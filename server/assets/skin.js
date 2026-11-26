/* ===== KICKSTART UP 전광판 디자인: 왕실 · 불꽃 (v1.5.0) · 🏟 경기장 (v1.7.0: 컷오프·품새 토너먼트·겨루기) =====
   - 품새 앱(공인 품새 · 자유 품새 · 태권체조 · 팀 경연)과 격파 앱의 컷오프 화면에 씀. 종목마다 따로 고름 (대회 설정 「컷오프 전광판 디자인」)
   - 화면: 대기 → 경기 중(이름·소속 가운데 크게) → 점수 공개(이름·점수만 가운데 크게) → 순위(1·2·3위 가운데 크게 + 나머지·진출선)
   - 토너먼트(청·홍) 화면과 「기존」을 고르면 지금까지의 전광판 그대로
   - 점수 공개·순위 효과음과 빛 효과는 기존 효과 모듈(.board.ksb-solo · .cbfinal · .rankv · .cbr.me)이 그대로 붙음 */
(function(){
if(window.KS_SKIN)return;
const F=window.KS_FIELD||{},APP=F.app||'';
if(APP!=='poomsae'&&APP!=='gyeokpa'&&APP!=='kyorugi')return;
const g=n=>{try{return (0,eval)(n);}catch(e){return undefined;}};
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SET=()=>{try{return g('SET')()||{};}catch(e){return {};}};
const NEWS=[['bc','📺 중계방송형'],['sw','▦ 타이포형'],['pr','✦ 프레스티지형']];   /* v1.7.55 */
const SKINS=[['','기존 디자인'],['royal','👑 왕실 (남색·금색)'],['fire','🔥 불꽃 (검정·주황)'],['arena','🏟 경기장 (세계 대회)'],...NEWS];
const SKINS2=[['','기존 디자인'],['arena','🏟 경기장 (세계 대회)']];
const SKINS_T=[['','기존 디자인'],['arena','🏟 경기장 (세계 대회)'],['duel','⚔️ 청·홍 대결 (금색 띠)'],...NEWS];
const ROWS=APP==='poomsae'?[['recognized','공인 품새'],['freestyle','자유 품새'],['gym','태권체조'],['team100','팀 경연'],['tour','토너먼트 (청·홍)']]:APP==='kyorugi'?[['kyorugi','겨루기']]:[['gyeokpa','격파']];
const by=()=>SET().skinBy||{};
function skinFor(cur){const B=by();if(APP==='gyeokpa')return B.gyeokpa||'';if(APP==='kyorugi')return B.kyorugi==='arena'?'arena':'';
  if(!cur){const v=ROWS.filter(r=>r[0]!=='tour').map(r=>B[r[0]]).filter(Boolean);return v[0]||'';}
  if((cur.entries||[]).length===2)return B.tour==='arena'||B.tour==='duel'||isNew(B.tour)?B.tour:'';   /* 토너먼트(청·홍)는 「경기장」만 · 아니면 기존 화면 */
  return B[cur.type||'recognized']||'';}
const fit=(s,base,max)=>{const n=String(s||'').length;return n<=max?base:Math.max(base*0.25,base*max/n);};
const U=n=>`calc(${n}*var(--u))`;

/* ---------- 앱마다 화면 자료 ---------- */
function modelPm(){const T=window.KS_THEME;if(!T||!T.model)return null;let m;try{m=T.model();}catch(e){return null;}
  if(!m||!['idle','live','score','rank'].includes(m.scr))return null;
  const o={scr:m.scr,comp:m.comp,court:m.court,div:m.div,label:m.label,key:m.key,el:m.el2!=null&&m.el2>=0?m.el2:m.el,next:m.next};
  if(m.p){o.name=m.p.name;o.team=m.p.team;o.members=m.p.members;}
  if(m.scr==='live'){o.timer=m.timer;o.judges=(m.live||[]).map(j=>j.ok);}
  if(m.res){const f2=v=>v==null?'—':(+v).toFixed(2);o.final=f2(m.res.final);o.parts=[{l:m.labA||'정확성',v:f2(m.res.a)},{l:m.labB||'표현성',v:f2(m.res.b)}];
    if(m.res.ded)o.parts.push({l:'감점',v:'−'+(+m.res.ded).toFixed(1),neg:true});}
  if(m.scr==='rank'){o.rows=(m.rows||[]).map(r=>({rank:r.rank,name:r.name,team:r.team,score:(+r.final).toFixed(2),me:r.me,inq:r.inq}));o.quota=m.quota;o.pre=m.pre;o.cut=m.cutLab;o.unit=m.unit||'명';o.medal=!!m.medal;}
  return o;}
function modelGp(){const st=g('ST')(),cur=g('curOf')(),S=g('S'),s=SET();
  const o={comp:s.name||'태권도 격파 대회',court:F.court||''};if(!cur){o.scr='idle';o.key='idle';return o;}
  const d=S.divs.find(x=>x.id===cur.divId),r=S.results[cur.perfId],k=cur.kind,rec=st.rec||{},N=cur.judgeCount,JU=g('JUDGED'),fmt3=g('fmt3'),fmtN=g('fmtN')||(v=>v),RT=g('resultText');
  Object.assign(o,{div:cur.divName||'',label:cur.label||'',name:cur.name||'',team:cur.team||'',members:cur.members||'',key:(st.epoch||0)+':'+cur.perfId});
  const revealed=st.status==='revealed'&&r;
  if(!revealed){o.scr='live';o.timer=g('cdText')(st.timer);const cs=g('curScores')().filter(x=>x.perfId===cur.perfId);o.judges=Array.from({length:N||0},(_,i)=>cs.some(x=>x.judge===i+1));
    o.liveCount=k==='height'?{l:'최고 높이',v:fmtN(rec.best||0),u:'cm'}:(k==='count'||k==='power')?{l:'격파',v:fmtN(rec.broken||0),u:'장'}:k==='powerc'?{l:'격파',v:(Number(rec.fist)||0)+(Number(rec.knife)||0)+(Number(rec.back)||0)+(Number(rec.elbow)||0),u:'장'}:null;return o;}
  const el=Date.now()-(st.revealedAt||Date.now()),CB=g('CB_SCORE_MS')||7000,canRank=!!(d&&!r.dq);o.el=el;
  if(el<CB||!canRank){if(canRank)setTimeout(g('schedule'),CB-el+30);o.scr='score';
    const P100=g('p100'),PM=g('p100max');o.final=r.dq?(r.wd?'기권':'실격'):JU(k)?fmt3(P100?P100(r):r.final):RT(r);if(PM&&PM(r))o.final100=true;o.parts=[];if(JU(k))o.parts.push({l:r.judges.length===1?'1심 점수':'심판 평균',v:fmt3(r.score*(PM&&PM(r)?100/PM(r):1))});if(r.dedTotal)o.parts.push({l:'감점',v:'−'+(PM&&PM(r)?Math.round(r.dedTotal*100/PM(r)*100)/100:fmtN(r.dedTotal)),neg:true});
    if(r.zero)o.note='격파 0장 · 순위 제외';return o;}
  const stagesOf=g('stagesOf'),curStage=g('curStage'),stIds=g('stIds'),rankList=g('rankList'),planOf=g('planOf'),athlete=g('athlete');
  const stg=stagesOf(d).find(x=>x.key===cur.stage)||curStage(d),ids=stg.groups&&cur.group!=null?stg.groups[cur.group]||[]:stIds(stg);
  const all=rankList(d,stg.key,ids),rows=all.filter(x=>x.ok),p=planOf(d),pre=stg.key==='pre',quota=pre?p.adv:3;o.medal=!pre&&all.length>0&&all.every(x=>x.r);
  o.scr='rank';o.el=el-CB;o.quota=quota;o.pre=pre;o.unit=cur.team&&!cur.name?'팀':'명';o.cut=`결선 진출선 · 상위 ${quota}${o.unit}`;
  o.rows=rows.map(x=>{const a=athlete(x.id)||{};return {rank:x.rank,name:a.name||'',team:a.team||'',score:RT(x.r),me:x.id===cur.athleteId,inq:x.rank<=quota};});
  return o;}

/* ---------- 화면 그리기 (1920×1080 기준) ---------- */
const brand=th=>th==='fire'?'KICKSTART UP':'KICKSTART UP';
function top(m,th){return `<div class="sk-top"><span class="sk-brand">${brand(th)}</span><span class="sk-comp" style="font-size:${U(fit(m.comp,34,26))}">${E(m.comp)}</span>${m.court?`<span class="sk-court">${E(m.court)} 코트</span>`:'<span></span>'}</div>`;}
function divLine(m){return m.div?`<div class="sk-div"><b>${E(m.div)}</b>${m.label?` · ${E(m.label)}`:''}</div>`:'';}
function idle(m,th){return `${top(m,th)}<div class="sk-center sk-idle"><div class="sk-kick">${th==='fire'?'GET READY':'OFFICIAL COMPETITION'}</div><h1 style="font-size:${U(fit(m.comp,210,8))}">${E(m.comp)}</h1><p>곧 경기가 시작됩니다</p><span class="sk-clock" data-now></span>${m.court?`<div class="sk-ic">${E(m.court)} 코트</div>`:''}</div>`;}
function live(m,th){const js=(m.judges||[]).map((ok,i)=>`<i class="${ok?'on':''}">${i+1}심</i>`).join('');
  return `${top(m,th)}${divLine(m)}<div class="sk-center sk-live"><div class="sk-kick">${th==='fire'?'NOW ON THE MAT':'NOW PERFORMING'}</div>
    <div class="sk-name" style="font-size:${U(fit(m.name||m.team,230,3))}">${E(m.name||m.team)}</div>${m.name&&m.team?`<div class="sk-team">${E(m.team)}</div>`:''}${m.members?`<div class="sk-mem">${E(m.members)}</div>`:''}
    ${m.liveCount?`<div class="sk-cnt dzlive"><small>${E(m.liveCount.l)}</small>${E(m.liveCount.v)}<small>${E(m.liveCount.u)}</small></div>`:''}
    <div class="sk-timer timer" data-timer>${E(m.timer||'')}</div>${js?`<div class="sk-js">${js}</div>`:''}</div>${foot(m)}`;}
/* v1.7.29 왕실·불꽃: 심판별 세부 점수 (들어간 점수 파랑 · 빠진 점수 빨강) */
function skJudges(js){if(!js||!js.length)return '';return `<div class="sk-jd" style="--n:${js.length}">${js.map(j=>`<div class="sk-jc ${j.drop?'out':j.per?'':'in'}"><div class="sk-jh">${j.n}심${j.drop?' <em>제외</em>':''}</div>${(j.items||[]).map(it=>`<div class="sk-ji"><span>${E(it.l)}</span><b class="${it.x?'jx':'jk'}">${E(it.v)}</b></div>`).join('')}<div class="sk-jt">${E(j.t)}</div></div>`).join('')}</div>`;}
function score(m,th){const parts=(m.parts||[]).map(p=>`<span class="sk-part ${p.neg?'neg':''}"><small>${E(p.l)}</small><b>${E(p.v)}</b></span>`).join('');
  return `${top(m,th)}${divLine(m)}<div class="sk-center sk-score ${m.js&&m.js.length?'hasj':''}">
    <div class="sk-name sm" style="font-size:${U(fit(m.name||m.team,m.js&&m.js.length?110:140,6))}">${E(m.name||m.team)}</div>${skJudges(m.js)}
    <div class="cbres sk-res">${parts}<span class="cbfinal sk-final">${E(m.final)}</span></div>${m.note?`<div class="sk-note">${E(m.note)}</div>`:''}
    ${th==='fire'?'<svg class="sk-crack" viewBox="0 0 1200 200" preserveAspectRatio="none"><path d="M0 100 L180 88 L260 30 L360 120 L470 60 L560 140 L680 70 L790 120 L900 50 L1010 110 L1200 96"/><path class="b" d="M260 30 L290 0 M360 120 L380 200 M560 140 L540 200 M900 50 L930 0"/></svg>':''}</div>${foot(m)}`;}
/* v1.7.9 생활체육(4명 1조): 순위 대신 금·은·동·동 */
const SK_COMM=()=>{try{const f=(0,eval)('COMM');return typeof f==='function'&&!!f();}catch(e){return false;}};
const SK_MED={1:'금',2:'은',3:'동',4:'동'};
/* v1.7.68 메달: 동그라미 대신 리본 달린 메달 그림 안에 금·은·동 (4위 공동 동) — 모든 디자인·기존 전광판 공통 */
const KMD_C={1:['#FFF7D6','#E6B94C','#8E6618'],2:['#FFFFFF','#C9CFD8','#76808F'],3:['#FFE6CC','#CD8A4E','#76431C']};
const ksMedal=(r,lab)=>{const k=Math.min(3,r),c=KMD_C[k];return `<span class="kmd km${k}"><svg viewBox="0 0 100 128" aria-hidden="true"><defs><radialGradient id="kmg${k}" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient></defs><path d="M18 0h28l16 58-26 5z" fill="#1E4FD8"/><path d="M82 0H54L38 58l26 5z" fill="#D7263D"/><path d="M30 0h8l15 55-6 1z" fill="#fff" opacity=".35"/><path d="M70 0h-8L47 55l6 1z" fill="#fff" opacity=".25"/><rect x="34" y="50" width="32" height="12" rx="3" fill="${c[2]}"/><circle cx="50" cy="86" r="40" fill="url(#kmg${k})"/><circle cx="50" cy="86" r="40" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="2"/><circle cx="50" cy="86" r="31" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.5"/></svg><b>${lab}</b></span>`;};
window.KS_MEDAL=ksMedal;
/* v1.7.55 메달(금·은·동)은 그 조·단계 경기가 모두 끝난 뒤에만 (m.medal) — 진행 중에는 순위 숫자 · 생활체육은 4위까지 동 */
const medOk=(r,m)=>!!(m&&m.medal)&&r>=1&&r<=(SK_COMM()?4:3);
const skRk=(r,m)=>medOk(r,m)?ksMedal(r,SK_MED[r]):r;const skRkT=(r,m)=>medOk(r,m)?SK_MED[r]+'메달':r;const skMc=(r,m)=>medOk(r,m)?' md m'+Math.min(3,r):'';
/* v1.7.17 순위: 위에서 아래로 한 줄씩 (금 → 은 → 동 → 동 …) 크게 — 시상대처럼 좌우로 엇갈리지 않게 */
function rank(m,th){const R=m.rows||[],me=R.find(r=>r.me);let show=R.slice(0,8);if(me&&!show.includes(me)){const k=R.indexOf(me);show=R.slice(0,5).concat(R.slice(Math.max(5,k-1),k+2));}
  const rh=Math.max(64,Math.min(124,Math.floor((690-(show.length-1)*12)/Math.max(1,show.length))));
  let list='';show.forEach((r,i,a)=>{const prev=a[i-1];if(prev&&prev.rank<r.rank-1&&!(m.pre&&prev.rank<=m.quota&&r.rank>m.quota))list+=`<div class="sk-gap">⋯</div>`;
    if(m.pre&&m.quota&&prev&&prev.rank<=m.quota&&r.rank>m.quota)list+=`<div class="sk-cut1"><span>${E(m.cut)}</span></div>`;
    list+=`<div class="sk-r1 p${Math.min(r.rank,5)} ${r.me?'me':''} ${m.pre&&r.inq?'in':''}${skMc(r.rank,m)}" style="--i:${i};--rh:${rh}">${r.me?'<i class="cbr me sk-mk" style="--dl:0ms"></i>':''}<span class="sk-medal">${skRk(r.rank,m)}</span><span class="sk-r1n"><b>${E(r.name||r.team)}</b><small>${E(r.name?r.team||'':'')}</small></span><em>${E(r.score)}</em></div>`;});
  const meTxt=me?`<div class="sk-me1">${E(me.name||me.team)} · 현재 <b>${skRkT(me.rank,m)}${medOk(me.rank,m)?'':'위'}</b> <small>${R.length}${m.unit||'명'} 중</small></div>`:'';
  return `${top(m,th)}<div class="sk-rkh"><span>${th==='fire'?'RESULTS':'STANDINGS'}</span><b>${E(m.div||'')}${m.label?` · ${E(m.label)}`:''}</b></div>
    <div class="sk-one">${list}</div>${meTxt}`;}
function foot(m){return m.next&&m.next.who?`<div class="sk-next"><span>NEXT</span>${E(m.next.who)}${m.next.team?' · '+E(m.next.team):''}</div>`:'';}
const SCR={idle,live,score,rank};
const SEEN=new Map();function since(k){if(!SEEN.has(k)){SEEN.set(k,Date.now());if(SEEN.size>80)SEEN.delete(SEEN.keys().next().value);}return Date.now()-SEEN.get(k);}
function draw(th,m){const fn=(th==='arena'?ASCR:th==='duel'?DSCR:isNew(th)?NSCR:SCR)[m.scr];if(!fn)return null;let body='';if(m.el==null)m.el=since(th+'|'+m.scr+'|'+(m.key||''));try{body=fn(m,th);}catch(e){console.error('[KS_SKIN]',e);return null;}
  const solo=th==='duel'?false:(th!=='arena'&&!isNew(th))||!/^(duel|duelres|bracket|champ)$/.test(m.scr);   /* ⚔️ 청·홍 대결은 자기 소리·빛 */
  if(th==='duel')dzSound(m);   /* 효과 모듈: 점수 공개·순위만 */
  return `<div class="board ${solo?'ksb-solo':''} sk sk-${th} sk-${m.scr} ${m.scr==='rank'?'rankv':''}" ${th==='arena'||isNew(th)?`style="--cc:${arCol(m.court)}"`:''}><div class="sk-bg"></div><div class="sk-s" style="--t:-${Math.max(0,m.el||0)}ms">${body}</div></div>`;}

/* ===================== 🏟 경기장 디자인 (v1.7.0) =====================
   세계 대회 경기장 화면: 짙은 남색 · 가운데 넓은 띠에 이름·점수 크게 · 왼쪽 코트 색 띠 · 아래 현재 순위·다음 선수
   컷오프(품새·격파·태권체조·팀 경연) · 품새 토너먼트(청·홍) · 겨루기. 효과 모듈이 찾는 이름(cbres·cbfinal·vfinal·cbr.me·dzlive·ks-side…)은 그대로 둠 */
const AR_CC=['#2F7DF6','#2FBF71','#FF8A1F','#9B59FF','#FF4F8B','#18C1D6','#E2C27F','#8FA3C7'];
function arCol(c){c=String(c||'').trim().toUpperCase();let i=0;if(/^[A-Z]/.test(c))i=c.charCodeAt(0)-65;else if(/^\d+/.test(c))i=parseInt(c,10)-1;return AR_CC[((i%8)+8)%8];}
const AR_EV=[['공인 품새','RECOGNIZED POOMSAE'],['자유 품새','FREESTYLE POOMSAE'],['태권체조','TAEKWON AEROBICS'],['팀 경연','TEAM PERFORMANCE'],['체공 도약 격파','JUMPING BREAKING'],['수직축 회전 격파','VERTICAL SPIN BREAKING'],['수평축 회전 격파','HORIZONTAL SPIN BREAKING'],['종합 격파','COMPREHENSIVE BREAKING'],['위력 격파','POWER BREAKING'],['격파','BREAKING'],['겨루기','KYORUGI'],['품새','POOMSAE']];
function arEv(div){div=String(div||'');const k=div.replace(/\s/g,'');const f=AR_EV.find(([ko])=>k.startsWith(ko.replace(/\s/g,'')));
  if(!f)return {ko:'',rest:div,en:''};let n=0,i=0;const t=f[0].replace(/\s/g,'');while(i<div.length&&n<t.length){if(!/\s/.test(div[i]))n++;i++;}
  const rest=div.slice(i).trim(),en=[f[1]];if(/남자/.test(rest))en.push('MALE');if(/여자/.test(rest))en.push('FEMALE');
  const lv=/유치/.test(rest)?'KIDS':/초등/.test(rest)?'ELEMENTARY':/중·고|중고/.test(rest)?'MIDDLE–HIGH SCHOOL':/중등/.test(rest)?'MIDDLE SCHOOL':/고등/.test(rest)?'HIGH SCHOOL':/실버/.test(rest)?'SILVER':/일반/.test(rest)?'ADULT':'';if(lv)en.push(lv);
  const gm=/(\d)학년/.exec(rest);if(gm)en.push('GRADE '+gm[1]);const bm=/(저|중|고)학년/.exec(rest);if(bm)en.push({저:'GRADE 1–2',중:'GRADE 3–4',고:'GRADE 5–6'}[bm[1]]);
  if(/A조|유품/.test(rest))en.push('GROUP A');if(/B조|유급/.test(rest))en.push('GROUP B');const kg=/([−\-+]?\d+\s*kg)/i.exec(rest);if(kg)en.push(kg[1].toUpperCase());
  return {ko:f[0],rest,en:en.join(' · ')};}
const arStEn=t=>{t=String(t||'');return /준결/.test(t)?'SEMIFINAL':/결승|결선/.test(t)?'FINAL':/8강/.test(t)?'QUARTERFINAL':/16강/.test(t)?'ROUND OF 16':/32강/.test(t)?'ROUND OF 32':/예선/.test(t)?'PRELIMINARY':/본선/.test(t)?'MAIN ROUND':/재경기/.test(t)?'REMATCH':'';};
function arTop(m,ko,en){const v=arEv(m.div),title=(v.ko?`${E(v.ko)} <i>${E(v.rest)}</i>`:`<i>${E(m.div||m.comp||'')}</i>`);
  return `<div class="ar-top">${m.court?`<div class="ar-court"><b>${E(m.court)}</b><span>코트</span></div>`:''}
    <div class="ar-ev"><span class="ar-en">${E(v.en||'')}</span><h2 style="font-size:${U(fit(m.div||m.comp,56,28))}">${title}</h2></div>
    <div class="ar-stage"><span class="ar-en">${E(en||arStEn(ko))}</span><b>${E(ko||'')}</b></div></div>`;}
const arNext=n=>n&&n.who?`<div class="ar-next"><span class="ar-en">Next</span><b>${E(n.who)}</b><small>${E(n.team||n.div||'')}</small></div>`:`<div class="ar-next"><span class="ar-en">Next</span><b>—</b></div>`;
function arStand(rows,unit){const t=(rows||[]).slice(0,3);if(!t.length)return `<div class="ar-cell ar-mute"><span>아직 순위 없음</span></div><div class="ar-cell ar-mute"></div><div class="ar-cell ar-mute"></div>`;
  return t.map(r=>`<div class="ar-cell ${r.rank===1?'r1':''} ${r.me?'me':''}"><span class="ar-rk">${r.rank}</span><span class="ar-rn"><b>${E(r.name||r.team)}</b><small>${E(r.name?r.team:'')}</small></span><span class="ar-rs">${E(r.score)}</span></div>`).join('')+(t.length<3?'<div class="ar-cell ar-mute"></div>'.repeat(3-t.length):'');}
function arBot(lab,en,mid,next){return `<div class="ar-bot"><div class="ar-lab"><b>${E(lab)}</b><span class="ar-en">${E(en)}</span></div>${mid}${arNext(next)}</div>`;}
/* 컷오프: 현재 순위 위 3명 · 심판별 점수 (화면 자료에 덧붙임) */
function arExtra(m){try{m.top=[];m.js=null;const cur=g('curOf')(),S=g('S');if(!cur||!S)return;m.isTeam=APP==='poomsae'?/^(gym|team100)$/.test(cur.type||''):!!(cur.members);const d=S.divs.find(x=>x.id===cur.divId);if(!d)return;
  if(APP==='poomsae'){const e=(cur.entries||[])[0]||{},stg=cur.stage?g('stagesOf')(d).find(x=>x.key===cur.stage):null;
    if(stg){const rows=g('stageRanked')(d,stg)||[];m.top=rows.slice(0,3).map(x=>{const a=(g('athlete')||(()=>null))(x.id)||{};return {rank:x.rank,name:a.name||'',team:a.team||'',score:(+x.agg.final).toFixed(2),me:x.id===e.athleteId};});m.total=rows.length;}
    const r=S.results[e.perfId];let sh=null;try{sh=g('SHEETS')[cur.type];}catch(x){}const la=(sh&&sh.A&&sh.A.label)||'정확성',lb=(sh&&sh.B&&sh.B.label)||'표현성';
    /* v1.7.29 항목마다 들어간 점수(k)·빠진 점수(x) */
    if(r&&r.judges&&m.scr==='score')m.js=r.judges.map(j=>({n:j.judge,t:((+j.a||0)+(+j.b||0)).toFixed(1),items:[{l:la,v:(+j.a).toFixed(1),x:!!j.dropA},{l:lb,v:(+j.b).toFixed(1),x:!!j.dropB}],sub:`<span class="${j.dropA?'x':'k'}">${(+j.a).toFixed(1)}</span> · <span class="${j.dropB?'x':'k'}">${(+j.b).toFixed(1)}</span>`,drop:j.dropA&&j.dropB,per:true}));}
  else{const st=g('stagesOf')(d).find(x=>x.key===cur.stage)||g('curStage')(d),ids=st.groups&&cur.group!=null?st.groups[cur.group]||[]:g('stIds')(st),RT=g('resultText');
    const rows=g('rankList')(d,st.key,ids).filter(x=>x.ok);m.top=rows.slice(0,3).map(x=>{const a=g('athlete')(x.id)||{};return {rank:x.rank,name:a.name||'',team:a.team||'',score:RT(x.r),me:x.id===cur.athleteId};});m.total=rows.length;
    const r=S.results[cur.perfId],JU=g('JUDGED');if(r&&r.judges&&JU&&JU(cur.kind)&&m.scr==='score'){const cols=g('itemCols')(cur),fN=g('fmtN')||(v=>v);
      const PFf=g('pf'),k1=PFf?PFf(r):1,sc=v=>k1!==1?String(Math.round(v*k1*100)/100):fN(v);m.js=r.judges.map((j,i)=>{const dr=r.judges.length>=5&&(i===r.hi||i===r.lo);return {n:j.judge,t:sc(j.total),items:cols.map(c=>({l:c.l,v:sc(c.v(j.items||{})),x:dr})),sub:cols.map(c=>`<span class="${dr?'x':'k'}">${E(c.l)} ${sc(c.v(j.items||{}))}</span>`).join(' · '),drop:dr,why:dr?(i===r.hi?'최고점 제외':'최저점 제외'):''};});}}
}catch(e){console.error('[KS_ARENA]',e);}}
const arStage=m=>m.label||'';
function arJudges(js){if(!js||!js.length)return '';return `<div class="ar-js" style="--n:${js.length}">${js.map(j=>j.t!=null?`<div class="ar-j rv ${j.drop?'drop':j.per?'':'in'}"><span class="ar-jn">${j.n}</span><b>${E(j.t)}</b>${j.items?`<div class="ar-ji">${j.items.map(it=>`<span class="${it.x?'jx':'jk'}"><i>${E(it.l)}</i>${E(it.v)}</span>`).join('')}</div>`:`<small>${j.sub}</small>`}${j.drop&&j.why?`<em class="ar-why">${E(j.why)}</em>`:''}</div>`
  :`<div class="ar-j ${j.ok?'ok':'wait'}"><span class="ar-jn">${j.n}</span><b>${j.ok?'입력':'—'}</b><small>${j.ok?'Judge '+j.n:'채점 중'}</small></div>`).join('')}</div>`;}
function aIdle(m){return `<div class="ar-idle"><span class="ar-en">Official Competition</span><h1 style="font-size:${U(fit(m.comp,210,8))}">${E(m.comp)}</h1><p>곧 경기가 시작됩니다</p><span class="ar-clock" data-now></span>${m.court?`<div class="ar-ic"><b>${E(m.court)}</b> 코트</div>`:''}</div>`;}
/* v1.7.76 팀(단체) 이름은 파란 칸 너비에 꽉 차게, 팀원 이름은 이름 단위로 줄바꿈(이름이 중간에 끊기지 않게) + 두 줄 안에서 최대한 크게 */
function memHtml(mem){const L=String(mem||'').split(/\s*[,·/]\s*|\s{2,}/).map(x=>x.trim()).filter(Boolean);return L.map((x,i)=>`<span class="ar-mn">${E(x)}${i<L.length-1?',':''}</span>`).join(' ');}
function memSize(mem,w,lines,max){const c=String(mem||'').replace(/\s+/g,' ').length;return c?Math.max(26,Math.min(max,w*lines/(c*0.92+2))):max;}
function aWho(m){const team=!m.name||m.isTeam,nm=m.name||m.team,n=String(nm||'').length;
  const fs=m.isTeam?Math.max(70,Math.min(260,1000/(Math.max(n,1)*0.95))):fit(nm,300,3);
  return `<div class="ar-who"><span class="ar-en">${team?'Team':'Athlete'}</span><div class="ar-nm${m.isTeam?' ks-fillw':''}" ${m.isTeam?'data-fmax="300"':''} style="font-size:${U(fs)}">${E(nm)}</div>${m.name&&m.team?`<div class="ar-tm">${E(m.team)}</div>`:''}${m.members?`<div class="ar-mem ar-mem2 ks-fillh" data-fmax="64" style="font-size:${U(memSize(m.members,1000,2,60))}">${memHtml(m.members)}</div>`:''}</div>`;}
function aLive(m){const js=(m.judges||[]).map((ok,i)=>({n:i+1,ok}));
  const right=m.liveCount?`<div class="ar-sc"><span class="ar-en">${E(m.liveCount.l)}</span><div class="ar-big dzlive">${E(m.liveCount.v)}<small>${E(m.liveCount.u)}</small></div><div class="ar-sub">경기 시간 <span class="timer" data-timer>${E(m.timer||'')}</span></div></div>`
    :`<div class="ar-sc"><span class="ar-en">Time</span><div class="ar-big ar-time timer" data-timer>${E(m.timer||'')}</div><div class="ar-sub">${m.name?'경기 시간':'연기 시간'}</div></div>`;
  return `${arTop(m,arStage(m))}<div class="ar-mid"><div class="ar-band">${aWho(m)}${right}</div>${arJudges(js)}</div>${arBot('현재 순위','Standings',arStand(m.top),m.next)}`;}
function aScore(m){const parts=(m.parts||[]).map(p=>`<span class="ar-p ${p.neg?'neg':''}"><small>${E(p.l)}</small><b>${E(p.v)}</b></span>`).join('');
  return `${arTop(m,arStage(m))}<div class="ar-mid"><div class="ar-band">${aWho(m)}<div class="ar-sc"><span class="ar-en">Score</span><div class="cbres ar-res">${parts}<span class="cbfinal ar-final">${E(m.final)}</span></div>${m.note?`<div class="ar-sub neg">${E(m.note)}</div>`:''}</div></div>${arJudges(m.js)}</div>${arBot('현재 순위','Standings',arStand(m.top),m.next)}`;}
/* v1.7.17 순위는 위에서 아래로 한 줄씩 (금 → 은 → 동 → 동) 크게 — 좌우 두 줄로 엇갈리지 않게 */
function aRank(m){const R=m.rows||[],me=R.find(r=>r.me);let show=R.slice(0,8);if(me&&!show.includes(me)){const k=R.indexOf(me);show=R.slice(0,5).concat(R.slice(Math.max(5,k-1),k+2));}
  const rowH=Math.max(64,Math.min(138,Math.floor((640-(show.length-1)*12)/Math.max(1,show.length))));
  const row=(r,i)=>`<div class="ar-rr one ${r.rank===1?'g1':''} ${r.me?'me':''} ${m.pre&&!r.inq?'out':''}${skMc(r.rank,m)}" style="--i:${i};height:${U(rowH)};--rh:${rowH}">${r.me?'<i class="cbr me sk-mk" style="--dl:0ms"></i>':''}<span class="ar-rk">${skRk(r.rank,m)}</span><span class="ar-rn"><b>${E(r.name||r.team)}${r.me?'<em>지금</em>':''}</b><small>${E(r.name?r.team:'')}</small></span><span class="ar-rs">${E(r.score)}</span></div>`;
  const cut=m.pre&&m.quota&&R.length>m.quota?`<div class="ar-cut"><span>${E(m.cut||'')}</span><span class="ar-en">Qualified</span></div>`:'';
  return `${arTop(m,String(m.label||'').replace(/\s*\d+\s*번$/,'')+' 순위','STANDINGS')}<div class="ar-mid"><div class="ar-rank one">${show.map(row).join('')}</div>${cut}</div>
    ${arBot('진행','Progress',`<div class="ar-cell ar-wide"><span class="ar-rn"><b>${me?`${E(me.name||me.team)} · 현재 ${me.rank}위`:'순위'}</b><small>${R.length}${E(m.unit||'명')} 경기 마침${m.pre&&m.quota?` · 상위 ${m.quota}${E(m.unit||'명')} 진출`:''}</small></span></div>`,m.next)}`;}
/* ---------- 품새 토너먼트 (청·홍) ---------- */
function arTourModel(){const T=window.KS_THEME;if(!T||!T.model)return null;let m;try{m=T.model();}catch(e){return null;}if(!m||!/^(duel|duelres|bracket|champ)$/.test(m.scr))return null;
  m.el=m.el2!=null&&m.el2>=0?m.el2:m.el;return m;}
const f3=v=>v==null?'—':(+v).toFixed(2);
function tSide(s,res){const b=s.side==='blue';const js=res?(s.js||[]).map(j=>`<span class="ar-jv ${j.dA&&j.dB?'x':''}">${(+j.t).toFixed(1)}</span>`).join(''):(s.live||[]).map(j=>`<span class="ar-jd ${j.ok?'ok':''}">${j.n}</span>`).join('');
  return `<div class="ar-side side ${b?'ar-b':'ar-r'} ${s.win?'win':''} ${s.lose?'lose':''}"><div class="ar-sh">${b?'청':'홍'}<span class="ar-en">${b?'Blue':'Red'}</span>${s.win?'<span class="ar-wtag">WIN</span>':''}</div>
    <div class="ar-sb"><div class="ar-nm" style="font-size:${U(fit(s.name,res?120:150,4))}">${E(s.name)}</div><div class="ar-tm">${E(s.team)}</div>
    ${res&&s.res?`<div class="ar-sbig vfinal">${f3(s.res.final)}</div><div class="ar-sub">${s.res.parts?`1품새 ${f3(s.res.parts[0])} · 2품새 ${f3(s.res.parts[1])}`:`정확성 ${f3(s.res.a)} · 표현성 ${f3(s.res.b)}`}${s.res.ded?` · 감점 −${(+s.res.ded).toFixed(1)}`:''}</div>`:''}
    <div class="ar-jrow">${js}</div></div></div>`;}
function aDuel(m){const [b,r]=m.sides,pl=m.pl?m.pl.map(p=>p.nm).join('<br>'):'';
  return `${arTop(m,m.label)}<div class="ar-mid"><div class="ar-vs">${tSide(b,false)}<div class="ar-vc"><span class="ar-vsx">VS</span>${pl?`<span class="ar-pm">${pl}</span>`:''}<span class="ar-vt timer" data-timer>${E(m.timer||'')}</span></div>${tSide(r,false)}</div></div>
    ${arBot('진행','Progress',`<div class="ar-cell ar-wide"><span class="ar-rn"><b>${E(m.label||'')}</b><small>심판 입력이 모두 끝나면 점수를 공개합니다</small></span></div>`,m.next)}`;}
function aDuelres(m){const [b,r]=m.sides,w=m.sides.find(s=>s.win);
  return `${arTop(m,m.label)}<div class="ar-mid"><div class="ar-vs">${tSide(b,true)}<div class="ar-vc"><span class="ar-vsx">VS</span>${m.pl?`<span class="ar-pm">${m.pl.map(p=>E(p.nm)).join('<br>')}</span>`:''}</div>${tSide(r,true)}</div></div>
    ${arBot('판정','Decision',`<div class="ar-cell ar-wide"><span class="ar-rn"><b>${w?`<span class="ar-${w.side}">${w.side==='blue'?'청':'홍'}</span> ${E(w.name)} 승`:E(m.note||'판정')}</b><small>${E(m.note||'')}</small></span></div>`,m.next)}`;}
function arBk(m){const rs=m.rounds||[],R=rs.length;if(!R)return '';
  if(rs[0].length>2){const x=rs.flat().find(q=>q.cur),ri=x?x.r-1:0,ms=rs[ri]||[];   /* 큰 대진: 지금 라운드 경기만 칸으로 */
    return `<div class="ar-bkh ar-en">${E(g('roundName')?g('roundName')(ri+1,R):'')}</div><div class="ar-bkg" style="--c:${Math.min(4,ms.length)}">${ms.map(q=>`<div class="ar-bm ${q.cur?'now':''}">${['blue','red'].map(sd=>{const p=q[sd],sc=sd==='blue'?q.bS:q.rS;return `<div class="ar-bp ${q.win===sd?'w':q.win?'l':''}"><i class="${sd}"></i><b>${p?E(p.name):'—'}</b><small>${sc!=null?f3(sc):''}</small></div>`;}).join('')}</div>`).join('')}</div>`;}
  const col=(ms,ri)=>`<div class="ar-bc"><span class="ar-en">${E(ri===R-1?'Final':g('roundName')?g('roundName')(ri+1,R):'')}</span>${ms.map(x=>`<div class="ar-bm ${x.cur?'now':''}">${['blue','red'].map(sd=>{const p=x[sd],sc=sd==='blue'?x.bS:x.rS;return `<div class="ar-bp ${x.win===sd?'w':x.win?'l':''}"><i class="${sd}"></i><b>${p?E(p.name):'—'}</b><small>${sc!=null?f3(sc):''}</small></div>`;}).join('')}</div>`).join('')}</div>`;
  return `<div class="ar-bk" style="--c:${R}">${rs.map(col).join('')}</div>`;}
function aBracket(m){const all=(m.rounds||[]).flat(),x=all.find(q=>q.cur),ws=x&&x.win?x[x.win]:null,last=x&&x.r===(m.R-1);
  return `${arTop(m,(m.round||m.label||'')+' 결과','RESULT')}<div class="ar-mid ar-mid2">${ws?`<div class="ar-hero ${x.win}"><div><span class="ar-en">Winner · ${x.win==='blue'?'청 Blue':'홍 Red'}</span><div class="ar-nm" style="font-size:${U(fit(ws.name,170,4))}">${E(ws.name)}</div><div class="ar-tm">${E(ws.team||'')} · ${f3(x.win==='blue'?x.bS:x.rS)}점</div></div><div class="ar-hr"><span class="ar-en">${last?'Advances to Final':'Advances'}</span><b>${last?'결승 진출':'다음 경기 진출'}</b></div></div>`:''}${arBk(m)}</div>
    ${arBot('진행','Progress',`<div class="ar-cell ar-wide"><span class="ar-rn"><b>${E(m.div||'')}</b><small>${E(m.round||'')} 경기 마침</small></span></div>`,m.next)}`;}
function aChamp(m){const p=m.path&&m.path.length?m.path[m.path.length-1]:null;
  return `${arTop(m,'최종 결과','CHAMPION')}<div class="ar-mid ar-mid2"><div class="ar-hero gold"><div><span class="ar-en">Champion · 우승</span><div class="ar-nm" style="font-size:${U(fit(m.champ.name,190,4))}">${E(m.champ.name)}</div><div class="ar-tm">${E(m.champ.team||'')}${p?` · 결승 ${f3(p.me)} : ${f3(p.op)}`:''}</div></div><div class="ar-hr"><span class="ar-en">Gold Medal</span><b>우승</b></div></div>
    <div class="ar-pods"><div class="ar-cell"><span class="ar-rk s">2</span><span class="ar-rn"><b>${E(m.second.name||'—')}</b><small>${E(m.second.team||'')}</small></span></div>${(m.thirds||[]).map(t=>`<div class="ar-cell"><span class="ar-rk b">3</span><span class="ar-rn"><b>${E(t.name)}</b><small>${E(t.team||'')}</small></span></div>`).join('')}</div></div>
    ${arBot('시상','Medals',`<div class="ar-cell ar-wide"><span class="ar-rn"><b>${E(m.div||'')}</b><small>시상대 준비</small></span></div>`,m.next)}`;}
const ASCR={idle:aIdle,live:aLive,score:aScore,rank:aRank,duel:aDuel,duelres:aDuelres,bracket:aBracket,champ:aChamp};

/* ===================== ⚔️ 청·홍 대결 (v1.7.15 품새 토너먼트 새 전광판) =====================
   - 경기 중: 왼쪽 청 · 오른쪽 홍, 가운데 금색 띠에 「몇 강 · 지정 품새 · 시간」
   - 점수 공개: 심판 카드가 한꺼번에 뒤집히고 → 최고·최저(정확성·표현성 따로) 줄 긋기 → 최종 점수
     → 이긴 쪽이 화면 2/3로 커지며 금색 「승」 · 반짝이 · 소리 (동점이면 「재경기」)
   - 경기 사이: 대진표 — 이긴 선수가 다음 칸으로 넘어감 · 결승이 끝나면 우승 화면 */
const DZ_WIN=3200;
const dzRound=m=>{const t=String(m.round||m.label||'');const r=/(준결승|결승|\d+\s*강)/.exec(t);return r?r[1].replace(/\s/g,''):t.split('·')[0].trim();};
const dzRoundEn=t=>/준결/.test(t)?'SEMI-FINAL':/결승/.test(t)?'FINAL':/(\d+)강/.test(t)?'ROUND OF '+(/(\d+)강/.exec(t)[1]):'';
function dzTop(m){const v=arEv(m.div);return `<div class="dz-top"><div class="dz-court">${m.court?`<b>${E(m.court)}</b><span>COURT</span>`:''}</div>
  <div class="dz-ev"><h2 style="font-size:${U(fit(m.div||m.comp,52,26))}">${E(m.div||m.comp||'')}</h2><span>${E(v.en||'POOMSAE TOURNAMENT')}</span></div><div class="dz-comp">${E(m.comp||'')}</div></div>`;}
function dzBand(m,res){const rd=dzRound(m),pl=m.pl||[];
  return `<div class="dz-band"><div class="dz-rd"><span>${E(dzRoundEn(rd))}</span><b style="font-size:${U(fit(rd,96,3))}">${E(rd||'대결')}</b></div>
    ${pl.length?`<div class="dz-pl"><small>지정 품새</small>${pl.map(p=>`<div class="dz-pi ${p.on&&pl.length>1?'on':''}">${pl.length>1?`<i>${E(p.lab)}</i>`:''}<b style="font-size:${U(fit(p.nm,40,5))}">${E(p.nm)}</b></div>`).join('')}</div>`:''}
    ${res?`<div class="dz-vs">판정</div>`:`<div class="dz-tm timer" data-timer>${E(m.timer||'')}</div>`}</div>`;}
const f1=v=>v==null?'—':(+v).toFixed(1);
function dzSide(s,m,res){const b=s.side==='blue',w=res&&s.win,l=res&&s.lose,tie=res&&m.win==='tie';
  const cards=res?(s.js||[]).map((j,i)=>`<div class="dz-card" style="--i:${i}"><div class="dz-cin"><div class="dz-back"><span>${b?'청':'홍'}</span></div>
      <div class="dz-face"><small>${j.n}심</small><div class="dz-v ${j.dA?'drop':''}"><i>정확</i><b>${f1(j.a)}</b></div><div class="dz-v ${j.dB?'drop':''}"><i>표현</i><b>${f1(j.b)}</b></div></div></div></div>`).join('')
    :(s.live||[]).map(j=>`<span class="dz-jd ${j.ok?'ok':''}">${j.n}</span>`).join('');
  const r=s.res;
  return `<div class="dz-side ${b?'blue':'red'} ${w?'win':''} ${l?'lose':''}">
    <div class="dz-hd"><b>${b?'청':'홍'}</b><span>${b?'BLUE':'RED'}</span></div>
    <div class="dz-who"><div class="dz-nm" style="font-size:${U(fit(s.name,res?110:150,4))}">${E(s.name)}</div><div class="dz-tmn">${E(s.team)}</div></div>
    ${res?`<div class="dz-cards">${cards}</div>
      <div class="dz-fin"><b>${r?(+r.final).toFixed(2):'—'}</b><small>${r?(r.parts?`1품새 ${(+r.parts[0]).toFixed(2)} · 2품새 ${(+r.parts[1]).toFixed(2)}`:`정확성 ${(+r.a).toFixed(2)} · 표현성 ${(+r.b).toFixed(2)}`)+(r.ded?` · 감점 −${(+r.ded).toFixed(1)}`:''):''}</small></div>
      ${w?`<div class="dz-win"><b>승</b><span>WINNER</span></div><div class="dz-spk">${Array.from({length:26},(_,k)=>`<i style="--x:${(k*37)%100}%;--y:${(k*61)%92}%;--k:${k}"></i>`).join('')}</div>`:''}
      ${tie?'<div class="dz-tie">동점</div>':''}`
    :`<div class="dz-jds">${cards}</div>`}</div>`;}
function dDuel(m){const [b,r]=m.sides;return `${dzTop(m)}<div class="dz-stage">${dzSide(b,m,false)}${dzBand(m,false)}${dzSide(r,m,false)}</div>${dzNext(m)}`;}
function dRes(m){const [b,r]=m.sides;return `${dzTop(m)}<div class="dz-stage res ${m.win==='blue'||m.win==='red'?'decided w-'+m.win:''}">${dzSide(b,m,true)}${dzBand(m,true)}${dzSide(r,m,true)}</div>
  ${m.win==='tie'||!m.win?`<div class="dz-note">${E(m.note||'')}</div>`:m.why?`<div class="dz-note dzw">${E(m.why)}</div>`:''}${dzNext(m)}`;}
const dzNext=m=>m.next&&m.next.who?`<div class="dz-next"><span>NEXT</span>${E(m.next.who)}${m.next.label?` · <small>${E(m.next.label)}</small>`:''}</div>`:'';
function dBracket(m){const rs=m.rounds||[],R=rs.length;if(!R)return dzTop(m);const x=rs.flat().find(q=>q.cur),cr=x?x.r-1:0;
  const from=rs[0].length>8?Math.max(0,Math.min(cr,R-3)):0,cols=rs.slice(from),ws=x&&x.win?x[x.win]:null,nx=x?(rs[x.r]||[])[Math.floor(x.i/2)]:null;
  const slot=(q,sd,ri)=>{const p=q[sd],sc=sd==='blue'?q.bS:q.rS,adv=nx&&q===nx&&ws&&p&&p.name===ws.name;
    return `<div class="dz-bs ${sd} ${q.win===sd?'w':q.win?'l':''} ${adv?'adv':''}"><i></i><b>${p?E(p.name):'—'}</b><small>${sc!=null?(+sc).toFixed(2):p?E(p.team||''):''}</small></div>`;};
  const col=(ms,k)=>{const ri=from+k;return `<div class="dz-bc"><div class="dz-bch">${E(g('roundName')?g('roundName')(ri+1,R):'')}</div><div class="dz-bcl">${ms.map(q=>`<div class="dz-bm ${q.cur?'now':''} ${nx===q?'nx':''}">${slot(q,'blue',ri)}${slot(q,'red',ri)}</div>`).join('')}</div></div>`;};
  return `${dzTop(m)}<div class="dz-bkhero">${ws?`<span class="dz-dot ${x.win}"></span><b>${E(ws.name)}</b><span>${x.r===R-1?'결승 진출':'다음 경기 진출'}</span>`:`<b>${E(m.round||'')} 경기 마침</b>`}</div>
    <div class="dz-bk" style="--c:${cols.length};--sh:${U(Math.max(24,Math.min(52,(720/Math.max(1,cols[0].length)-14)/2)))};--fs:${U(Math.max(17,Math.min(28,(720/Math.max(1,cols[0].length)-14)/2*0.56)))}">${cols.map(col).join('')}</div>${dzNext(m)}`;}
function dChamp(m){const p=m.path&&m.path.length?m.path[m.path.length-1]:null;
  return `${dzTop(m)}<div class="dz-champ"><div class="dz-spk all">${Array.from({length:40},(_,k)=>`<i style="--x:${(k*37)%100}%;--y:${(k*53)%96}%;--k:${k}"></i>`).join('')}</div>
    <span class="dz-cl">CHAMPION · 우승</span><div class="dz-cn" style="font-size:${U(fit(m.champ.name,200,4))}">${E(m.champ.name)}</div><div class="dz-ct">${E(m.champ.team||'')}${p?` · 결승 ${(+p.me).toFixed(2)} : ${(+p.op).toFixed(2)}`:''}</div>
    <div class="dz-pods"><div><i class="s">은</i><b>${E(m.second.name||'—')}</b><small>${E(m.second.team||'')}</small></div>${(m.thirds||[]).map(t=>`<div><i class="b">동</i><b>${E(t.name)}</b><small>${E(t.team||'')}</small></div>`).join('')}</div></div>${dzNext(m)}`;}
const DSCR={duel:dDuel,duelres:dRes,bracket:dBracket,champ:dChamp};
/* 「승」 소리: 점수 공개 뒤 DZ_WIN ms · 우승 화면 · 같은 경기에 한 번만 */
const DZ_PLAYED=new Set();
function dzAudio(){let a=null;try{a=g('audioCtx');if(!a){const u=g('unlockAudio');if(u)u();a=g('audioCtx');}}catch(e){}return a;}
function dzFan(big){const a=dzAudio();if(!a)return;try{if(a.state==='suspended')a.resume();const t0=a.currentTime+.02,N=big?[523,659,784,1047,1319]:[523,659,784,1047];
  N.forEach((f,i)=>{const o=a.createOscillator(),gn=a.createGain();o.type='triangle';o.frequency.value=f;const t=t0+i*.11;gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.2,t+.02);gn.gain.exponentialRampToValueAtTime(.001,t+(i===N.length-1?1.4:.5));o.connect(gn).connect(a.destination);o.start(t);o.stop(t+1.5);});
  for(let k=0;k<10;k++){const o=a.createOscillator(),gn=a.createGain(),t=t0+.45+k*.07;o.type='sine';o.frequency.value=2000+((k*397)%1400);gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.05,t+.01);gn.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(gn).connect(a.destination);o.start(t);o.stop(t+.3);}}catch(e){}}
function dzSound(m){const k=m.key||'';if(DZ_PLAYED.has(k))return;
  if(m.scr==='duelres'&&(m.win==='blue'||m.win==='red')){const el=m.el||0;if(el>DZ_WIN+1500){DZ_PLAYED.add(k);return;}DZ_PLAYED.add(k);setTimeout(()=>dzFan(false),Math.max(0,DZ_WIN+100-el));}
  else if(m.scr==='champ'){DZ_PLAYED.add(k);if((m.el2||0)<1500)setTimeout(()=>dzFan(true),300);}
  if(DZ_PLAYED.size>60)DZ_PLAYED.delete(DZ_PLAYED.values().next().value);}
/* ---------- 겨루기 ---------- */
function arKy(orig){const L=g('live')&&g('live')();if(!L)return null;const st=g('ST')(),set=g('SET')(),EN=g('eng')(),sc=g('shownScore')(L,EN),gj=g('shownGj')(L,EN),res=L.result,ph=L.phase,bo3=set.system==='bo3';
  const mmss=g('mmss'),remain=g('remain'),rl=g('roundLabel')||(r=>r+'회전');
  let ctl='';try{const h=orig.apply(window,[]);const k=String(h).indexOf('<div class="ksb-s">');if(k>0)ctl=String(h).slice(String(h).indexOf('>')+1,k);}catch(e){}
  const d=(sc.blue||0)-(sc.red||0),nGj=bo3&&L.round<4?5:10,court=F.court||'';
  const phaseTxt=res?`${res.side==='blue'?'청':'홍'} 승`:ph==='break'?'갈려':ph==='rest'?'휴식':ph==='decide'?'우세 판정':ph==='ready'?'준비':L.round===4?'골든라운드':'경기 중';
  const pcls=res?'win':ph==='fight'?'on':'brk';
  const side=s=>{const p=L[s]||{},b=s==='blue',rw=(L.roundWins||{})[s]||0;
    return `<div class="ks-side ${s} ${res&&res.side===s?'win':''} ${res&&res.side!==s?'lose':''}"><div class="ks-pn"></div><div class="ar-sh">${b?'청':'홍'}<span class="ar-en">${b?'Blue Corner':'Red Corner'}</span>${bo3?`<span class="ks-rw">${[0,1].map(i=>`<i class="${i<rw?'on':''}"></i>`).join('')}</span>`:''}${res&&res.side===s?'<span class="ar-wtag">WIN</span>':''}</div>
      <div class="ks-who"><div class="ks-nm" style="font-size:${U(fit(p.name,84,4))}">${E(p.name||'')}</div><div class="ks-tm">${E(p.team||'')}</div></div>
      <div class="ks-sco"><b>${sc[s]}</b></div>
      <div class="ks-gj"><span class="ar-en">Gam-jeom</span>감점 <b>${gj[s]}</b> ${Array.from({length:nGj},(_,i)=>`<i class="${i<gj[s]?'on':''}"></i>`).join('')}</div></div>`;};
  const rlog=(L.roundLog||[]).map(x=>`<span class="${x.side==='blue'?'b':x.side==='red'?'r':''}">${E(rl(x.r))} ${x.b} : ${x.rr}${x.side?' · '+(x.side==='blue'?'청':'홍'):''}</span>`).join('');
  let nx=null;try{const b=window.KS_HQ&&KS_HQ.board(),n=b&&b.next&&b.next[0];if(n)nx={who:(n.names||[]).map(p=>p.name).filter(Boolean).join(' vs '),div:n.label||n.div||''};}catch(e){}
  const m={div:L.divName||'',label:L.label||'',court};
  return `<div class="board ksb ky ar" style="--cc:${arCol(court)}">${ctl}<div class="ksb-s"><div class="ar-bg"></div><span class="ksb-div" style="display:none"><b>${E(L.divName||'')}</b></span>${arTop(m,(L.label||'')+(bo3?' · 3전 2선승':''),(arStEn(L.label)||'MATCH')+(bo3?' · BEST OF 3':''))}
    <div class="ar-kmid">${side('blue')}<div class="ar-ctr"><div class="ar-ph ${pcls}">${E(phaseTxt)}${res&&res.how?` · ${E(res.how)}`:''}</div>
      <div class="ar-clock ${ph==='rest'?'rest':ph!=='fight'?'stop':''}"><span class="ar-en">${ph==='rest'?'Rest':'Time'}</span><b data-timer>${mmss(remain(L.timer))}</b></div>
      <div class="ar-rd"><b>${L.round===4?'GOLDEN ROUND':'ROUND '+L.round}</b></div>${d&&!res?`<div class="ar-lead ${d>0?'b':'r'}">LEAD +${Math.abs(d)} · ${d>0?'청':'홍'}</div>`:''}</div>${side('red')}</div>
    <div class="ar-bot"><div class="ar-lab"><b>라운드</b><span class="ar-en">Rounds</span></div><div class="ar-rlog">${rlog||'<span>1회전</span>'}</div>${arNext(nx)}</div></div></div>`;}
/* ===================== v1.7.30 점수 공개 화면 모양 (모든 디자인 공통) =====================
   ① 왼쪽에 1심부터 한 줄씩 · 오른쪽에 선수 이름과 아주 큰 총점
   ② 위에 선수 이름과 총점을 크게 · 아래에 심판 점수 한 줄 (경기장 「격파 B조」 화면 모양)
   청·홍 토너먼트: 양쪽 끝에 청·홍 심판 점수 · 가운데에 두 선수 이름과 총점
   들어간 점수 = 밝은 흰색 · 빠진 점수(최고·최저) = 어두운 회색 (줄 긋지 않음) · 색은 고른 디자인에 맞춤 */
const LAYS=[['1','① 심판 왼쪽 · 총점 오른쪽'],['2','② 이름·총점 위 · 심판 아래'],['0','디자인 그대로']];
const LAYS_T=[['1','청·홍 양쪽 심판 · 가운데 총점'],['0','디자인 그대로']];
const LAY_DEF={recognized:'2',freestyle:'2',gym:'2',team100:'2',gyeokpa:'2',tour:'1'}; /* v1.7.35 컷오프 경기는 모두 ② (이름·총점 크게) */
const layKey=cur=>APP==='gyeokpa'?'gyeokpa':cur&&(cur.entries||[]).length===2?'tour':(cur&&cur.type)||'recognized';
function layFor(cur){if(APP==='kyorugi')return '0';const L=SET().layBy||{},k=layKey(cur);return L[k]!=null?String(L[k]):(LAY_DEF[k]||'1');}
function lyHead(m,th){return `<div class="ly-top"><span class="ly-court">${E(String(m.court||'').replace(/\s*코트$/,''))}<small>코트</small></span><span class="ly-div">${E(m.div||'')}</span><span class="ly-lab">${E(m.label||'')}</span></div>`;}
function lyParts(m){return (m.parts||[]).map(p=>`<span class="${p.neg?'neg':''}"><i>${E(p.l)}</i>${E(p.v)}</span>`).join('');}
function lyLegend(js){return js&&js.length>=5?`<span class="ly-lg"><i class="k"></i>들어간 점수 <i class="o"></i>빠진 점수 (최고·최저)</span>`:'';}
function lyNext(m){return m.next&&m.next.who?`<span class="ly-nx"><i>NEXT</i>${E(m.next.who)}${m.next.team?' · '+E(m.next.team):''}</span>`:'';}
const lyIt=it=>`<span class="${it.x?'o':''}"><i>${E(it.l)}</i><b>${E(it.v)}</b></span>`;
function lyWrap(th,m,cls,body){if(m.el==null)m.el=since('ly|'+(m.key||''));
  return `<div class="board ksb-solo sk sk-lay ly-${th||'base'} ${cls}" style="--cc:${arCol(m.court)}"><div class="ly-bg"></div><div class="sk-s" style="--t:-${Math.max(0,m.el||0)}ms">${body}</div></div>`;}
function lySolo(th,lay,m){const js=m.js||[],N=js.length;
  if(lay==='1'){const rows=js.map((j,i)=>`<div class="ly-j ${j.drop?'out':''}" style="--d:${i*90}ms"><b class="ly-jn">${j.n}<small>심</small></b><span class="ly-its">${(j.items||[]).map(lyIt).join('')}</span><b class="ly-jt">${E(j.t)}</b></div>`).join('');
    return lyWrap(th,m,'ly1',`${lyHead(m,th)}<div class="ly-main"><div class="ly-js" style="--n:${Math.max(N,3)}">${rows}</div>
      <div class="ly-me"><div class="ly-nm" style="font-size:${U(fit(m.name||m.team,180,5))}">${E(m.name||m.team)}</div>${m.name&&m.team?`<div class="ly-tm">${E(m.team)}</div>`:''}
      <div class="ly-fin">${E(m.final)}</div><div class="ly-parts">${lyParts(m)}</div>${m.note?`<div class="ly-note">${E(m.note)}</div>`:''}</div></div>
      <div class="ly-foot">${lyLegend(js)}${lyNext(m)}</div>`);}
  const cards=js.map((j,i)=>`<div class="ly-c ${j.drop?'out':''}" style="--d:${i*90}ms"><div class="ly-ch"><b>${j.n}심</b><b class="ly-ct">${E(j.t)}</b></div><div class="ly-its">${(j.items||[]).map(lyIt).join('')}</div></div>`).join('');
  /* v1.7.35 ② 위쪽 띠를 꽉 채움: 1줄 = 선수(팀) 이름 + 소속 · 2줄 = 세부(정확성·표현성 등) + 아주 큰 총점 */
  const nm=String(m.name||m.team||''),tm=m.name&&m.team?String(m.team):'',tmW=tm?Math.min(tm.length,12)*78+40:0,nmF=Math.max(110,Math.min(230,(1700-tmW)/Math.max(nm.length,1)));
  return lyWrap(th,m,'ly2',`${lyHead(m,th)}<div class="ly-band"><div class="ly-r1"><div class="ly-nm" style="font-size:${U(nmF)}">${E(nm)}</div>${tm?`<div class="ly-tm">${E(tm)}</div>`:''}</div>
    <div class="ly-r2"><div class="ly-pl"><div class="ly-parts">${lyParts(m)}</div>${m.note?`<div class="ly-note">${E(m.note)}</div>`:''}</div><div class="ly-fin">${E(m.final)}</div></div></div>
    <div class="ly-cs" style="--n:${Math.max(N,3)}">${cards}</div><div class="ly-foot">${lyLegend(js)}${lyNext(m)}</div>`);}
function lyTour(th,m){const S=m.sides||[];if(S.length!==2)return null;const f=v=>v==null?'—':(+v).toFixed(2);
  const col=s=>{const js=(s.js||[]);return `<div class="lt-js ${s.side==='blue'?'b':'r'}">${js.map((j,i)=>`<div class="lt-j ${j.dA&&j.dB?'out':''}" style="--d:${i*90}ms"><b class="ly-jn">${j.n}<small>심</small></b><span class="${j.dA?'o':''}">${(+j.a).toFixed(1)}</span><span class="${j.dB?'o':''}">${(+j.b).toFixed(1)}</span></div>`).join('')}</div>`;};
  const pl=s=>{const b=s.side==='blue',r=s.res||{};return `<div class="lt-p ${b?'b':'r'} ${s.win?'win':''} ${s.lose?'lose':''}"><div class="lt-h">${b?'청':'홍'}${s.win?'<em>WIN</em>':''}</div>
    <div class="ly-nm" style="font-size:${U(fit(s.name||s.team,120,4))}">${E(s.name||s.team)}</div><div class="ly-tm">${E(s.name?s.team:'')}</div>
    <div class="ly-fin">${f(r.final)}</div><div class="ly-parts">${r.parts?`<span><i>1품새</i>${f(r.parts[0])}</span><span><i>2품새</i>${f(r.parts[1])}</span>`:`<span><i>${E(m.labA||'정확성')}</i>${f(r.a)}</span><span><i>${E(m.labB||'표현성')}</i>${f(r.b)}</span>`}${r.ded?`<span class="neg"><i>감점</i>−${(+r.ded).toFixed(1)}</span>`:''}</div></div>`;};
  const B=S.find(x=>x.side==='blue')||S[0],Rd=S.find(x=>x.side==='red')||S[1],js=B.js||[];
  return lyWrap(th,m,'lyT',`${lyHead(m,th)}<div class="lt-main">${col(B)}<div class="lt-ctr">${pl(B)}${pl(Rd)}</div>${col(Rd)}</div>
    <div class="ly-foot">${lyLegend(js)}${m.note?`<span class="ly-nx">${E(m.note)}</span>`:''}</div>`);}
function layDraw(th,c){const lay=layFor(c);if(lay==='0')return null;
  if(c&&(c.entries||[]).length===2){if(APP!=='poomsae')return null;const tm=arTourModel();return tm&&tm.scr==='duelres'?lyTour(th,tm):null;}
  const m=APP==='poomsae'?modelPm():modelGp();if(!m||m.scr!=='score')return null;arExtra(m);if(!m.js||!m.js.length)return null;return lySolo(th,lay,m);}
/* ===================== v1.7.55 새 전광판 디자인 3가지 (품새 컷오프·토너먼트 · 태권체조 · 팀 경연 · 격파) =====================
   📺 중계방송형(bc): 올림픽·F1 중계처럼 굵은 띠 · 청·홍 반반 · 아주 큰 시간
   ▦ 타이포형(sw): 검은 바탕에 큰 글자와 가는 선만 · 형광 노랑 포인트
   ✦ 프레스티지형(pr): 남색·금빛 테두리 · 유리 카드 · 금빛 원형 시계
   화면 자료는 경기장(arena)과 같은 것을 씁니다. 효과 모듈이 찾는 이름(cbres·cbfinal·vfinal·cbr.me·dzlive·rankv)은 그대로 둡니다. */
const NEW_SK=['bc','sw','pr'];
const isNew=th=>NEW_SK.includes(th);
const nEn=t=>`<span class="n-en">${E(t)}</span>`;
function nTop(m,stageKo,stageEn){const v=arEv(m.div),st=stageKo!=null?stageKo:(m.label||'');
  return `<div class="n-top">${m.court?`<div class="n-crt"><b>${E(m.court)}</b><small>COURT</small></div>`:''}
    <div class="n-ttl">${nEn(v.en||(APP==='gyeokpa'?'BREAKING':'POOMSAE'))}<b style="font-size:${U(fit(m.div||m.comp,46,26))}">${E(m.div||m.comp||'')}</b></div>
    <div class="n-stg">${nEn(stageEn||arStEn(st)||'LIVE')}<b style="font-size:${U(fit(st,40,8))}">${E(st||'—')}</b></div></div>`;}
function nNext(m){return m.next&&m.next.who?`<div class="n-next">${nEn('Next')}<b>${E(m.next.who)}</b><small>${E(m.next.team||'')}</small></div>`:`<div class="n-next">${nEn('Next')}<b>—</b></div>`;}
function nStand(m){const t=(m.top||[]).slice(0,3);
  const cells=t.length?t.map(r=>`<div class="n-sc ${r.me?'me':''}"><i>${r.rank}</i><span><b>${E(r.name||r.team)}</b><small>${E(r.name?r.team:'')}</small></span><em>${E(r.score)}</em></div>`).join(''):`<div class="n-sc mute"><span><b>아직 순위 없음</b></span></div>`;
  return `<div class="n-bot"><div class="n-bl">${nEn('Standings')}<b>현재 순위</b></div><div class="n-scs">${cells}</div>${nNext(m)}</div>`;}
function nWho(m,big){const team=!m.name||m.isTeam,nm=m.name||m.team;
  return `<div class="n-who">${nEn(team?'Team':'Athlete')}<div class="n-nm${m.isTeam?' ks-fillw':''}" ${m.isTeam?'data-fmax="300"':''} style="font-size:${U(fit(nm,big||320,3))}">${E(nm)}</div>${m.name&&m.team?`<div class="n-tm">${E(m.team)}</div>`:''}${m.members?`<div class="n-mem ar-mem2 ks-fillh" data-fmax="64" style="font-size:${U(memSize(m.members,1000,2,60))}">${memHtml(m.members)}</div>`:''}</div>`;}
function nJs(js,live){if(!js||!js.length)return '';
  return `<div class="n-js" style="--n:${js.length}">${js.map(j=>live?`<div class="n-j ${j.ok?'ok':'wait'}"><small>J${j.n}</small><b>${j.ok?'✓':'···'}</b></div>`
    :`<div class="n-j rv ${j.drop?'drop':''}"><small>J${j.n}${j.drop?' · 제외':''}</small><b>${E(j.t)}</b>${j.items&&j.items.length?`<span class="n-ji">${j.items.map(it=>`<i class="${it.x?'x':''}">${E(it.l)} ${E(it.v)}</i>`).join('')}</span>`:''}</div>`).join('')}</div>`;}
function nIdle(m){return `<div class="n-idle">${nEn('Official Competition')}<h1 style="font-size:${U(fit(m.comp,210,8))}">${E(m.comp)}</h1><p>곧 경기가 시작됩니다</p><b class="n-now" data-now></b>${m.court?`<div class="n-ic"><b>${E(m.court)}</b> 코트</div>`:''}</div>`;}
function nLive(m){const js=(m.judges||[]).map((ok,i)=>({n:i+1,ok}));
  const right=m.liveCount?`<div class="n-clk">${nEn(m.liveCount.l)}<b class="dzlive">${E(m.liveCount.v)}<small>${E(m.liveCount.u)}</small></b><span class="n-sub">경기 시간 <i class="timer" data-timer>${E(m.timer||'')}</i></span></div>`
    :`<div class="n-clk">${nEn('Time')}<b class="timer" data-timer>${E(m.timer||'')}</b><span class="n-sub">${m.name?'경기 시간':'연기 시간'}</span></div>`;
  return `${nTop(m)}<div class="n-main">${nWho(m)}${right}</div>${nJs(js,true)}${nStand(m)}`;}
function nScore(m){const parts=(m.parts||[]).map(p=>`<span class="n-p ${p.neg?'neg':''}"><small>${E(p.l)}</small><b>${E(p.v)}</b></span>`).join('');
  return `${nTop(m)}<div class="n-main sc">${nWho(m)}<div class="n-clk fin">${nEn('Score')}<div class="cbres n-res"><span class="cbfinal n-final">${E(m.final)}</span><div class="n-parts">${parts}</div></div>${m.note?`<span class="n-sub neg">${E(m.note)}</span>`:''}</div></div>${nJs(m.js,false)}${nStand(m)}`;}
function nRank(m){const R=m.rows||[],me=R.find(r=>r.me);let show=R.slice(0,8);if(me&&!show.includes(me)){const k=R.indexOf(me);show=R.slice(0,5).concat(R.slice(Math.max(5,k-1),k+2));}
  const rh=Math.max(64,Math.min(116,Math.floor((660-(show.length-1)*10)/Math.max(1,show.length))));let list='';
  show.forEach((r,i,a)=>{const prev=a[i-1];if(m.pre&&m.quota&&prev&&prev.rank<=m.quota&&r.rank>m.quota)list+=`<div class="n-cut"><span>${E(m.cut||'')}</span>${nEn('Qualified')}</div>`;
    else if(prev&&prev.rank<r.rank-1)list+=`<div class="n-gap">⋯</div>`;
    const md=skMc(r.rank,m);list+=`<div class="n-r ${r.me?'me':''} ${m.pre&&r.inq?'in':''} ${m.pre&&!r.inq?'out':''} ${md}" style="--i:${i};height:${U(rh)}">${r.me?'<i class="cbr me sk-mk" style="--dl:0ms"></i>':''}<span class="n-rk">${skRk(r.rank,m)}</span><span class="n-rn"><b>${E(r.name||r.team)}${r.me?'<em>지금</em>':''}</b><small>${E(r.name?r.team:'')}</small></span><span class="n-rs">${E(r.score)}</span></div>`;});
  const st=String(m.label||'').replace(/\s*\d+\s*번$/,'');
  return `${nTop(m,st+' 순위','Standings')}<div class="n-rank">${list}</div><div class="n-bot"><div class="n-bl">${nEn(m.medal?'Final':'Progress')}<b>${m.medal?'최종 순위':'진행'}</b></div><div class="n-scs"><div class="n-sc wide"><span><b>${me?`${E(me.name||me.team)} · 현재 ${skRkT(me.rank,m)}${m.medal&&me.rank<=(SK_COMM()?4:3)?'':'위'}`:'순위'}</b><small>${R.length}${E(m.unit||'명')} 경기 마침${m.pre&&m.quota?` · 상위 ${m.quota}${E(m.unit||'명')} 진출`:''}${m.medal?' · 메달 확정':''}</small></span></div></div>${nNext(m)}</div>`;}
/* ---------- 청·홍 (품새 토너먼트) ---------- */
const nf2=v=>v==null?'—':(+v).toFixed(2),nf1=v=>v==null?'—':(+v).toFixed(1);
function nSide(s,m,res){const b=s.side==='blue',r=s.res;
  const js=res?(s.js||[]).map(j=>`<div class="n-j rv ${j.dA&&j.dB?'drop':''}"><small>J${j.n}</small><b>${nf1(j.t)}</b><span class="n-ji"><i class="${j.dA?'x':''}">${nf1(j.a)}</i><i class="${j.dB?'x':''}">${nf1(j.b)}</i></span></div>`).join('')
    :(s.live||[]).map(j=>`<div class="n-j ${j.ok?'ok':'wait'}"><small>J${j.n}</small><b>${j.ok?'✓':'···'}</b></div>`).join('');
  return `<div class="n-side side ${b?'b':'r'} ${res&&s.win?'win':''} ${res&&s.lose?'lose':''}"><div class="n-wm">${b?'청':'홍'}</div>
    <div class="n-sh"><i>${b?'청':'홍'}</i>${nEn(b?'Blue':'Red')}${res&&s.win?'<em class="n-win">WINNER</em>':''}</div>
    <div class="n-nm ks-fillw" data-fmax="${res?240:280}" style="font-size:${U(fit(s.name,res?140:170,4))}">${E(s.name)}</div><div class="n-tm">${E(s.team)}</div>
    ${res&&r?`<div class="n-tot vfinal">${nf2(r.final)}</div><div class="n-sub">${r.parts?`1품새 ${nf2(r.parts[0])} · 2품새 ${nf2(r.parts[1])}`:`${E(m.labA||'정확성')} ${nf2(r.a)} · ${E(m.labB||'표현성')} ${nf2(r.b)}`}${r.ded?` · 감점 −${(+r.ded).toFixed(1)}`:''}</div>`:''}
    <div class="n-js sd" style="--n:${(res?s.js:s.live||[]).length||5}">${js}</div></div>`;}
function nPl(m){const pl=m.pl||[];return pl.length?`<div class="n-pls ${pl.length>1?'two':'one'}">${pl.map(p=>`<div class="n-pi ${p.on&&pl.length>1?'on':''}">${pl.length>1?`<small>${E(p.lab)}</small>`:''}<b>${E(p.nm)}</b></div>`).join('')}</div>`:'';}
function nDuel(m){const [b,r]=m.sides;
  return `${nTop(m)}<div class="n-duel">${nSide(b,m,false)}<div class="n-ctr">${nPl(m)}<div class="n-clk">${nEn('Time')}<b class="timer" data-timer>${E(m.timer||'')}</b><span class="n-sub">${E(m.limit||'')}</span></div></div>${nSide(r,m,false)}</div>${nNext(m).replace('n-next','n-next solo')}`;}
function nDres(m){const [b,r]=m.sides,w=m.sides.find(s=>s.win);
  const ctr=w?`<div class="n-verd ${w.side==='blue'?'b':'r'}">${nEn('Result')}<b>${w.side==='blue'?'청':'홍'} 승</b><small>${E(m.note||'')}</small></div>`:`<div class="n-verd">${nEn('Result')}<b>${m.win==='tie'?'동점':'판정'}</b><small>${E(m.note||'')}</small></div>`;
  return `${nTop(m)}<div class="n-duel res">${nSide(b,m,true)}<div class="n-ctr">${nPl(m)}${ctr}</div>${nSide(r,m,true)}</div>${nNext(m).replace('n-next','n-next solo')}`;}
function nBracket(m){const rs=m.rounds||[],R=rs.length,x=rs.flat().find(q=>q.cur),ri=x?x.r-1:0,ms=rs[ri]||[],ws=x&&x.win?x[x.win]:null;
  const rn=g('roundName')?g('roundName')(ri+1,R):'';
  const row=q=>`<div class="n-bm ${q.cur?'now':''}">${['blue','red'].map(sd=>{const p=q[sd],sc=sd==='blue'?q.bS:q.rS;return `<div class="n-bp ${sd==='blue'?'b':'r'} ${q.win===sd?'w':q.win?'l':''}"><i>${sd==='blue'?'청':'홍'}</i><b>${p?E(p.name):'—'}</b><small>${p?E(p.team||''):''}</small><em>${sc!=null?nf2(sc):''}</em></div>`;}).join('')}</div>`;
  return `${nTop(m,(m.round||rn)+' 결과','Result')}${ws?`<div class="n-hero ${x.win==='blue'?'b':'r'}">${nEn('Winner · '+(x.win==='blue'?'청':'홍'))}<b style="font-size:${U(fit(ws.name,150,4))}">${E(ws.name)}</b><small>${E(ws.team||'')}</small></div>`:''}
    <div class="n-bk ${ws?'':'full'}" style="--c:${Math.min(4,Math.max(1,ms.length))}">${nEn(rn)}<div class="n-bks">${ms.map(row).join('')}</div></div>${nNext(m).replace('n-next','n-next solo')}`;}
function nChamp(m){const p=m.path&&m.path.length?m.path[m.path.length-1]:null;
  return `${nTop(m,'최종 결과','Champion')}<div class="n-hero champ">${nEn('Champion · 우승')}<b style="font-size:${U(fit(m.champ.name,200,4))}">${E(m.champ.name)}</b><small>${E(m.champ.team||'')}${p?` · 결승 ${nf2(p.me)} : ${nf2(p.op)}`:''}</small></div>
    <div class="n-pod"><div class="n-r md m2"><span class="n-rk">은</span><span class="n-rn"><b>${E(m.second.name||'—')}</b><small>${E(m.second.team||'')}</small></span></div>${(m.thirds||[]).map(t=>`<div class="n-r md m3"><span class="n-rk">동</span><span class="n-rn"><b>${E(t.name)}</b><small>${E(t.team||'')}</small></span></div>`).join('')}</div>`;}
const NSCR={idle:nIdle,live:nLive,score:nScore,rank:nRank,duel:nDuel,duelres:nDres,bracket:nBracket,champ:nChamp};

/* ---------- 감싸기 ---------- */
function install(){const cur=window.vDisplay;if(typeof cur!=='function')return false;if(cur.__sk)return true;
  if(!cur.__ksb)return false;if(APP==='poomsae'&&!cur.__kst)return false;   /* 금빛 전광판·테마를 감싼 다음에 */
  const w=function(){try{let c=null;try{c=g('curOf')();}catch(e){}const th=skinFor(c);
      /* v1.7.65 「기존 디자인」 대기 화면도 다른 디자인과 같은 글씨 크기 (프레스티지 금빛 대기 화면) */
      if(!th){let idle=false;try{idle=APP==='kyorugi'?!g('live')():!c;}catch(e){}if(idle&&SET().board!=='classic'){const F=window.KS_FIELD,court=(F&&F.court)||(window.KS_HOST&&KS_HOST.court)||'';
        const nm=SET().name||(APP==='kyorugi'?'겨루기 대회':APP==='gyeokpa'?'태권도 격파 대회':'품새 대회');const h=draw('pr',{scr:'idle',comp:nm,court,key:'idle'});if(h){const kb=(()=>{try{return g('KIOSK')?'':'<button data-act="go" data-r="admin-run">← 운영석</button>';}catch(e){return '';}})();return h.replace('<div class="sk-bg">','<div class="dctl" style="position:fixed;top:8px;right:10px;z-index:30">'+kb+'<button data-act="fullscreen">전체 화면</button></div><div class="sk-bg">');}}}
      if(!isNew(th)){const h=layDraw(th,c);if(h)return h;}
      if(th==='arena'&&APP==='kyorugi'){const h=arKy(cur);if(h)return h;}
      else if((th==='arena'||th==='duel'||isNew(th))&&c&&(c.entries||[]).length===2){const m=arTourModel();if(m){const h=draw(th,m);if(h)return h;}}
      else if(th){const m=APP==='poomsae'?modelPm():modelGp();if(m){if(th==='arena'||isNew(th)||m.scr==='score')arExtra(m);const h=draw(th,m);if(h)return h;}}}catch(e){console.error('[KS_SKIN]',e);}
    return cur.apply(this,arguments);};
  w.__sk=true;w.__ksb=true;w.__kst=true;window.vDisplay=w;try{g('render')();}catch(e){}return true;}
/* 대회 설정: 종목별 고르기 */
function panel(){const B=by();return `<div class="panel sk-setp"><h2>${APP==='kyorugi'?'겨루기 전광판 디자인':'전광판 디자인 (종목별)'}</h2>
  ${APP==='kyorugi'?'':`<span class="small muted">컷오프 종목의 관중용 전광판 모양을 종목마다 고릅니다. 점수 화면은 이름·점수만 가운데 크게, 그다음 순위 화면에 1·2·3위를 가운데 크게 보여 줍니다. 「기존 디자인」은 지금까지의 전광판(위 「전광판 디자인」)을 그대로 씁니다.${APP==='poomsae'?' 토너먼트(청·홍)는 「기존」이면 위 「전광판 디자인」을 따릅니다.':''}</span>`}
  <span class="small muted">🏟 경기장: 세계 대회 경기장 화면처럼 짙은 남색 바탕에 이름·점수를 크게, 왼쪽 코트 색 띠, 아래에 현재 순위·다음 선수를 보여 줍니다. 효과음·점수 효과는 그대로입니다.</span>
  ${APP==='kyorugi'?'':`<div class="field"><span class="label">✨ 새 디자인을 모든 종목에 한 번에</span><div class="seg">${NEWS.map(([v,t])=>`<button class="${ROWS.every(([k])=>(B[k]||'')===v)?'on':''}" data-skall="${v}">${t}</button>`).join('')}<button data-skall="">기존으로</button></div><span class="small muted">📺 중계방송형: 청·홍 반반 굵은 띠·아주 큰 시간 · ▦ 타이포형: 검은 바탕에 큰 글자와 가는 선 · ✦ 프레스티지형: 남색·금빛 원형 시계와 유리 카드. 아래에서 종목마다 따로 고를 수도 있습니다.</span></div>`}
  ${ROWS.map(([k,l])=>`<div class="field"><span class="label">${l}</span><div class="seg">${(k==='tour'?SKINS_T:k==='kyorugi'?SKINS2:SKINS).map(([v,t])=>`<button class="${(B[k]||'')===v?'on':''}" data-skset="${k}" data-v="${v}">${t}</button>`).join('')}</div></div>`).join('')}
  ${APP==='kyorugi'?'':`<h2 style="margin-top:14px">점수 공개 화면 모양</h2><span class="small muted">점수가 나올 때 심판 점수와 총점을 놓는 자리입니다. 어느 디자인을 고르든 그 디자인 색으로 나옵니다. 들어간 점수는 밝은 흰색, 빠진 점수(최고·최저)는 어두운 회색입니다.</span>
  ${ROWS.map(([k,l])=>{const L=SET().layBy||{},v=L[k]!=null?String(L[k]):(LAY_DEF[k]||'1');return `<div class="field"><span class="label">${l}</span><div class="seg">${(k==='tour'?LAYS_T:LAYS).map(([x,t])=>`<button class="${v===x?'on':''}" data-lyset="${k}" data-v="${x}">${t}</button>`).join('')}</div></div>`;}).join('')}`}</div>`;}
function installSet(){const o=window.aSettings;if(typeof o!=='function')return false;if(o.__sk)return true;
  const w=function(){const h=o.apply(this,arguments);try{return panel()+h;}catch(e){return h;}};w.__sk=true;
  for(const k of ['__ksfx','__kst'])if(o[k])w[k]=true;window.aSettings=w;return true;}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-lyset]');if(!b)return;e.preventDefault();e.stopPropagation();
  const S=g('S'),sv=g('saveSettings');if(!S||!sv)return;const cur=S.settings||{},nx={...cur,layBy:{...(cur.layBy||{}),[b.dataset.lyset]:b.dataset.v}};
  S.settings=nx;try{await sv(nx);}catch(x){}try{g('render')();}catch(x){}},true);
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-skset]');if(!b)return;e.preventDefault();e.stopPropagation();
  const S=g('S'),sv=g('saveSettings');if(!S||!sv)return;const cur=S.settings||{},nx={...cur,skinBy:{...(cur.skinBy||{}),[b.dataset.skset]:b.dataset.v}};
  S.settings=nx;try{await sv(nx);}catch(x){}try{g('render')();}catch(x){}},true);
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-skall]');if(!b)return;e.preventDefault();e.stopPropagation();
  const S=g('S'),sv=g('saveSettings');if(!S||!sv)return;const v=b.dataset.skall,cur=S.settings||{},sb={...(cur.skinBy||{})};ROWS.forEach(([k])=>{sb[k]=v;});
  const nx={...cur,skinBy:sb};S.settings=nx;try{await sv(nx);}catch(x){}try{g('render')();}catch(x){}},true);
let k=0;const tm=setInterval(()=>{const a=install(),b=installSet();if((a&&b)||++k>240)clearInterval(tm);},250);

/* ---------- 모양 ---------- */
const css=`
body.disp .board.sk{position:fixed;inset:0;margin:0;padding:0;border:0;border-radius:0;max-width:none;width:auto;height:auto;overflow:hidden;z-index:2}
.board.sk{--u:min(calc(100vw/1920),calc(100vh/1080));position:relative;min-height:60vh;overflow:hidden;font-family:"Noto Sans KR","Malgun Gothic",sans-serif;color:#fff}
.board.sk>.sk-bg{position:absolute!important;inset:0!important;z-index:0!important;width:auto;height:auto}
.board.sk>.sk-s{position:absolute!important;z-index:1!important;left:50%;top:50%;width:${U(1920)};height:${U(1080)};transform:translate(-50%,-50%)}
.sk-top{position:absolute;left:${U(70)};right:${U(70)};top:${U(50)};height:${U(64)};display:flex;justify-content:space-between;align-items:center;gap:${U(30)}}
.sk-brand{font:900 ${U(26)} Cinzel,"Noto Sans KR",serif;letter-spacing:.42em}
.sk-comp{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:${U(1200)};font-weight:800;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sk-court{font:900 ${U(26)} "Noto Sans KR";padding:${U(10)} ${U(26)};border-radius:${U(30)}}
.sk-div{position:absolute;left:0;right:0;top:${U(150)};text-align:center;font:700 ${U(38)} "Noto Sans KR";opacity:.85}
.sk-center{position:absolute;left:${U(100)};right:${U(100)};top:${U(230)};bottom:${U(120)};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.sk-kick{font:800 ${U(26)} Cinzel,"Noto Sans KR";letter-spacing:.5em;margin-bottom:${U(18)}}
.sk-idle h1{font-weight:900;line-height:1.12;margin:0 0 ${U(24)};max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sk-idle p{font-size:${U(64)};opacity:.85;margin:0}.sk-clock{margin-top:${U(26)};font:800 ${U(190)}/1 Archivo,sans-serif;font-stretch:80%}
.sk-idle .sk-kick{font-size:${U(40)};letter-spacing:.3em}.sk-ic{margin-top:${U(14)};font-size:${U(64)};font-weight:800}
.sk-name{font-weight:900;line-height:1.05;letter-spacing:-.02em;animation:skrise .9s cubic-bezier(.2,1.2,.3,1) both;animation-delay:var(--t)}
.sk-team{font:700 ${U(50)} "Noto Sans KR";margin-top:${U(14)};opacity:.85}
.sk-mem{font-size:${U(28)};opacity:.7;margin-top:${U(10)};max-width:${U(1500)}}
.sk-timer{font:900 ${U(110)} Cinzel,"Noto Sans KR";margin-top:${U(40)};letter-spacing:.04em}
.sk-timer.over{color:#FF5A5A}
.sk-cnt{font:900 ${U(110)} Cinzel,"Noto Sans KR";margin-top:${U(20)}}.sk-cnt small{font-size:${U(34)};margin:0 ${U(14)};font-family:"Noto Sans KR";opacity:.8}
.sk-js{display:flex;gap:${U(16)};margin-top:${U(34)}}.sk-js i{font-style:normal;font:800 ${U(26)} "Noto Sans KR";padding:${U(10)} ${U(22)};border-radius:${U(40)};opacity:.45;border:2px solid currentColor}.sk-js i.on{opacity:1}
.sk-res{display:flex;flex-direction:column;align-items:center;margin-top:${U(10)}}
.sk-final{order:-1;font:900 ${U(300)}/1 Cinzel,"Noto Sans KR";letter-spacing:-.02em;animation:skslam .8s cubic-bezier(.2,1.4,.3,1) both;animation-delay:var(--t)}
.sk-part{display:inline-flex;align-items:baseline;gap:${U(12)};font-size:${U(30)};margin:${U(6)} ${U(18)}}.sk-part b{font:900 ${U(52)} Cinzel,"Noto Sans KR"}
.sk-res{flex-direction:row;flex-wrap:wrap;justify-content:center}.sk-res .sk-final{flex-basis:100%}
.sk-note{margin-top:${U(16)};font-size:${U(34)};color:#FF8A8A}
.sk-jd{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:${U(20)};width:${U(1780)};margin:${U(18)} auto ${U(6)}}
.sk-jc{border:${U(3)} solid rgba(255,255,255,.22);border-radius:${U(22)};padding:${U(14)} ${U(24)};background:rgba(0,0,0,.35);display:flex;flex-direction:column;gap:${U(2)};animation:skup .6s ease-out both;animation-delay:var(--t)}
.sk-jc.in{border-color:rgba(255,255,255,.3)}.sk-jc.out{border-color:rgba(74,80,93,.8);background:rgba(0,0,0,.3)}
.sk-jh{font:900 ${U(40)}/1.15 "Noto Sans KR";text-align:center}.sk-jh em{font-style:normal;color:#4A505D;font-size:.7em}.sk-jc.out .sk-jh,.sk-jc.out .sk-ji span{color:#4A505D}
.sk-ji{display:flex;justify-content:space-between;align-items:center;font:800 ${U(26)} "Noto Sans KR";opacity:.95}.sk-ji span{opacity:.75}
.sk-ji b{font:900 ${U(72)}/1.05 Cinzel,"Noto Sans KR";color:#fff}.sk-ji b.jx{color:#4A505D}
.sk-jt{border-top:1px solid rgba(255,255,255,.18);text-align:right;font:900 ${U(56)}/1.15 Cinzel,"Noto Sans KR"}.sk-jc.in .sk-jt{color:#fff}.sk-jc.out .sk-jt{color:#4A505D}
.sk-jd[style*="--n:7"] .sk-ji b,.sk-jd[style*="--n:6"] .sk-ji b{font-size:${U(58)}}
.sk-center.sk-score.hasj{top:${U(205)};bottom:${U(82)};justify-content:space-evenly}
.sk-score.hasj .sk-final{font-size:${U(185)}}.sk-score.hasj .sk-res{margin-top:0}.sk-score.hasj .sk-part{font-size:${U(24)};margin:0 ${U(16)}}.sk-score.hasj .sk-part b{font-size:${U(42)}}
.sk-score.hasj .sk-ji b{font-size:${U(62)}}.sk-score.hasj .sk-jt{font-size:${U(48)}}.sk-score.hasj .sk-jh{font-size:${U(36)}}
.sk:has(.sk-score.hasj) .sk-next{bottom:${U(18)}}
:is(.board.sk-arena,.board.ky.ar) .ar-j small .k{color:#fff}:is(.board.sk-arena,.board.ky.ar) .ar-j small .x{color:#4A526B;text-decoration:none}
:is(.board.sk-arena,.board.ky.ar) .ar-j.rv.in{border-color:rgba(255,255,255,.3)}:is(.board.sk-arena,.board.ky.ar) .ar-j.rv.in b{color:#fff}
:is(.board.sk-arena,.board.ky.ar) .ar-j.rv.drop{opacity:1;border-color:rgba(74,82,107,.7)}:is(.board.sk-arena,.board.ky.ar) .ar-j.rv.drop b{color:#4A526B;text-decoration:none}:is(.board.sk-arena,.board.ky.ar) .ar-j.rv.drop .ar-jn{color:#4A526B;text-decoration:none}
:is(.board.sk-arena,.board.ky.ar) .ar-j small em{font-style:normal;color:#6B7590;font-weight:800}
:is(.board.sk-arena,.board.ky.ar) .ar-j.rv{padding:${U(14)} ${U(22)}}:is(.board.sk-arena,.board.ky.ar) .ar-j.rv small{font-size:${U(34)};font-weight:800;color:#C9D3EA;overflow:visible;white-space:normal;line-height:1.25}
:is(.board.sk-arena,.board.ky.ar) .ar-j.rv b{font-size:${U(68)}}
:is(.board.sk-arena,.board.ky.ar) .ar-j.rv.drop{opacity:.9}
:is(.board.sk-arena,.board.ky.ar) .ar-ji{grid-column:1/-1;display:flex;justify-content:space-between;gap:${U(10)};font:800 ${U(40)}/1.1 Archivo,"Noto Sans KR",sans-serif;font-stretch:85%}
:is(.board.sk-arena,.board.ky.ar) .ar-ji span{display:flex;flex-direction:column;align-items:flex-end}:is(.board.sk-arena,.board.ky.ar) .ar-ji i{font:700 ${U(19)} "Noto Sans KR";color:#9AA8C7;font-style:normal}
:is(.board.sk-arena,.board.ky.ar) .ar-ji .jk{color:#fff}:is(.board.sk-arena,.board.ky.ar) .ar-ji .jx{color:#4A526B}
:is(.board.sk-arena,.board.ky.ar) .ar-why{grid-column:1/-1;text-align:right;font:800 ${U(22)} "Noto Sans KR";color:#6B7590;font-style:normal}:is(.board.sk-arena,.board.ky.ar) .ar-j.rv small em{display:block;font-size:${U(24)}}
.sk-rkh{position:absolute;left:0;right:0;top:${U(130)};text-align:center}.sk-rkh span{display:block;font:800 ${U(28)} Cinzel;letter-spacing:.5em}.sk-rkh b{display:block;font:800 ${U(44)} "Noto Sans KR";margin-top:${U(10)}}
.sk-pods{position:absolute;left:0;right:0;top:${U(240)};display:flex;justify-content:center;align-items:flex-end;gap:${U(36)}}
.sk-pod{width:${U(470)};border-radius:${U(26)};padding:${U(22)} ${U(24)} ${U(24)};text-align:center;animation:skup .8s cubic-bezier(.2,1.2,.3,1) both;animation-delay:calc(var(--t) + var(--i)*.18s)}
.sk-pod.p1{width:${U(560)};padding-top:${U(30)};padding-bottom:${U(36)}}
.sk-medal{width:${U(80)};height:${U(80)};margin:0 auto ${U(12)};border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 ${U(50)} Cinzel,"Noto Sans KR";color:#2a1d00}
.p1 .sk-medal{width:${U(104)};height:${U(104)};font-size:${U(60)}}
.p1 .sk-medal{background:radial-gradient(circle at 35% 30%,#FFF6D2,#E2B54A 55%,#9C7120)}.p2 .sk-medal{background:radial-gradient(circle at 35% 30%,#FFFFFF,#C2C8D2 55%,#7C8594)}.p3 .sk-medal{background:radial-gradient(circle at 35% 30%,#FFE2C4,#C9864A 55%,#7E4A20)}
.sk-pn{font-weight:900;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sk-pt{font-size:${U(26)};opacity:.75;margin-top:${U(8)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sk-ps{font:900 ${U(60)}/1.1 Cinzel,"Noto Sans KR";margin-top:${U(10)}}.p1 .sk-ps{font-size:${U(80)}}
.sk-me{position:absolute;left:0;right:0;top:${U(690)};text-align:center;font:800 ${U(36)} "Noto Sans KR"}.sk-me small{font-size:${U(24)};opacity:.7}
.sk-list{position:absolute;left:${U(460)};right:${U(460)};top:${U(752)};bottom:${U(30)};display:flex;flex-direction:column;gap:${U(5)};overflow:hidden}
.sk-gap{text-align:center;font-size:${U(22)};line-height:1;opacity:.6}
.sk-row{display:flex;align-items:center;gap:${U(18)};padding:${U(5)} ${U(20)};border-radius:${U(10)};font-size:${U(27)};flex:none;animation:skin .5s ease both;animation-delay:calc(var(--t) + .6s + var(--i)*.05s)}
.sk-row>i:not(.sk-mk){font-style:normal;font:900 ${U(30)} Cinzel;width:${U(46)}}.sk-row span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sk-row small{margin-left:${U(12)};opacity:.65;font-size:${U(22)}}.sk-row em{font-style:normal;font:900 ${U(32)} Cinzel,"Noto Sans KR"}
.sk-cut{border-top:3px dashed currentColor;position:relative;margin:${U(4)} 0;flex:none}.sk-cut span{position:absolute;right:${U(-330)};top:${U(-16)};font:800 ${U(20)} "Noto Sans KR"}
.sk-qnote{position:absolute;left:0;right:0;bottom:${U(40)};text-align:center;font:700 ${U(24)} "Noto Sans KR";opacity:.7}
.sk-next{position:absolute;left:${U(70)};right:${U(70)};bottom:${U(40)};text-align:center;font-size:${U(26)};opacity:.75}.sk-next span{font:800 ${U(20)} Cinzel;letter-spacing:.3em;margin-right:${U(16)}}
@keyframes skrise{from{opacity:0;transform:translateY(${U(40)}) scale(.96)}to{opacity:1;transform:none}}
@keyframes skslam{0%{opacity:0;transform:scale(1.6);filter:blur(10px)}60%{opacity:1;transform:scale(.97);filter:none}100%{transform:scale(1)}}
@keyframes skup{from{opacity:0;transform:translateY(${U(80)})}to{opacity:1;transform:none}}
@keyframes skin{from{opacity:0;transform:translateX(${U(-30)})}to{opacity:1;transform:none}}
/* ===== 왕실 ===== */
.sk-royal .sk-bg{background:radial-gradient(ellipse at 50% -10%,#1F3A7A 0%,#0B1530 45%,#060B1A 100%)}
.sk-royal .sk-bg:before{content:"";position:absolute;inset:calc(26*var(--u));border:2px solid rgba(226,194,127,.55);border-radius:8px}
.sk-royal .sk-bg:after{content:"";position:absolute;left:50%;top:55%;width:120vw;height:70vh;transform:translate(-50%,-50%);background:radial-gradient(ellipse,rgba(226,194,127,.16),transparent 60%)}
.sk-royal .sk-brand,.sk-royal .sk-kick,.sk-royal .sk-rkh span{color:#E2C27F}.sk-royal .sk-comp{color:#E8ECF5}
.sk-royal .sk-court{color:#0B1530;background:linear-gradient(180deg,#F3DFAE,#C9A45A)}
.sk-royal .sk-div b{color:#E2C27F}
.sk-royal .sk-name{background:linear-gradient(180deg,#fff 30%,#E9D7A8);-webkit-background-clip:text;background-clip:text;color:transparent}
.sk-royal .sk-team{color:#C9CFDB}
.sk-royal .sk-final{background:linear-gradient(180deg,#FFF6DA,#E2C27F 55%,#9C7631);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 ${U(40)} rgba(226,194,127,.45))}
.sk-royal .sk-part b{color:#fff}.sk-royal .sk-part small{color:#AEB5C7}.sk-royal .sk-part.neg b{color:#FF9A9A}
.sk-royal .sk-timer{color:#F3DFAE}.sk-royal .sk-js i{color:#E2C27F}
.sk-royal .sk-pod{background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(226,194,127,.45)}
.sk-royal .sk-pod.p1{border:2px solid #E2C27F;box-shadow:0 0 ${U(60)} rgba(226,194,127,.35)}
.sk-royal .sk-ps{color:#E2C27F}.sk-royal .sk-pod.me{outline:3px solid #fff}
.sk-royal .sk-row{background:rgba(255,255,255,.04)}.sk-royal .sk-row i{color:#E2C27F}.sk-royal .sk-row.me{background:linear-gradient(90deg,rgba(226,194,127,.35),transparent)}.sk-royal .sk-row.in i{color:#fff}
.sk-royal .sk-cut{color:#E2C27F}.sk-royal .sk-me b{color:#E2C27F}
/* ===== 불꽃 ===== */
.sk-fire .sk-bg{background:#07070A}
.sk-fire .sk-bg:before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 25% 85%,rgba(255,80,20,.45),transparent 55%),radial-gradient(ellipse at 80% 10%,rgba(255,40,60,.25),transparent 50%),repeating-linear-gradient(115deg,rgba(255,255,255,.025) 0 2px,transparent 2px 26px)}
.sk-fire .sk-bg:after{content:"";position:absolute;left:-10%;right:-10%;top:58%;height:22%;background:linear-gradient(90deg,#FF3B1F,#FF8A00 60%,#FFD23F);transform:rotate(-6deg);opacity:.85;box-shadow:0 0 120px rgba(255,90,0,.6)}
.sk-fire.sk-rank .sk-bg:after{top:auto;bottom:-6%;height:12%;opacity:.6}
.sk-fire.sk-live .sk-bg:after,.sk-fire.sk-idle .sk-bg:after{top:84%;height:12%;opacity:.7}
.sk-fire .sk-js i{background:#000}.sk-fire .sk-js i.on{background:#FF8A00;color:#000;border-color:#FF8A00}
.sk-royal .sk-js i.on{background:#E2C27F;color:#0B1530}
.sk-fire .sk-brand{color:#FF8A00;font-style:italic;font-family:Archivo,"Noto Sans KR",sans-serif;letter-spacing:.2em}
.sk-fire .sk-court{background:#FF3B1F;transform:skewX(-12deg);border-radius:0}
.sk-fire .sk-kick,.sk-fire .sk-rkh span{color:#FF8A00;font-style:italic;font-family:Archivo,"Noto Sans KR",sans-serif}
.sk-fire .sk-div b{color:#FF8A00}
.sk-fire .sk-name{font-style:italic;text-shadow:${U(8)} ${U(8)} 0 #FF3B1F}
.sk-fire .sk-team{color:#FFB37A}
.sk-fire .sk-final{font-family:"Noto Sans KR";font-style:italic;color:#fff;text-shadow:0 0 ${U(30)} rgba(255,255,255,.4),${U(12)} ${U(12)} 0 #000;position:relative;z-index:1}
.sk-fire .sk-part{background:#000;border:2px solid #FF8A00;padding:${U(8)} ${U(20)};transform:skewX(-12deg)}.sk-fire .sk-part small{color:#FFB37A}.sk-fire .sk-part.neg{border-color:#FF4D4D}
.sk-fire .sk-crack{position:absolute;left:${U(160)};right:${U(160)};top:${U(470)};height:${U(220)};width:auto;z-index:0;opacity:.75}
.sk-fire .sk-res{position:relative;z-index:1}
.sk-fire .sk-crack path{fill:none;stroke:#fff;stroke-width:6;stroke-dasharray:1600;stroke-dashoffset:1600;animation:skcrack .5s .35s ease-out forwards;animation-delay:calc(var(--t) + .35s)}.sk-fire .sk-crack path.b{stroke-width:3;opacity:.8}
@keyframes skcrack{to{stroke-dashoffset:0}}
.sk-fire .sk-timer{color:#FFD23F;font-style:italic}.sk-fire .sk-js i{color:#FF8A00}
.sk-fire .sk-pod{background:rgba(255,255,255,.06);transform:skewX(-6deg)}
.sk-fire .sk-pod.p1{background:linear-gradient(180deg,#FF3B1F,#B5200E);box-shadow:0 0 ${U(70)} rgba(255,90,0,.6)}
.sk-fire .sk-ps{font-style:italic}.sk-fire .p2 .sk-ps,.sk-fire .p3 .sk-ps{color:#FF8A00}
.sk-fire .sk-pod.me{outline:3px solid #FFD23F}
.sk-fire .sk-row{background:rgba(255,255,255,.06);transform:skewX(-8deg)}.sk-fire .sk-row i{color:#FF8A00}.sk-fire .sk-row.me{background:#FF3B1F}.sk-fire .sk-row.me i{color:#FFD23F}
.sk-fire .sk-cut{color:#FFD23F}.sk-fire .sk-me b{color:#FFD23F}
body.disp .board.sk .sk-mk,.board.sk .sk-mk{position:absolute!important;inset:0!important;display:block!important;height:auto!important;min-height:0!important;width:auto!important;padding:0!important;margin:0!important;border:0!important;background:none!important;box-shadow:none!important;pointer-events:none;animation:none!important;transform:none!important;z-index:0}
.sk-pod,.sk-row{position:relative}
body.disp .board.sk .cbfinal.sk-final{font-family:Cinzel,"Noto Sans KR",serif!important;font-weight:900!important;font-size:${U(300)}!important;line-height:1!important}
body.disp .board.sk .cbres b{font-size:${U(52)}}
body.disp .board.sk-royal .cbfinal.sk-final{background:linear-gradient(180deg,#FFF6DA,#E2C27F 55%,#9C7631)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important}
body.disp .board.sk-fire .cbfinal.sk-final{font-family:"Noto Sans KR",sans-serif!important;font-style:italic;background:none!important;color:#fff!important;-webkit-text-fill-color:#fff;filter:none!important}
/* ===== 🏟 경기장 ===== */
.board.sk-arena .sk-bg,.board.ky.ar .ar-bg{background:radial-gradient(ellipse 75% 65% at 50% 52%,#123069 0%,#07122B 62%,#040A1A 100%)!important}
.board.sk-arena .sk-bg:before,.board.ky.ar .ar-bg:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,transparent 0 46px,rgba(255,255,255,.018) 46px 47px)}
.board.sk-arena .sk-bg:after,.board.ky.ar .ar-bg:after{content:"";position:absolute;left:0;top:0;bottom:0;width:${U(26)};background:var(--cc,#2F7DF6);box-shadow:0 0 ${U(40)} var(--cc,#2F7DF6)}
.board.ky.ar .ar-bg{position:absolute;inset:0}
body.disp .board.ky.ar{background:#000}
.board.ky.ar .ksb-s{--u:min(calc(100vw/1920),calc(100vh/1080));background:none}.board.ky.ar .ksb-s::before{display:none}
:is(.board.sk-arena .sk-s,.board.ky.ar .ksb-s){font-family:"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif;color:#fff}
:is(.board.sk-arena,.board.ky.ar) .ar-en{font-family:Archivo,"Noto Sans KR",sans-serif;font-stretch:75%;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9AA8C7}
:is(.board.sk-arena,.board.ky.ar) .ar-top{position:absolute;left:0;right:0;top:0;height:${U(150)};display:flex;align-items:center;gap:${U(36)};padding:0 ${U(70)} 0 ${U(84)};border-bottom:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(255,255,255,.04),transparent);z-index:2}
:is(.board.sk-arena,.board.ky.ar) .ar-court{flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;width:${U(150)};height:${U(96)};border-radius:${U(14)};background:var(--cc,#2F7DF6);line-height:1;color:#fff}
:is(.board.sk-arena,.board.ky.ar) .ar-court b{font:800 ${U(64)} Archivo,"Noto Sans KR",sans-serif;font-stretch:75%}:is(.board.sk-arena,.board.ky.ar) .ar-court span{font-size:${U(20)};font-weight:700;margin-top:${U(4)};opacity:.9}
:is(.board.sk-arena,.board.ky.ar) .ar-ev{display:flex;flex-direction:column;gap:${U(6)};flex:1;min-width:0}:is(.board.sk-arena,.board.ky.ar) .ar-ev .ar-en{font-size:${U(22)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:is(.board.sk-arena,.board.ky.ar) .ar-ev h2{margin:0;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15}:is(.board.sk-arena,.board.ky.ar) .ar-ev h2 i{font-style:normal;color:#E2C27F}
:is(.board.sk-arena,.board.ky.ar) .ar-stage{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:${U(6)};max-width:${U(640)}}:is(.board.sk-arena,.board.ky.ar) .ar-stage b{font-size:${U(44)};font-weight:900;white-space:nowrap}:is(.board.sk-arena,.board.ky.ar) .ar-stage .ar-en{font-size:${U(20)}}
:is(.board.sk-arena,.board.ky.ar) .ar-mid{position:absolute;left:${U(84)};right:${U(70)};top:${U(150)};bottom:${U(170)};display:flex;flex-direction:column;justify-content:center;gap:${U(34)}}
:is(.board.sk-arena,.board.ky.ar) .ar-mid2{gap:${U(26)}}
:is(.board.sk-arena,.board.ky.ar) .ar-band{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;background:linear-gradient(90deg,rgba(255,255,255,.10),rgba(255,255,255,.04) 70%,rgba(226,194,127,.10));border-top:2px solid rgba(255,255,255,.18);border-bottom:2px solid rgba(255,255,255,.18);padding:${U(34)} ${U(56)};min-height:${U(330)}}
:is(.board.sk-arena,.board.ky.ar) .ar-band:after{content:"";position:absolute;left:0;bottom:-2px;height:${U(4)};width:38%;background:linear-gradient(90deg,#E2C27F,transparent)}
:is(.board.sk-arena,.board.ky.ar) .ar-who{min-width:0}:is(.board.sk-arena,.board.ky.ar) .ar-who>.ar-en{font-size:${U(24)};display:block;margin-bottom:${U(6)}}
:is(.board.sk-arena,.board.ky.ar) .ar-nm{font-weight:900;line-height:1.05;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:arin .45s ease both;animation-delay:var(--t,0s)}
:is(.board.sk-arena,.board.ky.ar) .ar-tm{font-size:${U(60)};font-weight:700;color:#D6DEEF;margin-top:${U(14)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:is(.board.sk-arena,.board.ky.ar) .ar-mem{font-size:${U(32)};color:#9AA8C7;margin-top:${U(12)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:is(.board.sk-arena,.board.ky.ar) .ar-sc{text-align:right;padding-left:${U(60)};border-left:2px solid rgba(255,255,255,.10);min-width:${U(560)}}:is(.board.sk-arena,.board.ky.ar) .ar-sc>.ar-en{font-size:${U(24)}}
:is(.board.sk-arena,.board.ky.ar) .ar-big{font:800 ${U(230)}/.9 Archivo,"Noto Sans KR",sans-serif;font-stretch:80%;letter-spacing:-.02em;white-space:nowrap}
:is(.board.sk-arena,.board.ky.ar) .ar-big small{font-size:${U(50)};margin-left:${U(10)};color:#9AA8C7}
:is(.board.sk-arena,.board.ky.ar) .ar-sub{font-size:${U(30)};color:#9AA8C7;margin-top:${U(10)};font-weight:700}:is(.board.sk-arena,.board.ky.ar) .ar-sub.neg{color:#FF8A8A}
:is(.board.sk-arena,.board.ky.ar) .ar-res{display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:baseline;gap:${U(4)} ${U(26)}}
:is(.board.sk-arena,.board.ky.ar) .ar-res .ar-final{order:-1;flex-basis:100%;text-align:right}
:is(.board.sk-arena,.board.ky.ar) .ar-p{font-size:${U(28)};color:#9AA8C7;font-weight:700}:is(.board.sk-arena,.board.ky.ar) .ar-p small{font-size:inherit;margin-right:${U(8)}}:is(.board.sk-arena,.board.ky.ar) .ar-p b{color:#fff}:is(.board.sk-arena,.board.ky.ar) .ar-p.neg b{color:#FF8A8A}
body.disp .board.sk-arena .cbfinal.ar-final,.board.sk-arena .cbfinal.ar-final{font:800 ${U(240)}/.9 Archivo,"Noto Sans KR",sans-serif!important;font-stretch:80%!important;letter-spacing:-.02em;background:none!important;-webkit-text-fill-color:#E2C27F;color:#E2C27F!important;filter:none!important;white-space:nowrap}
body.disp .board.sk-arena .cbres b{font-size:inherit}
:is(.board.sk-arena,.board.ky.ar) .ar-js{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:${U(18)}}
:is(.board.sk-arena,.board.ky.ar) .ar-j{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);border-radius:${U(14)};padding:${U(14)} ${U(20)};display:grid;grid-template-columns:auto 1fr;align-items:center;gap:${U(4)} ${U(16)};min-width:0}
:is(.board.sk-arena,.board.ky.ar) .ar-jn{font:800 ${U(26)} Archivo,sans-serif;color:#9AA8C7;width:${U(56)};height:${U(56)};border-radius:50%;border:2px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center}
:is(.board.sk-arena,.board.ky.ar) .ar-j b{font:800 ${U(60)}/1 Archivo,"Noto Sans KR",sans-serif;font-stretch:80%;text-align:right;white-space:nowrap}
:is(.board.sk-arena,.board.ky.ar) .ar-j small{grid-column:1/-1;font-size:${U(19)};color:#9AA8C7;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:is(.board.sk-arena,.board.ky.ar) .ar-j small .x{text-decoration:line-through;opacity:.55}
:is(.board.sk-arena,.board.ky.ar) .ar-j.drop{opacity:.42}:is(.board.sk-arena,.board.ky.ar) .ar-j.drop b{text-decoration:line-through;text-decoration-thickness:${U(5)}}
:is(.board.sk-arena,.board.ky.ar) .ar-j.ok .ar-jn{border-color:#34C77B;color:#34C77B}:is(.board.sk-arena,.board.ky.ar) .ar-j.ok b{font-size:${U(42)};color:#34C77B;font-family:"Noto Sans KR",sans-serif}:is(.board.sk-arena,.board.ky.ar) .ar-j.wait b{color:#3B4A6E}
:is(.board.sk-arena,.board.ky.ar) .ar-bot{position:absolute;left:0;right:0;bottom:0;height:${U(170)};display:grid;grid-template-columns:${U(250)} repeat(3,minmax(0,1fr)) ${U(380)};border-top:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.25);z-index:2}
:is(.board.sk-arena,.board.ky.ar) .ar-bot>div{display:flex;align-items:center;gap:${U(16)};padding:0 ${U(28)};border-left:1px solid rgba(255,255,255,.10);min-width:0}
:is(.board.sk-arena,.board.ky.ar) .ar-bot .ar-lab{flex-direction:column;align-items:flex-start;justify-content:center;gap:${U(4)};border-left:0;padding-left:${U(84)}}
:is(.board.sk-arena,.board.ky.ar) .ar-lab b{font-size:${U(32)};font-weight:900;white-space:nowrap}:is(.board.sk-arena,.board.ky.ar) .ar-lab .ar-en{font-size:${U(18)}}
:is(.board.sk-arena,.board.ky.ar) .ar-bot .ar-wide{grid-column:span 3}
:is(.board.sk-arena,.board.ky.ar) .ar-rk{font:800 ${U(58)} Archivo,sans-serif;font-stretch:75%;min-width:${U(44)};color:#9AA8C7;flex:none}
:is(.board.sk-arena,.board.ky.ar) .ar-rn{display:flex;flex-direction:column;min-width:0;flex:1}:is(.board.sk-arena,.board.ky.ar) .ar-rn b{font-size:${U(32)};font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}:is(.board.sk-arena,.board.ky.ar) .ar-rn small{font-size:${U(22)};color:#9AA8C7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:is(.board.sk-arena,.board.ky.ar) .ar-rs{font:800 ${U(44)} Archivo,"Noto Sans KR",sans-serif;font-stretch:80%;flex:none;white-space:nowrap}
:is(.board.sk-arena,.board.ky.ar) .ar-cell.r1{box-shadow:inset 0 ${U(4)} 0 #E2C27F}:is(.board.sk-arena,.board.ky.ar) .ar-cell.r1 .ar-rk{color:#E2C27F}
:is(.board.sk-arena,.board.ky.ar) .ar-cell.me{background:rgba(226,194,127,.12)}:is(.board.sk-arena,.board.ky.ar) .ar-cell.me .ar-rk{color:#E2C27F}
:is(.board.sk-arena,.board.ky.ar) .ar-mute{color:#5E6C8E;font-size:${U(24)}}
:is(.board.sk-arena,.board.ky.ar) .ar-next{flex-direction:column;align-items:flex-start!important;justify-content:center;gap:0!important;background:rgba(255,255,255,.04)}
:is(.board.sk-arena,.board.ky.ar) .ar-next .ar-en{font-size:${U(16)}}:is(.board.sk-arena,.board.ky.ar) .ar-next b{font-size:${U(30)};font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}:is(.board.sk-arena,.board.ky.ar) .ar-next small{font-size:${U(20)};color:#9AA8C7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
/* 대기 */
.board.sk-arena:is(.sk-live,.sk-score) .ar-mid{justify-content:stretch;gap:${U(22)};top:${U(138)};bottom:${U(160)}}
.board.sk-arena:is(.sk-live,.sk-score) .ar-top{height:${U(138)}}.board.sk-arena:is(.sk-live,.sk-score) .ar-bot{height:${U(160)}}
.board.sk-arena:is(.sk-live,.sk-score) .ar-band{flex:1;min-height:0;padding:${U(20)} ${U(50)}}
.board.sk-arena.sk-score .ar-band{grid-template-columns:minmax(0,max-content) minmax(0,1fr)}.board.sk-arena.sk-score .ar-sc{min-width:0}
.board.sk-arena:is(.sk-live,.sk-score) .ar-who>.ar-en{font-size:${U(28)}}
.n-mem.ar-mem2,.board.sk-arena .ar-mem.ar-mem2,.board.ky.ar .ar-mem.ar-mem2{white-space:normal!important;word-break:keep-all;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.28;color:#EAF2FF;opacity:.92;font-weight:700;text-overflow:clip}.ar-mem2 .ar-mn{white-space:nowrap;display:inline-block}
.board.sk-arena:is(.sk-live,.sk-score) .ar-tm{font-size:${U(76)};margin-top:${U(8)}}.board.sk-arena:is(.sk-live,.sk-score) .ar-mem{font-size:${U(38)};white-space:normal;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3}
.board.sk-arena.sk-live .ar-big{font-size:${U(360)};line-height:.86;white-space:nowrap}.board.sk-arena.sk-live .ar-sc{min-width:${U(620)};padding-left:${U(50)};overflow:hidden}.board.sk-arena.sk-live .ar-band{grid-template-columns:minmax(55%,1fr) minmax(0,auto)}.board.sk-arena.sk-live .ar-big:is([data-over],.over){font-size:${U(280)}}
.board.sk-arena:is(.sk-live,.sk-score) .ar-sc>.ar-en{font-size:${U(30)}}.board.sk-arena:is(.sk-live,.sk-score) .ar-sub{font-size:${U(38)}}
.board.sk-arena:is(.sk-live,.sk-score) .ar-j{padding:${U(18)} ${U(26)}}.board.sk-arena:is(.sk-live,.sk-score) .ar-jn{width:${U(72)};height:${U(72)};font-size:${U(34)}}
.board.sk-arena:is(.sk-live,.sk-score) .ar-j:not(.rv) b{font-size:${U(78)}}.board.sk-arena:is(.sk-live,.sk-score) .ar-j:not(.rv) small{font-size:${U(30)};color:#C9D3EA}
.board.sk-arena:is(.sk-live,.sk-score) .ar-j.wait b{color:#7F8DB0}.board.sk-arena:is(.sk-live,.sk-score) .ar-j.ok b{font-size:${U(60)}}
.board.sk-arena .ar-idle{position:absolute;inset:${U(150)} ${U(100)};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:${U(20)}}
.board.sk-arena .ar-idle .ar-en{font-size:${U(28)};color:#E2C27F}.board.sk-arena .ar-idle h1{margin:0;font-weight:900;line-height:1.15}.board.sk-arena .ar-idle p{margin:0;font-size:${U(44)};color:#D6DEEF}
.board.sk-arena .ar-clock{font:800 ${U(90)} Archivo,sans-serif;font-stretch:80%}.board.sk-arena .ar-ic{font-size:${U(36)};font-weight:800;padding:${U(10)} ${U(30)};border-radius:${U(14)};background:var(--cc)}
/* v1.7.61 기다림 화면도 꽉 차게 */
.board.sk-arena .ar-idle{inset:${U(60)} ${U(80)};gap:${U(30)}}.board.sk-arena .ar-idle .ar-en{font-size:${U(40)};letter-spacing:.2em}
.board.sk-arena .ar-idle h1{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.1}.board.sk-arena .ar-idle p{font-size:${U(64)}}
.board.sk-arena .ar-idle .ar-clock{font-size:${U(190)};line-height:1}.board.sk-arena .ar-idle .ar-ic{font-size:${U(64)};padding:${U(14)} ${U(56)};border-radius:${U(20)}}.board.sk-arena .ar-ic b{font-family:Archivo,sans-serif}
/* 순위 */
.board.sk-arena .ar-rank{display:grid;grid-auto-flow:column;grid-template-columns:1fr 1fr;gap:${U(14)} ${U(40)}}
.board.sk-arena .ar-rr{position:relative;display:grid;grid-template-columns:${U(90)} minmax(0,1fr) auto;align-items:center;gap:${U(20)};padding:0 ${U(28)};border-radius:${U(14)};background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);animation:arin .45s ease both;animation-delay:calc(var(--t,0s) + var(--i)*.06s)}
.board.sk-arena .ar-rr .ar-rk{font-size:${U(66)}}.board.sk-arena .ar-rr .ar-rn b{font-size:${U(46)}}.board.sk-arena .ar-rr .ar-rn small{font-size:${U(24)}}.board.sk-arena .ar-rr .ar-rs{font-size:${U(62)}}
.board.sk-arena .ar-rr em{font-style:normal;font-size:${U(24)};font-weight:800;padding:${U(4)} ${U(14)};border-radius:${U(99)};background:#E2C27F;color:#1a1405;margin-left:${U(14)};vertical-align:middle}
.board.sk-arena .ar-rr.md .ar-rk{font-family:'Noto Sans KR',sans-serif;font-weight:900}.board.sk-arena .ar-rr.m1 .ar-rk{color:#F2D27A}.board.sk-arena .ar-rr.m2 .ar-rk{color:#D9DEE6}.board.sk-arena .ar-rr.m3 .ar-rk{color:#E0A070}.board.sk-arena .ar-rr.m3{border-color:rgba(205,127,50,.55)}.sk-row.md i{font-family:'Noto Sans KR',sans-serif;font-weight:900}.sk-row.m3 i{color:#E0A070}.board.sk-arena .ar-rr.g1{border-color:#E2C27F}.board.sk-arena .ar-rr.g1 .ar-rk{color:#E2C27F}
.board.sk-arena .ar-rr.me{background:linear-gradient(90deg,rgba(226,194,127,.22),rgba(226,194,127,.06));border-color:#E2C27F}
.board.sk-arena .ar-rr.out{opacity:.5}
.board.sk-arena .ar-rr.sm .ar-rn b{font-size:${U(38)};line-height:1.15}.board.sk-arena .ar-rr.sm .ar-rn small{font-size:${U(20)}}.board.sk-arena .ar-rr.sm .ar-rk{font-size:${U(56)}}.board.sk-arena .ar-rr.sm .ar-rs{font-size:${U(54)}}
.board.sk-arena .ar-cut{display:flex;align-items:center;gap:${U(20)};color:#E2C27F;font-weight:800;font-size:${U(26)}}.board.sk-arena .ar-cut:before,.board.sk-arena .ar-cut:after{content:"";flex:1;height:2px;background:#C9A45A}.board.sk-arena .ar-cut .ar-en{color:#C9A45A;font-size:${U(20)}}
/* 청·홍 */
:is(.board.sk-arena,.board.ky.ar) .ar-en.x{}
.board.sk-arena .ar-vs{display:grid;grid-template-columns:minmax(0,1fr) ${U(170)} minmax(0,1fr);min-height:${U(560)}}
.board.sk-arena .ar-side{position:relative;display:flex;flex-direction:column;border-radius:${U(18)};overflow:hidden;border:2px solid rgba(255,255,255,.12);min-width:0}
.board.sk-arena .ar-side.ar-b{background:linear-gradient(160deg,rgba(31,107,255,.32),rgba(11,58,158,.12) 60%,rgba(255,255,255,.03))}
.board.sk-arena .ar-side.ar-r{background:linear-gradient(200deg,rgba(240,53,63,.32),rgba(142,21,32,.12) 60%,rgba(255,255,255,.03))}
:is(.board.sk-arena,.board.ky.ar) .ar-sh{display:flex;align-items:center;gap:${U(16)};padding:${U(16)} ${U(32)};font-weight:900;font-size:${U(38)};position:relative;z-index:1}
.board.sk-arena .ar-b .ar-sh,.board.ky.ar .ks-side.blue .ar-sh{background:#1F6BFF}.board.sk-arena .ar-r .ar-sh,.board.ky.ar .ks-side.red .ar-sh{background:#F0353F;flex-direction:row-reverse}
:is(.board.sk-arena,.board.ky.ar) .ar-sh .ar-en{color:rgba(255,255,255,.85);font-size:${U(22)}}
:is(.board.sk-arena,.board.ky.ar) .ar-wtag{margin-left:auto;font:800 ${U(28)} Archivo,sans-serif;font-stretch:80%;letter-spacing:.12em;padding:${U(4)} ${U(18)};border-radius:${U(99)};background:#E2C27F;color:#1a1405}
.board.sk-arena .ar-r .ar-wtag,.board.ky.ar .ks-side.red .ar-wtag{margin-left:0;margin-right:auto}
.board.sk-arena .ar-sb{flex:1;display:flex;flex-direction:column;justify-content:center;padding:${U(18)} ${U(40)}}.board.sk-arena .ar-r .ar-sb{text-align:right}
.board.sk-arena .ar-side .ar-tm{font-size:${U(44)};margin-top:${U(8)}}
.board.sk-arena .ar-sbig{font:800 ${U(190)}/.9 Archivo,"Noto Sans KR",sans-serif;font-stretch:80%;margin-top:${U(10)}}
body.disp .board.sk-arena .vfinal.ar-sbig{font:800 ${U(190)}/.9 Archivo,"Noto Sans KR",sans-serif!important;font-stretch:80%!important;background:none!important;-webkit-text-fill-color:#fff;color:#fff!important;filter:none!important}
body.disp .board.sk-arena .side.win .vfinal.ar-sbig{-webkit-text-fill-color:#E2C27F;color:#E2C27F!important}
.board.sk-arena .ar-jrow{display:flex;gap:${U(12)};margin-top:${U(22)};flex-wrap:wrap}.board.sk-arena .ar-r .ar-jrow{justify-content:flex-end}
.board.sk-arena .ar-jd{width:${U(60)};height:${U(60)};border-radius:${U(12)};border:2px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font:800 ${U(26)} Archivo,sans-serif;color:#9AA8C7}
.board.sk-arena .ar-jd.ok{border-color:#34C77B;color:#34C77B;background:rgba(52,199,123,.08)}
.board.sk-arena .ar-jv{min-width:${U(92)};padding:${U(8)} ${U(10)};border-radius:${U(12)};border:2px solid rgba(255,255,255,.12);text-align:center;font:800 ${U(32)} Archivo,sans-serif}.board.sk-arena .ar-jv.x{opacity:.4;text-decoration:line-through}
.board.sk-arena .ar-side.win{border-color:#E2C27F;box-shadow:0 0 0 2px #E2C27F inset,0 0 ${U(60)} rgba(226,194,127,.25)}
.board.sk-arena .ar-side.lose{opacity:.55}
.board.sk-arena .ar-vc{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${U(16)};text-align:center}
.board.sk-arena .ar-vsx{font:800 ${U(72)} Archivo,sans-serif;font-stretch:75%;color:#9AA8C7}.board.sk-arena .ar-pm{font-size:${U(30)};font-weight:800;color:#E2C27F;line-height:1.3}.board.sk-arena .ar-vt{font:800 ${U(44)} Archivo,sans-serif;font-stretch:80%}
.board.sk-arena .ar-blue{color:#6FA0FF}.board.sk-arena .ar-red{color:#FF7A80}
.board.sk-arena .ar-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;border-radius:${U(18)};overflow:hidden;border:2px solid #E2C27F;padding:${U(30)} ${U(60)} ${U(30)} ${U(90)};animation:arin .5s ease both}
.board.sk-arena .ar-hero.blue{background:linear-gradient(90deg,rgba(31,107,255,.35),rgba(31,107,255,.08) 55%,rgba(226,194,127,.12))}.board.sk-arena .ar-hero.red{background:linear-gradient(90deg,rgba(240,53,63,.35),rgba(240,53,63,.08) 55%,rgba(226,194,127,.12))}.board.sk-arena .ar-hero.gold{background:linear-gradient(90deg,rgba(226,194,127,.30),rgba(226,194,127,.06) 60%,rgba(255,255,255,.04))}
.board.sk-arena .ar-hero:before{content:"";position:absolute;left:0;top:0;bottom:0;width:${U(30)};background:#E2C27F}.board.sk-arena .ar-hero.blue:before{background:#1F6BFF}.board.sk-arena .ar-hero.red:before{background:#F0353F}
.board.sk-arena .ar-hero .ar-en{font-size:${U(24)}}.board.sk-arena .ar-hero .ar-tm{font-size:${U(40)}}
.board.sk-arena .ar-hr{text-align:right}.board.sk-arena .ar-hr b{display:block;font-size:${U(96)};font-weight:900;color:#E2C27F;line-height:1.1}.board.sk-arena .ar-hr .ar-en{color:#C9A45A}
.board.sk-arena .ar-bk{display:grid;grid-template-columns:repeat(var(--c),minmax(0,1fr));gap:${U(30)};align-items:center}
.board.sk-arena .ar-bkg{display:grid;grid-template-columns:repeat(var(--c),minmax(0,1fr));gap:${U(14)} ${U(22)}}.board.sk-arena .ar-bkh{font-size:${U(22)};color:#E2C27F!important;margin-bottom:${U(-12)}}
.board.sk-arena .ar-bc{display:flex;flex-direction:column;justify-content:space-around;gap:${U(10)};height:100%}.board.sk-arena .ar-bc>.ar-en{font-size:${U(18)};color:#E2C27F}
.board.sk-arena .ar-bm{display:flex;flex-direction:column;gap:${U(4)};border-radius:${U(12)};padding:${U(4)}}.board.sk-arena .ar-bm.now{outline:2px solid #E2C27F}
.board.sk-arena .ar-bp{display:flex;align-items:center;gap:${U(12)};padding:${U(6)} ${U(16)};border-radius:${U(10)};background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);font-size:${U(26)};font-weight:800;min-width:0}
.board.sk-arena .ar-bp i{width:${U(14)};height:${U(14)};border-radius:${U(4)};flex:none}.board.sk-arena .ar-bp i.blue{background:#1F6BFF}.board.sk-arena .ar-bp i.red{background:#F0353F}
.board.sk-arena .ar-bp b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.board.sk-arena .ar-bp small{font:800 ${U(26)} Archivo,sans-serif;color:#9AA8C7}
.board.sk-arena .ar-bp.w{border-color:#E2C27F;background:rgba(226,194,127,.12)}.board.sk-arena .ar-bp.w small{color:#E2C27F}.board.sk-arena .ar-bp.l{opacity:.45}
.board.sk-arena .ar-pods{display:grid;grid-template-columns:repeat(3,1fr);gap:${U(18)}}.board.sk-arena .ar-pods .ar-cell{display:flex;align-items:center;gap:${U(18)};padding:${U(18)} ${U(26)};border-radius:${U(14)};background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10)}
.board.sk-arena .ar-rk.s{color:#C2C8D2}.board.sk-arena .ar-rk.b{color:#C9864A}
/* 겨루기 (기존 .ky 모양 위에 덮어씀 · 효과가 찾는 이름은 그대로) */
.board.ky.ar .ar-kmid{position:absolute;left:${U(84)};right:${U(70)};top:${U(178)};bottom:${U(148)};display:grid;grid-template-columns:minmax(0,1fr) ${U(380)} minmax(0,1fr);z-index:1}
.board.ky.ar .ks-side{position:relative;top:auto;left:auto;right:auto;width:auto;height:auto;display:flex;flex-direction:column;border-radius:${U(20)};overflow:hidden;border:2px solid rgba(255,255,255,.12);filter:none}
.board.ky.ar .ks-pn{position:absolute;inset:0;transform:none;border-radius:0;border:0!important;box-shadow:none!important;z-index:0}
.board.ky.ar .ks-pn::after{display:none}
.board.ky.ar .ks-side.blue .ks-pn{background:linear-gradient(170deg,rgba(31,107,255,.42),rgba(11,58,158,.16) 55%,rgba(255,255,255,.03))}
.board.ky.ar .ks-side.red .ks-pn{background:linear-gradient(190deg,rgba(240,53,63,.42),rgba(142,21,32,.16) 55%,rgba(255,255,255,.03))}
.board.ky.ar .ks-side.win{border-color:#E2C27F;box-shadow:0 0 0 3px #E2C27F inset,0 0 ${U(70)} rgba(226,194,127,.30)}
.board.ky.ar .ks-side.lose{opacity:.45;filter:none}
.board.ky.ar .ks-rw{position:static;display:flex;gap:${U(10)};margin-left:auto}.board.ky.ar .ks-side.red .ks-rw{margin-left:0;margin-right:auto}
.board.ky.ar .ks-rw i{width:${U(26)};height:${U(26)};border-radius:50%;border:${U(3)} solid rgba(255,255,255,.7);background:none;box-shadow:none}.board.ky.ar .ks-rw i.on{background:#E2C27F;border-color:#E2C27F}
.board.ky.ar .ks-who{position:relative;top:auto;left:auto;right:auto;padding:${U(22)} ${U(34)} 0;z-index:1}.board.ky.ar .ks-side.red .ks-who{text-align:right}
.board.ky.ar .ks-nm{font-weight:900;line-height:1.05;margin:0;text-shadow:none}.board.ky.ar .ks-tm{font-size:${U(36)};font-weight:700;color:#D6DEEF;margin-top:${U(4)}}
.board.ky.ar .ks-sco{position:relative;bottom:auto;left:auto!important;right:auto!important;flex:1;display:flex;align-items:center;justify-content:center;line-height:.85;z-index:1}
.board.ky.ar .ks-sco b{font:800 ${U(340)}/.85 Archivo,"Noto Sans KR",sans-serif;font-stretch:80%;letter-spacing:-.02em;text-shadow:none;color:#fff}
.board.ky.ar .ks-side.win .ks-sco b{color:#E2C27F;text-shadow:none}
.board.ky.ar .ks-gj{position:relative;bottom:auto;left:auto!important;right:auto!important;display:flex;align-items:center;gap:${U(12)};padding:${U(12)} ${U(34)} ${U(22)};font-size:${U(28)};font-weight:800;color:#D6DEEF;z-index:1}
.board.ky.ar .ks-side.red .ks-gj{flex-direction:row-reverse}.board.ky.ar .ks-gj .ar-en{font-size:${U(18)}}
.board.ky.ar .ks-gj b{font:800 ${U(36)} Archivo,sans-serif;margin:0 ${U(4)}}
.board.ky.ar .ks-gj i{width:${U(22)};height:${U(22)};border-radius:${U(6)};border:0;background:rgba(255,255,255,.14);box-shadow:none}.board.ky.ar .ks-gj i.on{background:#FFD23F;box-shadow:0 0 ${U(10)} #FFD23F}
.board.ky.ar .ar-ctr{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${U(18)};padding:0 ${U(18)}}
.board.ky.ar .ar-ph{font-size:${U(32)};font-weight:900;text-align:center}.board.ky.ar .ar-ph.on{color:#34C77B}.board.ky.ar .ar-ph.brk{color:#FFD23F}.board.ky.ar .ar-ph.win{color:#E2C27F}
.board.ky.ar .ar-clock{width:100%;border-radius:${U(20)};border:2px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);padding:${U(20)} ${U(10)} ${U(24)};text-align:center}.board.ky.ar .ar-clock .ar-en{font-size:${U(22)}}
.board.ky.ar .ar-clock b{display:block;font:800 ${U(148)}/1 Archivo,sans-serif;font-stretch:80%;margin-top:${U(6)}}.board.ky.ar .ar-clock.stop b{color:#FFD23F}.board.ky.ar .ar-clock.rest b{color:#7FD3FF}
.board.ky.ar .ar-rd{width:100%;text-align:center;border-radius:${U(14)};background:#E2C27F;color:#1a1405;padding:${U(10)} 0}.board.ky.ar .ar-rd b{font:800 ${U(44)} Archivo,sans-serif;font-stretch:80%;letter-spacing:.06em}
.board.ky.ar .ar-lead{font:800 ${U(32)} Archivo,"Noto Sans KR",sans-serif;font-stretch:80%;letter-spacing:.06em;padding:${U(8)} ${U(24)};border-radius:${U(99)};white-space:nowrap}.board.ky.ar .ar-lead.b{background:#1F6BFF}.board.ky.ar .ar-lead.r{background:#F0353F}
.board.ky.ar .ar-bot{height:${U(120)};grid-template-columns:${U(250)} minmax(0,1fr) ${U(380)}}
.board.ky.ar .ar-rlog{gap:${U(14)}!important;overflow:hidden}.board.ky.ar .ar-rlog span{font-size:${U(28)};font-weight:800;padding:${U(8)} ${U(18)};border-radius:${U(12)};border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);white-space:nowrap}
.board.ky.ar .ar-rlog span.b{border-color:#1F6BFF;box-shadow:inset ${U(4)} 0 0 #1F6BFF}.board.ky.ar .ar-rlog span.r{border-color:#F0353F;box-shadow:inset ${U(4)} 0 0 #F0353F}
.board.ky.ar .ksb-top,.board.ky.ar .ksb-bot,.board.ky.ar .ksb-wm{display:none}
@keyframes arin{from{opacity:0;transform:translateY(${U(14)})}to{opacity:1;transform:none}}
/* ⚔️ 청·홍 대결 (v1.7.15) */
.board.sk-duel{background:#07080C}
.sk-duel .sk-bg{background:radial-gradient(120% 80% at 50% 0%,#1A1A22,#06070A)}
.sk-duel .dz-top{position:absolute;left:0;right:0;top:0;height:${U(118)};display:grid;grid-template-columns:${U(220)} 1fr ${U(420)};align-items:center;padding:0 ${U(40)};background:linear-gradient(180deg,#14141B,#0B0B10);border-bottom:${U(4)} solid #C9A262}
.sk-duel .dz-court{display:flex;align-items:baseline;gap:${U(10)}}.sk-duel .dz-court b{font:900 ${U(70)} Archivo,"Noto Sans KR",sans-serif;color:#F2D27A;line-height:1}.sk-duel .dz-court span{font:800 ${U(18)} Archivo,sans-serif;letter-spacing:.2em;color:#9C8A66}
.sk-duel .dz-ev{text-align:center;min-width:0}.sk-duel .dz-ev h2{margin:0;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15}.sk-duel .dz-ev span{display:block;font:700 ${U(18)} Archivo,sans-serif;letter-spacing:.24em;color:#C9A262;margin-top:${U(4)}}
.sk-duel .dz-comp{text-align:right;font-size:${U(22)};color:#B9B2A2;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sk-duel .dz-stage{position:absolute;left:0;right:0;top:${U(122)};bottom:${U(70)};display:flex}
.sk-duel .dz-side{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;padding:${U(30)} ${U(30)} ${U(24)};overflow:hidden;transition:none}
.sk-duel .dz-side.blue{background:linear-gradient(160deg,#1C5BD8 0%,#0D2F86 45%,#061436 100%)}
.sk-duel .dz-side.red{background:linear-gradient(200deg,#E0323F 0%,#8E1220 45%,#3A050C 100%)}
.sk-duel .dz-side::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.035) 0 ${U(2)},transparent ${U(2)} ${U(26)});pointer-events:none}
.sk-duel .dz-hd{display:flex;align-items:baseline;gap:${U(14)};z-index:1}.sk-duel .dz-hd b{font:900 ${U(78)} "Black Han Sans","Noto Sans KR",sans-serif;line-height:1}.sk-duel .dz-hd span{font:800 ${U(26)} Archivo,sans-serif;letter-spacing:.3em;opacity:.8}
.sk-duel .dz-who{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:1;min-height:0;text-align:center}
.sk-duel .dz-nm{font-weight:900;line-height:1.05;white-space:nowrap;text-shadow:0 ${U(6)} ${U(24)} rgba(0,0,0,.45)}.sk-duel .dz-tmn{font-size:${U(40)};font-weight:700;opacity:.88;margin-top:${U(10)}}
.sk-duel .dz-jds{display:flex;gap:${U(14)};z-index:1;margin-bottom:${U(20)}}.sk-duel .dz-jd{width:${U(70)};height:${U(70)};border-radius:50%;display:grid;place-items:center;font:900 ${U(30)} Archivo,sans-serif;border:${U(4)} solid rgba(255,255,255,.35);color:rgba(255,255,255,.55)}
.sk-duel .dz-jd.ok{background:#fff;color:#111;border-color:#fff;box-shadow:0 0 ${U(20)} rgba(255,255,255,.6)}
.sk-duel .dz-band{flex:0 0 ${U(300)};z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${U(30)};padding:${U(20)} ${U(14)};color:#1C1405;
  background:linear-gradient(180deg,#F6DE97 0%,#D7AE5C 40%,#B8862E 70%,#E9C877 100%);box-shadow:0 0 ${U(50)} rgba(242,210,122,.45),inset 0 0 0 ${U(3)} rgba(255,255,255,.35)}
.sk-duel .dz-rd{text-align:center}.sk-duel .dz-rd span{display:block;font:800 ${U(18)} Archivo,sans-serif;letter-spacing:.22em;opacity:.75}.sk-duel .dz-rd b{display:block;font-family:"Black Han Sans","Noto Sans KR",sans-serif;line-height:1.05}
.sk-duel .dz-pl{display:flex;flex-direction:column;gap:${U(10)};align-items:stretch;width:100%}.sk-duel .dz-pl>small{text-align:center;font-weight:900;font-size:${U(22)};letter-spacing:.1em;opacity:.8}
.sk-duel .dz-pi{background:rgba(28,20,5,.12);border-radius:${U(14)};padding:${U(10)} ${U(8)};text-align:center;border:${U(3)} solid transparent}.sk-duel .dz-pi i{display:block;font-style:normal;font-weight:800;font-size:${U(18)};opacity:.75}.sk-duel .dz-pi b{display:block;font-weight:900;line-height:1.15}
.sk-duel .dz-pi.on{background:#1C1405;color:#F6DE97;border-color:#1C1405}
.sk-duel .dz-tm{font:900 ${U(76)} Archivo,sans-serif;font-variant-numeric:tabular-nums;font-stretch:80%}.sk-duel .dz-vs{font:900 ${U(46)} "Black Han Sans","Noto Sans KR",sans-serif}
.sk-duel .dz-next{position:absolute;left:0;right:0;bottom:0;height:${U(70)};display:flex;align-items:center;justify-content:center;gap:${U(16)};background:#0B0B10;border-top:${U(3)} solid #3A3326;font-size:${U(30)};font-weight:800}
.sk-duel .dz-next span{font:900 ${U(20)} Archivo,sans-serif;letter-spacing:.3em;color:#C9A262;border:${U(2)} solid #C9A262;padding:${U(3)} ${U(12)};border-radius:${U(8)}}.sk-duel .dz-next small{font-size:${U(24)};color:#B9B2A2}
.sk-duel .dz-note{position:absolute;left:50%;bottom:${U(86)};transform:translateX(-50%);background:#1C1405;color:#F6DE97;font-size:${U(30)};font-weight:900;padding:${U(8)} ${U(28)};border-radius:${U(40)};border:${U(3)} solid #C9A262;z-index:5;white-space:nowrap;opacity:0;animation:dzIn .5s ease both calc(var(--t) + 3.4s)}
/* 점수 공개: 카드 → 줄 긋기 → 최종 → 승 */
.sk-duel .dz-cards{display:flex;gap:${U(12)};z-index:1;perspective:${U(1400)};margin:${U(6)} 0 ${U(10)}}
.sk-duel .dz-card{width:${U(132)};height:${U(196)}}
.sk-duel .dz-cin{position:relative;width:100%;height:100%;transform-style:preserve-3d;transform:rotateY(180deg);animation:dzFlip .7s cubic-bezier(.3,1.4,.5,1) forwards calc(var(--t) + .6s)}
.sk-duel .dz-back,.sk-duel .dz-face{position:absolute;inset:0;border-radius:${U(16)};backface-visibility:hidden;-webkit-backface-visibility:hidden}
.sk-duel .dz-back{transform:rotateY(180deg);display:grid;place-items:center;background:repeating-linear-gradient(45deg,#C9A262 0 ${U(10)},#A9823F ${U(10)} ${U(20)});border:${U(4)} solid #F2D27A}.sk-duel .dz-back span{font:900 ${U(60)} "Black Han Sans",sans-serif;color:#1C1405}
.sk-duel .dz-face{background:#FBF7EE;color:#14110A;display:flex;flex-direction:column;align-items:center;justify-content:space-evenly;padding:${U(8)} ${U(4)};box-shadow:0 ${U(10)} ${U(26)} rgba(0,0,0,.4)}
.sk-duel .dz-face>small{font:900 ${U(20)} "Noto Sans KR";color:#7A6A48}
.sk-duel .dz-v{position:relative;display:flex;flex-direction:column;align-items:center;line-height:1}.sk-duel .dz-v i{font-style:normal;font-size:${U(16)};font-weight:800;color:#8A7C60}.sk-duel .dz-v b{font:900 ${U(50)} Archivo,sans-serif;font-variant-numeric:tabular-nums}
.sk-duel .dz-v.drop::after{content:"";position:absolute;left:-${U(10)};right:-${U(10)};top:58%;height:${U(6)};background:#E5282F;border-radius:${U(3)};transform:scaleX(0) rotate(-12deg);transform-origin:left;animation:dzStrike .35s ease-out forwards calc(var(--t) + 1.7s)}
.sk-duel .dz-v.drop b{animation:dzDim .3s forwards calc(var(--t) + 1.9s)}
.sk-duel .dz-fin{z-index:1;text-align:center;opacity:0;animation:dzPop .55s cubic-bezier(.3,1.6,.5,1) both calc(var(--t) + 2.3s)}.sk-duel .dz-fin b{display:block;font:900 ${U(140)} Archivo,sans-serif;font-stretch:85%;line-height:1;font-variant-numeric:tabular-nums;text-shadow:0 0 ${U(30)} rgba(255,255,255,.35)}.sk-duel .dz-fin small{font-size:${U(26)};font-weight:700;opacity:.85}
.sk-duel .dz-stage.decided .dz-side.win{animation:dzGrow .9s cubic-bezier(.5,0,.2,1) forwards calc(var(--t) + 3.2s)}
.sk-duel .dz-stage.decided .dz-side.lose{animation:dzLose .9s ease forwards calc(var(--t) + 3.2s)}
.sk-duel .dz-side.win .dz-fin b{animation:dzGold .6s forwards calc(var(--t) + 3.4s)}
.sk-duel .dz-win{position:absolute;right:${U(30)};top:${U(24)};z-index:4;text-align:center;opacity:0;animation:dzStamp .6s cubic-bezier(.2,1.6,.4,1) forwards calc(var(--t) + 3.5s)}
.sk-duel .dz-side.blue.win .dz-win{right:auto;left:${U(30)}}
.sk-duel .dz-win b{display:block;font:900 ${U(190)} "Black Han Sans","Noto Sans KR",sans-serif;line-height:1;background:linear-gradient(180deg,#FFF3C4,#F2D27A 40%,#B8862E 75%,#FFE7A3);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 ${U(6)} ${U(10)} rgba(0,0,0,.55)) drop-shadow(0 0 ${U(30)} rgba(242,210,122,.7))}
.sk-duel .dz-win span{font:900 ${U(28)} Archivo,sans-serif;letter-spacing:.35em;color:#F6DE97}
.sk-duel .dz-spk{position:absolute;inset:0;z-index:2;pointer-events:none}.sk-duel .dz-spk i{position:absolute;left:var(--x);top:var(--y);width:${U(26)};height:${U(26)};opacity:0;
  background:radial-gradient(circle,#FFF 0 12%,#FFE7A3 20%,transparent 62%);clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);
  animation:dzTw 1.6s ease-in-out infinite calc(var(--t) + 3.5s + var(--k)*.13s)}
.sk-duel .dz-tie{position:absolute;inset:auto 0 ${U(30)} 0;text-align:center;font:900 ${U(60)} "Black Han Sans",sans-serif;color:#F6DE97;opacity:0;animation:dzIn .5s forwards calc(var(--t) + 3.2s)}
@keyframes dzFlip{to{transform:rotateY(0)}}@keyframes dzStrike{to{transform:scaleX(1) rotate(-12deg)}}@keyframes dzDim{to{opacity:.35}}
@keyframes dzPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}@keyframes dzIn{from{opacity:0;transform:translate(-50%,${U(16)})}to{opacity:1;transform:translate(-50%,0)}}
.sk-duel .dz-tie{animation-name:dzFade}@keyframes dzFade{to{opacity:1}}
@keyframes dzGrow{to{flex-grow:2}}@keyframes dzShrink{to{transform:scale(.7)}}
.sk-duel .dz-stage.decided .dz-side.lose .dz-cards{animation:dzShrink .9s ease forwards calc(var(--t) + 3.2s)}@keyframes dzLose{to{flex-grow:.9;filter:saturate(.35) brightness(.55)}}
@keyframes dzGold{to{color:#FFE7A3;text-shadow:0 0 ${U(40)} rgba(242,210,122,.9)}}
@keyframes dzStamp{from{opacity:0;transform:scale(2.6) rotate(-14deg)}to{opacity:1;transform:scale(1) rotate(-6deg)}}
@keyframes dzTw{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:1;transform:scale(1.2) rotate(45deg)}}
/* 대진표 */
.sk-duel .dz-bkhero{position:absolute;left:0;right:0;top:${U(140)};display:flex;justify-content:center;align-items:center;gap:${U(18)};font-size:${U(54)};font-weight:900;animation:dzPop .6s both var(--t)}
.sk-duel .dz-bkhero>span:last-child{font-size:${U(32)};color:#1C1405;background:linear-gradient(180deg,#F6DE97,#B8862E);padding:${U(6)} ${U(22)};border-radius:${U(40)}}
.sk-duel .dz-dot{width:${U(34)};height:${U(34)};border-radius:50%}.sk-duel .dz-dot.blue{background:#2F6BFF}.sk-duel .dz-dot.red{background:#E5323F}
.sk-duel .dz-bk{position:absolute;left:${U(60)};right:${U(60)};top:${U(240)};bottom:${U(100)};display:grid;grid-template-columns:repeat(var(--c),1fr);gap:${U(40)}}
.sk-duel .dz-bc{display:flex;flex-direction:column;min-height:0}.sk-duel .dz-bch{text-align:center;font-weight:900;font-size:${U(30)};color:#F2D27A;margin-bottom:${U(10)};border-bottom:${U(3)} solid #3A3326;padding-bottom:${U(6)}}
.sk-duel .dz-bcl{flex:1;display:flex;flex-direction:column;justify-content:space-around;gap:${U(6)};min-height:0}
.sk-duel .dz-bm{border-radius:${U(14)};overflow:hidden;border:${U(3)} solid #2A2A33;background:#111118}
.sk-duel .dz-bm.now{border-color:#F2D27A;box-shadow:0 0 ${U(24)} rgba(242,210,122,.45)}.sk-duel .dz-bm.nx{border-color:#C9A262}
.sk-duel .dz-bs{display:flex;align-items:center;gap:${U(12)};padding:0 ${U(14)};font-size:var(--fs);height:var(--sh)}.sk-duel .dz-bs+.dz-bs{border-top:${U(2)} solid #24242C}
.sk-duel .dz-bs>i{flex:none;width:${U(14)};align-self:stretch;border-radius:${U(4)}}.sk-duel .dz-bs.blue>i{background:#2F6BFF}.sk-duel .dz-bs.red>i{background:#E5323F}
.sk-duel .dz-bs b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:900}.sk-duel .dz-bs small{font-size:calc(var(--fs)*.78);opacity:.75;font-variant-numeric:tabular-nums}
.sk-duel .dz-bs.w{background:linear-gradient(90deg,rgba(242,210,122,.28),transparent)}.sk-duel .dz-bs.w b{color:#FFE7A3}.sk-duel .dz-bs.l{opacity:.4}.sk-duel .dz-bs.l b{text-decoration:line-through}
.sk-duel .dz-bs.adv{animation:dzAdv 1.1s cubic-bezier(.3,1.3,.5,1) both calc(var(--t) + .9s)}
@keyframes dzAdv{0%{opacity:0;transform:translateX(-${U(260)})}60%{opacity:1;background:rgba(242,210,122,.6)}100%{opacity:1;transform:none;background:linear-gradient(90deg,rgba(242,210,122,.35),transparent)}}
/* 우승 */
.sk-duel .dz-champ{position:absolute;left:0;right:0;top:${U(118)};bottom:${U(70)};display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(60% 70% at 50% 45%,rgba(242,210,122,.28),transparent 70%)}
.sk-duel .dz-champ .dz-spk i{animation-delay:calc(var(--t) + var(--k)*.11s)}
.sk-duel .dz-cl{font:900 ${U(34)} Archivo,"Noto Sans KR",sans-serif;letter-spacing:.3em;color:#F2D27A;animation:dzPop .6s both var(--t)}
.sk-duel .dz-cn{font-weight:900;line-height:1.1;background:linear-gradient(180deg,#FFF3C4,#F2D27A 45%,#B8862E);-webkit-background-clip:text;background-clip:text;color:transparent;animation:dzPop .8s cubic-bezier(.3,1.5,.5,1) both calc(var(--t) + .3s)}
.sk-duel .dz-ct{font-size:${U(40)};font-weight:700;opacity:.9;margin-top:${U(8)}}
.sk-duel .dz-pods{display:flex;gap:${U(30)};margin-top:${U(50)}}.sk-duel .dz-pods>div{display:flex;align-items:center;gap:${U(14)};background:#14141B;border:${U(2)} solid #3A3326;border-radius:${U(18)};padding:${U(14)} ${U(26)};animation:dzPop .5s both calc(var(--t) + 1s)}
.sk-duel .dz-pods i{font-style:normal;width:${U(60)};height:${U(60)};border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:${U(28)};color:#111}.sk-duel .dz-pods i.s{background:linear-gradient(180deg,#F1F1F1,#A9A9A9)}.sk-duel .dz-pods i.b{background:linear-gradient(180deg,#E6A877,#9A5A2A)}
.sk-duel .dz-pods b{font-size:${U(38)};font-weight:900}.sk-duel .dz-pods small{font-size:${U(24)};opacity:.75}
/* v1.7.17 순위 한 줄씩 */
.sk-one{position:absolute;left:${U(260)};right:${U(260)};top:${U(250)};display:flex;flex-direction:column;gap:${U(12)}}
.sk-r1{position:relative;display:flex;align-items:center;gap:${U(26)};height:calc(var(--rh)*var(--u));padding:0 ${U(30)};border-radius:${U(18)};background:rgba(255,255,255,.06);animation:skR1 .5s both calc(var(--t) + var(--i)*.12s)}
.sk-r1 .sk-medal{flex:none;width:calc(var(--rh)*.78*var(--u));height:calc(var(--rh)*.78*var(--u));border-radius:50%;display:grid;place-items:center;font:900 calc(var(--rh)*.36*var(--u)) "Noto Sans KR",sans-serif;color:#1a1405;background:rgba(255,255,255,.18)}
.sk-r1.p1 .sk-medal{background:radial-gradient(circle at 35% 30%,#FFF6D2,#E2B54A 55%,#9C7120)}.sk-r1.p2 .sk-medal{background:radial-gradient(circle at 35% 30%,#FFFFFF,#C2C8D2 55%,#7C8594)}
.sk-r1.p3 .sk-medal,.sk-r1.md.m3 .sk-medal{background:radial-gradient(circle at 35% 30%,#FFE2C4,#C9864A 55%,#7E4A20)}.sk-r1.p4:not(.md) .sk-medal,.sk-r1.p5 .sk-medal{color:#fff}
.sk-r1 .sk-r1n{flex:1;min-width:0;display:flex;align-items:baseline;gap:${U(18)};white-space:nowrap;overflow:hidden}.sk-r1 .sk-r1n b{font-size:calc(var(--rh)*.46*var(--u));font-weight:900;overflow:hidden;text-overflow:ellipsis}.sk-r1 .sk-r1n small{font-size:calc(var(--rh)*.22*var(--u));opacity:.75}
.sk-r1 em{font-style:normal;font:900 calc(var(--rh)*.5*var(--u)) Archivo,"Noto Sans KR",sans-serif;font-variant-numeric:tabular-nums}
.sk-r1.p1{background:linear-gradient(90deg,rgba(226,181,74,.35),rgba(255,255,255,.05))}.sk-r1.me{outline:${U(4)} solid #E2C27F}
.sk-cut1{border-top:3px dashed currentColor;position:relative;margin:${U(6)} 0;opacity:.8}.sk-cut1 span{position:absolute;right:0;top:${U(-30)};font-size:${U(20)};font-weight:800}
.sk-me1{position:absolute;left:0;right:0;bottom:${U(60)};text-align:center;font-size:${U(32)};font-weight:800}.sk-me1 b{color:#E2C27F}.sk-me1 small{font-size:${U(22)};opacity:.75}
@keyframes skR1{from{opacity:0;transform:translateY(${U(20)})}to{opacity:1;transform:none}}
.board.sk-arena .ar-rank.one{grid-auto-flow:row;grid-template-columns:1fr;gap:${U(12)};width:${U(1500)};max-width:100%;margin:0 auto}
.board.sk-arena .ar-rr.one{grid-template-columns:calc(var(--rh)*1.25*var(--u)) 1fr auto}
.board.sk-arena .ar-rr.one .ar-rk{font-size:calc(var(--rh)*.6*var(--u))}
.board.sk-arena .ar-rr.one .ar-rn b{font-size:calc(var(--rh)*.44*var(--u))}
.board.sk-arena .ar-rr.one .ar-rn small{font-size:calc(var(--rh)*.2*var(--u))}
.board.sk-arena .ar-rr.one .ar-rs{font-size:calc(var(--rh)*.56*var(--u))}

/* ---------- v1.7.30 점수 공개 화면 모양 ---------- */
.board.sk-lay{--bg:#060709;--g1:rgba(232,194,106,.06);--ac:#E8C26A;--hi:#F7E7B4;--ln:rgba(232,194,106,.35);--pan:rgba(255,255,255,.035);--in:#FFFFFF;--out:#4A505D;--nf:Archivo,"Barlow Condensed","Noto Sans KR",sans-serif}
.board.sk-lay.ly-royal{--bg:#06112C;--g1:rgba(70,110,220,.20);--ac:#E8C26A;--hi:#F7E7B4;--ln:rgba(232,194,106,.42);--pan:rgba(255,255,255,.045);--out:#47506A}
.board.sk-lay.ly-fire{--bg:#0A0302;--g1:rgba(255,80,20,.16);--ac:#FF8A1F;--hi:#FFD08A;--ln:rgba(255,138,31,.45);--pan:rgba(255,255,255,.04);--out:#5A4842}
.board.sk-lay.ly-arena,.board.sk-lay.ly-duel{--bg:#07122B;--g1:color-mix(in srgb,var(--cc,#3B82F6) 16%,transparent);--ac:#E8C26A;--hi:#F7E7B4;--ln:rgba(255,255,255,.14);--pan:rgba(255,255,255,.045);--out:#46526E}
.board.sk-lay{background:var(--bg)}
.ly-bg{position:absolute;inset:0;background:radial-gradient(${U(1200)} ${U(800)} at 75% 45%,var(--g1),transparent 70%),linear-gradient(180deg,rgba(255,255,255,.03),transparent 30%),var(--bg)}
.board.sk.sk-lay>.sk-s{box-sizing:border-box;display:flex;flex-direction:column;padding:${U(34)} ${U(56)} ${U(26)}}
.board.sk.sk-lay>.ly-bg{z-index:0}
.ly-top{display:flex;align-items:center;gap:${U(28)};height:${U(96)};border-bottom:${U(2)} solid var(--ln);flex:none}
.ly-court{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:${U(120)};height:${U(84)};padding:0 ${U(14)};border-radius:${U(14)};background:var(--cc,var(--ac));color:#fff;font:800 ${U(54)}/1 var(--nf);font-stretch:75%}
.ly-fire .ly-court,.ly-base .ly-court,.ly-royal .ly-court{background:var(--ac);color:#140C02}
.ly-court small{font:800 ${U(18)} "Noto Sans KR";margin-top:${U(2)}}
.ly-div{flex:1;font:900 ${U(52)}/1.1 "Noto Sans KR";color:var(--hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ly-lab{font:800 ${U(44)} "Noto Sans KR";color:#fff;white-space:nowrap}
.ly-nm{font-weight:900;line-height:1.02;color:#fff;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:lyup .5s ease-out both;animation-delay:var(--t)}
.ly-tm{font:700 ${U(54)}/1.2 "Noto Sans KR";color:#C9CFDA;margin-top:${U(8)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ly-fin{font:800 ${U(380)}/.9 var(--nf);font-stretch:75%;color:var(--ac);letter-spacing:-.02em;text-shadow:0 ${U(6)} ${U(18)} rgba(0,0,0,.55);animation:lypop .7s cubic-bezier(.2,1.4,.4,1) both;animation-delay:calc(var(--t) + 300ms);white-space:nowrap}
.ly-fire .ly-fin{color:#fff;text-shadow:0 0 ${U(40)} rgba(255,138,31,.7),${U(10)} ${U(10)} 0 #000}
.ly-parts{display:flex;gap:${U(40)};flex-wrap:wrap;font:800 ${U(54)} var(--nf);font-stretch:85%;color:#fff}
.ly-parts i{font:700 ${U(30)} "Noto Sans KR";font-style:normal;color:#AEB6C6;margin-right:${U(12)}}.ly-parts .neg{color:#FF7A85}
.ly-note{font:800 ${U(34)} "Noto Sans KR";color:#FF8A8A}
.ly-foot{flex:none;display:flex;align-items:center;justify-content:space-between;gap:${U(30)};height:${U(64)};border-top:${U(2)} solid var(--ln);font:700 ${U(30)} "Noto Sans KR";color:#C9CFDA}
.ly-lg{display:flex;align-items:center;gap:${U(12)}}.ly-lg i{display:inline-block;width:${U(26)};height:${U(26)};border-radius:${U(6)};margin-left:${U(14)}}.ly-lg i.k{background:var(--in)}.ly-lg i.o{background:var(--out)}
.ly-nx{margin-left:auto;font-weight:800;color:#fff}.ly-nx i{font:800 ${U(22)} var(--nf);letter-spacing:.2em;color:var(--ac);font-style:normal;margin-right:${U(14)}}
/* 들어간 점수 흰색 · 빠진 점수 어두운 회색 */
.sk-lay .ly-its b,.sk-lay .lt-j span{color:var(--in)}
.sk-lay .ly-its .o b,.sk-lay .ly-its .o i,.sk-lay .lt-j span.o{color:var(--out)!important}
.sk-lay .out .ly-jn,.sk-lay .out .ly-jt,.sk-lay .out .ly-ct,.sk-lay .out .ly-ch b{color:var(--out)!important}
.sk-lay .out{border-color:color-mix(in srgb,var(--out) 60%,transparent)!important;background:rgba(0,0,0,.25)!important}
/* ① 왼쪽 심판 · 오른쪽 총점 */
.ly1 .ly-main{flex:1;display:grid;grid-template-columns:${U(820)} 1fr;gap:${U(56)};min-height:0;padding:${U(26)} 0}
.ly1 .ly-js{display:grid;grid-template-rows:repeat(var(--n),1fr);gap:${U(14)};min-height:0}
.ly1 .ly-j{display:grid;grid-template-columns:${U(120)} 1fr auto;align-items:center;gap:${U(18)};padding:0 ${U(26)};border-radius:${U(16)};background:var(--pan);border:${U(2)} solid rgba(255,255,255,.12);min-height:0;animation:lyin .5s ease-out both;animation-delay:calc(var(--t) + var(--d))}
.ly1 .ly-jn{font:800 ${U(58)}/1 var(--nf);font-stretch:80%;color:var(--hi)}.ly1 .ly-jn small{font:800 ${U(26)} "Noto Sans KR";margin-left:${U(4)}}
.ly1 .ly-its{display:flex;gap:${U(26)};justify-content:flex-start}
.ly1 .ly-its span{display:flex;flex-direction:column;align-items:flex-start}
.ly1 .ly-its i{font:700 ${U(20)} "Noto Sans KR";font-style:normal;color:#9AA3B5}.ly1 .ly-its b{font:800 ${U(52)}/1 var(--nf);font-stretch:80%}
.ly1 .ly-jt{font:800 ${U(70)}/1 var(--nf);font-stretch:75%;color:#fff}
.ly1 .ly-js[style*="--n:6"] .ly-its b,.ly1 .ly-js[style*="--n:7"] .ly-its b{font-size:${U(42)}}.ly1 .ly-js[style*="--n:6"] .ly-jt,.ly1 .ly-js[style*="--n:7"] .ly-jt{font-size:${U(56)}}
.ly1 .ly-its span:nth-child(4) b,.ly1 .ly-its span:nth-child(5) b{font-size:${U(44)}}
.ly1 .ly-me{display:flex;flex-direction:column;justify-content:center;align-items:flex-end;text-align:right;min-width:0;gap:${U(6)}}
.ly1 .ly-me .ly-nm,.ly1 .ly-me .ly-tm{max-width:100%}
.ly1 .ly-fin{margin-top:${U(18)}}.ly1 .ly-parts{justify-content:flex-end;margin-top:${U(10)}}
/* ② 위 이름·총점 · 아래 심판 한 줄 */
.ly2 .ly-band{flex:1;display:flex;flex-direction:column;justify-content:space-evenly;gap:0;padding:${U(6)} ${U(48)};margin:${U(16)} 0;border-radius:${U(22)};background:linear-gradient(90deg,var(--pan),rgba(255,255,255,.015));border:${U(2)} solid rgba(255,255,255,.08);border-bottom:${U(5)} solid var(--ac);min-height:0}
.ly2 .ly-r1{display:flex;align-items:baseline;gap:${U(40)};min-width:0}.ly2 .ly-r1 .ly-nm{flex:0 1 auto;min-width:0;line-height:1.05}.ly2 .ly-r1 .ly-tm{flex:none;font-size:${U(72)};font-weight:800;margin:0;max-width:${U(960)}}
.ly2 .ly-r2{display:flex;align-items:flex-end;justify-content:space-between;gap:${U(40)};min-width:0}
.ly2 .ly-pl{display:flex;flex-direction:column;gap:${U(8)};padding-bottom:${U(24)};min-width:0}.ly2 .ly-pl .ly-parts{flex-direction:column;gap:${U(6)};font-size:${U(62)}}.ly2 .ly-pl .ly-parts i{font-size:${U(32)}}
.ly2 .ly-fin{font-size:${U(420)};line-height:.84}
.ly2 .ly-cs{flex:none;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:${U(18)};margin-bottom:${U(14)}}
.ly2 .ly-top{height:${U(84)}}.ly2 .ly-div{font-size:${U(46)}}
.ly2 .ly-c{border-radius:${U(16)};background:var(--pan);border:${U(2)} solid rgba(255,255,255,.12);padding:${U(12)} ${U(22)} ${U(14)};animation:lyin .5s ease-out both;animation-delay:calc(var(--t) + var(--d))}
.ly2 .ly-ch{display:flex;justify-content:space-between;align-items:baseline}.ly2 .ly-ch b:first-child{font:800 ${U(34)} "Noto Sans KR";color:var(--hi)}.ly2 .ly-ct{font:800 ${U(66)}/1 var(--nf);font-stretch:75%;color:#fff}
.ly2 .ly-its{display:flex;justify-content:space-between;gap:${U(8)};margin-top:${U(6)}}.ly2 .ly-its span{display:flex;flex-direction:column;align-items:center}
.ly2 .ly-its i{font:700 ${U(19)} "Noto Sans KR";font-style:normal;color:#9AA3B5}.ly2 .ly-its b{font:800 ${U(44)}/1.05 var(--nf);font-stretch:80%}
/* 청·홍: 양쪽 끝 심판 · 가운데 두 선수 */
.lyT .lt-main{flex:1;display:grid;grid-template-columns:${U(330)} 1fr ${U(330)};gap:${U(28)};min-height:0;padding:${U(24)} 0}
.lyT .lt-js{display:flex;flex-direction:column;justify-content:center;gap:${U(12)}}
.lyT .lt-j{display:grid;grid-template-columns:${U(86)} 1fr 1fr;align-items:center;gap:${U(8)};padding:${U(10)} ${U(16)};border-radius:${U(14)};background:var(--pan);border:${U(2)} solid rgba(255,255,255,.1);animation:lyin .5s ease-out both;animation-delay:calc(var(--t) + var(--d))}
.lyT .lt-js.b .lt-j{border-left:${U(8)} solid #2F7BFF}.lyT .lt-js.r .lt-j{border-right:${U(8)} solid #FF3B4E}
.lyT .lt-j .ly-jn{font:800 ${U(46)}/1 var(--nf);font-stretch:80%;color:var(--hi)}.lyT .lt-j .ly-jn small{font:800 ${U(20)} "Noto Sans KR"}
.lyT .lt-j span{font:800 ${U(48)}/1 var(--nf);font-stretch:80%;text-align:right}
.lyT .lt-ctr{display:grid;grid-template-columns:1fr 1fr;gap:${U(24)};min-width:0}
.lyT .lt-p{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-radius:${U(24)};padding:${U(20)};min-width:0;background:var(--pan)}
.lyT .lt-p.b{background:linear-gradient(180deg,rgba(47,123,255,.32),rgba(47,123,255,.08));border:${U(3)} solid rgba(47,123,255,.6)}
.lyT .lt-p.r{background:linear-gradient(180deg,rgba(255,59,78,.32),rgba(255,59,78,.08));border:${U(3)} solid rgba(255,59,78,.6)}
.lyT .lt-p.win{box-shadow:0 0 ${U(60)} color-mix(in srgb,var(--ac) 55%,transparent);border-color:var(--ac)}.lyT .lt-p.lose{opacity:.8;filter:saturate(.7)}
.lyT .lt-h{font:900 ${U(52)} "Noto Sans KR";color:#fff}.lyT .lt-h em{font:800 ${U(34)} var(--nf);font-style:normal;color:#140C02;background:var(--ac);border-radius:${U(10)};padding:${U(2)} ${U(16)};margin-left:${U(16)};vertical-align:middle}
.lyT .ly-tm{font-size:${U(40)}}.lyT .ly-fin{font-size:${U(220)};margin-top:${U(10)}}.lyT .ly-parts{justify-content:center;font-size:${U(38)};gap:${U(24)}}.lyT .ly-parts i{font-size:${U(24)}}
@keyframes lyin{from{opacity:0;transform:translateX(${U(-30)})}to{opacity:1;transform:none}}
@keyframes lyup{from{opacity:0;transform:translateY(${U(24)})}to{opacity:1;transform:none}}
@keyframes lypop{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.board.sk *,.board.ky.ar *{animation:none!important}}
`;
const css3=`
/* ===== v1.7.55 새 디자인 공통 틀 ===== */
.sk-bc .n-en,.sk-sw .n-en,.sk-pr .n-en{display:block;font:700 ${U(20)} "Barlow Condensed",Archivo,sans-serif;letter-spacing:.32em;text-transform:uppercase;opacity:.75;white-space:nowrap}
.n-top{position:absolute;left:0;right:0;top:0;height:${U(120)};display:flex;align-items:stretch;z-index:3}
.n-crt{width:${U(150)};flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center}
.n-crt b{font:700 ${U(80)}/.9 "Barlow Condensed",Archivo,sans-serif}.n-crt small{font:700 ${U(17)} "Barlow Condensed",sans-serif;letter-spacing:.3em;margin-top:${U(4)}}
.n-ttl{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 ${U(36)};min-width:0}
.n-ttl b{font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
.n-stg{flex:none;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;padding:0 ${U(40)};min-width:${U(300)}}
.n-stg b{font-weight:900;white-space:nowrap;line-height:1.2}
.n-main{position:absolute;left:${U(60)};right:${U(60)};top:${U(150)};height:${U(500)};display:grid;grid-template-columns:minmax(0,1fr) ${U(740)};gap:${U(40)};z-index:1}
.n-who{position:relative;z-index:1;display:flex;flex-direction:column;justify-content:center;min-width:0}
.n-nm{font-weight:900;line-height:1.05;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:${U(10)};animation:nrise .7s cubic-bezier(.2,1.2,.3,1) both;animation-delay:var(--t)}
.n-tm{font:700 ${U(50)} "Noto Sans KR","Malgun Gothic",sans-serif;margin-top:${U(12)};opacity:.92;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.n-mem{font-size:${U(28)};opacity:.75;margin-top:${U(10)};line-height:1.35}
.n-clk{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:${U(24)};min-width:0}
.n-clk>b{font:700 ${U(270)}/.9 "Barlow Condensed",Archivo,sans-serif;letter-spacing:-.01em;white-space:nowrap}.n-clk>b small{font-size:${U(70)};margin-left:${U(10)}}
.n-sub{font-size:${U(28)};opacity:.82;margin-top:${U(12)};text-align:center}.n-sub i{font-style:normal;font-weight:800}.n-sub.neg{color:#ff8a98}
.n-res{display:flex;flex-direction:column;align-items:center}
.n-final{font:700 ${U(250)}/.9 "Barlow Condensed",Archivo,sans-serif;white-space:nowrap}
.n-parts{display:flex;gap:${U(34)};margin-top:${U(14)}}.n-p{text-align:center}.n-p small{display:block;font-size:${U(22)};opacity:.72}.n-p b{font:700 ${U(50)} "Barlow Condensed",Archivo,sans-serif}.n-p.neg b{color:#ff6b80}
.n-js{position:absolute;left:${U(60)};right:${U(60)};top:${U(680)};height:${U(140)};display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:${U(14)};z-index:1}
.n-j{border-radius:${U(14)};display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;animation:nup .45s both;animation-delay:calc(var(--t) + .2s)}
.n-j small{font:700 ${U(20)} "Barlow Condensed",sans-serif;letter-spacing:.2em;opacity:.75;white-space:nowrap}
.n-j b{font:700 ${U(60)}/1 "Barlow Condensed",Archivo,sans-serif;margin-top:${U(4)}}
.n-j.wait b{opacity:.35;font-size:${U(40)}}.n-j.ok b{color:#5CF2A6}
.n-ji{display:flex;gap:${U(12)};font-size:${U(19)};margin-top:${U(6)};opacity:.9;white-space:nowrap}.n-ji i{font-style:normal}.n-ji i.x{opacity:.35;text-decoration:line-through}
.n-j.drop{opacity:.42}
.n-bot{position:absolute;left:0;right:0;bottom:0;height:${U(190)};display:grid;grid-template-columns:${U(250)} minmax(0,1fr) ${U(440)};z-index:2}
.n-bl{display:flex;flex-direction:column;justify-content:center;padding-left:${U(50)}}.n-bl b{font-size:${U(36)};font-weight:900}
.n-scs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:${U(12)};padding:${U(24)} ${U(12)}}
.n-sc{display:flex;align-items:center;gap:${U(16)};padding:0 ${U(20)};border-radius:${U(14)};min-width:0}
.n-sc i{font:700 ${U(54)} "Barlow Condensed",Archivo,sans-serif;font-style:normal;width:${U(44)};text-align:center;flex:none}
.n-sc span{flex:1;min-width:0}.n-sc span b{display:block;font-size:${U(34)};font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.n-sc span small{display:block;font-size:${U(22)};opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.n-sc em{font:700 ${U(46)} "Barlow Condensed",Archivo,sans-serif;font-style:normal;flex:none}
.n-sc.wide,.n-sc.mute{grid-column:1/-1}.n-sc.mute{opacity:.5}
.n-next{display:flex;flex-direction:column;justify-content:center;padding:0 ${U(40)};min-width:0}
.n-next b{font-size:${U(34)};font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.n-next small{font-size:${U(22)};opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.n-next.solo{position:absolute;left:0;right:0;bottom:0;height:${U(110)};align-items:flex-end;text-align:right;z-index:2}
.n-rank{position:absolute;left:${U(130)};right:${U(130)};top:${U(150)};height:${U(700)};display:flex;flex-direction:column;justify-content:center;gap:${U(10)};z-index:1}
.n-r{position:relative;display:flex;align-items:center;gap:${U(30)};padding:0 ${U(34)};border-radius:${U(14)};flex:none;animation:nrow .5s cubic-bezier(.2,1,.3,1) both;animation-delay:calc(var(--t) + var(--i)*90ms)}
.n-rk{font:700 ${U(70)}/1 "Barlow Condensed",Archivo,sans-serif;width:${U(110)};text-align:center;flex:none}
.n-r.md .n-rk{font:400 ${U(48)}/1 "Black Han Sans","Noto Sans KR",sans-serif;width:${U(92)};height:${U(92)};border-radius:50%;display:grid;place-items:center;color:#1a1306;box-shadow:0 ${U(6)} ${U(18)} rgba(0,0,0,.35)}
.n-r.m1 .n-rk{background:linear-gradient(180deg,#FFF3C8,#D6A93E)}.n-r.m2 .n-rk{background:linear-gradient(180deg,#F4F7FB,#9AA6B6)}.n-r.m3 .n-rk{background:linear-gradient(180deg,#F6D2AE,#B06F38)}
.n-rn{flex:1;min-width:0}.n-rn b{display:block;font-size:${U(50)};font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.n-rn small{display:block;font-size:${U(26)};opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.n-rn em{font-style:normal;font-size:${U(22)};margin-left:${U(14)};padding:${U(2)} ${U(12)};border-radius:${U(8)};vertical-align:middle;background:#F5C451;color:#140c02}
.n-rs{font:700 ${U(68)} "Barlow Condensed",Archivo,sans-serif;flex:none}
.n-r.out{opacity:.5}
.n-cut{display:flex;justify-content:space-between;align-items:center;border-top:${U(3)} dashed;padding:${U(6)} ${U(10)} 0;font-weight:800;font-size:${U(24)};flex:none}
.n-gap{text-align:center;opacity:.5;font-size:${U(30)};line-height:1;flex:none}
.n-idle{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 ${U(120)};z-index:1}
.n-idle h1{font-weight:900;line-height:1.12;margin:${U(16)} 0;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.n-idle p{font-size:${U(64)};opacity:.85;margin:0}.n-now{font:800 ${U(190)}/1 Archivo,sans-serif;font-stretch:80%;margin-top:${U(26)}}.n-ic{margin-top:${U(14)};font-size:${U(64)};font-weight:800}.n-ic b{font:800 ${U(64)} Archivo,sans-serif}
.n-idle .n-en{font-size:${U(40)}!important}
/* 청·홍 */
.n-duel{position:absolute;left:0;right:0;top:${U(120)};bottom:${U(110)};display:grid;grid-template-columns:minmax(0,1fr) ${U(440)} minmax(0,1fr);z-index:1}
.n-side{position:relative;overflow:hidden;padding:${U(46)} ${U(60)} ${U(30)};display:flex;flex-direction:column;min-width:0}
.n-side.r{text-align:right;align-items:flex-end}
.n-wm{position:absolute;bottom:${U(-90)};font:400 ${U(460)}/1 "Black Han Sans","Noto Sans KR",sans-serif;opacity:.08;pointer-events:none}.n-side.b .n-wm{left:${U(20)}}.n-side.r .n-wm{right:${U(20)}}
.n-sh{position:relative;display:flex;align-items:center;gap:${U(14)}}.n-side.r .n-sh{flex-direction:row-reverse}
.n-sh i{font:400 ${U(38)} "Black Han Sans","Noto Sans KR",sans-serif;font-style:normal}
.n-win{font:700 ${U(30)} "Barlow Condensed",sans-serif;letter-spacing:.3em;font-style:normal;padding:${U(6)} ${U(18)};border-radius:${U(6)};background:#F5C451;color:#05070d;animation:npop .5s both;animation-delay:calc(var(--t) + .6s)}
.n-side .n-nm{position:relative;margin-top:${U(22)};max-width:100%}.n-side .n-tm{position:relative;font-size:${U(44)}}
.n-tot{position:relative;font:700 ${U(190)}/.85 "Barlow Condensed",Archivo,sans-serif;margin-top:auto;animation:npop .6s both;animation-delay:calc(var(--t) + .3s)}
.n-side .n-sub{position:relative;text-align:inherit;margin-top:${U(6)}}
.n-side .n-js.sd{position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;height:${U(112)}!important;margin-top:${U(20)};width:100%;border:0!important}
.n-duel:not(.res) .n-side .n-js.sd{margin-top:auto}
.n-side.lose{filter:saturate(.3) brightness(.6)}
.n-ctr{position:relative;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${U(24)}}
.n-ctr .n-clk{padding:${U(16)} ${U(34)} ${U(22)}}.n-ctr .n-clk>b{font-size:${U(220)}}
.n-pls{display:flex;flex-direction:column;gap:${U(10)};align-items:center}.n-pi{padding:${U(8)} ${U(28)};border-radius:999px;text-align:center}.n-pi small{display:block;font-size:${U(18)};opacity:.75}.n-pi b{font-size:${U(40)};font-weight:900;white-space:nowrap}
.n-verd{display:flex;flex-direction:column;align-items:center;text-align:center;animation:npop .6s both;animation-delay:calc(var(--t) + .5s)}.n-verd b{font:400 ${U(120)}/1.1 "Black Han Sans","Noto Sans KR",sans-serif;white-space:nowrap}.n-verd small{font-size:${U(24)};opacity:.78;max-width:${U(400)}}
.n-verd.b b{color:#7FA6FF}.n-verd.r b{color:#FF7A8C}
.n-hero{position:absolute;left:${U(60)};right:${U(60)};top:${U(150)};height:${U(300)};display:flex;flex-direction:column;justify-content:center;align-items:center;border-radius:${U(24)};z-index:1;text-align:center;animation:npop .6s both;animation-delay:var(--t)}
.n-hero b{font-weight:900;line-height:1.08;white-space:nowrap}.n-hero small{font-size:${U(36)};opacity:.88;margin-top:${U(8)}}.n-hero.champ{height:${U(460)}}
.n-bk{position:absolute;left:${U(60)};right:${U(60)};top:${U(480)};bottom:${U(130)};z-index:1}.n-bk.full{top:${U(150)}}
.n-bks{display:grid;grid-template-columns:repeat(var(--c),minmax(0,1fr));gap:${U(16)};margin-top:${U(12)}}
.n-bm{border-radius:${U(16)};overflow:hidden;display:flex;flex-direction:column}
.n-bp{display:grid;grid-template-columns:${U(46)} minmax(0,1fr) auto;align-items:center;padding:${U(12)} ${U(18)};column-gap:${U(10)}}
.n-bp i{font:400 ${U(30)} "Black Han Sans","Noto Sans KR",sans-serif;font-style:normal;grid-row:1/3}.n-bp.b i{color:#7FA6FF}.n-bp.r i{color:#FF7A8C}
.n-bp b{font-size:${U(32)};font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.n-bp small{grid-column:2;font-size:${U(18)};opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.n-bp em{grid-row:1/3;grid-column:3;font:700 ${U(44)} "Barlow Condensed",sans-serif;font-style:normal}.n-bp.l{opacity:.42}
.n-pod{position:absolute;left:${U(200)};right:${U(200)};top:${U(650)};display:flex;flex-direction:column;gap:${U(12)};z-index:1}.n-pod .n-r{height:${U(100)}}
@keyframes nrise{from{opacity:0;transform:translateY(${U(30)})}to{opacity:1;transform:none}}
/* v1.8.2 경기 중 화면: 선수 이름과 시간의 가운데 높이를 똑같이 — 위 작은 글(ATHLETE·TIME)과 아래 글(소속·경기 시간)은 띄워 놓고 이름·시간만 가운데 */
.board.sk-arena.sk-live .ar-band{align-items:stretch}
.board.sk-arena.sk-live .ar-who:not(:has(.ar-mem)),.board.sk-arena.sk-live .ar-sc{position:relative;display:flex;flex-direction:column;justify-content:center}
.board.sk-arena.sk-live .ar-sc{align-items:flex-end}
.board.sk-arena.sk-live .ar-who:not(:has(.ar-mem))>.ar-en,.board.sk-arena.sk-live .ar-sc>.ar-en{position:absolute;top:0;margin:0}
.board.sk-arena.sk-live .ar-who:not(:has(.ar-mem))>.ar-tm,.board.sk-arena.sk-live .ar-sc>.ar-sub{position:absolute;bottom:0;margin:0;max-width:100%}
.board.sk-live .n-who:not(:has(.n-mem))>.n-en,.board.sk-live .n-main:not(.sc) .n-clk>.n-en{position:absolute;top:${U(18)};margin:0}
.board.sk-live .n-who:not(:has(.n-mem))>.n-tm,.board.sk-live .n-main:not(.sc) .n-clk>.n-sub{position:absolute;bottom:${U(18)};margin:0;max-width:100%}
.board.sk-live .n-who:not(:has(.n-mem))>.n-nm{margin-top:0}
@keyframes nup{from{opacity:0;transform:translateY(${U(18)})}to{opacity:1;transform:none}}
@keyframes nrow{from{opacity:0;transform:translateX(${U(-40)})}to{opacity:1;transform:none}}
@keyframes npop{0%{opacity:0;transform:scale(.7)}100%{opacity:1;transform:none}}

/* ===== 📺 중계방송형 ===== */
.sk-bc{color:#fff}.sk-bc>.sk-bg{background:#04060c}
.sk-bc .n-top{background:linear-gradient(180deg,#0c111d,#070a12);border-bottom:2px solid #1b2333}
.sk-bc .n-crt{background:#fff;color:#05070d}
.sk-bc .n-ttl .n-en{color:#8ea0c2;opacity:1}.sk-bc .n-stg{background:#111827;border-left:2px solid #1b2333}.sk-bc .n-stg .n-en{color:#F5C451;opacity:1}
.sk-bc .n-nm,.sk-bc .n-hero b{font-family:"Black Han Sans","Noto Sans KR",sans-serif;font-weight:400;text-shadow:0 ${U(10)} ${U(40)} rgba(0,0,0,.35)}
.sk-bc .n-main{left:0;right:0;top:${U(120)};height:${U(540)};padding:0 ${U(70)}}
.sk-bc .n-main::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,#1a56ff,#0b2fb0 45%,#06134f);clip-path:polygon(0 0,66% 0,58% 100%,0 100%)}
.sk-bc .n-main::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.035) 0 2px,transparent 2px 22px);clip-path:polygon(0 0,66% 0,58% 100%,0 100%);pointer-events:none}
.sk-bc .n-clk{background:#04060c;margin:${U(40)} 0;box-shadow:0 0 0 2px #1f2a3f,0 ${U(30)} ${U(80)} rgba(0,0,0,.6)}
.sk-bc .n-js{top:${U(680)}}.sk-bc .n-j{background:#0f1626;border:2px solid #1f2a3f}.sk-bc .n-j.rv{border-color:#3d74ff;background:linear-gradient(180deg,#123170,#0b1838)}
.sk-bc .n-bot{background:#070a12;border-top:2px solid #1b2333}.sk-bc .n-bl .n-en{color:#8ea0c2;opacity:1}.sk-bc .n-sc{background:#0f1626;border:2px solid #1f2a3f}.sk-bc .n-sc.me{border-color:#F5C451}.sk-bc .n-sc i{color:#F5C451}
.sk-bc .n-next{border-left:2px solid #1b2333}.sk-bc .n-next .n-en{color:#F5C451;opacity:1}
.sk-bc .n-r{background:#0f1626;border:2px solid #1f2a3f}.sk-bc .n-r.in{border-color:#3d74ff}.sk-bc .n-r.me{background:linear-gradient(90deg,#1a56ff,#0b2fb0);border-color:#7fa6ff}.sk-bc .n-cut{border-color:#F5C451;color:#F5C451}
.sk-bc .n-duel{grid-template-columns:minmax(0,1fr) ${U(440)} minmax(0,1fr)}
.sk-bc .n-side.b{margin-right:${U(-240)};padding-right:${U(300)};background:linear-gradient(135deg,#1a56ff,#0b2fb0 45%,#06134f);clip-path:polygon(0 0,100% 0,82% 100%,0 100%)}
.sk-bc .n-side.r{margin-left:${U(-240)};padding-left:${U(300)};background:linear-gradient(225deg,#ff2f55,#c0102f 45%,#4f0414);clip-path:polygon(18% 0,100% 0,100% 100%,0 100%)}
.sk-bc .n-side::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.035) 0 2px,transparent 2px 22px);pointer-events:none}
.sk-bc .n-sh{background:rgba(0,0,0,.28);padding:${U(8)} ${U(18)};border-radius:${U(6)};align-self:flex-start}.sk-bc .n-side.r .n-sh{align-self:flex-end}
.sk-bc .n-side .n-j{background:rgba(0,0,0,.3);border:2px solid rgba(255,255,255,.18)}.sk-bc .n-side .n-j.ok{border-color:#5CF2A6}
.sk-bc .n-ctr .n-clk{margin:0}.sk-bc .n-pi{background:rgba(4,6,12,.78);border:2px solid rgba(255,255,255,.85)}.sk-bc .n-pi.on{background:#F5C451;color:#05070d;border-color:#F5C451}
.sk-bc .n-verd{background:#04060c;padding:${U(24)} ${U(40)};border-radius:${U(20)};box-shadow:0 0 0 2px #1f2a3f,0 ${U(30)} ${U(80)} rgba(0,0,0,.6)}
.sk-bc .n-next.solo{background:#070a12;border-top:2px solid #1b2333;border-left:0}
.sk-bc .n-hero{background:linear-gradient(135deg,#1a56ff,#06134f)}.sk-bc .n-hero.r{background:linear-gradient(225deg,#ff2f55,#4f0414)}.sk-bc .n-hero.champ{background:linear-gradient(135deg,#F5C451,#8a5a12);color:#05070d}.sk-bc .n-hero.champ b{text-shadow:none}
.sk-bc .n-bm{background:#0f1626;border:2px solid #1f2a3f}.sk-bc .n-bm.now{border-color:#F5C451}.sk-bc .n-bp.w{background:rgba(245,196,81,.12)}
.sk-bc .n-pod .n-r{background:#0f1626}
.sk-bc .n-idle{background:linear-gradient(135deg,#0b2fb0,#04060c 62%)}.sk-bc .n-idle h1{font-family:"Black Han Sans","Noto Sans KR",sans-serif;font-weight:400}

/* ===== ▦ 타이포형 ===== */
.sk-sw{color:#f2f2ee}.sk-sw>.sk-bg{background:#0b0b0c}
.sk-sw .n-en{font-family:"JetBrains Mono",monospace!important;font-weight:400!important;letter-spacing:.18em!important;opacity:.6!important;font-size:${U(19)}!important}
.sk-sw .n-top{height:${U(140)};border-bottom:1px solid #262628}
.sk-sw .n-crt{width:${U(190)};border-right:1px solid #262628}.sk-sw .n-crt b{font:900 ${U(104)}/.8 Archivo,sans-serif;letter-spacing:-.05em}.sk-sw .n-crt small{font-family:"JetBrains Mono",monospace;font-weight:400;opacity:.6}
.sk-sw .n-ttl b,.sk-sw .n-stg b{letter-spacing:-.03em}.sk-sw .n-stg{border-left:1px solid #262628}
.sk-sw .n-main{left:0;right:0;top:${U(140)};height:${U(520)};gap:0;border-bottom:1px solid #262628}
.sk-sw .n-who{padding:0 ${U(70)};border-left:${U(22)} solid #d8ff3d}
.sk-sw .n-nm{letter-spacing:-.06em}.sk-sw .n-tm{font-weight:500;color:#b9b9b4}
.sk-sw .n-clk{border-left:1px solid #262628;border-radius:0}
.sk-sw .n-clk>b,.sk-sw .n-final,.sk-sw .n-tot{font-family:Archivo,sans-serif;font-weight:900;letter-spacing:-.06em}
.sk-sw .n-clk>b{font-size:${U(230)}}.sk-sw .n-final{font-size:${U(220)}}
.sk-sw .n-p b{font-family:Archivo,sans-serif;font-weight:800}
.sk-sw .n-js{left:0;right:0;top:${U(660)};height:${U(170)};gap:0;border-bottom:1px solid #262628}
.sk-sw .n-j{border-radius:0;border-right:1px solid #262628;align-items:flex-start;padding-left:${U(30)}}.sk-sw .n-j small{font-family:"JetBrains Mono",monospace;font-weight:400}
.sk-sw .n-j b{font:800 ${U(64)}/1 Archivo,sans-serif;letter-spacing:-.03em}.sk-sw .n-j.ok b{color:#d8ff3d}.sk-sw .n-j.wait b{font-size:${U(40)}}
.sk-sw .n-bot{height:${U(250)}}.sk-sw .n-scs{gap:0;padding:${U(30)} 0}.sk-sw .n-sc{border-radius:0;border-left:1px solid #333;padding:0 ${U(26)}}.sk-sw .n-sc.me{color:#d8ff3d}
.sk-sw .n-sc i,.sk-sw .n-sc em,.sk-sw .n-rk,.sk-sw .n-rs,.sk-sw .n-now,.sk-sw .n-bp em{font-family:Archivo,sans-serif!important;font-weight:900}
.sk-sw .n-next{border-left:1px solid #262628}
.sk-sw .n-r{border-radius:0;border-bottom:1px solid #262628}.sk-sw .n-r.in .n-rk{color:#d8ff3d}.sk-sw .n-r.me{background:#d8ff3d;color:#0b0b0c}.sk-sw .n-r.me .n-rk{color:#0b0b0c}.sk-sw .n-cut{border-color:#d8ff3d;color:#d8ff3d}
.sk-sw .n-r.md .n-rk{box-shadow:none}
.sk-sw .n-duel{top:${U(140)}}
.sk-sw .n-side{border-right:1px solid #262628}.sk-sw .n-side.b{border-left:${U(22)} solid #2F6BFF}.sk-sw .n-side.r{border-right:${U(22)} solid #FF2D4A}
.sk-sw .n-ctr{border-right:1px solid #262628}
.sk-sw .n-sh i{font-family:"JetBrains Mono",monospace;font-size:${U(26)}}.sk-sw .n-side.b .n-sh{color:#6f98ff}.sk-sw .n-side.r .n-sh{color:#ff6b80}
.sk-sw .n-wm{display:none}.sk-sw .n-side.lose{filter:none;opacity:.35}
.sk-sw .n-tot{font-size:${U(200)}}.sk-sw .n-win{background:#d8ff3d;color:#0b0b0c;font-family:"JetBrains Mono",monospace;letter-spacing:.2em;border-radius:0}
.sk-sw .n-side .n-j{border:0;border-left:1px solid #333;padding-left:${U(14)}}
.sk-sw .n-ctr .n-clk>b{font-size:${U(170)}}.sk-sw .n-ctr .n-clk{border:0}
.sk-sw .n-pi{border-radius:0;border-top:1px solid #333;width:${U(380)};display:flex;justify-content:space-between;align-items:baseline;padding:${U(12)} 0}.sk-sw .n-pi small{font-family:"JetBrains Mono",monospace}.sk-sw .n-pi.on b{color:#d8ff3d}
.sk-sw .n-next.solo{border-top:1px solid #262628;border-left:0}
.sk-sw .n-hero{border:1px solid #262628;border-radius:0}.sk-sw .n-hero.champ b{color:#d8ff3d}
.sk-sw .n-bm{border:1px solid #333;border-radius:0}.sk-sw .n-bm.now{border-color:#d8ff3d}
.sk-sw .n-idle h1{letter-spacing:-.05em}
.sk-sw .n-final,.sk-sw .n-tot{background:none!important;color:#f2f2ee!important;-webkit-text-fill-color:#f2f2ee!important;text-shadow:none!important;filter:none!important}

/* ===== ✦ 프레스티지형 ===== */
.sk-pr{color:#F4EEDF}.sk-pr>.sk-bg{background:radial-gradient(120% 90% at 50% 45%,#141a2c 0%,#0a0d18 55%,#05060b 100%)}
.sk-pr>.sk-bg::before{content:"";position:absolute;inset:calc(22*var(--u));border:1px solid rgba(214,178,106,.45);border-radius:6px}
.sk-pr .n-en{font-family:"Cormorant Garamond",Georgia,serif!important;font-weight:700!important;letter-spacing:.36em!important;color:#C9A262;opacity:1!important;font-size:${U(22)}!important}
.sk-pr .n-top{top:${U(30)};left:${U(50)};right:${U(50)};height:${U(130)}}
.sk-pr .n-crt b{width:${U(96)};height:${U(96)};border-radius:50%;border:2px solid #D6B26A;display:grid;place-items:center;font:700 ${U(54)}/1 "Cormorant Garamond",Georgia,serif;color:#F2D27A;background:radial-gradient(circle,#1d2438,#0b0e19)}.sk-pr .n-crt small{font-family:"Cormorant Garamond",serif;color:#C9A262;margin-top:${U(6)}}
.sk-pr .n-ttl{align-items:center;text-align:center}.sk-pr .n-ttl b{max-width:100%}
.sk-pr .n-main{top:${U(185)};height:${U(470)};left:${U(70)};right:${U(70)}}
.sk-pr .n-who{padding:${U(36)} ${U(50)};border-radius:${U(28)};background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.015));border:1px solid rgba(255,255,255,.12);box-shadow:0 ${U(40)} ${U(100)} rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.12)}
.sk-pr .n-clk{width:${U(450)};height:${U(450)};border-radius:50%;justify-self:center;align-self:center;background:radial-gradient(circle,#0b0e19,#05060b);box-shadow:0 0 0 ${U(12)} rgba(214,178,106,.16),0 0 0 ${U(15)} #D6B26A,0 ${U(30)} ${U(80)} rgba(0,0,0,.6)}
.sk-pr .n-clk.fin{width:${U(560)};height:${U(470)};border-radius:${U(40)}}
.sk-pr .n-clk>b,.sk-pr .n-final,.sk-pr .n-tot,.sk-pr .n-verd b,.sk-pr .n-hero.champ b{font-family:Archivo,sans-serif;font-weight:800;letter-spacing:-.04em;background:linear-gradient(180deg,#FFF6D8,#E6C27A 60%,#B8862E);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.sk-pr .n-clk>b{font-size:${U(150)}}.sk-pr .n-final{font-size:${U(170)}}.sk-pr .n-verd b,.sk-pr .n-hero.champ b{font-family:"Black Han Sans","Noto Sans KR",sans-serif;font-weight:400}
.sk-pr .n-p b{font-family:Archivo,sans-serif;font-weight:700}
.sk-pr .n-js{left:${U(70)};right:${U(70)};top:${U(680)}}.sk-pr .n-j{border:1.5px solid rgba(214,178,106,.5);background:rgba(0,0,0,.25);border-radius:${U(70)}}.sk-pr .n-j.ok{border-color:#7BE0A8}.sk-pr .n-j.ok b{color:#7BE0A8}.sk-pr .n-j small{font-family:"Cormorant Garamond",serif;color:#C9A262;opacity:1}.sk-pr .n-j b{font-family:Archivo,sans-serif;font-weight:700}
/* v1.7.64 새 디자인(중계방송형·스위스형·프레스티지형) 한 명씩 화면 꽉 차게: 가운데 칸을 아래로 넓히고 이름·시간·심판 칸 크게 */
:is(.sk-bc,.sk-sw,.sk-pr):is(.sk-live,.sk-score) .n-js{top:${U(770)};height:${U(108)}}
.sk-bc:is(.sk-live,.sk-score) .n-main{height:${U(630)}}.sk-sw:is(.sk-live,.sk-score) .n-main{height:${U(610)}}.sk-pr:is(.sk-live,.sk-score) .n-main{height:${U(560)}}
.sk-sw:is(.sk-live,.sk-score) .n-js{top:${U(750)};height:${U(130)}}
.sk-bc:is(.sk-live,.sk-score) .n-clk{margin:${U(26)} 0}.sk-bc.sk-live .n-clk>b{font-size:${U(335)}}.sk-sw.sk-live .n-clk>b{font-size:${U(290)};letter-spacing:-.02em}:is(.sk-bc,.sk-sw,.sk-pr).sk-live .n-j{align-items:center!important;justify-content:center!important}
.sk-pr.sk-live .n-clk{width:${U(530)};height:${U(530)}}.sk-pr.sk-live .n-clk>b{font-size:${U(190)}}
:is(.sk-bc,.sk-sw,.sk-pr):is(.sk-live,.sk-score) .n-tm{font-size:${U(62)}}:is(.sk-bc,.sk-sw,.sk-pr):is(.sk-live,.sk-score) .n-mem{font-size:${U(34)}}
:is(.sk-bc,.sk-sw,.sk-pr):is(.sk-live,.sk-score) .n-sub{font-size:${U(36)}}
:is(.sk-bc,.sk-sw,.sk-pr):is(.sk-live,.sk-score) .n-j{flex-direction:row;gap:${U(26)}}
:is(.sk-bc,.sk-sw,.sk-pr):is(.sk-live,.sk-score) .n-j small{font-size:${U(36)};opacity:.9}
:is(.sk-bc,.sk-sw,.sk-pr).sk-live .n-j b{font-size:${U(72)};margin:0}:is(.sk-bc,.sk-sw,.sk-pr).sk-live .n-j.wait b{font-size:${U(56)};opacity:.6}
:is(.sk-bc,.sk-sw,.sk-pr).sk-score .n-j{flex-direction:row;align-items:center!important;justify-content:center!important;gap:${U(22)};padding:0 ${U(14)};overflow:hidden}
:is(.sk-bc,.sk-sw,.sk-pr).sk-score .n-j small{font-size:${U(30)}}:is(.sk-bc,.sk-sw,.sk-pr).sk-score .n-j b{font-size:${U(66)};margin:0}
:is(.sk-bc,.sk-sw,.sk-pr).sk-score .n-js .n-ji{flex-direction:column;gap:${U(2)};font-size:${U(24)};margin:0;line-height:1.15}
.sk-pr .n-bot{bottom:${U(30)};left:${U(50)};right:${U(50)};height:${U(160)};border-top:1px solid rgba(214,178,106,.35)}.sk-pr .n-sc{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}.sk-pr .n-sc i{color:#F2D27A}.sk-pr .n-sc.me{border-color:#D6B26A}.sk-pr .n-sc em{font-family:Archivo,sans-serif;font-weight:700}
.sk-pr .n-r{background:linear-gradient(90deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.1)}.sk-pr .n-r.me{border-color:#D6B26A;box-shadow:0 0 ${U(30)} rgba(214,178,106,.25)}.sk-pr .n-rk{color:#F2D27A}.sk-pr .n-rs{font-family:Archivo,sans-serif;font-weight:700}.sk-pr .n-cut{border-color:#D6B26A;color:#D6B26A}
.sk-pr .n-rank{top:${U(180)};height:${U(640)}}
.sk-pr .n-duel{top:${U(175)};bottom:${U(130)};left:${U(60)};right:${U(60)};gap:${U(30)}}
.sk-pr .n-side{border-radius:${U(28)};background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.015));border:1px solid rgba(255,255,255,.12)}
.sk-pr .n-side.b{box-shadow:inset 0 ${U(8)} 0 #2F6BFF,0 ${U(40)} ${U(100)} rgba(0,0,0,.45)}.sk-pr .n-side.r{box-shadow:inset 0 ${U(8)} 0 #E0203F,0 ${U(40)} ${U(100)} rgba(0,0,0,.45)}
.sk-pr .n-side.b::before,.sk-pr .n-side.r::before{content:"";position:absolute;width:${U(520)};height:${U(520)};border-radius:50%;filter:blur(${U(90)});opacity:.32;top:${U(-220)}}
.sk-pr .n-side.b::before{background:#2F6BFF;left:${U(-170)}}.sk-pr .n-side.r::before{background:#E0203F;right:${U(-170)}}
.sk-pr .n-sh i{width:${U(54)};height:${U(54)};border-radius:50%;display:grid;place-items:center;font:800 ${U(28)} "Noto Sans KR","Malgun Gothic",sans-serif}.sk-pr .n-side.b .n-sh i{background:#2F6BFF}.sk-pr .n-side.r .n-sh i{background:#E0203F}
.sk-pr .n-wm{display:none}
.sk-pr .n-tot{font-size:${U(160)}}
.sk-pr .n-side .n-j{border-radius:${U(20)}}.sk-pr .n-side .n-j b{font-size:${U(46)}}.sk-pr .n-side .n-ji{font-size:${U(16)};gap:${U(8)}}
.sk-pr .n-win{background:linear-gradient(180deg,#FFF1C4,#D6B26A);color:#1a1408;font-family:"Cormorant Garamond",serif;border-radius:999px}
.sk-pr .n-ctr .n-clk{width:${U(420)};height:${U(420)};padding:0}.sk-pr .n-ctr .n-clk>b{font-size:${U(130)}}
.sk-pr .n-verd{width:${U(420)};height:${U(420)};border-radius:50%;justify-content:center;background:radial-gradient(circle,#0b0e19,#05060b);box-shadow:0 0 0 ${U(12)} rgba(214,178,106,.16),0 0 0 ${U(15)} #D6B26A}
.sk-pr .n-pi{border:1px solid rgba(214,178,106,.5)}.sk-pr .n-pi small{color:#C9A262;font-family:"Cormorant Garamond",serif;font-weight:700}.sk-pr .n-pi.on{background:rgba(214,178,106,.18)}
.sk-pr .n-next.solo{left:${U(50)};right:${U(50)};bottom:${U(30)};border-top:1px solid rgba(214,178,106,.35)}
.sk-pr .n-hero{border:1px solid rgba(214,178,106,.45);background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.015));top:${U(185)}}.sk-pr .n-hero.b{box-shadow:inset 0 ${U(8)} 0 #2F6BFF}.sk-pr .n-hero.r{box-shadow:inset 0 ${U(8)} 0 #E0203F}
.sk-pr .n-bm{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04)}.sk-pr .n-bm.now{border-color:#D6B26A}.sk-pr .n-bp em{font-family:Archivo,sans-serif;font-weight:700}
.sk-pr .n-idle h1{background:linear-gradient(180deg,#FFF6D8,#E6C27A 60%,#B8862E);-webkit-background-clip:text;background-clip:text;color:transparent}.sk-pr .n-now{color:#F2D27A;font-family:Archivo,sans-serif}
/* v1.7.82 청·홍 대결: 멀리서도 보이게 — 품새 이름을 금색 큰 판으로, 시간·선수 이름도 크게 (가운데 칸 넓힘, 이름은 칸 너비에 꽉 차게 자동 맞춤) */
.board .n-duel{grid-template-columns:minmax(0,1fr) ${U(600)} minmax(0,1fr)!important}   /* v1.7.86 결과(청승·홍승) 화면도 같은 크기 */
.board .n-duel.res .n-side .n-tm{font-size:${U(50)};font-weight:700}

.board .n-duel.res .n-side .n-sub{font-size:${U(30)}}
.board .n-verd b{font-size:${U(170)}}.board .n-verd small{font-size:${U(34)}}
.board .n-duel.res .n-side .n-j b{font-size:${U(40)}}
.n-duel .n-ctr{gap:${U(22)}}
.n-pls{width:100%;padding:0 ${U(10)};box-sizing:border-box}
.board .n-pls .n-pi{width:100%;box-sizing:border-box;text-align:center;padding:${U(14)} ${U(18)} ${U(18)};border-radius:${U(22)};background:linear-gradient(180deg,#F8D36A,#E2AE3C);color:#141006;border:0;box-shadow:0 ${U(10)} ${U(36)} rgba(0,0,0,.45),inset 0 2px 0 rgba(255,255,255,.4)}
.board .n-pls .n-pi b{display:block;font:400 ${U(118)}/1.05 "Black Han Sans","Noto Sans KR",sans-serif;letter-spacing:.02em;white-space:nowrap}
.board .n-pls .n-pi small{font-size:${U(26)};font-weight:800;opacity:.7}
.board .n-pls.two .n-pi{padding:${U(8)} ${U(14)} ${U(10)}}.board .n-pls.two .n-pi b{font-size:${U(74)}}
.board .n-pls.two .n-pi:not(.on){background:rgba(4,6,12,.78);color:#E9EDF5;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35)}
.board .n-duel:not(.res) .n-ctr .n-clk{padding:${U(18)} ${U(24)} ${U(22)};width:100%;box-sizing:border-box}
.board .n-duel:not(.res) .n-ctr .n-clk>b{font-size:${U(290)};line-height:.88}
.board .n-duel .n-ctr .n-clk .n-sub{font-size:${U(36)};font-weight:800;margin-top:${U(6)}}
.n-side .n-nm.ks-fillw{white-space:nowrap;overflow:hidden;width:100%;line-height:1.05}
.board .n-duel:not(.res) .n-side .n-tm{font-size:${U(54)};font-weight:700}
`;

const cssMd=`
.kmd{position:relative;display:inline-block;width:1.15em;height:1.47em;vertical-align:middle;line-height:0;font-size:1.25em;flex:none}
.kmd svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 .04em .07em rgba(0,0,0,.5))}
.kmd b{position:absolute;left:0;right:0;top:67.2%;transform:translateY(-50%);text-align:center;font:900 .5em/1 "Noto Sans KR",sans-serif;color:#2c1c00;letter-spacing:0}
.kmd.km2 b{color:#2a313d}.kmd.km3 b{color:#2e1504}
:is(.sk-medal,.n-rk,.cbrk,.ar-rk):has(.kmd){background:none!important;box-shadow:none!important;border:0!important;border-radius:0!important;overflow:visible}
.cbrk.md:has(.kmd){width:auto;height:auto}.ar-rr.md .ar-rk .kmd{font-size:1em}
`;
const st=document.createElement('style');st.id='ks-skin-css';st.textContent=css+css3+cssMd;(document.head||document.documentElement).appendChild(st);
window.KS_SKIN={skinFor,modelPm,modelGp,draw,NEW:NEWS};
})();

/* v1.7.76 팀 이름·팀원 이름 자동 맞춤: 칸 너비(이름)·두 줄(팀원)에 꽉 차도록 크게 시작해서 넘치면 줄입니다 */
(function(){if(window.KS_FILLFIT)return;let q=0;
function run(){q=0;document.querySelectorAll('.ks-fillw,.ks-fillh').forEach(el=>{if(!el.isConnected||!el.clientWidth)return;const key=el.textContent+'|'+el.clientWidth+'|'+el.clientHeight;if(el._kf===key)return;
  const max=Number(el.dataset.fmax)||200,h=el.classList.contains('ks-fillh');const base=el.style.fontSize;
  let lo=8,hi=0;const px=parseFloat(getComputedStyle(el).fontSize)||40;
  /* 지금 크기(px)와 설계 크기(--u 배수)의 비율로 최대 px 구하기 */
  const m=/calc\(([\d.]+)\*var\(--u\)\)/.exec(base);const unit=m?px/Number(m[1]):1;hi=max*unit;
  const rg=document.createRange();const over=()=>{if(h)return el.scrollHeight>el.clientHeight+2;rg.selectNodeContents(el);const cs=getComputedStyle(el),avail=el.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0);return rg.getBoundingClientRect().width>avail*0.97;};
  let a=lo,b=hi;for(let i=0;i<14;i++){const mid=(a+b)/2;el.style.fontSize=mid+'px';if(over())b=mid;else a=mid;}
  el.style.fontSize=Math.floor(a)+'px';el._kf=el.textContent+'|'+el.clientWidth+'|'+el.clientHeight;});}
const sch=()=>{if(q)return;q=requestAnimationFrame(run);};
window.KS_FILLFIT=sch;
const go=()=>{try{new MutationObserver(()=>run()).observe(document.body,{childList:true,subtree:true});}catch(e){}   /* v1.7.86 그리기 전에 바로 맞춤 → 크기가 한 번 바뀌며 깜빡이던 것 없앰 */addEventListener('resize',()=>{document.querySelectorAll('.ks-fillw,.ks-fillh').forEach(e=>e._kf='');sch();});setInterval(sch,1500);sch();};
if(document.body)go();else addEventListener('DOMContentLoaded',go);
try{document.fonts&&document.fonts.ready.then(()=>{document.querySelectorAll('.ks-fillw,.ks-fillh').forEach(e=>e._kf='');sch();});}catch(e){}
})();
