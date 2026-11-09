/* v1.4.57 심판 태블릿 배터리 → 코트 노트북 → 본부 화면
   심판 화면(#judge…)에서만, 1분마다 그리고 배터리·충전 상태가 바뀔 때 알립니다.
   안드로이드 크롬(LG 태블릿 등)에서 됩니다. 아이패드 사파리는 배터리 정보를 주지 않아 표시되지 않습니다. */
(function(){
  if(!window.KS_FIELD||!navigator.getBattery)return;
  const APPK=location.pathname.split('/').filter(Boolean)[0]||'';
  const g=n=>{try{return (0,eval)(n);}catch(e){return undefined;}};
  const isJudge=()=>/^#judge/.test(location.hash||'');
  let ID='';try{ID=localStorage.getItem('ks_bat_id')||'';if(!ID){ID='t'+Math.random().toString(36).slice(2,10);localStorage.setItem('ks_bat_id',ID);}}catch(e){ID='t'+Math.random().toString(36).slice(2,10);}
  let B=null,last=0;
  function seat(){const m=/^#judge-(\d+)/.exec(location.hash||'');if(m)return +m[1];const v=g('myJudge');return typeof v==='number'?v:0;}
  async function send(force){if(!B||!isJudge())return;const now=Date.now();if(!force&&now-last<55000)return;last=now;
    try{await fetch('/api/bat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:ID,app:APPK,seat:seat(),level:B.level,charging:!!B.charging})});}catch(e){}}
  navigator.getBattery().then(b=>{B=b;['levelchange','chargingchange'].forEach(ev=>b.addEventListener(ev,()=>send(true)));send(true);setInterval(()=>send(false),15000);
    addEventListener('hashchange',()=>send(true));}).catch(()=>{});
})();
