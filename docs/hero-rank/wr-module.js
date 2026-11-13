/* ================= 세계 랭킹: 공식 코스 · 히어로 아이디 · 공인 도장 · 부모 동의 =================
   이 블록은 docs/hero-rank/wr-module.js 원본을 태권 히어로 1·2 앱(index.html) 맨 끝에 그대로 붙여 넣은 것입니다. 고칠 때는 원본을 고치고 두 앱에 다시 붙여 넣으세요.
   · 실명은 이 기기(앱)에만 있습니다. 서버에는 별명 · 출생 연도 · 성별만 보냅니다.
   · 공식 코스로 뛴 「개인 히어로 런」 기록 중, 부모 동의를 받은 선수만 조 확정 때 자동으로 보냅니다(인터넷이 없으면 모아 두었다가 연결되면 보냄). */
(()=>{
if(typeof LIC==='undefined')return;
const APP=LIC.LS==='tkhero2.lic'?'hero2':'hero';
const RANK_URL='https://liketkd-jpg.github.io/kickstart-field/hero-rank/';
const WK='tkhero.wr.v1',CK='tkhero.wr.course.'+APP,QK='tkhero.wr.q.'+APP;   // 아이디(WK)는 히어로 1·2가 함께 · 공식 코스(CK)와 보낼 기록(QK)은 앱마다
const COUNTRIES=['KR','US','CA','DE','GB','FR','ES','IT','NL','AU','NZ','JP','CN','TW','HK','SG','MY','PH','VN','TH','ID','IN','AE','SA','TR','BR','MX','AR','CL','ZA'];
const TX={ko:{
  chip:'세계 랭킹',title:'세계 랭킹 · 공식 코스',close:'닫기',needLic:'세계 랭킹은 허가 코드를 넣은 도장만 쓸 수 있습니다.',openLic:'허가 코드 넣기',
  s1:'공인 도장',s2:'공식 코스',s3:'선수 히어로 아이디 · 부모 동의',s4:'기록 보내기',
  dName:'도장 이름',dCountry:'나라',dCity:'도시',dCoach:'지도자 이름',apply:'공인 도장 신청',update:'정보 고치기',
  st_none:'아직 신청하지 않았습니다',st_pending:'⏳ 본사 승인 기다리는 중',st_approved:'✅ 공인 도장',st_rejected:'❌ 반려되었습니다 — 정보를 고쳐 다시 신청해 주세요',st_suspended:'⛔ 사용이 중지되었습니다 — 본사에 문의해 주세요',
  applyHelp:'신청하면 KICKSTART UP 본사가 확인한 뒤 승인합니다. 승인 뒤에 히어로 아이디를 만들 수 있습니다.',
  cPick:'공식 코스 고르기',cUse:'이 코스로 장애물 설정하기',cConfirm:'지금 장애물 설정을 공식 코스로 바꿉니다. 계속할까요?',cNow:'✅ 지금 공식 코스로 진행 중: {c}',cNot:'지금 장애물 설정은 공식 코스가 아닙니다. 기록이 세계 랭킹에 올라가지 않습니다.',
  cChanged:'공식 코스를 불러온 뒤 장애물이나 감점을 바꿔서, 지금은 공식 기록이 아닙니다. 다시 불러와 주세요.',cRace:'세계 랭킹에는 「개인 히어로 런」 기록만 올라갑니다.',cNone:'본사가 정한 공식 코스가 아직 없습니다.',cSetup:'설치 기준',
  kName:'이름 (이 기기에만)',kNick:'별명 (공개)',kYear:'출생 연도',kG:'성별',kSt:'상태',kNone:'명단에 선수가 없습니다. 「경기 설정」에서 명단을 먼저 넣어 주세요.',
  kMake:'아이디 만들기',kSave:'고치기',kCopy:'동의 링크 복사',kShare:'보내기',kRe:'다시 요청',kSug:'별명 추천',
  ks_pending:'⏳ 부모 동의 기다림',ks_given:'✅ 동의 완료',ks_withdrawn:'↩️ 동의 철회됨',ks_none:'—',
  needApprove:'공인 도장으로 승인된 뒤에 히어로 아이디를 만들 수 있습니다.',
  kHelp:'별명에는 실명을 쓰지 마세요. 「동의 링크」를 부모님 휴대폰(카카오톡·문자)으로 보내면, 부모님이 직접 동의해야 기록이 랭킹에 올라갑니다.',
  privacy:'실명은 이 기기에만 저장됩니다. 서버에는 별명 · 출생 연도 · 성별만 올라가고, 공개 랭킹에는 별명 · 나라 · 도장 · 나이 · 기록만 보입니다.',
  refresh:'상태 새로고침',viewRank:'세계 랭킹 보기',qInfo:'보낸 기록 {s}개 · 보낼 기록 {q}개',qSend:'지금 보내기',qAuto:'공식 코스 기록은 조 확정 때 자동으로 보냅니다. 인터넷이 없으면 모아 두었다가 연결되면 보냅니다.',
  busy:'처리 중…',net:'인터넷에 연결할 수 없습니다',copied:'동의 링크를 복사했습니다',made:'히어로 아이디 {id}를 만들었습니다',
  shareMsg:'[KICKSTART UP 태권 히어로] {n} 어린이의 세계 랭킹 참가 동의를 부탁드립니다. 아래 링크에서 확인 후 동의해 주세요.',
  nickReal:'별명에 실명이 들어 있습니다. 다른 별명을 써 주세요.',sent:'세계 랭킹 기록 {n}개를 보냈습니다',
  e_license:'허가 코드를 확인할 수 없습니다',e_dojang:'공인 도장 승인이 필요합니다',e_nickname:'별명은 2~20자로 써 주세요',e_birth_year:'출생 연도를 골라 주세요',e_gender:'성별을 골라 주세요',e_locked:'부모 동의를 받은 뒤에는 별명을 바꿀 수 없습니다',e_name:'도장 이름을 2~60자로 써 주세요',e_country:'나라를 골라 주세요',e_suspended:'사용이 중지된 도장입니다',
  M:'남',F:'여'},
 en:{
  chip:'World Ranking',title:'World Ranking · Official Course',close:'Close',needLic:'World Ranking is for dojangs with a license code.',openLic:'Enter license code',
  s1:'Certified dojang',s2:'Official course',s3:'Hero IDs · parent consent',s4:'Send records',
  dName:'Dojang name',dCountry:'Country',dCity:'City',dCoach:'Coach name',apply:'Apply for certification',update:'Update details',
  st_none:'Not applied yet',st_pending:'⏳ Waiting for HQ approval',st_approved:'✅ Certified dojang',st_rejected:'❌ Not approved — please fix the details and apply again',st_suspended:'⛔ Suspended — please contact HQ',
  applyHelp:'KICKSTART UP HQ reviews each application. Once approved, you can create Hero IDs.',
  cPick:'Choose an official course',cUse:'Use this course',cConfirm:'This replaces your current obstacle settings with the official course. Continue?',cNow:'✅ Running the official course: {c}',cNot:'Your current obstacles are not an official course. Records will not go to the World Ranking.',
  cChanged:'Obstacles or penalties changed after loading the official course, so records are not official. Load the course again.',cRace:'Only Individual Hero Run records go to the World Ranking.',cNone:'HQ has not published an official course yet.',cSetup:'Setup',
  kName:'Name (this device only)',kNick:'Nickname (public)',kYear:'Birth year',kG:'Gender',kSt:'Status',kNone:'No athletes yet. Add the roster in Setup first.',
  kMake:'Create ID',kSave:'Update',kCopy:'Copy consent link',kShare:'Send',kRe:'Ask again',kSug:'Suggest',
  ks_pending:'⏳ Waiting for parent',ks_given:'✅ Consent given',ks_withdrawn:'↩️ Consent withdrawn',ks_none:'—',
  needApprove:'Hero IDs can be created after your dojang is certified.',
  kHelp:'Never use a real name as the nickname. Send the consent link to the parent’s phone; records join the ranking only after the parent agrees.',
  privacy:'Real names stay on this device. Only nickname, birth year and gender go to the server; the public ranking shows nickname, country, dojang, age and record.',
  refresh:'Refresh status',viewRank:'Open World Ranking',qInfo:'{s} sent · {q} waiting',qSend:'Send now',qAuto:'Official-course records are sent automatically when a heat is confirmed. Offline records wait and are sent once you are online.',
  busy:'Working…',net:'No internet connection',copied:'Consent link copied',made:'Created Hero ID {id}',
  shareMsg:'[KICKSTART UP Taekwon Heroes] Please review and give consent for {n} to join the World Ranking.',
  nickReal:'The nickname contains the real name. Please choose another nickname.',sent:'Sent {n} records to the World Ranking',
  e_license:'License code could not be verified',e_dojang:'Dojang certification is required',e_nickname:'Nickname must be 2–20 characters',e_birth_year:'Choose a birth year',e_gender:'Choose a gender',e_locked:'The nickname cannot change after consent',e_name:'Dojang name must be 2–60 characters',e_country:'Choose a country',e_suspended:'This dojang is suspended',
  M:'M',F:'F'}};
const tw=(k,v)=>{let s=((TX[S.lang]||TX.ko)[k])||TX.ko[k]||k;if(v)for(const x in v)s=s.split('{'+x+'}').join(v[x]);return s};
const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
let W=Object.assign({dojang:null,checked:'',courses:[],kids:{}},ld(WK,{}),{queue:[],sentN:0,seen:{}},ld(QK,{}));
let C=ld(CK,null);   // {code,name,stations}
/* 두 앱을 함께 열어 두어도 아이디가 지워지지 않게: 선수마다 더 최근(u)에 바뀐 쪽을 남깁니다 */
const mergeKids=(a,b)=>{const o=Object.assign({},a||{});for(const k in (b||{}))if(!o[k]||(+b[k].u||0)>=(+o[k].u||0))o[k]=b[k];return o};
const wsave=()=>{try{const cur=ld(WK,{});W.kids=mergeKids(cur.kids,W.kids);localStorage.setItem(WK,JSON.stringify({dojang:W.dojang,checked:W.checked,courses:W.courses,kids:W.kids}));localStorage.setItem(QK,JSON.stringify({queue:W.queue,sentN:W.sentN,seen:W.seen}))}catch(e){}};
window.addEventListener('storage',e=>{if(e.key!==WK||!e.newValue)return;try{const n=JSON.parse(e.newValue);W.kids=mergeKids(W.kids,n.kids);if(n.dojang)W.dojang=n.dojang;draw()}catch(x){}});
const csave=()=>{try{C?localStorage.setItem(CK,JSON.stringify(C)):localStorage.removeItem(CK)}catch(e){}};
const UI={open:false,busy:'',err:'',pick:'',nick:{},year:{},g:{}};
const sig=a=>(a||[]).map(s=>s.id+':'+(+s.pen||0)).join(',');
const isRace=()=>!S.game||S.game==='race';
function official(){return C&&C.code&&sig(S.st)===sig(C.stations)?C:null}
const approved=()=>!!(W.dojang&&W.dojang.status==='approved');
const kkey=m=>String(m.name||'').trim()+'|'+String(m.team||'').trim();
const gOf=m=>{const g=String(m.gender||'').trim().toLowerCase();return /^(남|m|boy|male)/.test(g)?'M':/^(여|f|girl|female)/.test(g)?'F':''};
function kidsList(){const seen=new Set(),out=[];(S.roster||[]).forEach(m=>{if(!m||m.members||!String(m.name||'').trim())return;if(typeof isParentDiv==='function'&&isParentDiv(m.div))return;const k=kkey(m);if(seen.has(k))return;seen.add(k);out.push({k,m})});return out}
async function rpc(fn,body){let r;try{r=await fetch(LIC.URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:LIC.KEY,'Content-Type':'application/json'},body:JSON.stringify(body||{})})}catch(e){throw new Error(tw('net'))}
  const j=await r.json().catch(()=>null);if(!r.ok||j==null)throw new Error((j&&j.message)||tw('net'));return j}
const why=j=>tw('e_'+(j&&j.reason))||String(j&&j.reason||'');
const code=()=>lic&&lic.code||'';
async function refresh(){if(!code())return;
  const [me,cs]=await Promise.all([rpc('hero_dojang_me',{p_license:code()}),rpc('hero_courses_list',{})]);
  if(me.ok)W.dojang=me.dojang;W.courses=Array.isArray(cs)?cs:[];W.checked=new Date().toISOString();
  if(C&&C.code){const c=W.courses.find(x=>x.code===C.code);if(c)C={code:c.code,name:c.name,name_en:c.name_en,stations:c.stations};csave()}
  const ids=Object.values(W.kids).map(x=>x.hid).filter(Boolean);
  if(ids.length&&approved()){const st=await rpc('hero_kids_status',{p_license:code(),p_ids:ids});
    if(st.ok)(st.kids||[]).forEach(r=>{const e=Object.values(W.kids).find(x=>x.hid===r.hero_id);if(e&&(e.st!==r.status||e.nick!==r.nickname||e.token!==r.token)){e.st=r.status;e.nick=r.nickname;e.by=r.birth_year;e.g=r.gender;e.token=r.token;e.u=Date.now()}})}
  wsave()}
async function act(fn){UI.busy=fn.name||'x';UI.err='';draw();try{await fn()}catch(e){UI.err=e.message||String(e)}UI.busy='';draw();try{render()}catch(e){}}
/* ---------- 기록 대기열 ---------- */
const uid=()=>crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)});
function queueHeat(h,hk){const c=official();if(!c||!isRace()||!approved()||!code())return;
  [0,1,2,3].forEach(i=>{const pid=h.lanes[i];if(pid==null||h.dnf[i]||h.time[i]==null)return;const p=P(pid);if(!p)return;
    const e=W.kids[kkey(p)];if(!e||!e.hid||e.st!=='given')return;
    const k=[APP,S.ev.name,hk,i,h.time[i]].join('|');if(W.seen[k])return;W.seen[k]=1;
    W.queue.push({id:uid(),hero_id:e.hid,course:c.code,time_ms:Math.round(h.time[i]),pen_ms:Math.round(penSec(h,i)*1000),event:String(S.ev.name||'').slice(0,120),at:new Date().toISOString(),app:APP})});
  const ks=Object.keys(W.seen);if(ks.length>3000)ks.slice(0,ks.length-2000).forEach(k=>delete W.seen[k]);
  wsave();flush()}
let flushing=false,flushT=null;
async function flush(show){if(flushing||!W.queue.length||!code())return;flushing=true;clearTimeout(flushT);
  try{const batch=W.queue.slice(0,100);const j=await rpc('hero_records_submit',{p_license:code(),p_recs:batch});
    if(j.ok){const done=new Set(batch.map(x=>x.id));W.queue=W.queue.filter(x=>!done.has(x.id));W.sentN+=j.saved||0;wsave();if(show||j.saved)toast(tw('sent',{n:j.saved||0}));if(W.queue.length)setTimeout(()=>flush(show),300)}
    else{if(j.reason==='dojang'||j.reason==='license'){UI.err=why(j)}flushT=setTimeout(flush,120000)}}
  catch(e){flushT=setTimeout(flush,60000);if(show)UI.err=e.message}
  flushing=false;draw();try{renderTop()}catch(e){}}
window.addEventListener('online',()=>flush());
if(typeof ROLE!=='undefined'&&ROLE==='ctrl'){
  const orig=confirmHeat;
  confirmHeat=function(){const h=typeof ensureHeat==='function'?ensureHeat():null,was=!!(h&&h.done),hk=typeof heatKey==='function'?heatKey():'';
    const r=orig.apply(this,arguments);try{if(h&&!was&&h.done)queueHeat(h,hk)}catch(e){console.warn('wr',e)}return r};
  setTimeout(()=>{if(code())refresh().then(()=>{try{renderTop()}catch(e){}flush()}).catch(()=>{})},1500);
}
/* ---------- 창 ---------- */
let BOX=null;
function openWr(){UI.open=true;UI.err='';if(!BOX){BOX=document.createElement('div');BOX.className='licov wrov';BOX.setAttribute('role','dialog');BOX.setAttribute('aria-modal','true');BOX.setAttribute('aria-label',tw('title'));document.body.appendChild(BOX)}
  draw();if(code())act(async function load(){await refresh()})}
function closeWr(){UI.open=false;if(BOX){BOX.remove();BOX=null}}
const yNow=new Date().getFullYear(),YEARS=Array.from({length:16},(_,i)=>yNow-2-i);
function suggest(k){const h=HEROES[Math.floor(Math.random()*HEROES.length)].en,a=['Star','Tiger','Rocket','Comet','Thunder','Galaxy','Dragon','Flash'][Math.floor(Math.random()*8)];return h+' '+a+' '+(10+Math.floor(Math.random()*90))}
function kidRow({k,m}){const e=W.kids[k]||{},st=e.st||'none',lockd=st==='given',busy=!!UI.busy;
  const nick=UI.nick[k]??e.nick??'',yr=UI.year[k]??e.by??'',g=UI.g[k]??e.g??gOf(m);
  return`<tr><td><b>${esc(m.name)}</b><small>${esc(m.team||'')}${m.div?' · '+esc(m.div):''}</small></td>
   <td><div class="wrnick"><input type="text" maxlength="20" data-wrin="nick" data-k="${esc(k)}" value="${esc(nick)}" ${lockd?'disabled':''} aria-label="${esc(tw('kNick'))}">${lockd?'':`<button class="btn ghost sm" data-wr="sug" data-k="${esc(k)}" title="${esc(tw('kSug'))}">🎲</button>`}</div>${e.hid?`<small class="wrid">${esc(e.hid)}</small>`:''}</td>
   <td><select data-wrin="year" data-k="${esc(k)}" ${lockd?'disabled':''} aria-label="${esc(tw('kYear'))}"><option value="">—</option>${YEARS.map(y=>`<option ${+yr===y?'selected':''}>${y}</option>`).join('')}</select></td>
   <td><select data-wrin="g" data-k="${esc(k)}" ${lockd?'disabled':''} aria-label="${esc(tw('kG'))}"><option value="">—</option><option value="M" ${g==='M'?'selected':''}>${esc(tw('M'))}</option><option value="F" ${g==='F'?'selected':''}>${esc(tw('F'))}</option></select></td>
   <td><span class="wrst ${st}">${esc(tw('ks_'+st))}</span></td>
   <td class="wract">${!e.hid?`<button class="btn gold sm" data-wr="make" data-k="${esc(k)}" ${busy?'disabled':''}>${esc(tw('kMake'))}</button>`
     :st==='given'?'':`${st==='pending'?`<button class="btn sm" data-wr="save" data-k="${esc(k)}" ${busy?'disabled':''}>${esc(tw('kSave'))}</button>`:`<button class="btn sm" data-wr="save" data-k="${esc(k)}" ${busy?'disabled':''}>${esc(tw('kRe'))}</button>`}
       <button class="btn gold sm" data-wr="copy" data-k="${esc(k)}">${esc(tw('kCopy'))}</button>${navigator.share?`<button class="btn sm" data-wr="share" data-k="${esc(k)}">${esc(tw('kShare'))}</button>`:''}`}</td></tr>`}
function draw(){if(!BOX)return;const d=W.dojang,st=d?d.status:'none',c=official(),ap=approved();
  const sel=UI.pick||(C&&C.code)||(W.courses[0]&&W.courses[0].code)||'',cs=W.courses.find(x=>x.code===sel);
  const cname=x=>S.lang==='en'&&x.name_en?x.name_en:x.name;
  const body=!code()?`<p class="note">${esc(tw('needLic'))}</p><div class="row"><button class="btn gold" data-wr="lic">🔑 ${esc(tw('openLic'))}</button></div>`:`
   <section class="wrsec"><h3><span class="tag">1</span>${esc(tw('s1'))} <span class="wrst ${st}">${esc(tw('st_'+st))}</span></h3>
    ${d&&d.note&&st!=='approved'?`<p class="note">${esc(d.note)}</p>`:''}
    <form class="wrform" data-wrform="dojang">
     <label>${esc(tw('dName'))}<input name="name" required minlength="2" maxlength="60" value="${esc(d?d.name:(lic.holder||''))}"></label>
     <label>${esc(tw('dCountry'))}<select name="country">${COUNTRIES.map(x=>`<option ${((d&&d.country)||'KR')===x?'selected':''}>${x}</option>`).join('')}</select></label>
     <label>${esc(tw('dCity'))}<input name="city" maxlength="60" value="${esc(d?d.city:'')}"></label>
     <label>${esc(tw('dCoach'))}<input name="coach" maxlength="40" value="${esc(d?d.coach:'')}"></label>
     <button class="btn ${d?'':'gold'}" type="submit" ${UI.busy||st==='suspended'?'disabled':''}>${esc(d?tw('update'):tw('apply'))}</button></form>
    ${!d?`<p class="note">${esc(tw('applyHelp'))}</p>`:''}</section>
   <section class="wrsec"><h3><span class="tag">2</span>${esc(tw('s2'))}</h3>
    ${!isRace()?`<p class="wrwarn">${esc(tw('cRace'))}</p>`:''}
    ${c?`<p class="wrok">${esc(tw('cNow',{c:cname(c)+' ('+c.code+')'}))}</p>`:C&&C.code?`<p class="wrwarn">${esc(tw('cChanged'))}</p>`:`<p class="wrwarn">${esc(tw('cNot'))}</p>`}
    ${W.courses.length?`<div class="row"><select data-wrin="pick" aria-label="${esc(tw('cPick'))}">${W.courses.map(x=>`<option value="${esc(x.code)}" ${x.code===sel?'selected':''}>${esc(cname(x))} (${esc(x.code)})</option>`).join('')}</select>
      <button class="btn gold" data-wr="use">${esc(tw('cUse'))}</button></div>
      ${cs?`<ol class="wrcourse">${(cs.stations||[]).map(s=>`<li>${esc(S.lang==='en'?s.en||s.ko:s.ko)} <small>+${+s.pen||0}s</small></li>`).join('')}</ol>${cs.setup?`<p class="note"><b>${esc(tw('cSetup'))}</b> · ${esc(cs.setup)}</p>`:''}`:''}`:`<p class="note">${esc(tw('cNone'))}</p>`}</section>
   <section class="wrsec"><h3><span class="tag">3</span>${esc(tw('s3'))}</h3>
    ${!ap?`<p class="note">${esc(tw('needApprove'))}</p>`:(()=>{const L=kidsList();return L.length?`<p class="note">${esc(tw('kHelp'))}</p>
     <div class="wrtable"><table><thead><tr><th>${esc(tw('kName'))}</th><th>${esc(tw('kNick'))}</th><th>${esc(tw('kYear'))}</th><th>${esc(tw('kG'))}</th><th>${esc(tw('kSt'))}</th><th></th></tr></thead><tbody>${L.map(kidRow).join('')}</tbody></table></div>`:`<p class="note">${esc(tw('kNone'))}</p>`})()}
    <p class="wrpriv">🔒 ${esc(tw('privacy'))}</p></section>
   <section class="wrsec"><h3><span class="tag">4</span>${esc(tw('s4'))}</h3>
    <div class="row"><b>${esc(tw('qInfo',{s:W.sentN||0,q:W.queue.length}))}</b>${W.queue.length?`<button class="btn" data-wr="flush" ${flushing?'disabled':''}>${esc(tw('qSend'))}</button>`:''}</div>
    <p class="note">${esc(tw('qAuto'))}</p></section>`;
  BOX.innerHTML=`<div class="licbox wrbox"><div class="row" style="justify-content:space-between"><b class="lt">🌍 ${esc(tw('title'))}</b>
    <div class="row">${code()?`<button class="btn ghost" data-wr="refresh" ${UI.busy?'disabled':''}>${esc(UI.busy?tw('busy'):tw('refresh'))}</button>`:''}<a class="btn ghost" href="${RANK_URL}" target="_blank" rel="noopener">${esc(tw('viewRank'))} ↗</a><button class="btn" data-wr="close" aria-label="${esc(tw('close'))}">✕</button></div></div>
    ${UI.err?`<div class="licerr" role="alert">${esc(UI.err)}</div>`:''}${body}</div>`}
const link=e=>RANK_URL+'#consent='+e.token;
async function saveKid(k,isNew){const m=(kidsList().find(x=>x.k===k)||{}).m;if(!m)return;const e=W.kids[k]||{};
  const nick=String(UI.nick[k]??e.nick??'').trim(),yr=+(UI.year[k]??e.by??0),g=UI.g[k]??e.g??gOf(m);
  const real=String(m.name||'').replace(/\s/g,''),nn=nick.replace(/\s/g,'');
  if(real.length>=2&&(nn.includes(real)||(real.length>=3&&nn.includes(real.slice(1)))))throw new Error(tw('nickReal'));
  if(m.nameEn&&nn.toLowerCase().includes(String(m.nameEn).split(/\s+/)[0].toLowerCase())&&String(m.nameEn).split(/\s+/)[0].length>=3)throw new Error(tw('nickReal'));
  const j=await rpc('hero_kid_save',{p_license:code(),p_nickname:nick,p_birth_year:yr||null,p_gender:g,p_hero_id:isNew?null:e.hid});
  if(!j.ok)throw new Error(why(j));
  W.kids[k]={hid:j.hero_id,token:j.token,st:j.status,nick,by:yr,g,u:Date.now()};delete UI.nick[k];delete UI.year[k];delete UI.g[k];wsave();if(isNew)toast(tw('made',{id:j.hero_id}))}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-wr]');if(!b)return;e.preventDefault();const a=b.dataset.wr,k=b.dataset.k;
  if(a==='open')return openWr();if(a==='close')return closeWr();
  if(a==='lic'){closeWr();licOpen();return}
  if(a==='refresh')return act(async function r(){await refresh()});
  if(a==='flush')return flush(true);
  if(a==='use'){const c=W.courses.find(x=>x.code===(UI.pick||(W.courses[0]||{}).code));if(!c||!confirm(tw('cConfirm')))return;
    S.st=JSON.parse(JSON.stringify(c.stations));C={code:c.code,name:c.name,name_en:c.name_en,stations:c.stations};csave();if(isRace()===false){}commit();draw();renderTop();return}
  if(a==='sug'){UI.nick[k]=suggest(k);draw();return}
  if(a==='make')return act(async function mk(){await saveKid(k,true)});
  if(a==='save')return act(async function sv(){await saveKid(k,false)});
  const ent=W.kids[k];if(!ent||!ent.token)return;
  if(a==='copy'){const u=link(ent);(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast(tw('copied'))).catch(()=>prompt(tw('kCopy'),u));return}
  if(a==='share'){navigator.share({title:'KICKSTART UP Taekwon Heroes',text:tw('shareMsg',{n:ent.nick}),url:link(ent)}).catch(()=>{});return}
},true);
document.addEventListener('change',e=>{const el=e.target;if(!el.dataset||!el.dataset.wrin)return;e.stopPropagation();const k=el.dataset.k,w=el.dataset.wrin;
  if(w==='pick'){UI.pick=el.value;draw();return}if(w==='nick')UI.nick[k]=el.value;if(w==='year')UI.year[k]=el.value;if(w==='g')UI.g[k]=el.value},true);
document.addEventListener('input',e=>{const el=e.target;if(el.dataset&&el.dataset.wrin==='nick'){e.stopPropagation();UI.nick[el.dataset.k]=el.value}},true);
document.addEventListener('submit',e=>{const f=e.target;if(!f||f.dataset.wrform!=='dojang')return;e.preventDefault();e.stopPropagation();const fd=new FormData(f);
  act(async function ap(){const j=await rpc('hero_dojang_apply',{p_license:code(),p_name:fd.get('name'),p_country:fd.get('country'),p_city:fd.get('city'),p_coach:fd.get('coach')});
    if(!j.ok)throw new Error(why(j));W.dojang=j.dojang;wsave()})},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&BOX){e.stopPropagation();closeWr()}},true);
window.wrChip=()=>{if(typeof ROLE!=='undefined'&&ROLE!=='ctrl')return'';const c=official()&&isRace()&&approved();
  return`<button class="licchip ${c?'ok':''}" data-wr="open" title="${esc(tw('title'))}">🌍 ${esc(tw('chip'))}${c?' · '+esc(C.code):''}${W.queue.length?` · ⏳${W.queue.length}`:''}</button>`};
window.KS_WR={open:openWr,flush,save:wsave,state:()=>({W,C,official:official()}),queueHeat};
const css=document.createElement('style');css.textContent=`
.licov.wrov .licbox.wrbox{width:min(1000px,100%);max-width:none;max-height:calc(100vh - 32px);overflow:auto}
.wrsec{border-top:1px solid var(--line,#3a2a8a);padding-top:12px;display:grid;gap:8px}
.wrsec h3{margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:1.05rem}
.wrform{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:end}
.wrform label{display:grid;gap:4px;font-size:.85rem;color:var(--muted,#aab)}
.wrform input,.wrform select,.wrsec select,.wrtable input,.wrtable select{background:var(--ink,#000);border:2px solid var(--line,#3a2a8a);border-radius:10px;padding:6px 8px;color:var(--paper,#fff);min-width:0}
.wrst{font-size:.8rem;padding:2px 10px;border-radius:999px;background:var(--panel2,#1e1450);color:var(--muted,#aab);white-space:nowrap}
.wrst.approved,.wrst.given{background:color-mix(in srgb,var(--good,#3be3a0) 22%,transparent);color:var(--good,#3be3a0)}
.wrst.pending{background:color-mix(in srgb,var(--gold,#ffd23f) 18%,transparent);color:var(--gold,#ffd23f)}
.wrst.rejected,.wrst.suspended,.wrst.withdrawn{background:color-mix(in srgb,var(--bad,#ff5d73) 20%,transparent);color:var(--bad,#ff5d73)}
.wrok{margin:0;color:var(--good,#3be3a0);font-weight:700}.wrwarn{margin:0;color:var(--gold,#ffd23f)}
.wrcourse{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px;counter-reset:wc}.wrcourse li{counter-increment:wc;background:var(--panel2,#1e1450);border-radius:999px;padding:2px 12px;font-size:.85rem}.wrcourse li::before{content:counter(wc) '. ';color:var(--muted,#aab)}.wrcourse small{color:var(--muted,#aab)}
.wrtable{overflow:auto;max-height:46vh;border:2px solid var(--line,#3a2a8a);border-radius:12px}
.wrtable table{width:100%;min-width:760px;border-collapse:collapse;font-size:.9rem}
.wrtable select{width:auto}
.wrtable th{position:sticky;top:0;background:var(--panel2,#1e1450);text-align:left;font-weight:700;font-size:.78rem;color:var(--muted,#aab);padding:6px 8px;white-space:nowrap}
.wrtable td{padding:6px 8px;border-top:1px solid var(--line,#3a2a8a);vertical-align:middle}
.wrtable td small{display:block;color:var(--muted,#aab);font-size:.75rem}
.wrtable .wrid{font-family:var(--f-num,monospace);color:var(--neon,#38f2ff)}
.wrnick{display:flex;gap:4px}.wrnick input{width:11rem}
.wract{display:flex;gap:4px;flex-wrap:wrap}
.btn.sm{padding:3px 10px;font-size:.8rem}
.wrpriv{margin:0;font-size:.8rem;color:var(--muted,#aab)}
@media (max-width:640px){.wrnick input{width:8rem}}`;
document.head.appendChild(css);
})();
