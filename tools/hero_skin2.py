"""히어로 1·2: 디자인 형식 2타입 CSS 자동 생성 — 1타입 CSS를 고친 뒤에는 다시 실행: python3 tools/hero_skin2.py docs/hero/index.html docs/hero2/index.html (pip install tinycss2 필요)"""
import sys, re, colorsys
import tinycss2

PRE = ':root[data-skin="2"]'
A, B = '/* SKIN2:START */', '/* SKIN2:END */'
INK = r'(var\(--ink\)|#020010|#04061a|#03050d|#000(?:000)?\b)'
BRIGHT_SKIP = re.compile(r'^--')  # custom props handled in token block

def hx(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

def to_hex(rgb): return '#%02x%02x%02x' % tuple(max(0, min(255, round(c * 255))) for c in rgb)

def shift(rgb):
    """밝고 튀는 색 → 남색·은색 계열, 노랑·주황 → 금색 하나"""
    r, g, b = rgb
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    deg = h * 360
    if s < .14: return rgb
    if 20 <= deg <= 62:                       # 노랑·주황·금 → 금색
        return colorsys.hls_to_rgb(42 / 360, min(max(l, .32), .70), min(s, .58))
    if l < .32:                               # 어두운 바탕(보라·자주) → 짙은 남색
        return colorsys.hls_to_rgb(222 / 360, min(l, .16), min(s, .42))
    return colorsys.hls_to_rgb(220 / 360, min(max(l, .55), .80), min(s, .22))   # 그 밖의 형광 강조 → 은빛 파랑

def recolor(v):
    def rh(m):
        h = m.group(1); a = ''
        if len(h) == 8: h, a = h[:6], h[6:]
        elif len(h) == 4: h, a = h[:3], h[3]
        n = shift(hx(h))
        return (to_hex(n) + (a if len(a) == 2 else a * 2)) if n != hx(h) else m.group(0)
    v2 = re.sub(r'#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b', rh, v)
    def rr(m):
        r, g, b = (int(x) / 255 for x in m.group(2, 3, 4))
        n = shift((r, g, b))
        if n == (r, g, b): return m.group(0)
        return f"{m.group(1)}({','.join(str(round(c * 255)) for c in n)}{m.group(5) or ''})"
    return re.sub(r'(rgba?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,[^)]*)?\)', rr, v2)

def thin_shadow(v, text):
    parts, depth, cur = [], 0, ''
    for ch in v:
        if ch == '(': depth += 1
        if ch == ')': depth -= 1
        if ch == ',' and depth == 0: parts.append(cur); cur = ''
        else: cur += ch
    parts.append(cur)
    keep = []
    for p in parts:
        nums = re.findall(r'(-?[\d.]+)(px|vw|vh|em|rem)?', re.sub(r'(rgba?|color-mix|var)\([^)]*\)', '', p))
        nums = [float(n) for n, u in nums]
        hard = len(nums) >= 2 and (nums[0] or nums[1]) and (len(nums) < 3 or nums[2] == 0)
        if hard and 'inset' not in p: continue
        keep.append(p.strip())
    if not keep: return 'none'
    return ', '.join(keep)

def decl_changes(name, value, important):
    v = value
    out = {}
    if name.startswith('border') and re.search(INK, v) and re.search(r'(^|\s)([2-9](\.\d+)?px|[\d.]+v[wh])\b', v):
        v2 = re.sub(r'(^|\s)([2-9](\.\d+)?px|[\d.]+v[wh])\b', r'\g<1>1px', v)
        out[name] = re.sub(INK, 'rgba(255,255,255,.13)', v2)
        return out
    if name in ('-webkit-text-stroke', '-webkit-text-stroke-width') and not re.match(r'^\s*0', v):
        out[name] = '0'; return out
    if name in ('text-shadow', 'box-shadow') and re.search(INK, v):
        nv = thin_shadow(v, name == 'text-shadow')
        if nv != v.strip(): out[name] = recolor(nv) if nv != 'none' else ('0 1px 2px rgba(0,0,0,.45)' if name == 'text-shadow' else 'none')
        return out
    rc = recolor(v)
    if rc != v: out[name] = rc
    if name == 'font-family' and re.search(r'var\(--f-(disp|hero)\)', v): out['font-weight'] = '800'
    return out

def prefix_sel(sel):
    out = []
    for s in sel.split(','):
        s = s.strip()
        if not s: continue
        if s.startswith(':root') or s.startswith('html'): return None
        out.append(f'{PRE} {s}' if not s.startswith('body') else f'{PRE} {s}')
    return ', '.join(out)

def walk(rules, wrap=None):
    css = []
    for r in rules:
        if r.type == 'at-rule':
            kw = r.lower_at_keyword
            if kw in ('media', 'supports') and r.content:
                inner = walk(tinycss2.parse_rule_list(r.content, skip_whitespace=True, skip_comments=True))
                if inner: css.append(f"@{kw} {tinycss2.serialize(r.prelude).strip()}{{{inner}}}")
            continue  # @keyframes 등은 그대로
        if r.type != 'qualified-rule': continue
        sel = tinycss2.serialize(r.prelude).strip()
        ps = prefix_sel(sel)
        if not ps: continue
        decls = tinycss2.parse_declaration_list(r.content, skip_whitespace=True, skip_comments=True)
        ch = {}
        for d in decls:
            if d.type != 'declaration' or d.lower_name.startswith('--'): continue
            val = tinycss2.serialize(d.value).strip()
            for k, nv in decl_changes(d.lower_name, val, d.important).items():
                ch[k] = nv + (' !important' if d.important else '')
        if ch: css.append(ps + '{' + ';'.join(f'{k}:{v}' for k, v in ch.items()) + '}')
    return '\n'.join(css)

TOKENS = {
 'hero': """--night:#070b18;--panel:#0f1629;--panel2:#17203a;--line:#27324f;--ink:#03060f;--paper:#eef1f7;--muted:#8f9bb7;--gold:#d9b25c;
  --red:#c2484f;--blue:#3e72c4;--green:#3b9a6d;--yellow:#c9a24b;--bad:#cf5f6c;--good:#5db98c;--silver:#c9d0de;--bronze:#b9804f;
  --f-hero:"Chakra Petch","Noto Sans KR",sans-serif;--f-disp:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;--f-body:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;""",
 'hero2': """--night:#070b18;--panel:#0f1629;--panel2:#17203a;--line:#27324f;--ink:#03060f;--paper:#eef1f7;--muted:#8f9bb7;--gold:#d9b25c;--neon:#c9d3ea;
  --red:#b9506f;--blue:#3e7cc4;--green:#4a9a6a;--yellow:#c58a3e;--bad:#cf5f6c;--good:#5db98c;--silver:#c9d0de;--bronze:#b9804f;
  --f-hero:"Orbitron","Noto Sans KR",sans-serif;--f-disp:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;--f-body:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;"""}
HEX2 = {'hero': ['#c2484f', '#3e72c4', '#3b9a6d', '#c9a24b'], 'hero2': ['#3e7cc4', '#b9506f', '#4a9a6a', '#c58a3e']}

EXTRA = r"""
%(P)s body{font-weight:500;background:radial-gradient(1200px 600px at 50%% -10%%,#17213f 0%%,transparent 60%%),var(--night)!important}
%(P)s b,%(P)s strong,%(P)s h1,%(P)s h2,%(P)s h3,%(P)s .btn{font-weight:700}
%(P)s svg [stroke="#020010"],%(P)s svg [stroke="#04061a"]{stroke:rgba(3,6,15,.55);stroke-width:2.2px}
%(P)s .board{background:radial-gradient(1400px 700px at 50%% -20%%,#16203d 0%%,#0a1022 55%%,#05080f 100%%)!important}
%(P)s .board::before,%(P)s .board::after{opacity:.35}
%(P)s .board.v3 .bround b{background:var(--gold);color:var(--ink)}
%(P)s header.top{letter-spacing:-.02em}%(P)s header.top .licchip,%(P)s header.top .link,%(P)s header.top .tabs button,%(P)s header.top .lang button,%(P)s header.top .skinsw button{font-size:12px}
%(P)s .board.v3 .bl .htag{background:color-mix(in srgb,var(--c) 85%%,#fff 0%%);color:#fff}
%(P)s .skinsw{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;margin-left:6px}
.skinsw{display:inline-flex;border:1px solid rgba(255,255,255,.18);border-radius:999px;overflow:hidden;margin-left:6px}
.skinsw button{background:none;border:0;color:var(--muted);padding:3px 10px;font:inherit;font-size:.78rem;font-weight:700;cursor:pointer}
.skinsw button[aria-pressed="true"]{background:var(--gold);color:var(--ink)}
"""

def patch(path, app):
    s = open(path, encoding='utf-8').read()
    s = re.sub(re.escape(A) + r'.*?' + re.escape(B) + r'\n?', '', s, flags=re.S)
    styles = re.findall(r'<style>(.*?)</style>', s, flags=re.S)
    gen = []
    for css in styles:
        gen.append(walk(tinycss2.parse_stylesheet(css, skip_whitespace=True, skip_comments=True)))
    block = (A + '\n/* 2타입 (프리미엄): 짙은 남색 바탕 · 금색 하나만 강조 · 레인 색 차분하게 · 얇은 선. 아래는 1타입 CSS에서 patch_skin.py가 자동으로 만든 규칙입니다. */\n'
             + f'{PRE}{{{TOKENS[app]}}}\n' + '\n'.join(g for g in gen if g) + (EXTRA % {'P': PRE}) + B + '\n')
    i = s.rindex('</style>', 0, s.index('</head>') if '</head>' in s else len(s))
    # 마지막 head style 끝에 붙임
    last = max(m.start() for m in re.finditer('</style>', s))
    s = s[:last] + block + s[last:]
    # 적용 함수 + 저장
    if 'function applySkin(){' not in s:
        hook = ("/* 디자인 형식: 1타입(히어로) / 2타입(프리미엄) — S.cfg.skin 에 저장 */\n"
                f"const SKIN2_HEX={HEX2[app]!r};\n"
                "function applySkin(){const two=S&&S.cfg&&S.cfg.skin==='2';const el=document.documentElement;if(el.dataset.skin!==(two?'2':'1'))el.dataset.skin=two?'2':'1';"
                "HEROES.forEach((h,i)=>{if(h.hex0==null)h.hex0=h.hex;h.hex=two?SKIN2_HEX[i]:h.hex0})}\n")
        s = s.replace("function render(){", hook + "function render(){applySkin();", 1)
        s = s.replace("function renderBoard(){", "function renderBoard(){applySkin();", 1)
        lang = 'role="group" aria-label="language">\n      <button data-act="lang" data-v="ko" aria-pressed="${S.lang===\'ko\'}">KO</button><button data-act="lang" data-v="en" aria-pressed="${S.lang===\'en\'}">EN</button>\n    </div>'
        assert s.count(lang) == 1, (path, 'lang')
        s = s.replace(lang, lang + "\n    <div class=\"skinsw\" role=\"group\" aria-label=\"${esc(S.lang==='en'?'Design type':'디자인 형식')}\" title=\"${esc(S.lang==='en'?'Design type: 1 Hero · 2 Premium':'디자인 형식: 1타입 히어로 · 2타입 프리미엄')}\">"
                      "<button data-act=\"skin\" data-v=\"1\" aria-pressed=\"${S.cfg.skin!=='2'}\">${S.lang==='en'?'Type 1':'1타입'}</button><button data-act=\"skin\" data-v=\"2\" aria-pressed=\"${S.cfg.skin==='2'}\">${S.lang==='en'?'Type 2':'2타입'}</button></div>")
        assert s.count("    case'lang':") == 1, (path, 'case lang')
        s = s.replace("    case'lang':", "    case'skin':S.cfg.skin=v==='2'?'2':'1';applySkin();commit();break;\n    case'lang':")
    open(path, 'w', encoding='utf-8').write(s)
    n = block.count('\n')
    print('ok', path, 'skin2 lines', n)

patch(sys.argv[1], 'hero'); patch(sys.argv[2], 'hero2')
