/* ===== 대기실 연결 — 코트 운영석 쪽 =====
   본부 「대기실 연결」에서 대기실 진행 요원이 누른 출석(도착·불참)과 「추가 대기 요청」을
   본부가 이 코트로 넘겨 주면(hqatt/* · hqnote/*) 운영석 화면 왼쪽 아래에 보여 줍니다.
   - 불참·추가 대기가 새로 오면 알림 소리 + 안내
   - 「확인」을 누르면 그 알림은 닫힘 */
(function(){
if(window.KS_ROOM)return;
const F=window.KS_FIELD||{};const APP=F.app;if(!/^(poomsae|gyeokpa|kyorugi)$/.test(APP||''))return;
const g=n=>{try{return (0,eval)(n);}catch(e){return undefined;}};
const say=m=>{try{(g('toast'))(m);}catch(e){}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ATT=[],NOTE=[],WATCHED=false,PANEL=null,SEEN=null;
const admin=()=>{try{return String(g('routeNow')()||'').startsWith('admin');}catch(e){return false;}};
function chime(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),t=c.currentTime;
  [[988,0],[784,.2],[988,.4]].forEach(([f,d])=>{const o=c.createOscillator(),gn=c.createGain();o.frequency.value=f;gn.gain.setValueAtTime(0,t+d);gn.gain.linearRampToValueAtTime(.22,t+d+.02);gn.gain.exponentialRampToValueAtTime(.001,t+d+.4);o.connect(gn).connect(c.destination);o.start(t+d);o.stop(t+d+.45);});}catch(e){}}
function watch(){const st=g('store');if(WATCHED||!st||!st.watchColl)return;WATCHED=true;
  st.watchColl('hqatt',null,null,l=>{ATT=(l||[]).sort((a,b)=>(b.at||0)-(a.at||0));check();draw();});
  st.watchColl('hqnote',null,null,l=>{NOTE=(l||[]).sort((a,b)=>(b.at||0)-(a.at||0));check();draw();});}
/* 새로 온 불참·추가 대기 → 소리 (처음 불러온 것은 소리 없이) */
function sig(){const s=new Set();ATT.forEach(a=>(a.list||[]).forEach(p=>{if(p.st==='out')s.add('o|'+a.div+'|'+p.name+'|'+(p.team||''));}));NOTE.forEach(n=>{if(!n.ack)s.add('n|'+n._id);});return s;}
function check(){const now=sig();if(SEEN===null){SEEN=now;return;}const fresh=[...now].filter(k=>!SEEN.has(k));SEEN=now;
  if(!fresh.length||!admin())return;chime();
  const o=fresh.filter(k=>k[0]==='o').map(k=>k.split('|')[2]),n=fresh.filter(k=>k[0]==='n').length;
  say(o.length?`🚪 대기실: 불참 ${o.join(', ')}`:`🚪 대기실에서 추가 대기 요청이 왔습니다`+(n>1?` (${n}건)`:''));}
function divsLeft(){try{const S=g('S');return new Set((S.divs||[]).map(d=>d.name));}catch(e){return new Set();}}
function draw(){
  watch();
  const names=divsLeft(),att=ATT.filter(a=>names.has(a.div)&&Date.now()-(a.at||0)<6*3600e3).slice(0,3),notes=NOTE.filter(n=>!n.ack&&Date.now()-(n.at||0)<3*3600e3).slice(0,3);
  if(!admin()||(!att.length&&!notes.length)){if(PANEL){PANEL.remove();PANEL=null;}return;}
  if(!PANEL){PANEL=document.createElement('div');PANEL.className='ksroom';PANEL.setAttribute('data-noi18n','');document.body.appendChild(PANEL);}
  const h=`<b>🚪 대기실</b>${notes.map(n=>`<div class="ksrn"><span>⏳ <b>${esc(n.div||'')}</b> ${esc(n.text||'추가 대기 요청')}<small> · ${esc(n.room||'')} ${new Date(n.at||0).toTimeString().slice(0,5)}</small></span><button class="btn sm primary" data-ksroom="${esc(n._id)}">확인</button></div>`).join('')}
    ${att.map(a=>{const L=a.list||[],inn=L.filter(p=>p.st==='in').length,out=L.filter(p=>p.st==='out');
      return `<div class="ksra"><span><b>${esc(a.div)}</b> 도착 <b>${inn}</b>/${L.length}${out.length?` · <span class="ksro">불참 ${out.map(p=>esc(p.name)).join(', ')}</span>`:''}</span></div>`;}).join('')}`;
  if(PANEL.dataset.h!==h){PANEL.dataset.h=h;PANEL.innerHTML=h;}
}
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-ksroom]');if(!b)return;const st=g('store');const n=NOTE.find(x=>x._id===b.dataset.ksroom);if(!st||!n)return;
  const {_id,_pending,...rest}=n;await st.put('hqnote/'+_id,{...rest,ack:true,ackAt:Date.now()});});
setInterval(draw,1500);
const css=document.createElement('style');css.textContent=`.ksroom{position:fixed;left:16px;bottom:16px;z-index:9988;display:flex;flex-direction:column;gap:6px;max-width:min(460px,calc(100vw - 32px));
  background:var(--surface,#fff);color:var(--ink,#111);border:2px solid #2F5BD8;border-radius:14px;padding:10px 14px;box-shadow:0 14px 40px rgba(0,0,0,.35);font-size:14px}
.ksroom .ksrn,.ksroom .ksra{display:flex;gap:8px;align-items:center;justify-content:space-between}.ksroom small{color:var(--muted,#777)}.ksro{color:#C8202A;font-weight:800}
.ksroom .ksrn{background:color-mix(in srgb,#E2A400 14%,transparent);border-radius:9px;padding:5px 8px}`;
(document.head||document.documentElement).appendChild(css);
window.KS_ROOM={get state(){return {ATT,NOTE};}};
})();
