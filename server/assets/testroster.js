/* ===== v1.7.85 시험용 명단 넣기 (시험 모드에서만) =====
   대회 날 아침이나 리허설 때 파일 없이 바로 직접 채점해 볼 수 있게, 종목마다 시험용 출전 20개를 넣습니다.
   - 품새 앱: 공인 품새 개인 20명 · 태권체조 20팀 · 팀 경연(종합경연) 20팀
   - 격파 앱: 종합 격파 20명
   - 겨루기 앱: 한 체급 20명 (대진 추첨까지)
   - 지금 명단과 점수는 지워집니다 (되돌리기 가능). 🏁 실제 대회 모드에서는 단추가 나오지 않습니다.
   - 자동으로 끝까지 돌리는 「가상 경기」는 본부 「코트로 보내기 · 가상 경기」에서 따로 합니다. */
(function(){
if(window.KS_TESTROSTER)return;window.KS_TESTROSTER=1;
const F=window.KS_FIELD||{};const APP=F.app||(/\/(poomsae|gyeokpa|kyorugi)\//.exec(location.pathname)||[])[1];
if(!/^(poomsae|gyeokpa|kyorugi)$/.test(APP||''))return;
const g=n=>{try{return (0,eval)(n);}catch(e){return undefined;}};
const say=m=>{try{(g('toast'))(m);}catch(e){}};
const LIVE=()=>{try{return !!(window.KS_MODE&&KS_MODE.get().mode==='live');}catch(e){return false;}};
const route=()=>String(location.hash||'').replace(/^#/,'');

const SUR='김이박최정강조윤장임한오서신권황안송류홍'.split(''),GIV=['민준','서준','도윤','예준','시우','하준','지호','주원','지후','준우','서연','서윤','지우','하은','민서','하윤','윤서','지민','채원','수아','유준','건우','현우','연우','은우','선우','태윤','시윤','다은','예린'];
const ORGS=['시험가태권도','시험나태권도','시험다태권도','시험라태권도','시험마태권도'];
function names(n,seed){const out=[];for(let k=0;k<n;k++){const i=(seed||0)+k;out.push(SUR[i%SUR.length]+GIV[(i*7+Math.floor(i/SUR.length))%GIV.length]);}return out;}  /* 20×30=600가지 이름 */
function rowsFor(app){
  if(app==='poomsae'){const R=[['번호','이름','소속','지도자','부별','학년','성별','공인/자유','종목','팀원']];let k=1;
    names(20,1).forEach((nm,i)=>R.push([k++,nm,ORGS[i%5],'시험지도자','초등부','5','남','공인','개인','']));
    const team=(type,size,seed,label)=>{const pool=names(20*size,seed);for(let t=0;t<20;t++){const m=pool.slice(t*size,t*size+size);R.push([k++,`${ORGS[t%5].replace('태권도','')} ${label}${t+1}`,ORGS[t%5],'시험지도자','초등부','','혼성',type,'단체',m.join(',')]);}};
    team('태권체조',3,101,'체조팀');team('팀대항 종합경연',5,301,'시범팀');return R;}
  if(app==='kyorugi'){const R=[['번호','이름','소속','지도자','부별','학년','성별','체급']];
    names(20,5).forEach((nm,i)=>R.push([i+1,nm,ORGS[i%5],'시험지도자','고등부','2','남','-68kg']));return R;}
  const R=[['이름','종목','성별','부별','소속','지도자','체중(kg)','신장(cm)','팀원','부문']];
  names(20,9).forEach((nm,i)=>R.push([nm,'종합 격파','남','초등부',ORGS[i%5],'시험지도자','','','','']));return R;}
const LBL={poomsae:'공인 품새 20명 · 태권체조 20팀 · 팀 경연 20팀',gyeokpa:'종합 격파 20명',kyorugi:'겨루기 한 체급 20명 (대진 추첨까지)'};

let BUSY=false;
async function run(){if(BUSY)return;if(LIVE())return say('🏁 실제 대회 모드에서는 시험용 명단을 넣을 수 없습니다');
  if(!confirm(`🧪 시험용 명단을 넣을까요?\n\n${LBL[APP]}\n\n지금 이 코트의 명단과 점수는 지워집니다.\n(선수 등록 화면의 「되돌리기」로 명단은 되돌릴 수 있습니다)`))return;
  BUSY=true;draw();window.KS_SIM_IMPORT=true;   /* 연습 모드(허가 코드 없음)의 20명 제한 없이 모두 넣음 */
  try{const RI=window.KS_REGIMPORT,ACT=g('ACT');if(!RI||!ACT)throw new Error('앱이 아직 준비 중입니다. 잠시 뒤 다시 눌러 주세요');
    if(ACT.resetScores)await ACT.resetScores();
    const ui0=g('ui');if(ui0)ui0.importRows=null;
    await RI.feed(RI.toFile(rowsFor(APP),`시험용명단_${APP}.xlsx`));
    let rows=null;for(let i=0;i<80;i++){const u=g('ui');rows=u&&u.importRows;if(rows&&rows.length)break;await new Promise(r=>setTimeout(r,100));}
    if(!rows||!rows.length)throw new Error('시험용 명단을 읽지 못했습니다');
    await ACT.importReplace();await new Promise(r=>setTimeout(r,400));
    const S=g('S');try{if(S&&!(S.divs||[]).length&&g('regenerateDivs'))await g('regenerateDivs')();}catch(e){}
    if(APP==='kyorugi'&&ACT.drawAll){await new Promise(r=>setTimeout(r,400));try{await ACT.drawAll();}catch(e){}}
    const S2=g('S');say(`🧪 시험용 명단을 넣었습니다 · ${(S2&&S2.roster||[]).length}건 · 부문 ${(S2&&S2.divs||[]).length}개 · 「경기 진행」에서 직접 채점해 보세요`);
    try{(g('go')||(r=>{location.hash=r;}))('admin-run');}catch(e){location.hash='admin-run';}}
  catch(e){console.warn('testroster',e);say('시험용 명단을 넣지 못했습니다: '+(e.message||e));}
  finally{window.KS_SIM_IMPORT=false;BUSY=false;draw();}}

let el=null;
function draw(){const show=!LIVE()&&/^admin-(players|settings)$/.test(route())&&!document.body.classList.contains('bmax');
  if(!show){if(el)el.hidden=true;return;}
  if(!el){el=document.createElement('button');el.type='button';el.id='ksTestRoster';el.addEventListener('click',run);document.body.appendChild(el);
    const st=document.createElement('style');st.textContent=`#ksTestRoster{position:fixed;left:14px;bottom:62px;z-index:900;font:800 14px/1.2 "Noto Sans KR",sans-serif;padding:10px 14px;border-radius:12px;border:1.5px solid #3FB971;background:#0F2418;color:#9BE8B8;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35)}#ksTestRoster:hover{background:#163322}#ksTestRoster[disabled]{opacity:.6;cursor:wait}#ksTestRoster small{display:block;font-weight:600;font-size:11.5px;color:#7FBF98;margin-top:2px}@media print{#ksTestRoster{display:none!important}}`;document.head.appendChild(st);}
  el.hidden=false;el.disabled=BUSY;el.innerHTML=BUSY?'🧪 시험용 명단 넣는 중…':`🧪 시험용 명단 넣기<small>${LBL[APP]} · 시험 모드 전용</small>`;}
const go=()=>{draw();addEventListener('hashchange',draw);setInterval(draw,1500);};
if(document.body)go();else addEventListener('DOMContentLoaded',go);
})();
