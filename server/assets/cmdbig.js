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
  const BIG=APPK==='kyorugi'?{start1:'시작',stop:'그만'}:{attn:'차렷',bow:'경례',ready:'준비',start:'시작',stop:'바로'};
  const SHOW_MS=1600,REST_AT=3600;   /* 「바로」 소리(약 0.6초) + 3초 쉬고 「쉬어」 */
  const isDisp=()=>{try{const r=g('routeNow');return typeof r==='function'&&r()==='display';}catch(e){return false;}};
  const enabled=()=>{try{const S=g('S');return !(S&&S.settings&&S.settings.bigCmd===false);}catch(e){return true;}};
  let last=null,box=null,hideT=0,restT=0;
  function el(){if(!box||!box.isConnected){box=document.createElement('div');box.id='ksCmdBig';box.setAttribute('data-noi18n','');box.innerHTML='<span></span>';document.body.appendChild(box);}return box;}
  function show(t){const b=el();b.firstChild.textContent=t;b.classList.remove('on');void b.offsetWidth;b.classList.add('on');
    clearTimeout(hideT);hideT=setTimeout(()=>b.classList.remove('on'),SHOW_MS);}
  function hide(){clearTimeout(hideT);clearTimeout(restT);if(box)box.classList.remove('on');}
  function tick(){
    if(!isDisp()){hide();return;}
    let vc=null;try{const st=g('ST')();vc=st&&st.voice;}catch(e){return;}
    const key=vc&&vc.k?vc.k+'@'+(vc.at||0):'';
    if(last===null){last=key;return;}          /* 화면을 처음 열 때 남아 있던 구령은 띄우지 않음 */
    if(key===last)return;last=key;
    if(!vc||!enabled())return;
    const t=BIG[vc.k];if(!t)return;
    clearTimeout(restT);show(t);
    if(vc.k==='stop'&&APPK!=='kyorugi')restT=setTimeout(()=>{if(last===key&&isDisp()&&enabled())show('쉬어');},REST_AT);
  }
  /* v1.7.54 또렷하고 고급스럽게: 빛 번짐·흐림 없앰 → 진한 띠 위에 금빛 글씨 + 굵은 테두리 + 금색 가는 선 */
  try{if(!document.querySelector('link[href="/vendor/fonts/themes.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/vendor/fonts/themes.css';document.head.appendChild(l);}}catch(e){}
  const css=`#ksCmdBig{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;visibility:hidden;background:rgba(3,4,8,.55);transition:opacity .15s ease,visibility 0s linear .15s}
#ksCmdBig.on{opacity:1;visibility:visible;transition:opacity .06s ease}
#ksCmdBig::before{content:"";position:absolute;left:0;right:0;top:50%;height:min(62vh,46vw);transform:translateY(-50%);background:linear-gradient(180deg,rgba(6,7,12,.96),rgba(14,13,10,.97) 50%,rgba(6,7,12,.96));box-shadow:0 -3px 0 #D9B45F,0 3px 0 #D9B45F,0 0 0 1px rgba(0,0,0,.6),0 30px 80px rgba(0,0,0,.6)}
#ksCmdBig span{position:relative;font:400 min(30vw,50vh)/1 "Black Han Sans","Malgun Gothic","Noto Sans KR",sans-serif;letter-spacing:.06em;white-space:nowrap;padding:0 .08em;
  background:linear-gradient(180deg,#FFFFFF 0%,#FFF6DA 30%,#F6D27A 58%,#D9A441 78%,#B8862E 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;
  -webkit-text-stroke:3px #2A1E08;paint-order:stroke fill;filter:drop-shadow(0 8px 0 rgba(0,0,0,.55))}
#ksCmdBig.on span{animation:ksCmdIn .22s cubic-bezier(.2,1.3,.4,1) both}
@keyframes ksCmdIn{from{transform:scale(1.18);opacity:0}to{transform:none;opacity:1}}
#ksCmdBig.on::before{animation:ksCmdBand .2s ease-out both}
@keyframes ksCmdBand{from{transform:translateY(-50%) scaleY(.2)}to{transform:translateY(-50%) scaleY(1)}}
/* 예전 전광판별 구령 글씨는 이 모듈로 대신합니다 */
.cmdov{display:none!important}`;
  const st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st);
  setInterval(tick,120);
  window.KS_CMDBIG={show,hide};
})();
