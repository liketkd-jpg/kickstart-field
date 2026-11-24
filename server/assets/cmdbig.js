/* v1.7.53 구령 큰 글씨 (품새·격파·겨루기 전광판 공통 · 모든 전광판 디자인 · 팀 경연·태권체조 포함)
   - 운영석에서 구령(차렷·경례·준비·시작·바로)을 내면 전광판 맨 앞에 큰 글씨가 1.6초 뜹니다.
   - 「바로」 뒤에는 「쉬어」 소리에 맞춰 「쉬어」 글씨도 뜹니다. (겨루기는 「시작」·「그만」)
   - 예전에는 전광판이 「구령 시각」과 자기 시계를 비교해서 띄웠기 때문에, 전광판 컴퓨터 시계가 다르거나
     전광판 디자인을 바꾸면 글씨가 안 나올 수 있었습니다. 이제는 「새 구령이 들어왔는지」만 보고 띄웁니다.
   - 대회 설정 「전광판 구령 큰 글씨」에서 끌 수 있습니다 (settings.bigCmd === false 이면 안 띄움). */
(function(){
  if(window.KS_CMDBIG)return;
  const APPK=location.pathname.split('/').filter(Boolean)[0]||'';
  if(!/^(poomsae|gyeokpa|kyorugi)$/.test(APPK))return;
  const g=n=>{try{return (0,eval)(n);}catch(e){return undefined;}};
  const BIG=APPK==='kyorugi'?{start1:'시작',stop:'그만'}:{enter:'출전',attn:'차렷',bow:'경례',ready:'준비',start:'시작',stop:'바로'};
  const SHOW_MS=1600,REST_AT=3600;   /* 「바로」 소리(약 0.6초) + 3초 쉬고 「쉬어」 */
  const isDisp=()=>{try{const r=g('routeNow');return typeof r==='function'&&r()==='display';}catch(e){return false;}};
  const enabled=()=>{try{const S=g('S');return !(S&&S.settings&&S.settings.bigCmd===false);}catch(e){return true;}};
  let last=null,box=null,hideT=0,restT=0;
  function el(){if(!box||!box.isConnected){box=document.createElement('div');box.id='ksCmdBig';box.setAttribute('data-noi18n','');box.innerHTML='<span></span>';document.body.appendChild(box);}return box;}
  function show(t,k){const b=el();b.firstChild.textContent=t;b.classList.remove('on');b.classList.toggle('ent',k==='enter');void b.offsetWidth;b.classList.add('on');
    clearTimeout(hideT);hideT=setTimeout(()=>b.classList.remove('on'),k==='enter'?2400:SHOW_MS);}
  function hide(){clearTimeout(hideT);clearTimeout(restT);if(box)box.classList.remove('on');}
  function tick(){
    if(!isDisp()){hide();return;}
    let vc=null;try{const st=g('ST')();vc=st&&st.voice;}catch(e){return;}
    const key=vc&&vc.k?vc.k+'@'+(vc.at||0):'';
    if(last===null){last=key;return;}          /* 화면을 처음 열 때 남아 있던 구령은 띄우지 않음 */
    if(key===last)return;last=key;
    if(!vc||!enabled())return;
    const t=BIG[vc.k];if(!t)return;
    clearTimeout(restT);show(t,vc.k);
    if(vc.k==='stop'&&APPK!=='kyorugi')restT=setTimeout(()=>{if(last===key&&isDisp()&&enabled())show('쉬어');},REST_AT);
  }
  /* v1.7.58 다시 네모 상자: 화면 가운데 진한 상자 안에 큰 흰 글씨가 떴다가 사라짐 (배경 화면과 섞이지 않게) · 빛 번짐 없음 */
  try{if(!document.querySelector('link[href="/vendor/fonts/themes.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/vendor/fonts/themes.css';document.head.appendChild(l);}}catch(e){}
  const css=`#ksCmdBig{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;visibility:hidden;background:none;transition:opacity .15s ease,visibility 0s linear .15s}
#ksCmdBig.on{opacity:1;visibility:visible;transition:opacity .06s ease}
#ksCmdBig span{position:relative;display:block;font:400 min(26vw,44vh)/1 "Black Han Sans","Malgun Gothic","Noto Sans KR",sans-serif;letter-spacing:.08em;white-space:nowrap;color:#fff;
  padding:min(3.2vw,5.5vh) min(6vw,10vh) min(3.6vw,6vh);border-radius:min(2.4vw,4vh);background:#080A12;
  border:min(.35vw,.6vh) solid rgba(255,255,255,.9);box-shadow:0 0 0 min(.9vw,1.5vh) rgba(8,10,18,.55),0 min(2vw,3.5vh) min(6vw,10vh) rgba(0,0,0,.6)}
#ksCmdBig.on span{animation:ksCmdIn .24s cubic-bezier(.2,1.3,.4,1) both}
/* v1.7.75 「출전」만 연한 다홍빛 상자 · 작게 시작해 화면 가득 커지며 테두리가 은은하게 빛남 */
#ksCmdBig.ent{background:radial-gradient(ellipse at center,rgba(255,120,100,.28),rgba(0,0,0,0) 70%)}
#ksCmdBig.ent span{background:linear-gradient(160deg,#FF8A7A,#F2624F 55%,#D9483A);color:#fff;border-color:#FFE3DC;text-shadow:0 min(.5vw,.8vh) min(1.4vw,2.4vh) rgba(120,20,10,.45);
  box-shadow:0 0 0 min(.9vw,1.5vh) rgba(255,138,122,.35),0 0 min(6vw,10vh) rgba(255,110,90,.75),0 min(2vw,3.5vh) min(6vw,10vh) rgba(0,0,0,.5)}
#ksCmdBig.ent.on span{animation:ksEntIn 1s cubic-bezier(.16,1,.3,1) both,ksEntGlow 1.2s ease-in-out .9s infinite alternate}
@keyframes ksEntIn{0%{transform:scale(.18);opacity:0}25%{opacity:1}100%{transform:scale(1.08);opacity:1}}
@keyframes ksEntGlow{from{box-shadow:0 0 0 min(.9vw,1.5vh) rgba(255,138,122,.35),0 0 min(4vw,7vh) rgba(255,110,90,.55),0 min(2vw,3.5vh) min(6vw,10vh) rgba(0,0,0,.5)}to{box-shadow:0 0 0 min(1.4vw,2.4vh) rgba(255,138,122,.5),0 0 min(9vw,15vh) rgba(255,110,90,.95),0 min(2vw,3.5vh) min(6vw,10vh) rgba(0,0,0,.5)}}
@keyframes ksCmdIn{from{transform:scale(.82);opacity:0}to{transform:none;opacity:1}}
html body .cmdov,html body .cmdov.cmdtop,html body div.cmdov{display:none!important;visibility:hidden!important}
/* v1.7.77 구령 단추: 짙은 남색 바탕으로 통일, 글씨·얇은 테두리만 은은한 색 (출전 금빛 · 차렷·경례 은빛 · 준비·시작 청록 · 바로·쉬어 자줏빛 붉은색)
   지금 눌러야 할 단추(다음 차례)는 제 색이 살짝 번지고, 누를 수 없는 단추는 흐리게 */
html body .btn.btn:is([data-act="cmdEnter"],[data-act="cmdBow"],[data-act="cmdReady"],[data-act="timerStop"],[data-act="timerReset"]){
  --kc:201,209,220;background:linear-gradient(180deg,#17243F,#0F192E)!important;color:rgb(var(--kc))!important;border:1.5px solid rgba(var(--kc),.55)!important;
  font-weight:800!important;letter-spacing:.01em;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 2px 6px rgba(0,0,0,.25)!important;text-shadow:none!important;transition:background .2s,border-color .2s,box-shadow .2s,opacity .2s}
html body .btn.btn[data-act="cmdEnter"]{--kc:217,179,106}
html body .btn.btn[data-act="cmdBow"]{--kc:201,209,220}
html body .btn.btn[data-act="cmdReady"]{--kc:63,191,176}
html body .btn.btn[data-act="timerStop"]{--kc:200,88,122}
html body .btn.btn[data-act="timerReset"]{--kc:140,152,176;border-color:rgba(140,152,176,.35)!important}
html body .btn.btn:is([data-act="cmdEnter"],[data-act="cmdBow"],[data-act="cmdReady"],[data-act="timerStop"]):not(:disabled):hover{border-color:rgb(var(--kc))!important;background:linear-gradient(180deg,rgba(var(--kc),.14),rgba(var(--kc),.05)),#13203A!important}
html body .btn.btn:is([data-act="cmdBow"],[data-act="cmdReady"]):is(.primary,.armed):not(:disabled),html body .btn.btn[data-act="timerStop"].stopb:not(:disabled){
  background:linear-gradient(180deg,rgba(var(--kc),.26),rgba(var(--kc),.10)),#13203A!important;border-color:rgb(var(--kc))!important;color:#fff!important;
  box-shadow:0 0 0 1px rgba(var(--kc),.35),0 6px 18px rgba(var(--kc),.22),inset 0 1px 0 rgba(255,255,255,.10)!important}
html body .btn.btn:is([data-act="cmdEnter"],[data-act="cmdBow"],[data-act="cmdReady"],[data-act="timerStop"],[data-act="timerReset"]):disabled{opacity:.38!important;border-color:rgba(var(--kc),.25)!important;box-shadow:none!important}
`;
  const st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st);
  setInterval(tick,120);
  window.KS_CMDBIG={show,hide};
})();
