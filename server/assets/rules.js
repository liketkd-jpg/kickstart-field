/* v1.4.52 본부 「종목 설정」 받기 (품새·격파·겨루기 경기 앱 공통)
   본부에서 정한 설정(/api/rules)이 이 앱의 것보다 새로우면 대회 설정에 넣습니다.
   - 대회 기준(생활체육·협회·세계연맹)과 같은 도장 떨어뜨리기는 모든 종목 공통
   - 품새 앱: 공인 품새·자유 품새·태권체조·팀 대항 경연을 종목마다 따로 (경기 방식·진행 단계·진출 인원·심판 수·품새 수·추첨·시간)
   - 격파: 심판 수·예선 인원·조 인원·결선 인원 · 겨루기: 부심·방식·시간
   「아직 점수가 없는 부문」만 새 설정에 맞추고, 점수가 들어간 부문은 그대로 둡니다.
   운영석 화면에서만 처리합니다 (심판·전광판 기기는 대회 설정을 따라 바뀜). */
(function(){
  if(!window.KS_FIELD)return;
  const APPK=location.pathname.split('/').filter(Boolean)[0]||'';
  if(!/^(poomsae|gyeokpa|kyorugi)$/.test(APPK))return;
  const g=n=>{try{return (0,eval)(n);}catch(e){return undefined;}};
  const say=m=>{try{(window.toast||g('toast'))(m);}catch(e){}};
  const isAdmin=()=>{const h=location.hash||'';return /^#admin/.test(h)||h===''||h==='#';};
  const TEAM={gym:1,team100:1},PT=['recognized','freestyle','gym','team100'];
  const num=(v,d)=>{const n=Number(v);return isFinite(n)&&n>0?n:d;};
  let busy=false,lastAt=0;
  function want(set,d){const tf=set.typeFormat||{},tp=set.typePoom||{},tc=set.typeCut||{},ta=set.typeAdv||{};
    const w={format:TEAM[d.type]?'cutoff':(tf[d.type]||set.format||'cutoff'),poomsae:TEAM[d.type]?1:(tp[d.type]||set.poomsae||1)};
    if(tc[d.type])w.cut=tc[d.type];if(ta[d.type])w.adv=Number(ta[d.type]);return w;}
  async function fixDivs(S){const set=S.settings||{};if(!set.hqRulesAt||!Array.isArray(S.divs)||!S.divs.length)return;
    const has=g('divHasResults'),save=g('saveDivs');if(typeof has!=='function'||typeof save!=='function')return;
    let n=0;const list=S.divs.map(d=>{if(has(d))return d;const w=want(set,d);let x=d,ch=false;
      if((d.format||'cutoff')!==w.format||(d.poomsae||1)!==w.poomsae){x={...x,format:w.format,poomsae:w.poomsae};ch=true;}
      /* 부문에 따로 정한 진행 단계가 본부 설정과 다르면 본부 설정을 따름 */
      if(w.cut&&d.cutMode&&d.cutMode!==w.cut){x={...x,cutMode:null,advN:null};ch=true;}
      else if(w.adv&&d.advN&&Number(d.advN)!==w.adv){x={...x,advN:null};ch=true;}
      if(ch){n++;x={...x,stages:null};}return x;});
    if(n){await save(list);say(`본부 종목 설정에 맞춰 시작 전 부문 ${n}개를 고쳤습니다`);}}
  async function tick(){if(busy||!isAdmin())return;const S=g('S');if(!S)return;if(!S.settings||typeof S.settings!=='object')S.settings={}; /* v1.4.73 새 노트북(대회 설정 아직 없음)도 본부 규칙을 받음 */busy=true;
    try{const j=await (await fetch('/api/rules',{cache:'no-store'})).json();if(!j||!j.at||!j.rules)return;
      const R=typeof j.rules==='string'?JSON.parse(j.rules):j.rules;if(!R)return;
      const set=S.settings,C=R.common||{},ev=R.events||null;
      if((set.hqRulesAt||0)<j.at&&lastAt!==j.at){lastAt=j.at;const p={hqRulesAt:j.at};
        if(typeof C.sep==='boolean')p.sepDojang=C.sep;
        if(APPK==='poomsae'){const P=R.poomsae||{},T=P.types||{};
          p.typeJudges={};p.typeFormat={};p.typePoom={};p.typeCut={};p.typeAdv={};
          PT.forEach(t=>{const v=T[t]||{};if(v.judges)p.typeJudges[t]=num(v.judges,5);if(v.format)p.typeFormat[t]=TEAM[t]?'cutoff':v.format;
            if(v.poomsae)p.typePoom[t]=TEAM[t]?1:num(v.poomsae,1);if(v.cut)p.typeCut[t]=v.cut;if(v.adv)p.typeAdv[t]=num(v.adv,3);});
          /* 심판 링크·자리 수는 고른 종목 가운데 가장 많은 심판 수 */
          const use=PT.filter(t=>!ev||ev[t]!==false),js=use.map(t=>p.typeJudges[t]).filter(Boolean);
          if(js.length)p.judges=Math.max(...js);else if(P.judges)p.judges=num(P.judges,5);
          const rc=T.recognized||{};if(rc.format)p.format=rc.format;if(rc.poomsae)p.poomsae=num(rc.poomsae,1);if(rc.pdraw)p.pdraw=rc.pdraw;
          const fs=T.freestyle||{},gy=T.gym||{},tm=T.team100||{};
          if(fs.min)p.freeMin=num(fs.min,90);if(fs.max)p.freeMax=num(fs.max,100);if(gy.min)p.gymMin=num(gy.min,110);if(gy.max)p.gymMax=num(gy.max,120);if(tm.max)p.teamMax=num(tm.max,300);p.teamMin=Number(tm.min)||0;
          p.typeSheet={gym:gy.sheet==='wt'?'wt':'hm',team100:tm.sheet==='wt'?'wt':'hm'}; /* v1.4.73 채점 양식: 한마당 / 대회 규정 */
          /* 생활체육 기준: 공인 품새 「예선 2개·결선 1개」 등 단계마다 품새 수 */
          const m=/^([12])-([12])$/.exec(String(rc.pstage||''));p.typePoomStage=C.std==='comm'&&m?{recognized:{pre:+m[1],final:+m[2]}}:{};
          if(C.std==='comm'&&m)p.typePoom.recognized=+m[1];else if(C.std==='comm'&&/^[12]$/.test(String(rc.pstage||'')))p.typePoom.recognized=+rc.pstage;}
        else if(APPK==='gyeokpa'){const G=R.gyeokpa||{};['judges','preMin','grpSize','finalN'].forEach(k=>{if(G[k]!=null&&G[k]!=='')p[k]=num(G[k],set[k]);});}
        else if(APPK==='kyorugi'){const K=R.kyorugi||{};['refs','roundSec','restSec'].forEach(k=>{if(K[k]!=null&&K[k]!=='')p[k]=num(K[k],set[k]);});if(K.system)p.system=K.system;}
        const ns={...set,...p};await g('saveSettings')(ns);S.settings=ns;
        /* 대회 기준: 생활체육(4명 1조)·협회·세계연맹 — 바뀌면 부문을 다시 편성 (앱의 「생활체육 대회」 버튼과 같은 동작) */
        if(C.std&&APPK!=='kyorugi'){const wantComm=C.std==='comm',cs=g('commSet');
          if(!!ns.comm!==wantComm&&typeof cs==='function')await cs({comm:wantComm});
          if(APPK==='poomsae'&&C.std!=='comm'&&(S.settings.ageScheme||'kta')!==C.std){const s2={...S.settings,ageScheme:C.std};await g('saveSettings')(s2);S.settings=s2;try{if((S.roster||[]).length)await g('regenerateDivs')();}catch(e){}}}
        say('📋 본부에서 정한 종목 설정을 받았습니다 · 아직 시작 전인 부문부터 적용됩니다');}
      if(APPK==='poomsae')await fixDivs(S);
    }catch(e){console.warn('rules',e);}finally{busy=false;}}
  setInterval(tick,6000);setTimeout(tick,3000);
  window.KS_RULES={want,tick};
})();
