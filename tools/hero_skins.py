"""히어로 1·2: 디자인 형식 — 1타입 히어로(그대로) · 2타입 럭셔리. 1타입 CSS를 고친 뒤 다시 실행: python3 tools/hero_skins.py docs/hero/index.html docs/hero2/index.html (pip install tinycss2 필요)"""
import sys, re, colorsys, os, base64
import tinycss2

PRE = ':root[data-skin="2"]'
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
    """2타입 럭셔리: 노랑·주황·금 → 샴페인 골드 하나, 어두운 색 → 검정에 가까운 무채색, 그 밖의 튀는 색 → 은빛"""
    r, g, b = rgb
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    deg = h * 360
    if s < .12: return rgb
    if 20 <= deg <= 62:
        return colorsys.hls_to_rgb(38 / 360, min(max(l, .45), .74), min(s, .42))
    if l < .32:
        return colorsys.hls_to_rgb(220 / 360, min(l, .10), min(s, .06))
    return colorsys.hls_to_rgb(215 / 360, min(max(l, .66), .84), min(s, .06))

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


# ===================== 2타입 · 럭셔리 =====================
# 고급 자동차(포르쉐·벤틀리·롤스로이스) + 아이언맨의 빛나는 화면:
# 검정 탄소 섬유 바탕 · 은빛 금속 · 강조색은 샴페인 골드 하나 · 얇고 큰 글자 · 공중에 뜬 유리판 · 느리고 부드러운 움직임 · 출발 때 빛줄기

TOKENS = {
 'hero': """--night:#08090b;--panel:#111316;--panel2:#181b20;--line:#2a2e35;--ink:#050607;--paper:#f2f2f0;--muted:#8d929b;--gold:#c9a96e;--silver:#d7dbe0;--bronze:#a77b55;--good:#8fbf9f;--bad:#c98a8f;
  --red:#c98a8f;--blue:#8fb3d1;--green:#8fbf9f;--yellow:#d1b27a;--acc:#c9a96e;
  --f-hero:"Saira","Noto Sans KR",sans-serif;--f-disp:"Saira","Noto Sans KR",sans-serif;--f-num:"Saira","Noto Sans KR",sans-serif;--f-body:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;""",
 'hero2': """--night:#08090b;--panel:#111316;--panel2:#181b20;--line:#2a2e35;--ink:#050607;--paper:#f2f2f0;--muted:#8d929b;--gold:#c9a96e;--silver:#d7dbe0;--bronze:#a77b55;--good:#8fbf9f;--bad:#c98a8f;--neon:#d7dbe0;
  --blue:#8fb3d1;--red:#c98a8f;--green:#8fbf9f;--yellow:#d1b27a;--acc:#c9a96e;
  --f-hero:"Saira","Noto Sans KR",sans-serif;--f-disp:"Saira","Noto Sans KR",sans-serif;--f-num:"Saira","Noto Sans KR",sans-serif;--f-body:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;"""}
HEX = {'hero': ['#c98a8f', '#8fb3d1', '#8fbf9f', '#d1b27a'], 'hero2': ['#8fb3d1', '#c98a8f', '#8fbf9f', '#d1b27a']}

LUX = r"""
/* ===== 2타입 · 럭셔리 ===== */
%(P)s{--glass:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.018));--hair:rgba(255,255,255,.13);--hair2:rgba(255,255,255,.26);
  --metal:linear-gradient(180deg,#ffffff 0%%,#d9dde2 38%%,#8e949c 62%%,#e9ecef 100%%);--champ:linear-gradient(180deg,#f3e2bd 0%%,#c9a96e 45%%,#8a6d3b 75%%,#e6cf9f 100%%);
  --carbon:repeating-linear-gradient(45deg,#0c0d0f 0 3px,#141518 3px 6px),repeating-linear-gradient(-45deg,rgba(255,255,255,.022) 0 3px,transparent 3px 6px);
  --ease:cubic-bezier(.22,.61,.24,1)}
%(P)s body{font-weight:400;letter-spacing:.01em;background:radial-gradient(1100px 520px at 50%% -12%%,rgba(255,255,255,.07),transparent 60%%),var(--carbon),#090a0c!important;background-attachment:fixed!important}
%(P)s b,%(P)s strong{font-weight:600}
%(P)s svg [stroke="#020010"],%(P)s svg [stroke="#04061a"]{stroke:rgba(0,0,0,.55);stroke-width:1.6px}
/* 운영 화면 */
%(P)s header.top{background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,0)),#0b0c0e!important;border-bottom:1px solid var(--hair)!important;box-shadow:0 1px 0 rgba(0,0,0,.6)}
%(P)s header.top .licchip,%(P)s header.top .link,%(P)s header.top .tabs button,%(P)s header.top .lang button{font-size:12px;letter-spacing:.04em}
%(P)s .logo b{background:var(--metal);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;font-weight:300;letter-spacing:.06em}
%(P)s .card,%(P)s .lane,%(P)s .licbox,%(P)s .runbar{background:var(--glass),rgba(17,19,22,.82)!important;border:1px solid var(--hair)!important;border-radius:14px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.09),0 18px 40px -22px rgba(0,0,0,.9)!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
%(P)s .lane-top{background:linear-gradient(90deg,var(--c) 0 3px,rgba(255,255,255,.04) 3px)!important;border-radius:13px 13px 0 0!important;border-bottom:1px solid var(--hair)!important;box-shadow:none!important;text-shadow:none!important}
%(P)s .btn{background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.02))!important;border:1px solid var(--hair2)!important;color:var(--paper)!important;border-radius:10px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)!important;font-weight:500!important;letter-spacing:.03em;transition:border-color .4s var(--ease),background .4s var(--ease)}
%(P)s .btn:hover:not(:disabled){border-color:var(--acc)!important}
%(P)s .btn.gold,%(P)s .btn.red,%(P)s .btn.go,%(P)s button.go{background:var(--champ)!important;color:#1a140a!important;border-color:rgba(255,236,200,.6)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 10px 24px -14px rgba(201,169,110,.8)!important;text-shadow:none!important}
%(P)s .btn.ghost{background:transparent!important}
%(P)s input,%(P)s select,%(P)s textarea{background:rgba(0,0,0,.45)!important;border:1px solid var(--hair)!important;color:var(--paper)!important;border-radius:9px!important}
%(P)s .tag{background:transparent!important;border:1px solid var(--acc)!important;color:var(--acc)!important;font-weight:500}
%(P)s .banner{background:var(--glass),rgba(17,19,22,.9)!important;border:1px solid var(--acc)!important;color:var(--paper)!important;border-radius:12px!important;box-shadow:0 0 0 1px rgba(201,169,110,.15),0 20px 40px -24px rgba(201,169,110,.5)!important}
%(P)s .skinsw{border-color:var(--hair2)}
/* ---------- 전광판 ---------- */
%(P)s .board{background:radial-gradient(90%% 60%% at 50%% -8%%,rgba(255,255,255,.10),transparent 60%%),radial-gradient(120%% 90%% at 50%% 120%%,rgba(201,169,110,.08),transparent 55%%),var(--carbon),#08090b!important}
%(P)s .board::before,%(P)s .board::after{opacity:.18}
%(P)s .board.v3{--bt:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-weight:300}
%(P)s .board.v3 .bhead{border-bottom:0!important;position:relative}
%(P)s .board.v3 .bhead::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,transparent,var(--hair2) 20%%,rgba(201,169,110,.7) 50%%,var(--hair2) 80%%,transparent)}
%(P)s .board.v3 .bev .evn{color:var(--muted)!important;font-weight:400;letter-spacing:.32em;text-transform:uppercase}
%(P)s .board.v3 .bev b{font-family:"Saira","Noto Sans KR",sans-serif!important;font-weight:300!important;letter-spacing:.14em;text-transform:uppercase;background:var(--metal);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;text-shadow:none!important}
%(P)s .board.v3 .bev b small{-webkit-text-fill-color:var(--muted);color:var(--muted);letter-spacing:.06em;font-weight:300}
%(P)s .board.v3 .bround b{background:transparent!important;color:var(--acc)!important;border:1px solid rgba(201,169,110,.7);border-radius:999px!important;font-family:"Saira",sans-serif;font-weight:400!important;letter-spacing:.3em;box-shadow:none!important}
%(P)s .board.v3 .bround small{letter-spacing:.06em}
%(P)s .board.v3 .bclock{font-family:"Saira",sans-serif!important;font-weight:200!important;letter-spacing:.02em;color:#f6f6f4!important;-webkit-text-fill-color:#f6f6f4;background:var(--glass)!important;border:1px solid var(--hair2)!important;border-radius:calc(1*var(--u,1vw))!important;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 calc(2*var(--u,1vw)) calc(4*var(--u,1vw)) calc(-1.6*var(--u,1vw)) rgba(0,0,0,.95)!important;text-shadow:0 0 calc(2.4*var(--u,1vw)) rgba(255,255,255,.18)!important;font-variant-numeric:tabular-nums}
%(P)s .board.v3 .bbest span{color:var(--acc);letter-spacing:.3em;font-weight:400}
%(P)s .board.v3 .bbest b{font-family:"Saira",sans-serif;font-weight:300}
/* 레인: 공중에 뜬 유리판, 캐릭터는 뒤에 은빛 실루엣 */
%(P)s .board.v3 .blanes{gap:calc(1.6*var(--u,1vw))!important}
%(P)s .board.v3 .bl{background:var(--glass),rgba(14,15,18,.55)!important;border:1px solid var(--hair)!important;border-radius:calc(1*var(--u,1vw))!important;-webkit-backdrop-filter:blur(16px) saturate(1.1);backdrop-filter:blur(16px) saturate(1.1);overflow:hidden;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 calc(2.4*var(--u,1vw)) calc(4.4*var(--u,1vw)) calc(-1.8*var(--u,1vw)) rgba(0,0,0,.95)!important;
  grid-template-rows:calc(2.6*var(--u,1vw)) minmax(0,1fr) calc(2.4*var(--u,1vw)) calc(8.6*var(--u,1vw)) calc(2.4*var(--u,1vw))!important;animation:lxfloat 9s ease-in-out infinite alternate}
%(P)s .board.v3 .bl:nth-child(2){animation-delay:-2.2s}%(P)s .board.v3 .bl:nth-child(3){animation-delay:-4.4s}%(P)s .board.v3 .bl:nth-child(4){animation-delay:-6.6s}
@keyframes lxfloat{from{transform:translateY(0)}to{transform:translateY(calc(-.5*var(--u,1vw)))}}
%(P)s .board.v3 .bl::before{content:"";position:absolute;left:12%%;right:12%%;top:0;height:2px;background:linear-gradient(90deg,transparent,var(--c),transparent);box-shadow:0 0 calc(1.2*var(--u,1vw)) var(--c);opacity:.9}
%(P)s .board.v3 .bl::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 35%%,rgba(255,255,255,.07) 48%%,transparent 60%%);pointer-events:none}
%(P)s .board.v3 .bl .hero{position:absolute;left:0;right:0;bottom:18%%;height:62%%;display:grid;place-items:center;opacity:.13;filter:grayscale(1) brightness(2.2) contrast(.8);pointer-events:none;z-index:0}
%(P)s .board.v3 .bl .hero svg{height:100%%;width:auto;filter:none!important}
%(P)s .board.v3 .bl>*:not(.hero):not(.bplace){position:relative;z-index:1}%(P)s .board.v3 .bl .bplace{z-index:2}
%(P)s .board.v3 .bl .htag{background:transparent!important;color:var(--muted)!important;font-family:"Saira",sans-serif;font-weight:400!important;letter-spacing:.42em!important;box-shadow:none!important;padding:0!important;display:flex;align-items:center;gap:calc(.6*var(--u,1vw))}
%(P)s .board.v3 .bl .htag::before{content:"";width:calc(.55*var(--u,1vw));height:calc(.55*var(--u,1vw));border-radius:50%%;background:var(--c);box-shadow:0 0 calc(.8*var(--u,1vw)) var(--c)}
%(P)s .board.v3 .bl .bn{font-weight:300!important;letter-spacing:.02em;color:#fbfbfa;text-shadow:none!important;align-self:center;font-size:calc(var(--bnu,4)*1.25*var(--u,1vw))!important}
%(P)s .board.v3 .bl .bt{color:var(--muted);letter-spacing:.14em;font-weight:300}
%(P)s .board.v3 .bl .btime{width:86%%;justify-self:center;background:rgba(0,0,0,.35)!important;border:1px solid var(--hair)!important;border-radius:calc(.7*var(--u,1vw))!important;font-family:"Saira",sans-serif!important;font-weight:200!important;font-size:calc(5.6*var(--u,1vw))!important;color:#f6f6f4!important;text-shadow:none!important;font-variant-numeric:tabular-nums;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
%(P)s .board.v3 .bl .bpen span{background:transparent!important;border:1px solid rgba(201,138,143,.7)!important;color:#e8b9bd!important;font-weight:400}
%(P)s .board.v3 .bl .bplace{filter:saturate(.75) drop-shadow(0 .6vw 1vw rgba(0,0,0,.6))}
/* 화면이 바뀔 때: 느리게 떠오름 · 출발할 때: 빛줄기가 지나가며 화면이 켜짐 */
%(P)s .board.enter .bhead,%(P)s .board.enter .bclockw,%(P)s .board.enter .blanes>.bl,%(P)s .board.enter .squad>div,%(P)s .board.enter .podium,%(P)s .board.enter .stitle,%(P)s .board.enter .champtitle,%(P)s .board.enter .kcol,%(P)s .board.enter .stand{animation:lxin 1.2s var(--ease) both}
%(P)s .board.enter .blanes>.bl:nth-child(2),%(P)s .board.enter .squad>div:nth-child(2),%(P)s .board.enter .kcol:nth-child(2){animation-delay:.12s}
%(P)s .board.enter .blanes>.bl:nth-child(3),%(P)s .board.enter .squad>div:nth-child(3),%(P)s .board.enter .kcol:nth-child(3){animation-delay:.24s}
%(P)s .board.enter .blanes>.bl:nth-child(4),%(P)s .board.enter .squad>div:nth-child(4),%(P)s .board.enter .kcol:nth-child(4){animation-delay:.36s}
@keyframes lxin{from{opacity:0;transform:translateY(1.6vh);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
%(P)s .board.ignite .blanes>.bl{animation:lxpower 1.6s var(--ease) both}
%(P)s .board.ignite .blanes>.bl:nth-child(2){animation-delay:.08s}%(P)s .board.ignite .blanes>.bl:nth-child(3){animation-delay:.16s}%(P)s .board.ignite .blanes>.bl:nth-child(4){animation-delay:.24s}
@keyframes lxpower{0%%{filter:brightness(.25)}35%%{filter:brightness(1.9)}100%%{filter:none}}
.lxscan{position:fixed;inset:0;z-index:99;pointer-events:none;overflow:hidden}
.lxscan::before{content:"";position:absolute;top:-10%%;bottom:-10%%;width:18vw;left:-25vw;background:linear-gradient(90deg,transparent,rgba(255,244,222,.06) 35%%,rgba(255,244,222,.55) 50%%,rgba(255,244,222,.06) 65%%,transparent);transform:skewX(-14deg);animation:lxsweep 1.5s var(--ease,ease) forwards}
.lxscan::after{content:"";position:absolute;left:0;right:0;top:50%%;height:1px;background:linear-gradient(90deg,transparent,rgba(232,210,160,.95),transparent);box-shadow:0 0 1.6vw rgba(201,169,110,.9);transform:scaleX(0);animation:lxline 1.5s var(--ease,ease) forwards}
@keyframes lxsweep{to{left:110vw}}
@keyframes lxline{0%%{transform:scaleX(0);opacity:1}55%%{transform:scaleX(1);opacity:1}100%%{transform:scaleX(1);opacity:0}}
/* 오프닝(히어로 소개) */
%(P)s .board.v3 .stitle{font-family:"Saira","Noto Sans KR",sans-serif!important;font-weight:200!important;letter-spacing:.32em!important;background:var(--metal);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;text-shadow:none!important}
%(P)s .board.v3 .stitle small{-webkit-text-fill-color:var(--muted)!important;background:none!important;letter-spacing:.1em}
%(P)s .squad>div{background:var(--glass),rgba(14,15,18,.6)!important;border:1px solid var(--hair)!important;border-radius:1vw!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2.4vw 4vw -1.6vw rgba(0,0,0,.95)!important;position:relative;overflow:hidden}
%(P)s .squad>div::before{content:"";position:absolute;left:15%%;right:15%%;top:0;height:2px;background:linear-gradient(90deg,transparent,var(--c),transparent);box-shadow:0 0 1vw var(--c)}
%(P)s .squad svg{filter:saturate(.25) contrast(1.05) drop-shadow(0 1.6vw 1.6vw rgba(0,0,0,.7))!important}
%(P)s .squad b{font-family:"Saira",sans-serif!important;font-weight:300!important;letter-spacing:.16em;white-space:nowrap;font-size:min(2.6vw,3.2vh)!important;color:#f6f6f4!important;-webkit-text-fill-color:#f6f6f4;text-shadow:none!important}
%(P)s .squad span{color:var(--muted)!important;letter-spacing:.04em;white-space:nowrap;font-size:min(1.6vw,2.4vh)!important;font-weight:400!important}
/* 우승 화면: 위에서 내려오는 조명 · 플래티넘 유리 시상대 · 1등은 샴페인 골드 */
%(P)s .champwrap{position:relative}
%(P)s .champwrap::before{content:"";position:absolute;left:50%%;top:-12vh;width:70vw;height:95vh;transform:translateX(-50%%);background:conic-gradient(from 180deg at 50%% 0%%,transparent 160deg,rgba(255,240,210,.09) 172deg,rgba(255,240,210,.16) 180deg,rgba(255,240,210,.09) 188deg,transparent 200deg);pointer-events:none;filter:blur(6px)}
%(P)s .board.v3 .champtitle{font-family:"Saira","Noto Sans KR",sans-serif!important;font-weight:200!important;letter-spacing:.42em!important;background:var(--champ)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}
%(P)s .podium{background:var(--glass),rgba(14,15,18,.6);border:1px solid var(--hair);border-radius:1vw;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2.4vw 4vw -1.6vw rgba(0,0,0,.95);padding:1vh .6vw;position:relative;overflow:hidden}
%(P)s .podium svg{filter:saturate(.25) drop-shadow(0 1.4vw 1.4vw rgba(0,0,0,.7))!important}
%(P)s .podium b{font-family:"Noto Sans KR",sans-serif!important;font-weight:300!important;color:#f6f6f4!important;-webkit-text-fill-color:#f6f6f4;text-shadow:none!important}
%(P)s .podium .tm{font-family:"Saira",sans-serif!important;font-weight:300!important}
%(P)s .podium .blk{background:transparent!important;border-top:1px solid var(--hair)!important;box-shadow:none!important;color:var(--muted)!important}
%(P)s .podium.p1{border-color:rgba(201,169,110,.75);box-shadow:inset 0 1px 0 rgba(255,236,200,.4),0 0 0 1px rgba(201,169,110,.25),0 3vw 6vw -2vw rgba(201,169,110,.35)}
%(P)s .podium.p1 svg{filter:sepia(.5) saturate(.9) brightness(1.08) drop-shadow(0 1.4vw 1.4vw rgba(0,0,0,.7))!important}
%(P)s .podium.p1 .blk{color:var(--acc)!important;border-top-color:rgba(201,169,110,.6)!important}
%(P)s .podium.p1::after{content:"";position:absolute;top:-20%%;bottom:-20%%;width:30%%;left:-40%%;background:linear-gradient(90deg,transparent,rgba(255,244,222,.16),transparent);transform:skewX(-14deg);animation:lxsheen 5.5s var(--ease) 1.2s infinite}
@keyframes lxsheen{0%%{left:-40%%}45%%,100%%{left:130%%}}
/* 순위표 · 왕중왕전 대진표 */
%(P)s .srow{border-bottom:1px solid rgba(255,255,255,.07)!important;background:transparent!important}
%(P)s .srow.head{color:var(--muted)!important;letter-spacing:.2em}
%(P)s .kokt{background:var(--champ)!important;-webkit-background-clip:text!important;background-clip:text!important;font-family:"Saira",sans-serif!important;font-weight:200!important;letter-spacing:.4em!important}
%(P)s .kslot{background:var(--glass),rgba(14,15,18,.6)!important;border:1px solid var(--hair)!important;border-radius:.6vw!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)!important}
%(P)s .kslot .nm{font-weight:300!important}
%(P)s .kslot .tm{font-family:"Saira",sans-serif!important;font-weight:300!important}
%(P)s .kslot.win{border-color:rgba(201,169,110,.75)!important;box-shadow:inset .25vw 0 0 var(--acc),0 0 2vw -0.6vw rgba(201,169,110,.6)!important;background:linear-gradient(90deg,rgba(201,169,110,.14),transparent 70%%),rgba(14,15,18,.6)!important}
%(P)s .kslot.win .tm{color:var(--acc)!important}
%(P)s .kslot.byew{border-color:var(--hair2)!important;background:var(--glass)!important}
%(P)s .kbye{background:transparent!important;border:1px solid var(--hair2);color:var(--muted)!important}
%(P)s .kpair::after,%(P)s .kcol:not(:first-child) .kmatch::before{border-color:rgba(255,255,255,.18)!important}
%(P)s .kchamp{border:1px solid var(--hair)!important;background:var(--glass)!important;border-radius:1vw!important}
%(P)s .kchamp.on{border-color:rgba(201,169,110,.8)!important;box-shadow:0 3vw 6vw -2vw rgba(201,169,110,.45)!important}
%(P)s .kchamp .cup{filter:sepia(.4) saturate(.8)}
%(P)s .kokqc{border:1px solid var(--hair)!important;background:var(--glass)!important;border-radius:1vw!important}
%(P)s .kokqc.on{border-color:rgba(201,169,110,.8)!important;box-shadow:0 2vw 4vw -2vw rgba(201,169,110,.5)!important}
/* 큰 알림 글자(GO!·BOSS DOWN 등) */
%(P)s .bigov{background:radial-gradient(60%% 40%% at 50%% 50%%,rgba(0,0,0,.55),transparent 70%%)!important}
%(P)s .bigov b{font-family:"Saira","Noto Sans KR",sans-serif!important;font-weight:200!important;letter-spacing:.18em!important;background:var(--champ)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;-webkit-text-fill-color:transparent!important;-webkit-text-stroke:0!important;text-shadow:none!important;filter:drop-shadow(0 0 2.4vw rgba(201,169,110,.45))}
%(P)s .bigov span{font-family:"Noto Sans KR",sans-serif!important;font-weight:300!important;letter-spacing:.2em;color:var(--silver)!important;-webkit-text-fill-color:var(--silver)!important;-webkit-text-stroke:0!important;text-shadow:none!important;background:none!important}
/* 카운트다운·GO·결승 진출(POWER UP) 효과: 번개·색종이 대신 금빛 빛줄기와 은은한 금가루 */
%(P)s .cd b,%(P)s .cd b.gotxt{font-family:"Saira",sans-serif!important;font-weight:200!important;letter-spacing:.12em;background:var(--champ)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;-webkit-text-fill-color:transparent!important;-webkit-text-stroke:0!important;text-shadow:none!important;filter:drop-shadow(0 0 2.4vw rgba(201,169,110,.5))}
%(P)s .flash{display:none!important}%(P)s .board.shake{animation:none!important}
%(P)s .pwov{background:radial-gradient(60%% 45%% at 50%% 50%%,rgba(0,0,0,.6),transparent 75%%)!important}%(P)s .pwov .rays{display:none!important}
%(P)s .pwov .pwt b{font-family:"Saira",sans-serif!important;font-weight:200!important;letter-spacing:.24em!important;background:var(--champ)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;-webkit-text-fill-color:transparent!important;-webkit-text-stroke:0!important;text-shadow:none!important}
%(P)s .pwov .pwt span{font-family:"Noto Sans KR",sans-serif!important;font-weight:300!important;letter-spacing:.3em!important;color:var(--silver)!important;-webkit-text-fill-color:var(--silver)!important;-webkit-text-stroke:0!important;text-shadow:none!important;background:none!important}
%(P)s .lvov{background:radial-gradient(60%% 50%% at 50%% 45%%,rgba(201,169,110,.10),rgba(5,6,7,.92) 70%%)!important;backdrop-filter:blur(6px)}
%(P)s .lvt{font-family:"Saira",sans-serif!important;font-weight:200!important;font-size:6vw!important;letter-spacing:.3em!important;background:var(--champ)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;-webkit-text-fill-color:transparent!important;-webkit-text-stroke:0!important;text-shadow:none!important;animation:lxin 1.4s cubic-bezier(.2,.7,.2,1) both!important}
%(P)s .lvc{border:1px solid rgba(215,219,224,.22)!important;border-top-color:rgba(201,169,110,.7)!important;border-radius:.6vw!important;background:linear-gradient(170deg,rgba(255,255,255,.07),rgba(255,255,255,.015))!important;box-shadow:0 2vw 4vw rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.12)!important;backdrop-filter:blur(10px);animation:lxin 1.2s cubic-bezier(.2,.7,.2,1) both!important}
%(P)s .lvc b{font-family:"Noto Sans KR",sans-serif!important;font-weight:300!important;letter-spacing:.06em;color:var(--paper)!important}
%(P)s .lvc span{font-weight:300;letter-spacing:.08em;color:var(--silver)!important}
%(P)s .lvc em{font-family:"Saira",sans-serif!important;font-weight:300!important;color:var(--gold)!important}
.lxglit{position:fixed;inset:0;z-index:98;pointer-events:none;overflow:hidden}
.lxglit i{position:absolute;top:-4vh;width:var(--s);height:var(--s);background:var(--k);opacity:.0;transform:rotate(45deg);box-shadow:0 0 .6vw var(--k);animation:lxfall var(--d) cubic-bezier(.3,.2,.4,1) var(--w) forwards}
@keyframes lxfall{0%%{opacity:0;transform:translateY(0) rotate(45deg)}12%%{opacity:.95}100%%{opacity:0;transform:translateY(108vh) rotate(405deg)}}
@media (prefers-reduced-motion:reduce){%(P)s .board.v3 .bl,%(P)s .podium.p1::after{animation:none!important}.lxscan{display:none}%(P)s .board.enter *,%(P)s .board.ignite *{animation:none!important}}
"""

PHOTO_CSS = r"""
/* 3타입 · 그림 히어로 — 2타입 럭셔리 위에 그림 캐릭터 */
:root[data-photo="1"] .hf.photo{overflow:visible}
:root[data-photo="1"] .hf.photo image{transform-box:fill-box;transform-origin:50% 100%}
:root[data-photo="1"] .hf.photo[data-mode="ready"] image{animation:phbreath 6s ease-in-out infinite}
:root[data-photo="1"] .hf.photo[data-mode="run"] image,:root[data-photo="1"] .hf.photo[data-mode="runx"] image{animation:phrun 1.1s ease-in-out infinite}
:root[data-photo="1"] .hf.photo[data-mode="p1"],:root[data-photo="1"] .hf.photo[data-mode="p1x"]{filter:drop-shadow(0 0 1.6vw rgba(201,169,110,.55)) drop-shadow(0 1.4vh 2vh rgba(0,0,0,.6))!important}
@keyframes phbreath{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-.6%) scale(1.008)}}
@keyframes phrun{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-1.6%) rotate(1.2deg)}}
:root[data-photo="1"] .board.v3 .bl .hero{opacity:1!important;filter:none!important;bottom:auto!important;top:6%!important;height:62%!important;-webkit-mask-image:linear-gradient(to bottom,#000 30%,rgba(0,0,0,.35) 62%,transparent 92%);mask-image:linear-gradient(to bottom,#000 30%,rgba(0,0,0,.35) 62%,transparent 92%)}
:root[data-photo="1"] .squad svg,:root[data-photo="1"] .podium svg,:root[data-photo="1"] .lvc svg{filter:drop-shadow(0 1.4vw 1.4vw rgba(0,0,0,.7))!important}
:root[data-photo="1"] .podium .fig{position:relative}
:root[data-photo="1"] .podium .fig svg.photo{position:absolute;inset:0;width:100%!important;height:100%!important;max-height:none!important}
:root[data-photo="1"] .podium.p1 svg{filter:drop-shadow(0 0 1.4vw rgba(201,169,110,.45)) drop-shadow(0 1.4vw 1.4vw rgba(0,0,0,.7))!important}
:root[data-photo="1"] .board.v3 .bl .hero svg{filter:drop-shadow(0 1.2vh 1.6vh rgba(0,0,0,.55))!important}
:root[data-photo="1"] .board.v3 .bl.emptyb .hero{opacity:.18!important;filter:grayscale(1)!important}
:root[data-photo="1"] .board.v3 .bl .bn{text-shadow:0 .2vw 1.2vw rgba(0,0,0,.95),0 0 .3vw rgba(0,0,0,.9)}
@media (prefers-reduced-motion: reduce){:root[data-photo="1"] .hf.photo image{animation:none!important}}
"""

UI_CSS = r"""
.skinsw{display:inline-flex;border:1px solid rgba(255,255,255,.18);border-radius:999px;overflow:hidden;margin-left:6px}
.skinsw::before{content:attr(data-l);padding:3px 2px 3px 8px;font-size:12px;opacity:.8}
.skinsw button{background:none;border:0;color:var(--muted);padding:3px 9px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
.skinsw button[aria-pressed="true"]{background:var(--gold);color:var(--ink)}
"""

SKINJS_A, SKINJS_B = '/* SKINJS:START */', '/* SKINJS:END */'

ART_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hero_art')

def art_list(app):
    d = os.path.join(ART_DIR, app)
    if not all(os.path.exists(os.path.join(d, f'{i}.webp')) for i in range(4)): return []
    from PIL import Image
    out = []
    for i in range(4):
        f = os.path.join(d, f'{i}.webp'); w, h = Image.open(f).size
        out.append((w, h, base64.b64encode(open(f, 'rb').read()).decode()))
    return out

def art_js(app):
    L = art_list(app)
    if not L: return "const HERO_ART=[];\n"
    # 그림은 한 번만 풀어서 짧은 blob 주소로 씁니다 (화면을 다시 그릴 때마다 긴 글자를 붙이지 않도록)
    items = ','.join(f"['{b}',{w},{h}]" for w, h, b in L)
    return ("const HERO_ART=[" + items + "].map(([b,w,h])=>{try{const s=atob(b),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);"
            "return{u:URL.createObjectURL(new Blob([a],{type:'image/webp'})),w,h}}catch(e){return{u:'data:image/webp;base64,'+b,w,h}}});\n")

def skin_js(app):
    return (SKINJS_A + "\n/* 디자인 형식: 1타입 히어로(지금 그대로) · 2타입 럭셔리 · 3타입 그림 히어로(럭셔리 바탕 + tools/hero_art 그림) — S.cfg.skin 에 저장 */\n"
            f"const SKIN_HEX={{'2':{HEX[app]!r},'3':{HEX[app]!r}}};\n"
            + art_js(app) +
            "function skinOf(){const v=S&&S.cfg&&S.cfg.skin;return v==='3'&&HERO_ART.length?'3':v==='2'||v==='3'?'2':'1'}\n"
            "function lux(){return skinOf()!=='1'}\n"
            "function applySkin(){const k=skinOf(),el=document.documentElement,b=k==='3'?'2':k,ph=k==='3'?'1':'0';if(el.dataset.skin!==b)el.dataset.skin=b;if(el.dataset.photo!==ph)el.dataset.photo=ph;"
            "HEROES.forEach((h,i)=>{if(h.hex0==null)h.hex0=h.hex;h.hex=SKIN_HEX[k]?SKIN_HEX[k][i]:h.hex0})}\n"
            "if(typeof heroFig==='function'&&HERO_ART.length){const _hf=heroFig;heroFig=function(i,cls='',mode='ready'){const a=skinOf()==='3'&&HERO_ART[i];if(!a)return _hf.apply(this,arguments);"
            "return`<svg class=\"hf photo ${cls}\" data-mode=\"${mode}\" viewBox=\"0 0 ${a.w} ${a.h}\" preserveAspectRatio=\"xMidYMax meet\" role=\"img\" aria-label=\"${esc(heroName(i))}\"><image href=\"${a.u}\" width=\"${a.w}\" height=\"${a.h}\"/></svg>`}}\n"
            "let _skinK='',_skinPh='';\n"
            "function lxSweep(){if(!lux()||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const o=document.createElement('div');o.className='lxscan';document.body.appendChild(o);setTimeout(()=>o.remove(),1700)}\n"
            "function skinEnter(){const b=document.getElementById('board');if(!b)return;"
            "const k=[S.board,S.dkey,S.cur&&S.cur.r,S.cur&&S.cur.h,typeof slideIx!=='undefined'?slideIx:''].join('|');if(k!==_skinK){_skinK=k;b.classList.add('enter')}"
            "const ph=typeof R!=='undefined'&&R?R.phase:'';if(ph==='running'&&_skinPh!=='running'&&S.board==='live'){b.classList.remove('enter');b.classList.add('ignite');lxSweep()}_skinPh=ph}\n"
            "function lxGlitter(n){if(!lux()||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const o=document.createElement('div');o.className='lxglit';"
            "const K=['#e6cf9f','#c9a96e','#f3e2bd','#d7dbe0'];let h='';for(let i=0;i<Math.min(90,Math.max(24,n/3|0));i++){h+=`<i style=\"left:${(Math.random()*100).toFixed(1)}vw;--s:${(.25+Math.random()*.45).toFixed(2)}vw;--k:${K[i%4]};--d:${(3.2+Math.random()*2.6).toFixed(2)}s;--w:${(Math.random()*1.4).toFixed(2)}s\"></i>`}"
            "o.innerHTML=h;document.body.appendChild(o);setTimeout(()=>o.remove(),7200)}\n"
            "if(typeof confetti==='function'){const _cf=confetti;confetti=function(n,lane){if(lux())return lxGlitter(n||100);return _cf.apply(this,arguments)}}\n"
            "if(typeof runFx==='function'){const _rf=runFx;runFx=function(name,arg){if(lux()&&(name==='bolt'||name==='champion')){playLocal(name==='champion'?'fanfare':'thunder');if(!boardVisible())return;lxSweep();if(name==='champion'||(arg&&arg.big))lxGlitter(name==='champion'?260:110);return}return _rf.apply(this,arguments)}}\n"
            "if(typeof powerUp==='function'){const _pu=powerUp;powerUp=function(){if(!lux())return _pu.apply(this,arguments);if(!boardVisible())return;playLocal('fanfare');"
            "const o=document.createElement('div');o.className='pwov';o.innerHTML=`<div class=\"pwt\"><b>FINAL</b><span>${esc(t('final'))}</span></div>`;document.body.appendChild(o);setTimeout(()=>o.remove(),3300);lxSweep();lxGlitter(160)}}\n"
            + SKINJS_B + "\n")

def patch(path, app):
    s = open(path, encoding='utf-8').read()
    for a, b in ((OLD_A, OLD_B), (A, B)):
        s = re.sub(re.escape(a) + r'.*?' + re.escape(b) + r'\n?', '', s, flags=re.S)
    s = re.sub(re.escape(SKINJS_A) + r'.*?' + re.escape(SKINJS_B) + r'\n', '', s, flags=re.S)
    s = s.replace('&family=Lilita+One', '')
    k = s.index('fonts.googleapis.com/css2'); e = s.index('&display=swap', k)
    fam = s[k:e]
    add = ''
    if 'Saira' not in fam: add += '&family=Saira:wght@200;300;400;500'
    if 'Noto+Sans+KR:wght@300' not in fam: s = s.replace('Noto+Sans+KR:wght@500;700;900', 'Noto+Sans+KR:wght@300;400;500;700;900', 1)
    if add:
        e = s.index('&display=swap', k); s = s[:e] + add + s[e:]
    styles = re.findall(r'<style>(.*?)</style>', s, flags=re.S)
    gen = [walk(tinycss2.parse_stylesheet(c, skip_whitespace=True, skip_comments=True)) for c in styles]
    block = (A + '\n/* 디자인 형식 2타입 · 럭셔리 — tools/hero_skins.py 가 만든 부분입니다 (아래 자동 규칙은 1타입 CSS에서 만듦). 1타입 CSS를 고친 뒤 다시 실행하세요. */\n'
             + f'{PRE}{{{TOKENS[app]}}}\n' + '\n'.join(g for g in gen if g) + '\n' + (LUX % {'P': PRE}) + PHOTO_CSS + UI_CSS + B + '\n')
    last = max(m.start() for m in re.finditer('</style>', s))
    s = s[:last] + block + s[last:]
    s = s.replace("function render(){applySkin();", skin_js(app) + "function render(){applySkin();", 1) if "function render(){applySkin();" in s else s.replace("function render(){", skin_js(app) + "function render(){applySkin();", 1)
    if "function renderBoard(){applySkin();" not in s: s = s.replace("function renderBoard(){", "function renderBoard(){applySkin();", 1)
    if "\n  skinEnter();" not in s:
        i = s.index("function renderBoard(){applySkin();"); j = s.index("\n}\n", i)
        s = s[:j] + "\n  skinEnter();" + s[j:]
    sw = ("<div class=\"skinsw\" role=\"group\" aria-label=\"${esc(S.lang==='en'?'Design type':'디자인 형식')}\" data-l=\"🎨\" title=\"${esc(S.lang==='en'?'Design type: 1 Hero · 2 Luxury':'디자인 형식: 1타입 히어로 · 2타입 럭셔리 · 3타입 그림 히어로')}\">"
          "${[['1','히어로 (지금 그대로)','Hero'],['2','럭셔리','Luxury']].concat(HERO_ART.length?[['3','그림 히어로 (럭셔리 + 그림 캐릭터)','Hero art']]:[]).map(([v,d,e])=>`<button data-act=\"skin\" data-v=\"${v}\" title=\"${esc(S.lang==='en'?e:d)}\" aria-pressed=\"${skinOf()===v}\">${v}</button>`).join('')}</div>")
    s, n = re.subn(r'<div class="skinsw".*?</div>(?=\n)', lambda m: sw, s, count=1, flags=re.S)
    assert n == 1, (path, 'skinsw')
    s, n = re.subn(r"    case'skin':[^\n]*\n", "    case'skin':S.cfg.skin=v==='2'||v==='3'?v:'1';applySkin();commit();break;\n", s, count=1)
    assert n == 1, (path, 'case skin')
    open(path, 'w', encoding='utf-8').write(s)
    print('ok', path, 'lines', block.count('\n'))

patch(sys.argv[1], 'hero'); patch(sys.argv[2], 'hero2')
