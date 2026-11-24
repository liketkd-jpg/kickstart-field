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
  /* v1.7.77 떨림 없애기: 크기를 1로 되돌렸다가 다시 줄이지 않고, 지난번 배율을 그대로 둔 채
     넘치면 줄이고 · 3% 이상 여유가 생길 때만 키웁니다. 화면이 새로 그려지면 그리기 전에 바로 지난 배율을 씌웁니다. */
  let busy=false;const ZK={},BAD={};
  const keyOf=p=>(p.className||'')+'|'+(location.hash||'');
  const setZ=(kids,z)=>{const v=z===1?'':String(z);kids.forEach(k=>{if(k.style.zoom!==v)k.style.zoom=v;});};
  const over=p=>p.scrollHeight>p.clientHeight+2;
  function fit(){
    if(busy)return;busy=true;
    try{
      const on=isRun()&&innerWidth>=900&&!document.body.classList.contains('jdg')&&!document.body.classList.contains('disp');
      if(document.body.classList.contains('ks-fitrun')!==on)document.body.classList.toggle('ks-fitrun',on);
      if(!on)return;
      document.querySelectorAll('.panel.bcur,.panel.bp.grow:has([data-act="timerStop"],[data-act="startRound"])').forEach(p=>{
        const kids=[...p.children],key=keyOf(p);
        let z=Number(p.dataset.ksz||ZK[key]||1);
        setZ(kids,z);
        const ch=p.clientHeight;if(!ch)return;
        /* v1.7.80 내용 높이는 칸 높이가 아니라 「실제 내용」으로 잼 — scrollHeight는 칸이 내용보다 크면 칸 높이가 나와서
           한 번 줄어든 뒤에 다시 커지지 못하던 문제 (겨루기 화면이 반쪽 크기로 남던 원인) */
        const cs=getComputedStyle(p),pt=parseFloat(cs.paddingTop)||0,pb=parseFloat(cs.paddingBottom)||0,top=p.getBoundingClientRect().top+pt-p.scrollTop;
        const col=cs.display.includes('flex')&&cs.flexDirection.startsWith('column'),gap=parseFloat(cs.rowGap)||0;
        /* 세로 flex 칸은 마지막 줄이 margin-top:auto 로 바닥에 붙어 있어 「맨 아래 위치」로 재면 늘 꽉 찬 것처럼 보임 → 높이를 더해서 잼 */
        const used=()=>{if(col){let t=0,n=0;for(const k of kids){if(k.offsetParent===null)continue;const r=k.getBoundingClientRect();if(!r.height)continue;const kc=getComputedStyle(k);const mg=v=>{const n=parseFloat(v)||0;return n>40?0:n;};t+=r.height+mg(kc.marginTop)+mg(kc.marginBottom);  /* auto 여백(바닥 붙이기)은 계산값이 커서 뺌 */n++;}return t+Math.max(0,n-1)*gap;}
          let m=0;for(const k of kids){if(k.offsetParent===null&&getComputedStyle(k).position!=='fixed')continue;const r=k.getBoundingClientRect();if(r.height)m=Math.max(m,r.bottom-top+(parseFloat(getComputedStyle(k).marginBottom)||0));}return m;};
        const avail=ch-pt-pb;const over2=()=>used()>avail+1;
        const nat=used()/z;if(!nat)return;
        let want=Math.max(.5,Math.min(1.2,Math.floor(avail/nat*100)/100-.01));   /* 큰 화면에서 남는 자리가 있으면 1.2배까지 키움 */
        const bad=BAD[key];if(bad&&Date.now()-bad.at<15000&&want>=bad.z&&!over2())want=z;   /* 방금 넘쳤던 크기로는 15초 동안 다시 키우지 않음 (줄었다 커졌다 반복 방지) */
        if(over2()||want-z>=.03){const z0=z;
          setZ(kids,want);z=want;
          for(let i=0;i<8&&over2()&&z>.5;i++){z=Math.max(.5,+(z-.02).toFixed(2));setZ(kids,z);}
          if(z<z0)BAD[key]={z:z0,at:Date.now()};
        }
        if(!p.dataset.ksov){p.style.setProperty('overflow-y','auto','important');p.style.setProperty('scrollbar-gutter','stable');p.dataset.ksov='1';}  /* 스크롤 막대가 생겼다 없어졌다 하며 폭이 바뀌어 떨리던 것 방지 */   /* 가장 작게 줄여도 넘치면 그 칸 안에서만 내려 보기 (아래 단추가 잘리지 않게) */
        p.dataset.ksz=z;ZK[key]=z;
      });
    }catch(e){}finally{busy=false;}
  }
  let raf=0;const later=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;fit();});};
  const app=()=>document.getElementById('app');
  const mo=new MutationObserver(()=>fit());
  const start=()=>{const a=app();if(a)mo.observe(a,{childList:true,subtree:false});later();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  addEventListener('resize',later);addEventListener('hashchange',later);
  setInterval(later,1500);
})();
