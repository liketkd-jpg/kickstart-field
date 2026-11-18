"""히어로 1·2: 디자인 형식 1·2·3타입 (3타입 바탕 CSS 자동 생성 + 2타입 게임 · 3타입 중계 전용 CSS) — 1타입 CSS를 고친 뒤에는 다시 실행: python3 tools/hero_skins.py docs/hero/index.html docs/hero2/index.html (pip install tinycss2 필요)"""
import sys, re, colorsys
import tinycss2

PRE = ':root[data-skin="3"]'
P2 = ':root[data-skin="2"]'
A, B = '/* SKINS:START */', '/* SKINS:END */'
OLD_A, OLD_B = '/* SKIN2:START */', '/* SKIN2:END */'
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

HEX = {  # 레인 색 (확인용 캔버스 효과 등에서 쓰는 hex)
    'hero': {'2': ['#ff3b4f', '#2f8cff', '#1fd37a', '#ffc21a'], '3': ['#c2484f', '#3e72c4', '#3b9a6d', '#c9a24b']},
    'hero2': {'2': ['#22b8ff', '#ff3d9a', '#7be23a', '#ff9a1f'], '3': ['#3e7cc4', '#b9506f', '#4a9a6a', '#c58a3e']}}

GAME_TOKENS = {
 'hero': '--night:#13235e;--panel:#1d3488;--panel2:#2643a8;--line:#3b5bd1;--ink:#0a1440;--paper:#ffffff;--muted:#c9d6ff;--gold:#ffc81e;--red:#ff3b4f;--blue:#2f8cff;--green:#1fd37a;--yellow:#ffc21a;',
 'hero2': '--night:#1a1460;--panel:#2a1f8a;--panel2:#3527a8;--line:#5140d0;--ink:#100a44;--paper:#ffffff;--muted:#d6d0ff;--gold:#ffc81e;--neon:#5fe1ff;--red:#ff3d9a;--blue:#22b8ff;--green:#7be23a;--yellow:#ff9a1f;'}

# ---------- 2타입 · 게임 (입체 판 · 등장 · 승리 장면) ----------
GAME = r"""
/* ===== 2타입 · 게임: 도톰한 입체 판, 살짝 기운 레인 카드, 쾅 내려앉는 등장, 빛줄기 우승 장면 ===== */
%(P)s{--f-g:"Lilita One","Black Han Sans","Apple SD Gothic Neo","Malgun Gothic",sans-serif;--f-disp:var(--f-g);--f-hero:var(--f-g);--f-num:var(--f-g)}
%(P)s body{background:radial-gradient(1200px 700px at 50%% -10%%,#5a7bff 0%%,transparent 55%%),linear-gradient(180deg,var(--night),#0b123a)!important}
%(P)s .board{background:repeating-conic-gradient(from 0deg at 50%% 115%%,rgba(255,255,255,.07) 0 6deg,transparent 6deg 14deg),radial-gradient(1400px 800px at 50%% 110%%,#6a5cff 0%%,#2a1f8a 45%%,#0d0a3a 100%%)!important}
%(P)s .board::before,%(P)s .board::after{opacity:.25}
%(P)s .board.v3{--bt:var(--f-g)}
%(P)s .board.v3 .bhead{border-bottom:0;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.04));border-radius:calc(1.4*var(--u));padding:calc(.6*var(--u)) calc(1.2*var(--u));box-shadow:inset 0 2px 0 rgba(255,255,255,.25),0 calc(.5*var(--u)) 0 rgba(0,0,0,.25)}
%(P)s .board.v3 .bev b{font-family:var(--f-g);font-weight:400;letter-spacing:.02em;text-shadow:0 .25vw 0 rgba(0,0,0,.35)}
%(P)s .board.v3 .bround b{font-family:var(--f-g);font-weight:400;background:linear-gradient(180deg,#ffe36b,#ffb800);color:#3a2300;border-radius:calc(.8*var(--u));box-shadow:inset 0 2px 0 rgba(255,255,255,.7),0 calc(.35*var(--u)) 0 #b36b00;text-shadow:none}
%(P)s .board.v3 .bclock{font-family:var(--f-g);font-weight:400;background:linear-gradient(180deg,#ffffff,#dfe6ff);color:#1a1460;border-radius:calc(1.4*var(--u));box-shadow:inset 0 -.4vw 0 rgba(26,20,96,.18),0 calc(.6*var(--u)) 0 #8f9cff,0 calc(1.2*var(--u)) calc(2*var(--u)) rgba(0,0,0,.45);text-shadow:none!important;-webkit-text-fill-color:#1a1460}
%(P)s .board.v3 .bbest span{color:#ffe36b}
%(P)s .board.v3 .blanes{perspective:1400px}
%(P)s .board.v3 .bl{border:0!important;border-radius:calc(2.2*var(--u))!important;transform:rotateX(5deg);transform-origin:50%% 100%%;
  background:radial-gradient(120%% 60%% at 50%% 0%%,rgba(255,255,255,.45),transparent 60%%),linear-gradient(180deg,color-mix(in srgb,var(--c) 70%%,#fff) 0%%,var(--c) 38%%,color-mix(in srgb,var(--c) 62%%,#000) 100%%)!important;
  box-shadow:inset 0 .3vw 0 rgba(255,255,255,.55),inset 0 -.5vw 0 rgba(0,0,0,.18),0 calc(.9*var(--u)) 0 color-mix(in srgb,var(--c) 45%%,#000),0 calc(1.6*var(--u)) calc(2.4*var(--u)) rgba(0,0,0,.5)!important;overflow:visible}
%(P)s .board.v3 .bl::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(115deg,transparent 30%%,rgba(255,255,255,.22) 42%%,transparent 54%%);pointer-events:none;mix-blend-mode:screen}
%(P)s .board.v3 .bl .hero svg{filter:drop-shadow(0 .5vw 0 rgba(0,0,0,.28))!important}
%(P)s .board.v3 .bl .htag{font-family:var(--f-g);font-weight:400;background:#fff;color:color-mix(in srgb,var(--c) 75%%,#000);box-shadow:0 calc(.25*var(--u)) 0 rgba(0,0,0,.25)}
%(P)s .board.v3 .bl .bn{font-family:var(--f-g);font-weight:400;color:#fff;text-shadow:0 .3vw 0 rgba(0,0,0,.35)}
%(P)s .board.v3 .bl .bt{color:rgba(255,255,255,.85)}
%(P)s .board.v3 .bl .btime{font-family:var(--f-g);font-weight:400;background:linear-gradient(180deg,#15104a,#241a78);color:#fff;border-radius:calc(1*var(--u));box-shadow:inset 0 .3vw .6vw rgba(0,0,0,.5),0 2px 0 rgba(255,255,255,.35);text-shadow:none}
%(P)s .board.v3.enter .blanes>.bl{animation:gslam .75s cubic-bezier(.2,1.5,.35,1) both}
%(P)s .board.v3.enter .blanes>.bl:nth-child(2){animation-delay:.1s}%(P)s .board.v3.enter .blanes>.bl:nth-child(3){animation-delay:.2s}%(P)s .board.v3.enter .blanes>.bl:nth-child(4){animation-delay:.3s}
@keyframes gslam{0%%{opacity:0;transform:translateY(-40vh) rotateX(5deg) scale(1.15)}70%%{opacity:1;transform:translateY(1.2vh) rotateX(5deg) scale(.98)}100%%{transform:rotateX(5deg)}}
%(P)s .board.v3.enter .bclock{animation:gpop .6s .35s cubic-bezier(.2,1.8,.4,1) both}
@keyframes gpop{0%%{opacity:0;transform:scale(.3)}100%%{opacity:1;transform:none}}
%(P)s .squad>div{border:0!important;border-radius:2vw!important;background:radial-gradient(120%% 60%% at 50%% 0%%,rgba(255,255,255,.45),transparent 60%%),linear-gradient(180deg,color-mix(in srgb,var(--c) 70%%,#fff),var(--c) 40%%,color-mix(in srgb,var(--c) 60%%,#000))!important;box-shadow:inset 0 .3vw 0 rgba(255,255,255,.55),0 1vw 0 color-mix(in srgb,var(--c) 45%%,#000),0 1.6vw 2.4vw rgba(0,0,0,.5)!important}
%(P)s .squad b,%(P)s .squad span{color:#fff!important;-webkit-text-fill-color:#fff;font-family:var(--f-g);font-weight:400;text-shadow:0 .25vw 0 rgba(0,0,0,.35)}
%(P)s .board.enter .squad>div{animation:gslam .75s cubic-bezier(.2,1.5,.35,1) both}%(P)s .board.enter .squad>div:nth-child(2){animation-delay:.12s}%(P)s .board.enter .squad>div:nth-child(3){animation-delay:.24s}%(P)s .board.enter .squad>div:nth-child(4){animation-delay:.36s}
%(P)s .board.v3 .stitle,%(P)s .board.v3 .champtitle{font-family:var(--f-g)!important;font-weight:400;color:#fff;-webkit-text-fill-color:#fff;text-shadow:0 .35vw 0 rgba(0,0,0,.35)}
/* 승리 장면: 뒤에서 도는 빛줄기 + 1등 판이 튀어 올라옴 */
%(P)s .champwrap{position:relative}
%(P)s .champwrap::before{content:"";position:absolute;left:50%%;top:55%%;width:160vmax;height:160vmax;margin:-80vmax 0 0 -80vmax;background:repeating-conic-gradient(rgba(255,220,90,.22) 0 8deg,transparent 8deg 20deg);animation:grays 24s linear infinite;pointer-events:none;-webkit-mask:radial-gradient(circle,#000 0,#000 18%%,transparent 52%%);mask:radial-gradient(circle,#000 0,#000 18%%,transparent 52%%)}
@keyframes grays{to{transform:rotate(360deg)}}
%(P)s .podium{border-radius:2vw;background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,.06));box-shadow:inset 0 .3vw 0 rgba(255,255,255,.4),0 1vw 0 rgba(0,0,0,.28);padding:1vh .6vw}
%(P)s .podium.p1{background:linear-gradient(180deg,#ffe36b,#ffb800);box-shadow:inset 0 .3vw 0 rgba(255,255,255,.7),0 1vw 0 #b36b00,0 0 4vw rgba(255,200,30,.55)}
%(P)s .podium.p1 b,%(P)s .podium.p1 small,%(P)s .podium.p1 .tm{color:#3a2300!important;-webkit-text-fill-color:#3a2300;text-shadow:none}
%(P)s .podium b{font-family:var(--f-g);font-weight:400}
%(P)s .podium svg{filter:drop-shadow(0 .5vw 0 rgba(0,0,0,.3))!important}
%(P)s .board.enter .podium{animation:gslam .8s cubic-bezier(.2,1.5,.35,1) both}%(P)s .board.enter .podium.p1{animation:gwin 1s .5s cubic-bezier(.2,1.8,.4,1) both}%(P)s .board.enter .podium.p2{animation-delay:.15s}%(P)s .board.enter .podium.p3{animation-delay:.3s}
@keyframes gwin{0%%{opacity:0;transform:translateY(30vh) scale(.6)}70%%{opacity:1;transform:translateY(-3vh) scale(1.08)}100%%{transform:none}}
/* 운영 화면 */
%(P)s .lane{border:0!important;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.03)),var(--panel)!important;box-shadow:inset 0 2px 0 rgba(255,255,255,.18),0 6px 0 rgba(0,0,0,.3),0 12px 22px -8px rgba(0,0,0,.5)!important;border-radius:20px!important}
%(P)s .lane-top{border-radius:16px 16px 0 0;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 65%%,#fff),var(--c) 50%%,color-mix(in srgb,var(--c) 70%%,#000))!important;box-shadow:inset 0 2px 0 rgba(255,255,255,.5),0 4px 0 color-mix(in srgb,var(--c) 45%%,#000)!important}
%(P)s .btn{border:0!important;border-radius:14px;box-shadow:inset 0 2px 0 rgba(255,255,255,.3),0 4px 0 rgba(0,0,0,.35)!important}
%(P)s .btn.gold{background:linear-gradient(180deg,#ffe36b,#ffb800)!important;color:#3a2300!important;box-shadow:inset 0 2px 0 rgba(255,255,255,.7),0 4px 0 #b36b00!important}
%(P)s .btn.red{background:linear-gradient(180deg,#ff6b7a,#e8213d)!important;box-shadow:inset 0 2px 0 rgba(255,255,255,.45),0 4px 0 #8e0f22!important}
%(P)s .btn:active:not(:disabled){transform:translateY(3px);box-shadow:inset 0 2px 0 rgba(255,255,255,.3),0 1px 0 rgba(0,0,0,.35)!important}
%(P)s .card{border:0!important;border-radius:22px;box-shadow:inset 0 2px 0 rgba(255,255,255,.14),0 8px 0 rgba(0,0,0,.25),0 18px 30px -12px rgba(0,0,0,.5)!important}
%(P)s .logo b,%(P)s .tabs button{font-family:var(--f-g);font-weight:400;letter-spacing:.02em}
@media (prefers-reduced-motion:reduce){%(P)s .champwrap::before{animation:none}%(P)s .board.enter *{animation:none!important}}
"""

# ---------- 3타입 · 중계 (각진 판 · 금빛 선 · 이름과 기록 크게) ----------
BCAST = r"""
/* ===== 3타입 · 중계: 어두운 바탕, 금빛 가는 선, 모서리 잘린 각진 판, 캐릭터 대신 이름·기록 크게 ===== */
%(P)s{--cut:calc(1.4*var(--u,1vw))}
%(P)s .board{background:linear-gradient(90deg,rgba(217,178,92,.05) 1px,transparent 1px) 0 0/6vw 6vw,linear-gradient(rgba(217,178,92,.04) 1px,transparent 1px) 0 0/6vw 6vw,linear-gradient(180deg,#05070d,#0b1120 60%%,#05070d)!important}
%(P)s .board::before,%(P)s .board::after{display:none}
%(P)s .board.v3 .bhead{border-bottom:1px solid rgba(217,178,92,.55);box-shadow:0 1px 0 rgba(0,0,0,.6)}
%(P)s .board.v3 .bev b{text-transform:uppercase;letter-spacing:.12em;font-weight:800}
%(P)s .board.v3 .bev .evn{color:var(--gold)!important;text-transform:uppercase;letter-spacing:.3em}
%(P)s .board.v3 .bround b{border-radius:0;background:transparent;color:var(--gold);border:1px solid var(--gold);letter-spacing:.24em;clip-path:polygon(var(--cut) 0,100%% 0,calc(100%% - var(--cut)) 100%%,0 100%%);padding-left:calc(2*var(--u));padding-right:calc(2*var(--u))}
%(P)s .board.v3 .bclock{border-radius:0!important;background:linear-gradient(180deg,#0f1628,#070a14);border:1px solid rgba(217,178,92,.7);color:#fff;text-shadow:none!important;clip-path:polygon(var(--cut) 0,calc(100%% - var(--cut)) 0,100%% var(--cut),100%% 100%%,0 100%%,0 var(--cut));font-variant-numeric:tabular-nums}
%(P)s .board.v3 .bbest span{color:var(--gold)}
%(P)s .board.v3 .bl{border-radius:0!important;border:1px solid rgba(217,178,92,.35)!important;background:linear-gradient(180deg,#0e1526 0%%,#080c17 100%%)!important;box-shadow:none!important;
  clip-path:polygon(0 0,calc(100%% - var(--cut)) 0,100%% var(--cut),100%% 100%%,var(--cut) 100%%,0 calc(100%% - var(--cut)));
  grid-template-rows:calc(.5*var(--u)) calc(2.6*var(--u)) minmax(0,1fr) calc(2.6*var(--u)) calc(9*var(--u)) calc(2.6*var(--u))!important}
%(P)s .board.v3 .bl::before{content:"";grid-row:1;align-self:start;justify-self:stretch;height:calc(.5*var(--u));background:var(--c)}
%(P)s .board.v3 .bl .hero{display:none}
%(P)s .board.v3 .bl .htag{grid-row:2;justify-self:start;border-radius:0;background:transparent;color:var(--c);letter-spacing:.3em;border-left:calc(.35*var(--u)) solid var(--c);padding-left:calc(.8*var(--u))}
%(P)s .board.v3 .bl .bn{grid-row:3;align-self:center;font-size:calc(var(--bnu,4)*1.32*var(--u))!important;font-weight:900;letter-spacing:-.02em;max-width:100%%;overflow:hidden;text-overflow:clip}
%(P)s .board.v3 .bl .bt{grid-row:4;color:var(--muted);text-transform:uppercase;letter-spacing:.12em}
%(P)s .board.v3 .bl .btime{grid-row:5;width:100%%;border-radius:0!important;background:rgba(217,178,92,.06);border-top:1px solid rgba(217,178,92,.45);font-size:calc(6.6*var(--u))!important;color:#fff;text-shadow:none;font-variant-numeric:tabular-nums}
%(P)s .board.v3 .bl .bpen{grid-row:6}
%(P)s .board.v3 .bl .bplace{filter:grayscale(.15)}
%(P)s .board.v3 .stitle,%(P)s .board.v3 .champtitle{letter-spacing:.2em!important;text-transform:uppercase}
%(P)s .board.v3 .champtitle{-webkit-text-fill-color:var(--gold);border-top:1px solid rgba(217,178,92,.5);border-bottom:1px solid rgba(217,178,92,.5);padding:.6vh 2vw}
%(P)s .squad>div{border-radius:0!important;border:1px solid rgba(217,178,92,.35)!important;background:linear-gradient(180deg,#0e1526,#080c17)!important;box-shadow:inset 0 .5vw 0 var(--c)!important;clip-path:polygon(0 0,calc(100%% - 1.4vw) 0,100%% 1.4vw,100%% 100%%,1.4vw 100%%,0 calc(100%% - 1.4vw))}
%(P)s .squad svg{filter:grayscale(.35) brightness(.9)!important;opacity:.9}
%(P)s .podium{border-radius:0;border:1px solid rgba(217,178,92,.3);background:linear-gradient(180deg,#0e1526,#080c17);clip-path:polygon(0 0,calc(100%% - 1.4vw) 0,100%% 1.4vw,100%% 100%%,1.4vw 100%%,0 calc(100%% - 1.4vw));padding:1vh .6vw}
%(P)s .podium.p1{border-color:var(--gold);box-shadow:inset 0 .5vw 0 var(--gold)}
%(P)s .podium .fig{opacity:.85;filter:grayscale(.3)}
%(P)s .kslot,%(P)s .kchamp,%(P)s .kokqc{border-radius:0!important}
%(P)s .kslot.win{box-shadow:inset .35vw 0 0 var(--gold)!important}
/* 운영 화면 */
%(P)s .lane,%(P)s .card,%(P)s .btn,%(P)s .lane-top,%(P)s .ltime,%(P)s .lhero{border-radius:4px!important}
%(P)s .lane-top{background:linear-gradient(90deg,var(--c) 0 6px,#121a2e 6px)!important;text-shadow:none}
%(P)s .btn.gold{background:var(--gold)!important;color:#141006!important}
%(P)s .logo b,%(P)s .tabs button{letter-spacing:.14em;text-transform:uppercase}
"""

UI_CSS = r"""
.skinsw{display:inline-flex;border:1px solid rgba(255,255,255,.18);border-radius:999px;overflow:hidden;margin-left:6px}
.skinsw button{background:none;border:0;color:var(--muted);padding:3px 8px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
.skinsw::before{content:attr(data-l);padding:3px 2px 3px 8px;font-size:12px;opacity:.8}
.skinsw button[aria-pressed="true"]{background:var(--gold);color:var(--ink)}
:root[data-skin="3"] header.top{letter-spacing:-.02em}:root[data-skin="3"] header.top .licchip,:root[data-skin="3"] header.top .link,:root[data-skin="3"] header.top .tabs button,:root[data-skin="3"] header.top .lang button{font-size:12px}
:root[data-skin="2"] header.top .licchip,:root[data-skin="2"] header.top .link,:root[data-skin="2"] header.top .lang button{font-size:12px}
"""

SKINJS_A, SKINJS_B = '/* SKINJS:START */', '/* SKINJS:END */'

def skin_js(app):
    return (SKINJS_A + "\n/* 디자인 형식: 1타입 히어로(지금 그대로) · 2타입 게임(입체) · 3타입 중계(각진 금빛) — S.cfg.skin 에 저장 */\n"
            f"const SKIN_HEX={{'2':{HEX[app]['2']!r},'3':{HEX[app]['3']!r}}};\n"
            "function skinOf(){const v=S&&S.cfg&&S.cfg.skin;return v==='2'||v==='3'?v:'1'}\n"
            "function applySkin(){const k=skinOf(),el=document.documentElement;if(el.dataset.skin!==k)el.dataset.skin=k;"
            "HEROES.forEach((h,i)=>{if(h.hex0==null)h.hex0=h.hex;h.hex=SKIN_HEX[k]?SKIN_HEX[k][i]:h.hex0})}\n"
            "let _skinK='';function skinEnter(){const b=document.getElementById('board');if(!b)return;"
            "const k=[S.board,S.dkey,S.cur&&S.cur.r,S.cur&&S.cur.h,typeof slideIx!=='undefined'?slideIx:''].join('|');if(k!==_skinK){_skinK=k;b.classList.add('enter')}}\n"
            + SKINJS_B + "\n")

def patch(path, app):
    s = open(path, encoding='utf-8').read()
    # 예전 블록 지우기
    for a, b in ((OLD_A, OLD_B), (A, B)):
        s = re.sub(re.escape(a) + r'.*?' + re.escape(b) + r'\n?', '', s, flags=re.S)
    s = re.sub(r"/\* 디자인 형식: 1타입\(히어로\) / 2타입\(프리미엄\).*?\nconst SKIN2_HEX=[^\n]*\nfunction applySkin\(\)\{[^\n]*\n", '', s, flags=re.S)
    s = re.sub(re.escape(SKINJS_A) + r'.*?' + re.escape(SKINJS_B) + r'\n', '', s, flags=re.S)
    # 글꼴: 게임 글꼴 Lilita One
    if 'Lilita+One' not in s:
        k = s.index('fonts.googleapis.com/css2'); e = s.index('&display=swap', k)
        s = s[:e] + '&family=Lilita+One' + s[e:]
    # 3타입 바탕(자동) + 2·3타입 전용 CSS
    styles = re.findall(r'<style>(.*?)</style>', s, flags=re.S)
    gen = [walk(tinycss2.parse_stylesheet(c, skip_whitespace=True, skip_comments=True)) for c in styles]
    block = (A + '\n/* 디자인 형식 2·3타입 — tools/hero_skins.py 가 만든 부분입니다. 1타입 CSS를 고친 뒤 다시 실행하세요. */\n'
             + f'{P2}{{{GAME_TOKENS[app]}}}\n' + (GAME % {'P': P2})
             + f'{PRE}{{{TOKENS[app]}}}\n' + '\n'.join(g for g in gen if g) + ('\n'.join(l for l in EXTRA.split('\n') if 'skinsw' not in l) % {'P': PRE}) + (BCAST % {'P': PRE})
             + UI_CSS + B + '\n')
    last = max(m.start() for m in re.finditer('</style>', s))
    s = s[:last] + block + s[last:]
    # JS
    s = s.replace("function render(){applySkin();", skin_js(app) + "function render(){applySkin();", 1) if "function render(){applySkin();" in s else s.replace("function render(){", skin_js(app) + "function render(){applySkin();", 1)
    if "function renderBoard(){applySkin();" not in s: s = s.replace("function renderBoard(){", "function renderBoard(){applySkin();", 1)
    # 전광판 그린 뒤 등장 연출 표시
    if "skinEnter();" not in s.split(SKINJS_B)[1]:
        i = s.index("function renderBoard(){applySkin();"); j = s.index("\n}\n", i)
        s = s[:j] + "\n  skinEnter();" + s[j:]
    # 단추 1·2·3
    sw = ("<div class=\"skinsw\" role=\"group\" aria-label=\"${esc(S.lang==='en'?'Design type':'디자인 형식')}\" data-l=\"🎨\" title=\"${esc(S.lang==='en'?'Design type: 1 Hero · 2 Game · 3 Broadcast':'디자인 형식: 1타입 히어로 · 2타입 게임 · 3타입 중계')}\">"
          "${[['1','1타입','Type 1','히어로 (지금 그대로)'],['2','2타입','Type 2','게임 (입체)'],['3','3타입','Type 3','중계 (각진 금빛)']].map(([v,k,e,d])=>`<button data-act=\"skin\" data-v=\"${v}\" title=\"${esc(d)}\" aria-pressed=\"${skinOf()===v}\">${v}</button>`).join('')}</div>")
    s, n = re.subn(r'<div class="skinsw".*?</div>(?=\n)', lambda m: sw, s, count=1, flags=re.S)
    assert n == 1, (path, 'skinsw')
    s, n = re.subn(r"    case'skin':[^\n]*\n", "    case'skin':S.cfg.skin=v==='2'||v==='3'?v:'1';applySkin();commit();break;\n", s, count=1)
    assert n == 1, (path, 'case skin')
    open(path, 'w', encoding='utf-8').write(s)
    print('ok', path, 'lines', block.count('\n'))

patch(sys.argv[1], 'hero'); patch(sys.argv[2], 'hero2')
