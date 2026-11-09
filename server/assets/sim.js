/* ===== 가상 경기 (본부 「대회 운영표」 시험 운영) — 품새·격파 운영석 =====
   - 본부 운영표에서 「가상 경기용」으로 보낸 명단은 묻지 않고 이 코트 명단을 바꿉니다 (점수·결과는 지움).
   - 본부가 「가상 경기 시작」을 누르면(sim/main 문서) 운영석 화면이 가상 심판이 되어
     호출 → 심판 점수(모든 심판) → 점수 공개 → 다음 경기 → 다음 부문(결선 순서 추첨 포함)을 끝까지 자동으로 진행합니다.
   - 실제 대회 중에는 sim/main 이 켜지지 않는 한 아무 일도 하지 않습니다. 가상 심판 점수에는 sim:true 표시가 붙습니다. */
(function(){
if(window.KS_SIM)return;
const F=window.KS_FIELD||{};const APP=F.app;
if(!/^(poomsae|gyeokpa)$/.test(APP||''))return;
const g=n=>{try{return (0,eval)(n);}catch(e){return undefined;}};
const say=m=>{try{(g('toast'))(m);}catch(e){}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TAB='t'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let WD={sig:'',at:0,n:0};let SIM=null,INB=null,WATCHED=false,TAKING=false,BUSY=false,LAST={},DONE=false,PANEL=null,COUNT=0,STALL={};

/* ---------- 준비: 앱 저장소 감시 ---------- */
function watch(){const st=g('store');if(WATCHED||!st||!st.watchDoc||!st.watchColl)return;WATCHED=true;
  st.watchDoc('sim/main',d=>{const was=SIM&&SIM.on;SIM=d;if(d&&d.on&&!was){DONE=false;COUNT=0;}if(d&&d.reset)RESETQ=d.reset;draw();});
  st.watchColl('inbox',null,null,list=>{INB=(list||[]).find(x=>x._id==='roster')||null;});}
const admin=()=>{try{return String(g('routeNow')()||'').startsWith('admin');}catch(e){return false;}};
/* 같은 컴퓨터에서 운영석 창이 여러 개면 한 창만 진행 */
function leader(){try{const k='ks_sim_lead_'+APP,v=JSON.parse(localStorage.getItem(k)||'null'),now=Date.now();
  if(!v||v.t===TAB||now-v.at>4000){localStorage.setItem(k,JSON.stringify({t:TAB,at:now}));return true;}return false;}catch(e){return true;}}

/* ---------- 가상 명단 받기 ---------- */
async function take(doc){TAKING=true;
  window.KS_SIM_IMPORT=true; /* v1.4.69 연습 모드(허가 코드 없음)에서도 가상 경기 명단은 모두 넣음 — 격파 코트가 20명에서 끝나던 문제 */
  try{const RI=window.KS_REGIMPORT,ACT=g('ACT'),st=g('store');if(!RI||!ACT||!st)throw new Error('앱 준비 중');
    say(`본부 운영표에서 가상 경기 명단 ${doc.rows.length-1}건이 왔습니다. 점수를 지우고 명단을 바꿉니다…`);
    await ACT.resetScores();
    const ui0=g('ui');if(ui0)ui0.importRows=null;
    await RI.feed(RI.toFile(doc.rows,`${doc.court||''}코트_가상경기.xlsx`));
    let rows=null;for(let i=0;i<60;i++){const u=g('ui');rows=u&&u.importRows;if(rows&&rows.length)break;await new Promise(r=>setTimeout(r,100));}
    if(!rows||!rows.length)throw new Error('받은 명단을 읽지 못했습니다');
    await ACT.importReplace();
    const {_id,_pending,...rest}=doc;await st.put('inbox/roster',{...rest,done:true,takenAt:Date.now(),simTaken:true});
    DONE=false;COUNT=0;STALL={};say(`가상 경기 명단 ${rows.length}건으로 바꿨습니다. 본부에서 「가상 경기 시작」을 누르면 자동으로 진행합니다`);}
  catch(e){console.warn('sim take',e);say('가상 경기 명단을 넣지 못했습니다: '+(e.message||e));}
  finally{TAKING=false;window.KS_SIM_IMPORT=false;draw();}}

/* ---------- 점수 만들기 ---------- */
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0)/4294967296;}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const noise=k=>(Math.random()-.5)*k;
function skillOf(id){return .35+hash(id)*.6;}                  /* 선수마다 실력 (0.35~0.95), 심판마다 조금씩 다르게 */
function pickOpt(opts,q){const o=[...opts].map(Number).sort((a,b)=>a-b);return o[clamp(Math.round(q*(o.length-1)),0,o.length-1)];}
function poomsaeScore(cur,e,j,st){
  const SH=g('SHEETS'),sh=SH[cur.type]||SH.recognized,base=skillOf(e.athleteId||e.perfId),q=()=>clamp(base+noise(.18),0,1);
  const d={ded:[],jd:[],items:{}};
  const all=[...((sh.A&&sh.A.items)||[]),...((sh.B&&sh.B.items)||[])];all.forEach(it=>{d.items[it.k]=it.opts?pickOpt(it.opts,q()):null;});
  if(sh.aMode==='ded'){const n=Math.max(0,Math.round((1-q())*12+noise(3)));for(let i=0;i<n;i++)d.ded.push(sh.dedOpts&&Math.random()<.12?0.3:0.1);}
  const sc=g('draftScore')(cur.type,d);
  return {perfId:e.perfId,callId:cur.callId,epoch:st.epoch||0,judge:j,type:cur.type,a:sc.a,b:sc.b,items:d.items,ded:d.ded,jd:d.jd,at:Date.now(),sim:true};
}
function gyeokpaScore(cur,j,st){
  const base=skillOf(cur.athleteId||cur.perfId),q=()=>clamp(base+noise(.16),0,1),items={},nT=(cur.techs||[]).length;
  if(cur.kind==='tech'){const T=g('TECH_OPTS');for(let i=0;i<nT;i++){items['t'+i+'c']=pickOpt(T,q());items['t'+i+'e']=pickOpt(T,q());}}
  else if(cur.kind==='comp'){(g('COMP_ITEMS')||[]).forEach(it=>{items[it.k]=Math.round(it.max*(.45+q()*.5));});items.x=0;}
  else (g('TEAM_ITEMS')||[]).forEach(it=>{items[it.k]=Math.round(it.max*(.45+q()*.5));});
  return {perfId:cur.perfId,callId:cur.callId,epoch:st.epoch||0,judge:j,kind:cur.kind,items,dg:null,total:g('judgeTotal')(cur.kind,items,nT),at:Date.now(),sim:true};
}
function record(cur){const q=clamp(skillOf(cur.athleteId||cur.perfId)+noise(.15),0,1);
  if(cur.kind==='height')return {best:Math.round((140+q*110)/5)*5};
  if(cur.kind==='count')return {broken:Math.round(4+q*16),line:0};
  if(cur.kind==='powerc')return {fist:Math.round(1+q*3),knife:Math.round(1+q*3),back:Math.round(1+q*3),elbow:Math.round(1+q*3)};
  return {broken:Math.round(2+q*8),applied:10};}

/* 한 경기에 걸리는 실제 시간(초) → 속도로 나눔 */
function perfSec(cur){if(APP==='poomsae')return {recognized:90,freestyle:90,gym:115,team100:360}[cur.type]||90;
  return {tech:50,comp:60,team:300,height:30,count:30,power:30,powerc:60}[cur.kind]||50;}
const AUTOW={},DRAWN={};
const speed=()=>Math.max(1,Number(SIM&&SIM.speed)||10);

/* ---------- 다음 경기 찾기 (부문 이름 순서 = 운영표 순서) ---------- */
function divsSorted(){const S=g('S');return [...(S.divs||[])].sort((a,b)=>String(a.name).localeCompare(String(b.name),'ko',{numeric:true}));}
function findNext(cur){
  const L=divsSorted(),cS=g('curStage'),cO=g('callsOf'),cD=g('callDone');
  /* 늘 앞 부문부터: 결선 진출자가 올라온 앞 부문(순서 추첨 전)이 있으면 그 부문을 먼저 끝냄 */
  for(const d of L){let st;try{st=cS(d);}catch(e){continue;}
    if(st&&st.pending)return {draw:d};
    const c=(cO(d)||[]).find(x=>!cD(x));if(c)return {call:c,d};
    /* 방금 끝난 부문: 예선 → 결선 자동 진출을 잠깐 기다림 */
    if(cur&&d.id===cur.divId){const k=d.id+'#'+(st&&st.key);STALL[k]=STALL[k]||Date.now();if(Date.now()-STALL[k]<3000)return {wait:true};}}
  return {done:true};
}
function progress(){const L=divsSorted(),cO=g('callsOf'),cD=g('callDone');let tot=0,dn=0,dd=0;
  L.forEach(d=>{let c=[];try{c=cO(d)||[];}catch(e){}tot+=c.length;const k=c.filter(cD).length;dn+=k;if(c.length&&k===c.length)dd++;});return {divs:L.length,dd,tot,dn};}

/* ---------- 진행 ---------- */
/* v1.4.54 본부 「가상 경기 초기화」: 이 코트의 점수·결과·진행을 모두 지우고 처음부터 (명단·경기 규칙은 그대로). 한 번만 실행 */
let RESETQ=0,RESETTING=false;
async function doReset(){const k='ks_sim_reset_'+APP;let done=0;try{done=Number(localStorage.getItem(k))||0;}catch(e){}if(RESETQ<=done||RESETTING)return false;
  RESETTING=true;try{const ACT=g('ACT');if(!ACT||!ACT.resetScores)return false;await ACT.resetScores();try{localStorage.setItem(k,String(RESETQ));}catch(e){}
    DONE=false;COUNT=0;STALL={};LAST={};say('본부 요청으로 가상 경기를 초기화했습니다 · 점수·결과를 지우고 처음부터 시작합니다');}catch(e){console.warn('sim reset',e);}finally{RESETTING=false;}return true;}
async function tick(){
  watch();draw();
  if(!F.status||!admin())return;
  if(RESETQ&&leader()&&!BUSY){BUSY=true;try{if(await doReset())return;}finally{BUSY=false;}}
  if(INB&&INB.sim&&!INB.done&&!TAKING&&leader()){await take(INB);return;}
  if(!SIM||!SIM.on||DONE||BUSY||TAKING||!leader())return;
  const S=g('S'),ST=g('ST'),curOf=g('curOf');if(!S||!ST||!curOf||!S.stateLoaded)return;
  BUSY=true;
  try{
    const st=ST(),cur=curOf(),now=Date.now(),store=g('store'),SET=g('SET')();
    /* v1.4.55 멈춤 지킴이: 같은 상태로 20초(배속 반영) 넘게 그대로면 막힌 곳을 건너뜀 — 점수가 덜 들어왔으면 모든 심판 점수를 채워 공개,
       공개된 채로 서 있으면 다음 경기를 직접 부름 (심판 기기 끊김·자동 호출 대기 등으로 멈추던 문제) */
    {const sig=[st.status,cur&&cur.callId,st.epoch||0,(g('curScores')()||[]).length,COUNT].join('|');
      if(WD.sig!==sig){WD.sig=sig;WD.at=now;WD.n=0;}
      else if(now-WD.at>Math.max(20000,perfSec(cur||{})*4000/speed())){WD.at=now;WD.n++;
        say(`가상 경기: ${cur?cur.label:'다음 경기'}에서 멈춰 있어 다시 진행합니다`);console.warn('sim watchdog',sig);
        if(cur&&st.status==='open'){const have=g('curScores')(),ents=APP==='poomsae'?cur.entries:[{perfId:cur.perfId}];
          for(const e of ents)for(let j=1;j<=(cur.judgeCount||3);j++){if(have.some(x=>x.perfId===e.perfId&&x.judge===j))continue;
            await store.put(`scores/${e.perfId}__j${j}`,APP==='poomsae'?poomsaeScore(cur,e,j,st):gyeokpaScore(cur,j,st));}
          await new Promise(r=>setTimeout(r,300));
          if(APP==='gyeokpa'&&!g('JUDGED')(cur.kind)){await g('saveState')({...st,rec:{...(st.rec||{}),...record(cur)}});await new Promise(r=>setTimeout(r,150));await g('confirmRecord')();}
          else await g('doReveal')(true);return;}
        if(cur&&st.status==='revealed'){Object.keys(AUTOW).forEach(k=>delete AUTOW[k]);STALL={};const n=findNext(cur);if(n.call){await g('callIt')(n.call.callId);COUNT++;return;}}}}
    if(cur&&st.status==='open'){
      const wait=perfSec(cur)*1000/speed();if(now-(st.calledAt||now)<wait)return;
      if(APP==='gyeokpa'&&!g('JUDGED')(cur.kind)){                    /* 기록·위력: 기록원이 기록 넣고 확정 */
        await g('saveState')({...st,rec:{...(st.rec||{}),...record(cur)}});await new Promise(r=>setTimeout(r,150));await g('confirmRecord')();return;}
      const have=g('curScores')();
      const ents=APP==='poomsae'?cur.entries:[{perfId:cur.perfId}],puts=[];
      for(const e of ents){for(let j=1;j<=cur.judgeCount;j++){if(have.some(s=>s.perfId===e.perfId&&s.judge===j))continue;
        const doc=APP==='poomsae'?poomsaeScore(cur,e,j,st):gyeokpaScore(cur,j,st);puts.push(store.put(`scores/${e.perfId}__j${j}`,doc));if(speed()<10)break;}}  /* 느린 속도: 심판 1명씩 → 「도착 n/5」가 차례로 올라감 */
      if(puts.length){await Promise.all(puts);return;}
      /* 모든 심판 점수 도착: 앱의 자동 공개를 기다리고, 꺼져 있거나 3초 안에 안 되면 직접 공개 */
      const key=cur.callId+'#'+(st.epoch||0);if(LAST.key!==key){LAST.key=key;LAST.at=now;}
      if(SET.autoReveal===false||now-LAST.at>(speed()>=10?600:3000))await g('doReveal')(true);
      return;}
    if(cur&&st.status==='revealed'){
      if(now-(st.revealedAt||now)<Math.max(450,8000/speed()))return;
      /* 2품새 자동 호출을 기다림 — v1.4.51: 6초(배속 반영) 넘게 안 오면 직접 다음 경기를 부름 (결선에서 멈추던 문제) */
      if(APP==='poomsae'){const inf=g('autoNextInfo')();const k='an#'+cur.callId+'#'+(st.epoch||0);
        if(inf){AUTOW[k]=AUTOW[k]||now;if(now-AUTOW[k]<Math.max(1500,6000*10/speed()/10))return;}}
    }
    const n=findNext(cur);
    if(n.wait)return;
    if(n.draw){const dk='dr#'+n.draw.id;DRAWN[dk]=(DRAWN[dk]||0)+1;if(DRAWN[dk]>5){DRAWN[dk]=0;say(`가상 경기: 「${n.draw.name}」 순서 추첨이 되지 않아 잠시 기다립니다`);}
      await g('ACT').stageDraw({dataset:{id:n.draw.id},disabled:false});say(`가상 경기: 「${n.draw.name}」 다음 단계 순서를 추첨했습니다`);return;}
    if(n.call){await g('callIt')(n.call.callId);COUNT++;return;}
    if(n.done&&cur&&st.status!=='revealed')return;
    DONE=true;const p=progress();say(`가상 경기를 모두 마쳤습니다 · ${p.dd}/${p.divs}개 부문 · ${p.dn}경기`);
  }catch(e){console.warn('sim',e);}
  finally{BUSY=false;draw();}
}
/* v1.4.52 운영석 창이 뒤에 가려져 있거나 다른 창을 보고 있어도 가상 경기가 멈추지 않게:
   크롬은 안 보이는 창의 타이머를 1분에 한 번으로 늦추므로(2명 조 등에서 멈춘 것처럼 보임), 늦춰지지 않는 작업자(Worker) 타이머로 진행 */
(function(){try{const w=new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},400)'],{type:'text/javascript'})));w.onmessage=()=>{tick();};}
  catch(e){setInterval(tick,400);}})();

/* ---------- 운영석 표시 ---------- */
function draw(){
  const show=admin()&&(TAKING||(SIM&&(SIM.on||SIM.at)&&Date.now()-(SIM.at||0)<12*3600e3));
  if(!show){if(PANEL){PANEL.remove();PANEL=null;}return;}
  if(!PANEL){PANEL=document.createElement('div');PANEL.className='kssim';PANEL.setAttribute('data-noi18n','');document.body.appendChild(PANEL);}
  let p={divs:0,dd:0,tot:0,dn:0};try{p=progress();}catch(e){}
  const on=SIM&&SIM.on,sp=speed();
  const h=`<div><b>🧪 가상 경기 ${TAKING?'명단 받는 중…':!p.divs?'· 이 앱에는 명단 없음':DONE?'· 모두 마침':on?'진행 중':'멈춤'}</b><span>부문 ${p.dd}/${p.divs} · 경기 ${p.dn}/${p.tot} · 속도 ×${sp}${on&&!DONE&&!leader()?' · 다른 창에서 진행 중':''}</span></div>
    <div class="kssimb">${[1,10,30,100].map(v=>`<button class="btn sm ${v===sp?'primary':''}" data-sim="sp" data-v="${v}" title="${v===1?'실제 경기 속도':v+'배 빠르게'}">×${v}</button>`).join('')}
      <button class="btn sm ${on?'':'primary'}" data-sim="${on?'stop':'go'}">${on?'⏸ 멈춤':'▶ 계속'}</button></div>`;
  if(PANEL.dataset.h!==h){PANEL.dataset.h=h;PANEL.innerHTML=h;}
}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-sim]');if(!b)return;const st=g('store');if(!st)return;
  const cur={on:false,speed:10,...(SIM||{})};delete cur._id;delete cur._pending;
  if(b.dataset.sim==='sp')await st.put('sim/main',{...cur,speed:Number(b.dataset.v),at:Date.now()});
  else if(b.dataset.sim==='stop')await st.put('sim/main',{...cur,on:false,at:Date.now()});
  else if(b.dataset.sim==='go'){DONE=false;await st.put('sim/main',{...cur,on:true,at:Date.now()});}});
const css=document.createElement('style');css.textContent=`.kssim{position:fixed;right:16px;bottom:16px;z-index:9989;display:flex;gap:12px;align-items:center;flex-wrap:wrap;max-width:min(520px,calc(100vw - 32px));
  background:var(--surface,#fff);color:var(--ink,#111);border:2px dashed #7A3FC8;border-radius:14px;padding:10px 14px;box-shadow:0 14px 40px rgba(0,0,0,.35);font-size:14px}
.kssim b{display:block;font-size:15px}.kssim span{font-size:12.5px;color:var(--muted,#777);font-weight:700}.kssimb{display:flex;gap:5px;flex-wrap:wrap}`;
(document.head||document.documentElement).appendChild(css);
window.KS_SIM={tick,progress,get state(){return {SIM,DONE,COUNT};}};
})();
