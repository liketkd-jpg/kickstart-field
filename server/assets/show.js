/* v1.7.22 「점수 뒤 전광판」 (품새·격파·겨루기 전광판 공통)
   경기 점수 공개가 끝나고 정한 초가 지나면, 전광판에 본부가 정한 순서대로
     🏆 대회 이름 → 🤝 후원사(그림마다) → 🅰 코트 이름
   을 보여 줍니다. 마지막 화면(보통 코트 이름)은 다음 경기를 부를 때까지 그대로 떠 있고,
   운영석에서 다음 선수·경기를 부르면 곧바로 사라지고 경기 화면으로 돌아갑니다.
   설정은 본부 「📺 점수 뒤 전광판」에서 (/api/show) — 꺼져 있으면 아무것도 안 함. */
(function(){
  if(!window.KS_FIELD||window.KS_SHOW)return;
  const APPK=location.pathname.split('/').filter(Boolean)[0]||'';
  if(!/^(poomsae|gyeokpa|kyorugi)$/.test(APPK))return;
  const g=n=>{try{return (0,eval)(n);}catch(e){return undefined;}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let CFG=null,AT=0,K='',T0=0,box=null,shown='';
  async function pull(){try{const r=await fetch('/api/show'+(AT?'?at='+AT:''),{cache:'no-store'});const j=await r.json();
    if(j.show){CFG=typeof j.show==='string'?JSON.parse(j.show):j.show;AT=j.at||0;shown='';}else if(!j.at){CFG=null;AT=0;}}catch(e){}}
  const isDisp=()=>{const rn=g('routeNow');try{return typeof rn==='function'&&rn()==='display';}catch(e){return false;}};
  /* 지금 「점수 공개가 끝난」 상태인지 + 그 경기 열쇠 + 끝난 시각 */
  function state(){const ST=g('ST');if(typeof ST!=='function')return null;const st=ST()||{};
    if(APPK==='kyorugi'){if(st.phase!=='end')return {done:false};return {done:true,key:[st.matchId||st.mid||st.id||'',st.epoch||0,st.endedAt||0].join('#'),t0:st.endedAt||0};}
    if(st.status!=='revealed')return {done:false};let c=null;try{c=g('curOf')();}catch(e){}
    return {done:true,key:[c&&(c.callId||c.perfId)||'',st.epoch||0,st.revealedAt||0].join('#'),t0:st.revealedAt||0};}
  /* 순서 → 화면 목록 [{k,sec,img,name}] (후원사는 그림마다 한 장) */
  function plan(){const C=CFG||{},out=[];(C.steps||[]).forEach(s=>{if(!s||s.on===false)return;
      if(s.k==='spon')(C.sponsors||[]).filter(x=>x&&x.img).forEach(x=>out.push({k:'spon',sec:Math.max(2,+s.sec||5),img:x.img,name:x.name||''}));
      else if(s.k==='comp'||s.k==='court')out.push({k:s.k,sec:Math.max(2,+s.sec||5)});});return out;}
  function hide(){if(box){box.remove();box=null;}shown='';}
  function html(p){const C=CFG||{},court=String((window.KS_FIELD&&KS_FIELD.court)||'').trim();
    const logo=C.logo?`<div class="kss-logo"><img src="${esc(C.logo)}" alt=""><i></i></div>`:'';
    if(p.k==='comp')return `<div class="kss-comp"><div class="kss-rays"></div>${logo}<span class="kss-l">${esc(C.label||'KICKSTART UP')}</span><h1 class="kss-shine">${esc(C.title||'태권도 대회').replace(/\n/g,'<br>')}</h1>${C.sub?`<p>${esc(C.sub)}</p>`:''}</div>`;
    if(p.k==='spon')return `<div class="kss-spon"><span class="kss-l">${esc(C.sponLabel||'OFFICIAL SPONSOR · 후원')}</span><div class="kss-card"><img src="${p.img}" alt=""></div>${p.name?`<b>${esc(p.name)}</b>`:''}</div>`;
    return `<div class="kss-court"><div class="kss-flash"></div><div class="kss-ring"></div><div class="kss-ring r2"></div>${C.logo?`<div class="kss-logo sm"><img src="${esc(C.logo)}" alt=""><i></i></div>`:''}<div class="kss-big kss-shine">${esc(court||'—')}</div><span class="kss-n"><b>${esc(court)}</b> 코트 <small>COURT</small></span><p>${esc(C.wait||'다음 경기를 준비하고 있습니다')}</p></div>`;}
  function tick(){
    if(!CFG||!CFG.on||!isDisp()){hide();return;}
    try{if(window.KS_SIM&&KS_SIM.running){hide();return;}}catch(e){}
    const s=state();if(!s||!s.done){K='';hide();return;}
    if(s.key!==K){K=s.key;T0=s.t0||Date.now();hide();}
    const el=Date.now()-T0-Math.max(0,+CFG.after||12)*1000;if(el<0){hide();return;}
    const P=plan();if(!P.length){hide();return;}
    let acc=0,i=0;for(;i<P.length-1;i++){if(el<acc+P[i].sec*1000)break;acc+=P[i].sec*1000;}   /* 마지막 화면은 다음 경기까지 그대로 */
    const id=K+'|'+i+'|'+AT;if(id===shown&&box)return;shown=id;
    if(!box){box=document.createElement('div');box.id='ksShow';box.setAttribute('data-noi18n','');document.body.appendChild(box);}
    box.innerHTML=`<div class="kss-in">${html(P[i])}</div>`;}
  const css=`#ksShow{position:fixed;inset:0;z-index:99990;background:radial-gradient(120% 90% at 50% 40%,#17171f,#040406 70%);color:#F6F1E6;font-family:"Noto Sans KR","Malgun Gothic",sans-serif;overflow:hidden;cursor:default}
#ksShow .kss-in{position:absolute;inset:0;display:grid;place-items:center;animation:kssIn .7s cubic-bezier(.2,.9,.3,1) both}
@keyframes kssIn{from{opacity:0;transform:scale(1.06);filter:blur(10px)}to{opacity:1;transform:none;filter:none}}
#ksShow .kss-l{display:block;font:800 clamp(14px,1.6vw,28px) Archivo,"Noto Sans KR",sans-serif;letter-spacing:.42em;color:#C9A262;text-align:center}
#ksShow .kss-shine{background:linear-gradient(100deg,#B8862E 0%,#F2D27A 30%,#FFF6D8 45%,#F2D27A 60%,#B8862E 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:kssShine 3.2s linear infinite}
@keyframes kssShine{from{background-position:120% 0}to{background-position:-120% 0}}
#ksShow .kss-comp{position:relative;text-align:center;padding:0 6vw}
#ksShow .kss-comp h1{margin:2vh 0 1.5vh;font-weight:900;font-size:clamp(40px,6.4vw,140px);line-height:1.15;word-break:keep-all;filter:drop-shadow(0 6px 30px rgba(242,210,122,.25))}
#ksShow .kss-comp p{margin:0;font-size:clamp(18px,2.2vw,44px);color:#D9CFBC;font-weight:700}
#ksShow .kss-rays{position:absolute;left:50%;top:50%;width:160vmax;height:160vmax;transform:translate(-50%,-50%);background:repeating-conic-gradient(from 0deg,rgba(242,210,122,.07) 0 6deg,transparent 6deg 18deg);animation:kssRot 40s linear infinite;z-index:-1;mask:radial-gradient(circle,#000 0 25%,transparent 60%);-webkit-mask:radial-gradient(circle,#000 0 25%,transparent 60%)}
@keyframes kssRot{to{transform:translate(-50%,-50%) rotate(360deg)}}
#ksShow .kss-spon{display:flex;flex-direction:column;align-items:center;gap:3vh;width:100%}
#ksShow .kss-card{width:min(70vw,1300px);height:58vh;background:#fff;border-radius:28px;display:grid;place-items:center;padding:4vh 4vw;box-shadow:0 30px 90px rgba(0,0,0,.6),0 0 0 4px rgba(201,162,98,.6)}
#ksShow .kss-card img{max-width:100%;max-height:100%;object-fit:contain}
#ksShow .kss-spon b{font-size:clamp(22px,2.6vw,52px);font-weight:900}
#ksShow .kss-court{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%}
#ksShow .kss-logo{position:relative;display:inline-block;background:linear-gradient(180deg,#fff,#EEF1F6);border-radius:22px;padding:1.4vh 2vw;box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 0 3px rgba(201,162,98,.75),0 0 60px rgba(242,210,122,.25);overflow:hidden;margin-bottom:3vh;animation:kssPop .9s cubic-bezier(.2,1.4,.4,1) both}
#ksShow .kss-logo img{display:block;height:clamp(90px,17vh,240px);width:auto;max-width:78vw;object-fit:contain}
#ksShow .kss-logo i{position:absolute;top:0;bottom:0;width:35%;left:-40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.85),transparent);transform:skewX(-20deg);animation:kssSweep 3.6s ease-in-out infinite 1s}
@keyframes kssSweep{0%{left:-40%}55%,100%{left:120%}}
#ksShow .kss-logo.sm{position:absolute;top:2.4vh;left:50%;transform:translateX(-50%);padding:.8vh 1.2vw;margin:0;border-radius:14px;animation:none;z-index:2}
#ksShow .kss-logo.sm img{height:clamp(56px,11vh,150px)}
#ksShow .kss-big{font:900 clamp(260px,64vh,900px) Archivo,"Noto Sans KR",sans-serif;line-height:.9;margin-top:6vh;-webkit-text-stroke:2px rgba(255,240,200,.35);animation:kssShine 3.2s linear infinite,kssPop .9s cubic-bezier(.2,1.5,.4,1) both;filter:drop-shadow(0 0 40px rgba(242,210,122,.45))}
@keyframes kssPop{from{transform:scale(.3);opacity:0;filter:blur(18px)}to{transform:none;opacity:1}}
#ksShow .kss-n{font-size:clamp(40px,8vh,120px);font-weight:900;margin-top:.5vh;line-height:1.1;letter-spacing:.04em}#ksShow .kss-n b{color:#F2D27A}#ksShow .kss-n small{font:800 clamp(16px,2.6vh,40px) Archivo,sans-serif;letter-spacing:.4em;color:#C9A262;margin-left:.6em;vertical-align:middle}
#ksShow .kss-court p{margin:1.4vh 0 0;font-size:clamp(18px,3vh,44px);color:#CFC6B4;font-weight:700;animation:kssBlink 2.4s ease-in-out infinite}
@keyframes kssBlink{50%{opacity:.45}}
#ksShow .kss-flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,#fff,rgba(255,240,200,.6) 30%,transparent 70%);animation:kssFlash 1.1s ease-out both;pointer-events:none}
@keyframes kssFlash{0%{opacity:1}100%{opacity:0}}
#ksShow .kss-ring{position:absolute;left:50%;top:50%;width:56vh;height:56vh;border:4px solid rgba(242,210,122,.7);border-radius:50%;transform:translate(-50%,-50%) scale(.2);animation:kssRing 2.6s ease-out infinite}
#ksShow .kss-ring.r2{animation-delay:1.3s}
@keyframes kssRing{0%{opacity:.9;transform:translate(-50%,-50%) scale(.2)}100%{opacity:0;transform:translate(-50%,-50%) scale(3.2)}}
@media (prefers-reduced-motion:reduce){#ksShow *{animation:none!important}}`;
  const st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st);
  pull();setInterval(pull,8000);setInterval(tick,300);
  window.KS_SHOW={get cfg(){return CFG;},hide};
})();
