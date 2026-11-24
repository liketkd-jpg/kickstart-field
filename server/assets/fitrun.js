/* v1.7.75 경기 진행(운영석) 화면을 스크롤 없이 한 화면에 (품새·격파·겨루기 · 태권체조·팀 경연 포함)
   - 가운데 「지금 경기」 칸의 내용이 칸보다 길면, 내용 전체를 칸 높이에 맞게 줄여서 보여 줍니다 (글씨가 조금 작아짐).
   - 격파 운영석의 전광판 미리보기는 위의 이름·시간·심판 표시와 겹치므로 숨깁니다.
   - 진행 순서·순위 목록처럼 길어질 수 있는 목록 칸은 지금처럼 목록 안에서만 내려 봅니다. */
(function(){
  if(window.KS_FITRUN)return;window.KS_FITRUN=1;
  const APPK=location.pathname.split('/').filter(Boolean)[0]||'';
  if(!/^(poomsae|gyeokpa|kyorugi)$/.test(APPK))return;
  const st=document.createElement('style');
  st.textContent=`body.ks-fitrun .panel.bcur,body.ks-fitrun .panel.bp.grow:has([data-act="timerStop"],[data-act="startRound"]){overflow:hidden!important}
body.ks-fitrun .panel.bcur.run>.mboard{display:none!important}
body.ks-fitrun .panel.bcur>*{transform-origin:top left}
body.ks-fitrun .panel.bcur:has(>.gwho+*+.tbox){display:grid!important;grid-template-columns:minmax(0,.75fr) minmax(0,1.6fr);column-gap:14px;row-gap:8px;align-content:start}
body.ks-fitrun .panel.bcur:has(>.gwho+*+.tbox)>*{grid-column:1/-1}
body.ks-fitrun .panel.bcur:has(>.gwho+*+.tbox)>.gwho{grid-column:1;grid-row:2}
body.ks-fitrun .panel.bcur:has(>.gwho+*+.tbox)>.gwho+*{grid-column:1;grid-row:3;align-self:start}
body.ks-fitrun .panel.bcur:has(>.gwho+*+.tbox)>.tbox{grid-column:2;grid-row:2/4}
body.ks-fitrun .panel.bcur:has(>.gwho+*+.tbox)>.tbox .bcmd{grid-template-columns:repeat(5,minmax(0,1fr))!important}
body.ks-fitrun .panel.bcur:has(>.gwho+*+.tbox)>.tbox .bcmd:not(.b4){grid-template-columns:repeat(4,minmax(0,1fr))!important}
html body.ks-fitrun .panel.bcur:has(>.gwho+*+.tbox)>.tbox .bcmd .btn{min-width:0;padding:8px 4px!important;font-size:clamp(15px,.95vw,18px)!important;white-space:normal;line-height:1.2;word-break:keep-all}`;
  (document.head||document.documentElement).appendChild(st);
  const isRun=()=>/^#?admin-run$/.test((location.hash||'').replace(/^#/,'').split('?')[0])||/admin-run/.test(location.hash);
  let busy=false;
  function fit(){
    if(busy)return;busy=true;
    try{
      const on=isRun()&&innerWidth>=900&&!document.body.classList.contains('jdg')&&!document.body.classList.contains('disp');
      document.body.classList.toggle('ks-fitrun',on);
      if(!on)return;
      document.querySelectorAll('.panel.bcur,.panel.bp.grow:has([data-act="timerStop"],[data-act="startRound"])').forEach(p=>{
        const kids=[...p.children];
        const cur=Number(p.dataset.ksz||1);
        kids.forEach(k=>{k.style.zoom='';});
        const ch=p.clientHeight,sh=p.scrollHeight;
        if(!ch)return;
        let z=1;
        if(sh>ch+2){z=Math.max(.5,Math.floor(ch/sh*100)/100);}
        if(z<1){kids.forEach(k=>{k.style.zoom=z;});
          for(let i=0;i<4&&p.scrollHeight>p.clientHeight+2&&z>.5;i++){z=Math.max(.5,z-.03);kids.forEach(k=>{k.style.zoom=z;});}}
        p.dataset.ksz=z;
      });
    }catch(e){}finally{busy=false;}
  }
  let raf=0;const later=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;fit();});};
  const app=()=>document.getElementById('app');
  const mo=new MutationObserver(later);
  const start=()=>{const a=app();if(a)mo.observe(a,{childList:true,subtree:false});later();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  addEventListener('resize',later);addEventListener('hashchange',later);
  setInterval(later,1500);
})();
