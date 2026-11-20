import sys,re
for f in sys.argv[1:]:
    s=open(f).read()
    # ---------- 3. 한 조 인원 ----------
    old_cs=re.search(r"function commSizes\(n\)\{const G=4;[^\n]*\n",s).group(0)
    s=s.replace(old_cs,"""function grpN(){const v=parseInt(S.cfg&&S.cfg.grpN);return v===2||v===3?v:4}
function commSizes(n,G=grpN()){ // 한 조 인원 G(2·3·4)명. 딱 안 나누어지면 조 크기가 고르게 (한 조는 레인 4개를 넘지 않음)
  if(n<=G)return n?[n]:[];let k=G>=4?Math.ceil(n/G):Math.max(1,Math.floor(n/G));if(Math.ceil(n/k)>4)k=Math.ceil(n/4);
  const b=Math.floor(n/k),x=n%k;return Array.from({length:k},(_,i)=>b+(i<x?1:0))}
""",1)
    # 설정 칸
    old_ui="${isComm()?`<label class=\"chk\" style=\"margin-top:8px\"><input type=\"checkbox\" id=\"sepT\""
    assert old_ui in s
    s=s.replace(old_ui,"${isComm()?`<label class=\"f\" style=\"width:11rem;margin-top:8px\">${esc(t('grpN'))}<select id=\"grpN\" data-in=\"cfg.grpN\" ${commAnyRes()?'disabled':''}>${[2,3,4].map(n=>`<option value=\"${n}\" ${grpN()===n?'selected':''}>${esc(t('grpNn',{n}))}</option>`).join('')}</select></label><p class=\"note\">${esc(t('grpND'))}</p>`:''}\n    "+old_ui,1)
    s=s.replace("if(k==='perHeat')val=parseInt(val)||2;","if(k==='perHeat')val=parseInt(val)||2;\n  if(k==='cfg.grpN')val=parseInt(val)||4;",1)
    s=s.replace("if((k==='mode'||k==='cfg.sepT')&&","if((k==='mode'||k==='cfg.sepT'||k==='cfg.grpN')&&",1)
    # 글자
    s=s.replace("sepT:'같은 소속 떨어뜨리기',","grpN:'한 조 인원',grpNn:'{n}명씩',grpND:'조를 몇 명씩 나눌지 고릅니다. 딱 나누어떨어지지 않으면 조마다 인원이 고르게 되도록 한 명씩 더 넣습니다 (한 조는 최대 4명).',sepT:'같은 소속 떨어뜨리기',",1)
    s=s.replace("sepT:'Spread out the same dojang',","grpN:'Kids per group',grpNn:'{n} per group',grpND:'How many kids run together in a group. If it does not divide evenly, groups are kept as even as possible (max 4 per group).',sepT:'Spread out the same dojang',",1)
    s=s.replace("mComm:'생활체육 4명 1조 + 왕중왕전'","mComm:'생활체육 조 경기 + 왕중왕전'",1)
    s=s.replace("mCommD:'4명씩 조를 나눠","mCommD:'2·3·4명씩 조를 나눠",1)
    s=s.replace("mComm:'Groups of 4 + Champion of Champions'","mComm:'Group races + Champion of Champions'",1)
    s=s.replace("mCommD:'Kids run once in groups of 4.","mCommD:'Kids run once in groups of 2, 3 or 4.",1)
    # ---------- 2. 전광판 빛·흔들림 효과 ----------
    if '/* LFX:START */' not in s:
        js="""/* LFX:START — 전광판 빛·흔들림 효과 (1·2타입): 자세가 바뀔 때 번쩍, 달릴 때 빛줄기, 도착 때 흔들림·충격파, 1등 빛 */
const LFX=new WeakMap();
function lfxOf(h,i,mode){let m=LFX.get(h);if(!m){m=[];LFX.set(h,m)}const r=m[i],now=Date.now();
  if(!r){m[i]={m:mode,t:0,k:''};return{c:'',d:0}}
  if(r.m!==mode){r.k=/^p1/.test(mode)?'win':/^(p[234]|kiai)/.test(mode)?'hit':/^run/.test(mode)?'go':'';r.m=mode;r.t=now}
  const el=now-r.t;return(!r.k||el>1800)?{c:'',d:0}:{c:' fx-chg fx-'+r.k,d:el}}
const LFX_EL='<div class="lfx" aria-hidden="true"><i class="ls"></i><i class="ls"></i><i class="ls"></i><i class="ls"></i><i class="ls"></i><i class="lrays"></i><i class="lwave"></i><i class="lwave w2"></i><i class="lflash"></i></div>';
/* LFX:END */
"""
        s=s.replace("function boardLive(h){",js+"function boardLive(h){",1)
        o1="    const mode=heroMode(h,i);\n    return`<div class=\"bl ${tm!=null?'fin':''} ${dnf?'dnf':''} ${win?'win':''}\" style=\"--c:var(${H.v})\">"
        assert o1 in s,f
        s=s.replace(o1,"    const mode=heroMode(h,i),fx=lfxOf(h,i,mode);\n    return`<div class=\"bl ${tm!=null?'fin':''} ${dnf?'dnf':''} ${win?'win':''}${fx.c}\" data-m=\"${mode}\" style=\"--c:var(${H.v});--fxd:-${fx.d}ms\">${LFX_EL}",1)
        css=r"""/* LFX:START — 전광판 빛·흔들림 효과 */
.board .bl{isolation:isolate;--fxc:color-mix(in srgb,var(--c) 70%,#fff)}
.board .bl .lfx{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:-1}
.board .bl .lfx i{position:absolute;display:block;opacity:0}
.board .bl[data-m^="run"] .lfx .ls{opacity:1;height:.35vh;width:45%;right:-50%;border-radius:1vh;background:linear-gradient(90deg,transparent,var(--fxc) 60%,#fff);box-shadow:0 0 1vh var(--fxc);animation:lsflow .7s linear infinite}
.board .bl[data-m^="run"] .lfx .ls:nth-child(1){top:20%}
.board .bl[data-m^="run"] .lfx .ls:nth-child(2){top:31%;animation-delay:-.25s;width:35%}
.board .bl[data-m^="run"] .lfx .ls:nth-child(3){top:42%;animation-delay:-.5s}
.board .bl[data-m^="run"] .lfx .ls:nth-child(4){top:53%;animation-delay:-.12s;width:30%}
.board .bl[data-m^="run"] .lfx .ls:nth-child(5){top:63%;animation-delay:-.38s;width:40%}
@keyframes lsflow{from{transform:translateX(0)}to{transform:translateX(-330%)}}
.board .bl.fx-chg .lfx .lflash{opacity:0;inset:-20% -60%;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.75) 50%,transparent 62%);animation:lflash .8s ease-out both;animation-delay:var(--fxd,0ms)}
@keyframes lflash{0%{opacity:1;transform:translateX(-45%)}100%{opacity:0;transform:translateX(45%)}}
.board .bl.fx-hit .lfx .lwave,.board .bl.fx-win .lfx .lwave{left:50%;top:32%;width:30%;aspect-ratio:1;margin-left:-15%;border-radius:50%;border:.5vh solid var(--fxc);box-shadow:0 0 2vh var(--fxc),inset 0 0 2vh var(--fxc);animation:lwave .9s cubic-bezier(.2,.7,.3,1) both;animation-delay:var(--fxd,0ms)}
.board .bl.fx-hit .lfx .lwave.w2,.board .bl.fx-win .lfx .lwave.w2{animation-delay:calc(var(--fxd,0ms) + 150ms)}
@keyframes lwave{0%{opacity:1;transform:scale(.2)}100%{opacity:0;transform:scale(3.6)}}
.board .bl.fx-hit>.hero,.board .bl.fx-hit>.bn{animation:lshake .5s ease-out both;animation-delay:var(--fxd,0ms)}
@keyframes lshake{0%,100%{translate:0 0}15%{translate:-1.2% .4%}30%{translate:1.1% -.4%}45%{translate:-.8% .3%}60%{translate:.6% -.2%}75%{translate:-.3% 0}}
.board .bl.win .lfx .lrays{opacity:1;left:-25%;right:-25%;top:-5%;height:85%;background:linear-gradient(180deg,var(--fxc),transparent 80%);clip-path:polygon(38% 0,62% 0,100% 100%,0 100%);mix-blend-mode:screen;animation:lrays 3.2s ease-in-out infinite}
.board .bl.fx-win .lfx .lrays{animation:lpour 1.2s ease-out both,lrays 3.2s ease-in-out 1.2s infinite;animation-delay:var(--fxd,0ms),calc(var(--fxd,0ms) + 1.2s)}
@keyframes lrays{0%,100%{opacity:.32}50%{opacity:.6}}
@keyframes lpour{0%{opacity:0;transform:translateY(-40%) scaleY(.4)}60%{opacity:.85}100%{opacity:.45;transform:none}}
.podium.p1 .fig{isolation:isolate}
.podium.p1 .fig::before{content:"";position:absolute;left:-25%;right:-25%;top:-35%;bottom:8%;z-index:-1;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 60%,#fff),transparent 80%);clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);mix-blend-mode:screen;opacity:.4;animation:lrays 3.2s ease-in-out infinite;pointer-events:none}
@media (prefers-reduced-motion: reduce){.board .bl .lfx i,.board .bl.fx-hit>.hero,.board .bl.fx-hit>.bn,.podium.p1 .fig::before{animation:none!important}.board .bl .lfx .ls,.board .bl .lfx .lflash,.board .bl .lfx .lwave{display:none}}
/* LFX:END */
"""
        k=s.index('/* SKINS:START */') if '/* SKINS:START */' in s else s.rindex('</style>')
        s=s[:k]+css+s[k:]
    open(f,'w').write(s);print('ok',f)
