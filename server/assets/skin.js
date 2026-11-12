/* ===== KICKSTART UP 컷오프 전광판 디자인: 왕실 · 불꽃 (v1.5.0) =====
   - 품새 앱(공인 품새 · 자유 품새 · 태권체조 · 팀 경연)과 격파 앱의 컷오프 화면에 씀. 종목마다 따로 고름 (대회 설정 「컷오프 전광판 디자인」)
   - 화면: 대기 → 경기 중(이름·소속 가운데 크게) → 점수 공개(이름·점수만 가운데 크게) → 순위(1·2·3위 가운데 크게 + 나머지·진출선)
   - 토너먼트(청·홍) 화면과 「기존」을 고르면 지금까지의 전광판 그대로
   - 점수 공개·순위 효과음과 빛 효과는 기존 효과 모듈(.board.ksb-solo · .cbfinal · .rankv · .cbr.me)이 그대로 붙음 */
(function(){
if(window.KS_SKIN)return;
const F=window.KS_FIELD||{},APP=F.app||'';
if(APP!=='poomsae'&&APP!=='gyeokpa')return;
const g=n=>{try{return (0,eval)(n);}catch(e){return undefined;}};
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SET=()=>{try{return g('SET')()||{};}catch(e){return {};}};
const SKINS=[['','기존 디자인'],['royal','👑 왕실 (남색·금색)'],['fire','🔥 불꽃 (검정·주황)']];
const ROWS=APP==='poomsae'?[['recognized','공인 품새'],['freestyle','자유 품새'],['gym','태권체조'],['team100','팀 경연']]:[['gyeokpa','격파']];
const by=()=>SET().skinBy||{};
function skinFor(cur){const B=by();if(APP==='gyeokpa')return B.gyeokpa||'';
  if(!cur){const v=ROWS.map(r=>B[r[0]]).filter(Boolean);return v[0]||'';}
  if((cur.entries||[]).length===2)return '';   /* 토너먼트(청·홍)는 기존 화면 */
  return B[cur.type||'recognized']||'';}
const fit=(s,base,max)=>{const n=String(s||'').length;return n<=max?base:Math.max(base*0.45,base*max/n);};
const U=n=>`calc(${n}*var(--u))`;

/* ---------- 앱마다 화면 자료 ---------- */
function modelPm(){const T=window.KS_THEME;if(!T||!T.model)return null;let m;try{m=T.model();}catch(e){return null;}
  if(!m||!['idle','live','score','rank'].includes(m.scr))return null;
  const o={scr:m.scr,comp:m.comp,court:m.court,div:m.div,label:m.label,key:m.key,el:m.el2!=null&&m.el2>=0?m.el2:m.el,next:m.next};
  if(m.p){o.name=m.p.name;o.team=m.p.team;o.members=m.p.members;}
  if(m.scr==='live'){o.timer=m.timer;o.judges=(m.live||[]).map(j=>j.ok);}
  if(m.res){const f2=v=>v==null?'—':(+v).toFixed(2);o.final=f2(m.res.final);o.parts=[{l:m.labA||'정확성',v:f2(m.res.a)},{l:m.labB||'표현성',v:f2(m.res.b)}];
    if(m.res.ded)o.parts.push({l:'감점',v:'−'+(+m.res.ded).toFixed(1),neg:true});}
  if(m.scr==='rank'){o.rows=(m.rows||[]).map(r=>({rank:r.rank,name:r.name,team:r.team,score:(+r.final).toFixed(2),me:r.me,inq:r.inq}));o.quota=m.quota;o.pre=m.pre;o.cut=m.cutLab;o.unit=m.unit||'명';}
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
    o.final=r.dq?'실격':JU(k)?fmt3(r.final):RT(r);o.parts=[];if(JU(k))o.parts.push({l:r.judges.length===1?'1심 점수':'심판 평균',v:fmt3(r.score)});if(r.dedTotal)o.parts.push({l:'감점',v:'−'+fmtN(r.dedTotal),neg:true});
    if(r.zero)o.note='격파 0장 · 순위 제외';return o;}
  const stagesOf=g('stagesOf'),curStage=g('curStage'),stIds=g('stIds'),rankList=g('rankList'),planOf=g('planOf'),athlete=g('athlete');
  const stg=stagesOf(d).find(x=>x.key===cur.stage)||curStage(d),ids=stg.groups&&cur.group!=null?stg.groups[cur.group]||[]:stIds(stg);
  const rows=rankList(d,stg.key,ids).filter(x=>x.ok),p=planOf(d),pre=stg.key==='pre',quota=pre?p.adv:3;
  o.scr='rank';o.el=el-CB;o.quota=quota;o.pre=pre;o.unit=cur.team&&!cur.name?'팀':'명';o.cut=`결선 진출선 · 상위 ${quota}${o.unit}`;
  o.rows=rows.map(x=>{const a=athlete(x.id)||{};return {rank:x.rank,name:a.name||'',team:a.team||'',score:RT(x.r),me:x.id===cur.athleteId,inq:x.rank<=quota};});
  return o;}

/* ---------- 화면 그리기 (1920×1080 기준) ---------- */
const brand=th=>th==='fire'?'KICKSTART UP':'KICKSTART UP';
function top(m,th){return `<div class="sk-top"><span class="sk-brand">${brand(th)}</span><span class="sk-comp" style="font-size:${U(fit(m.comp,34,26))}">${E(m.comp)}</span>${m.court?`<span class="sk-court">${E(m.court)} 코트</span>`:'<span></span>'}</div>`;}
function divLine(m){return m.div?`<div class="sk-div"><b>${E(m.div)}</b>${m.label?` · ${E(m.label)}`:''}</div>`:'';}
function idle(m,th){return `${top(m,th)}<div class="sk-center sk-idle"><div class="sk-kick">${th==='fire'?'GET READY':'OFFICIAL COMPETITION'}</div><h1 style="font-size:${U(fit(m.comp,96,18))}">${E(m.comp)}</h1><p>곧 경기가 시작됩니다</p><span class="sk-clock" data-now></span></div>`;}
function live(m,th){const js=(m.judges||[]).map((ok,i)=>`<i class="${ok?'on':''}">${i+1}심</i>`).join('');
  return `${top(m,th)}${divLine(m)}<div class="sk-center sk-live"><div class="sk-kick">${th==='fire'?'NOW ON THE MAT':'NOW PERFORMING'}</div>
    <div class="sk-name" style="font-size:${U(fit(m.name||m.team,190,5))}">${E(m.name||m.team)}</div>${m.name&&m.team?`<div class="sk-team">${E(m.team)}</div>`:''}${m.members?`<div class="sk-mem">${E(m.members)}</div>`:''}
    ${m.liveCount?`<div class="sk-cnt dzlive"><small>${E(m.liveCount.l)}</small>${E(m.liveCount.v)}<small>${E(m.liveCount.u)}</small></div>`:''}
    <div class="sk-timer timer" data-timer>${E(m.timer||'')}</div>${js?`<div class="sk-js">${js}</div>`:''}</div>${foot(m)}`;}
function score(m,th){const parts=(m.parts||[]).map(p=>`<span class="sk-part ${p.neg?'neg':''}"><small>${E(p.l)}</small><b>${E(p.v)}</b></span>`).join('');
  return `${top(m,th)}${divLine(m)}<div class="sk-center sk-score">
    <div class="sk-name sm" style="font-size:${U(fit(m.name||m.team,140,6))}">${E(m.name||m.team)}</div>
    <div class="cbres sk-res">${parts}<span class="cbfinal sk-final">${E(m.final)}</span></div>${m.note?`<div class="sk-note">${E(m.note)}</div>`:''}
    ${th==='fire'?'<svg class="sk-crack" viewBox="0 0 1200 200" preserveAspectRatio="none"><path d="M0 100 L180 88 L260 30 L360 120 L470 60 L560 140 L680 70 L790 120 L900 50 L1010 110 L1200 96"/><path class="b" d="M260 30 L290 0 M360 120 L380 200 M560 140 L540 200 M900 50 L930 0"/></svg>':''}</div>${foot(m)}`;}
function rank(m,th){const R=m.rows||[],t3=R.filter(r=>r.rank<=3).slice(0,3),rest=R.filter(r=>!t3.includes(r)),me=R.find(r=>r.me);
  const pod=[t3.find(r=>r.rank===2)||t3[1],t3.find(r=>r.rank===1)||t3[0],t3.find(r=>r.rank===3)||t3[2]].filter(Boolean);
  const card=(r,i)=>`<div class="sk-pod p${r.rank} ${r.me?'me':''}" style="--i:${i}">${r.me?'<i class="cbr me sk-mk" style="--dl:0ms"></i>':''}<div class="sk-medal">${r.rank}</div><div class="sk-pn" style="font-size:${U(fit(r.name||r.team,r.rank===1?78:60,5))}">${E(r.name||r.team)}</div><div class="sk-pt">${E(r.team||'')}</div><div class="sk-ps">${E(r.score)}</div></div>`;
  let show=rest.slice(0,5);if(me&&!t3.includes(me)&&!show.includes(me)){const k=rest.indexOf(me);show=rest.slice(Math.max(0,k-3),k+2);if(show.length<5)show=rest.slice(Math.max(0,rest.length-5));}
  let list='';show.forEach((r,i,a)=>{const prev=a[i-1]||(i===0?t3[t3.length-1]:null);if(i>0&&prev.rank<r.rank-1&&!(m.pre&&prev.rank<=m.quota&&r.rank>m.quota))list+=`<div class="sk-gap">⋯</div>`;if(m.pre&&m.quota>3&&prev&&prev.rank<=m.quota&&r.rank>m.quota)list+=`<div class="sk-cut"><span>${E(m.cut)}</span></div>`;
    list+=`<div class="sk-row ${r.me?'me':''} ${m.pre&&r.inq?'in':''}" style="--i:${i}">${r.me?'<i class="cbr me sk-mk" style="--dl:0ms"></i>':''}<i>${r.rank}</i><span><b>${E(r.name||r.team)}</b><small>${E(r.team||'')}</small></span><em>${E(r.score)}</em></div>`;});
  const meTxt=me?`<div class="sk-me">${E(me.name||me.team)} · 현재 <b>${me.rank}위</b> <small>${R.length}${m.unit||'명'} 중</small></div>`:'';
  return `${top(m,th)}<div class="sk-rkh"><span>${th==='fire'?'RESULTS':'STANDINGS'}</span><b>${E(m.div||'')}${m.label?` · ${E(m.label)}`:''}</b></div>
    <div class="sk-pods">${pod.map(card).join('')}</div>${meTxt}${list?`<div class="sk-list">${list}</div>`:''}${m.pre&&m.quota&&m.quota<=3?`<div class="sk-qnote">${E(m.cut)}</div>`:''}`;}
function foot(m){return m.next&&m.next.who?`<div class="sk-next"><span>NEXT</span>${E(m.next.who)}${m.next.team?' · '+E(m.next.team):''}</div>`:'';}
const SCR={idle,live,score,rank};
const SEEN=new Map();function since(k){if(!SEEN.has(k)){SEEN.set(k,Date.now());if(SEEN.size>80)SEEN.delete(SEEN.keys().next().value);}return Date.now()-SEEN.get(k);}
function draw(th,m){const fn=SCR[m.scr];if(!fn)return null;let body='';if(m.el==null)m.el=since(th+'|'+m.scr+'|'+(m.key||''));try{body=fn(m,th);}catch(e){console.error('[KS_SKIN]',e);return null;}
  return `<div class="board ksb-solo sk sk-${th} sk-${m.scr} ${m.scr==='rank'?'rankv':''}"><div class="sk-bg"></div><div class="sk-s" style="--t:-${Math.max(0,m.el||0)}ms">${body}</div></div>`;}

/* ---------- 감싸기 ---------- */
function install(){const cur=window.vDisplay;if(typeof cur!=='function')return false;if(cur.__sk)return true;
  if(!cur.__ksb)return false;if(APP==='poomsae'&&!cur.__kst)return false;   /* 금빛 전광판·테마를 감싼 다음에 */
  const w=function(){try{let c=null;try{c=g('curOf')();}catch(e){}const th=skinFor(c);
      if(th){const m=APP==='poomsae'?modelPm():modelGp();if(m){const h=draw(th,m);if(h)return h;}}}catch(e){console.error('[KS_SKIN]',e);}
    return cur.apply(this,arguments);};
  w.__sk=true;w.__ksb=true;w.__kst=true;window.vDisplay=w;try{g('render')();}catch(e){}return true;}
/* 대회 설정: 종목별 고르기 */
function panel(){const B=by();return `<div class="panel sk-setp"><h2>컷오프 전광판 디자인 (종목별)</h2>
  <span class="small muted">컷오프 종목의 관중용 전광판 모양을 종목마다 고릅니다. 점수 화면은 이름·점수만 가운데 크게, 그다음 순위 화면에 1·2·3위를 가운데 크게 보여 줍니다. 「기존 디자인」은 지금까지의 전광판(위 「전광판 디자인」)을 그대로 씁니다.${APP==='poomsae'?' 토너먼트(청·홍) 경기는 늘 기존 화면입니다.':''}</span>
  ${ROWS.map(([k,l])=>`<div class="field"><span class="label">${l}</span><div class="seg">${SKINS.map(([v,t])=>`<button class="${(B[k]||'')===v?'on':''}" data-skset="${k}" data-v="${v}">${t}</button>`).join('')}</div></div>`).join('')}</div>`;}
function installSet(){const o=window.aSettings;if(typeof o!=='function')return false;if(o.__sk)return true;
  const w=function(){const h=o.apply(this,arguments);try{return panel()+h;}catch(e){return h;}};w.__sk=true;
  for(const k of ['__ksfx','__kst'])if(o[k])w[k]=true;window.aSettings=w;return true;}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-skset]');if(!b)return;e.preventDefault();e.stopPropagation();
  const S=g('S'),sv=g('saveSettings');if(!S||!sv)return;const cur=S.settings||{},nx={...cur,skinBy:{...(cur.skinBy||{}),[b.dataset.skset]:b.dataset.v}};
  S.settings=nx;try{await sv(nx);}catch(x){}try{g('render')();}catch(x){}},true);
let k=0;const tm=setInterval(()=>{const a=install(),b=installSet();if((a&&b)||++k>240)clearInterval(tm);},250);

/* ---------- 모양 ---------- */
const css=`
body.disp .board.sk{position:fixed;inset:0;margin:0;padding:0;border:0;border-radius:0;max-width:none;width:auto;height:auto;overflow:hidden;z-index:2}
.board.sk{--u:min(calc(100vw/1920),calc(100vh/1080));position:relative;min-height:60vh;overflow:hidden;font-family:"Noto Sans KR","Malgun Gothic",sans-serif;color:#fff}
.board.sk>.sk-bg{position:absolute!important;inset:0!important;z-index:0!important;width:auto;height:auto}
.board.sk>.sk-s{position:absolute!important;z-index:1!important;left:50%;top:50%;width:${U(1920)};height:${U(1080)};transform:translate(-50%,-50%)}
.sk-top{position:absolute;left:${U(70)};right:${U(70)};top:${U(50)};display:flex;justify-content:space-between;align-items:center;gap:${U(30)}}
.sk-brand{font:900 ${U(26)} Cinzel,"Noto Sans KR",serif;letter-spacing:.42em}
.sk-comp{font-weight:800;text-align:center;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sk-court{font:900 ${U(26)} "Noto Sans KR";padding:${U(10)} ${U(26)};border-radius:${U(30)}}
.sk-div{position:absolute;left:0;right:0;top:${U(150)};text-align:center;font:700 ${U(38)} "Noto Sans KR";opacity:.85}
.sk-center{position:absolute;left:${U(100)};right:${U(100)};top:${U(230)};bottom:${U(120)};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.sk-kick{font:800 ${U(26)} Cinzel,"Noto Sans KR";letter-spacing:.5em;margin-bottom:${U(18)}}
.sk-idle h1{font-weight:900;line-height:1.2;margin:0 0 ${U(24)}}.sk-idle p{font-size:${U(40)};opacity:.8;margin:0}.sk-clock{margin-top:${U(30)};font:900 ${U(64)} Cinzel,"Noto Sans KR"}
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
@media (prefers-reduced-motion:reduce){.board.sk *{animation:none!important}}
`;
const st=document.createElement('style');st.id='ks-skin-css';st.textContent=css;(document.head||document.documentElement).appendChild(st);
window.KS_SKIN={skinFor,modelPm,modelGp,draw};
})();
