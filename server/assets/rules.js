/* v1.4.51 본부 「종목별 경기 규칙」 받기 (품새·격파·겨루기 경기 앱 공통)
   본부에서 정한 규칙(/api/rules)이 이 앱의 것보다 새로우면 대회 설정에 넣고,
   품새는 「아직 점수가 없는 부문」의 경기 방식(컷오프·토너먼트)·품새 수도 규칙대로 맞춥니다.
   점수가 들어간 부문은 그대로 둡니다 (경기 도중 방식이 바뀌어 점수가 꼬이지 않게).
   운영석 화면에서만 처리합니다 (심판·전광판 기기는 대회 설정을 따라 바뀜). */
(function(){
  if(!window.KS_FIELD)return;
  const APPK=location.pathname.split('/').filter(Boolean)[0]||'';
  if(!/^(poomsae|gyeokpa|kyorugi)$/.test(APPK))return;
  const g=n=>{try{return (0,eval)(n);}catch(e){return undefined;}};
  const say=m=>{try{(window.toast||g('toast'))(m);}catch(e){}};
  const isAdmin=()=>{const h=location.hash||'';return /^#admin/.test(h)||h===''||h==='#';};
  const TEAM={gym:1,team100:1};
  let busy=false,lastAt=0;
  function want(set,d){const tf=set.typeFormat||{},tp=set.typePoom||{};
    if(TEAM[d.type])return {format:'cutoff',poomsae:1};
    return {format:tf[d.type]||set.format||'cutoff',poomsae:tp[d.type]||set.poomsae||1};}
  async function fixDivs(S){const set=S.settings||{};if(!set.hqRulesAt||!Array.isArray(S.divs)||!S.divs.length)return;
    const has=g('divHasResults'),save=g('saveDivs');if(typeof has!=='function'||typeof save!=='function')return;
    let n=0;const list=S.divs.map(d=>{if(has(d))return d;const w=want(set,d);
      if((d.format||'cutoff')!==w.format||(d.poomsae||1)!==w.poomsae){n++;return {...d,format:w.format,poomsae:w.poomsae,stages:null};}return d;});
    if(n){await save(list);say(`본부 경기 규칙에 맞춰 시작 전 부문 ${n}개를 고쳤습니다`);}}
  async function tick(){if(busy||!isAdmin())return;const S=g('S');if(!S||!S.settings||typeof S.settings!=='object')return;busy=true;
    try{const j=await (await fetch('/api/rules',{cache:'no-store'})).json();if(!j||!j.at||!j.rules)return;
      const R=typeof j.rules==='string'?JSON.parse(j.rules):j.rules,A=R&&R[APPK];if(!A)return;
      const set=S.settings;
      if((set.hqRulesAt||0)<j.at&&lastAt!==j.at){lastAt=j.at;const p={hqRulesAt:j.at};
        if(APPK==='poomsae'){if(A.judges)p.judges=Number(A.judges);p.typeFormat={};p.typePoom={};
          Object.entries(A.types||{}).forEach(([t,v])=>{if(v&&v.format)p.typeFormat[t]=v.format;if(v&&v.poomsae)p.typePoom[t]=Number(v.poomsae);});
          const rc=(A.types&&A.types.recognized)||{};if(rc.format)p.format=rc.format;if(rc.poomsae)p.poomsae=Number(rc.poomsae);}
        else if(APPK==='gyeokpa'){['judges','grpSize','finalN'].forEach(k=>{if(A[k]!=null&&A[k]!=='')p[k]=Number(A[k]);});}
        else if(APPK==='kyorugi'){['refs','roundSec','restSec'].forEach(k=>{if(A[k]!=null&&A[k]!=='')p[k]=Number(A[k]);});if(A.system)p.system=A.system;}
        const ns={...set,...p};await g('saveSettings')(ns);S.settings=ns;
        say('📋 본부에서 정한 경기 규칙을 받았습니다 · 아직 시작 전인 부문부터 적용됩니다');}
      if(APPK==='poomsae')await fixDivs(S);
    }catch(e){}finally{busy=false;}}
  setInterval(tick,6000);setTimeout(tick,3000);
  window.KS_RULES={want,tick};
})();
