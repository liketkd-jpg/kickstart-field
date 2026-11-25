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
html body.ks-fitrun .panel.bcur:has(>.gwho+*+.tbox)>.tbox .bcmd .btn{min-width:0;padding:8px 4px!important;font-size:clamp(15px,.95vw,18px)!important;white-space:normal;line-height:1.2;word-break:keep-all}
/* v1.7.87 작은 노트북에서도 글씨·단추가 너무 작아지지 않게: 통째로 줄이기 전에 자리를 먼저 만듦
   ① 위 「진행 순서」 띠를 한 줄로(옆으로 넘겨 보기) ② 키 작은 화면에서는 맨 위 로고 줄 숨김 ③ 격파 감점 칸은 접어 두고 눌러서 펼침 */
body.ks-fitrun .kfstrip .kfl2{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;max-height:none!important;scroll-snap-type:x proximity;padding-bottom:4px}
body.ks-fitrun .kfstrip .kfl2>.kfi{flex:0 0 auto;min-width:150px;max-width:230px;scroll-snap-align:start}
body.ks-fitrun .kfstrip .kft{font-size:20px}
@media (max-height:1000px){body.ks-fitrun>header.bar{display:none!important}}
body.ks-fitrun .panel.bcur:has(>.gwho+.tbox){display:grid!important;grid-template-columns:minmax(0,.8fr) minmax(0,1.6fr);column-gap:14px;row-gap:8px;align-content:start}
body.ks-fitrun .panel.bcur:has(>.gwho+.tbox)>*{grid-column:1/-1}
body.ks-fitrun .panel.bcur:has(>.gwho+.tbox)>.gwho{grid-column:1;grid-row:2;align-self:center}
body.ks-fitrun .panel.bcur:has(>.gwho+.tbox)>.tbox{grid-column:2;grid-row:2}
body.ks-fitrun .panel.bcur:has(>.gwho+.tbox)>.tbox .bcmd{grid-template-columns:repeat(5,minmax(0,1fr))!important}
html body.ks-fitrun .panel.bcur:has(>.gwho+.tbox)>.tbox .bcmd .btn{min-width:0;padding:8px 4px!important;font-size:clamp(14px,.95vw,18px)!important;white-space:normal;line-height:1.2;word-break:keep-all}
body.ks-fitrun .lmrun.ks-nomus{display:none!important}
@media (max-height:780px){body.ks-fitrun .kfstrip .kfl2{display:none!important}}
body.ks-fitrun .mu-run:not(.ks-open)>:not(:first-child){display:none!important}
body.ks-fitrun .mu-run>:first-child{cursor:pointer}
body.ks-fitrun .mu-run:not(.ks-open)>:first-child::after{content:"  ▾ 음악 자세히";font-weight:700;color:#E8B04A;font-size:.9em;white-space:nowrap}
body.ks-fitrun .advinfo:not(.ks-open){padding:6px 10px!important;cursor:pointer}
body.ks-fitrun .advinfo:not(.ks-open)>*{display:none!important}
body.ks-fitrun .advinfo:not(.ks-open)::before{content:"ℹ " attr(data-ksinfo) "  ▾";font-size:13px;font-weight:700;color:#C9CFDB}
body.ks-fitrun .col .blist .bitem{padding:6px 10px!important;min-height:0!important}
body.ks-fitrun .col .blist .bitem .bmain{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;align-items:baseline;gap:0 8px!important}
body.ks-fitrun .col>.panel.bp.grow{min-height:170px}
body.ks-fitrun .dedbox:not(.ks-open)>:not(:first-child){display:none!important}
body.ks-fitrun .dedbox>:first-child{cursor:pointer;user-select:none}
body.ks-fitrun .dedbox:not(.ks-open)>:first-child::after{content:"  ▾ 눌러서 감점 입력";font-weight:700;color:#E8B04A;font-size:.92em}
body.ks-fitrun .dedbox.ks-open>:first-child::after{content:"  ▴ 접기";font-weight:700;color:#9AA3B5;font-size:.92em}
body.ks-fitrun .dedbox:not(.ks-open)[data-ksded]:not([data-ksded="0"])>:first-child::before{content:"감점 " attr(data-ksded) "건 들어감 · ";color:#FF8A8A;font-weight:900}`;
  (document.head||document.documentElement).appendChild(st);
  let DEDOPEN=false;
  let ADVOPEN=false;
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('body.ks-fitrun .advinfo');if(!a||e.target.closest('button,select,input,label'))return;ADVOPEN=!ADVOPEN;a.classList.toggle('ks-open',ADVOPEN);setTimeout(()=>{try{fit();}catch(x){}},30);},true);
  let MUOPEN=false;
  document.addEventListener('click',e=>{const m=e.target.closest&&e.target.closest('body.ks-fitrun .mu-run>:first-child');if(!m||e.target.closest('button,select,input,label'))return;MUOPEN=!MUOPEN;m.parentElement.classList.toggle('ks-open',MUOPEN);setTimeout(()=>{try{fit();}catch(x){}},30);},true);
  document.addEventListener('click',e=>{const h=e.target.closest&&e.target.closest('body.ks-fitrun .dedbox>:first-child');if(!h)return;DEDOPEN=!DEDOPEN;h.parentElement.classList.toggle('ks-open',DEDOPEN);setTimeout(()=>{try{fit();}catch(x){}},30);},true);
  function decor(){document.querySelectorAll('.advinfo').forEach(m=>m.classList.toggle('ks-open',ADVOPEN));document.querySelectorAll('.mu-run').forEach(m=>m.classList.toggle('ks-open',MUOPEN));document.querySelectorAll('.lmrun').forEach(m=>m.classList.toggle('ks-nomus',/연결된 음악 없음/.test(m.textContent||'')&&m.textContent.trim().length<30));document.querySelectorAll('.dedbox').forEach(b=>{b.classList.toggle('ks-open',DEDOPEN);
});
    const cur=document.querySelector('.kfstrip .kfl2 .kfi.cur');if(cur&&cur.dataset.ksv!=='1'){cur.dataset.ksv='1';try{cur.scrollIntoView({block:'nearest',inline:'center'});}catch(x){}}}
  const isRun=()=>/^#?admin-run$/.test((location.hash||'').replace(/^#/,'').split('?')[0])||/admin-run/.test(location.hash);
  /* v1.7.77 떨림 없애기: 크기를 1로 되돌렸다가 다시 줄이지 않고, 지난번 배율을 그대로 둔 채
     넘치면 줄이고 · 3% 이상 여유가 생길 때만 키웁니다. 화면이 새로 그려지면 그리기 전에 바로 지난 배율을 씌웁니다. */
  let busy=false;const ZK={},BAD={};
  const keyOf=p=>(p.className||'')+'|'+(location.hash||'');
  const setZ=(kids,z)=>{const v=z===1?'':String(z);kids.forEach(k=>{if(k.style.zoom!==v)k.style.zoom=v;});};
  const over=p=>p.scrollHeight>p.clientHeight+2;
  function fit(){
    if(busy)return;busy=true;
    try{decor();
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
        let want=Math.max(.8,Math.min(1.2,Math.floor(avail/nat*100)/100-.01));   /* 큰 화면에서 남는 자리가 있으면 1.2배까지 키움 */
        const bad=BAD[key];if(bad&&Date.now()-bad.at<15000&&want>=bad.z&&!over2())want=z;   /* 방금 넘쳤던 크기로는 15초 동안 다시 키우지 않음 (줄었다 커졌다 반복 방지) */
        if(over2()||want-z>=.03){const z0=z;
          setZ(kids,want);z=want;
          for(let i=0;i<8&&over2()&&z>.8;i++){z=Math.max(.8,+(z-.02).toFixed(2));setZ(kids,z);}   /* v1.7.87 80% 아래로는 줄이지 않음 · 그래도 넘치면 칸 안에서 내려 봄 */
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

  /* 코트 글자가 정해지지 않은 노트북 — 운영석에 경고 띠 */
  let ksNoCourtX=false;window.addEventListener('hashchange',()=>setTimeout(courtWarn,300));
  function courtWarn(){const F=window.KS_FIELD;if(!F||!F.status&&F.role===undefined)return;if(String(F.court||'').trim())return;const ex=document.getElementById('ksNoCourt');if(!/^#admin/.test(location.hash)||ksNoCourtX){if(ex)ex.remove();return;}if(ex)return;
    const d=document.createElement('div');d.id='ksNoCourt';d.style.cssText='position:fixed;left:50%;top:6px;transform:translateX(-50%);z-index:99990;background:#7A1E1E;color:#fff;border:2px solid #FFB4A8;border-radius:12px;padding:8px 14px;font:700 15px "Noto Sans KR",sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4);display:flex;gap:10px;align-items:center;max-width:92vw';
    d.innerHTML='<span>⚠ 이 노트북은 <b>코트(A~E)가 정해지지 않았습니다</b> — 전광판 코트 칸이 비어 나옵니다. 현장 프로그램 첫 화면에서 「이 노트북은 어디에 쓰나요?」의 코트 글자를 골라 주세요.</span><a href="/" style="background:#fff;color:#7A1E1E;border-radius:8px;padding:4px 10px;text-decoration:none;white-space:nowrap">첫 화면</a><button style="background:none;border:0;color:#fff;font-size:18px;cursor:pointer" title="닫기">✕</button>';
    d.querySelector('button').onclick=()=>{ksNoCourtX=true;d.remove();};document.body.appendChild(d);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(courtWarn,800));else setTimeout(courtWarn,800);
})();
