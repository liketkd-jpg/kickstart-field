/* ===== KICKSTART UP 현장 모드 연결기 =====
   Claude 안에서 쓰던 저장·실시간 공유·접속 표시·파일 저장 기능을 노트북 현장 서버로 바꿔 줍니다.
   앱 코드는 그대로 두고 window.claude.use(...)만 이 파일이 대신합니다. */
(function(){
'use strict';
const F=window.KS_FIELD||{};
const API='/'+(F.app||'poomsae')+'/api/';
/* 노트북에 주소가 여러 개면 운영자가 고른 주소로 QR·링크를 만듦 */
try{const ip=localStorage.getItem('ks_field_ip');if(F.local&&ip&&(F.ips||[]).includes(ip))F.base='http://'+ip+':'+F.port+'/'+F.app+'/';}catch(e){}
/* 화면(탭)마다 새 이름: 예전처럼 sessionStorage에 두면 「새 창으로 열기」 때 그대로 복사돼, 두 화면이 서로의 연결을 끊는 일이 생겼습니다 */
const CID='c'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const UID=(()=>{let u=null;try{u=localStorage.getItem('ks_field_uid');}catch(e){}if(!u){u='u'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);try{localStorage.setItem('ks_field_uid',u);}catch(e){}}return u;})();

/* ---------- 연결 상태 (화면 표시에 사용) ---------- */
const NET={connected:false,ready:false,lastOk:0,lastFail:0,since:Date.now(),listeners:new Set()};
function netChanged(){NET.listeners.forEach(f=>{try{f(status());}catch(e){}});}
function status(){return {mode:'field',connected:NET.connected,ready:NET.ready,lastOk:NET.lastOk,lastFail:NET.lastFail,since:NET.since};}
F.status=status;F.onStatus=f=>{NET.listeners.add(f);return()=>NET.listeners.delete(f);};
window.KS_FIELD=F;

/* ---------- 데이터 사본 + 구독 ---------- */
const cache=new Map();
const docL=new Map();      // path -> Set(cb)
const collL=new Set();     // {coll, field, val, cb}
let pendingNotify=new Set(),notifyAll=false,notifyQueued=false;
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function docSnap(path){const d=cache.get(path);const id=path.split('/').pop();return {id,exists:d!==undefined,data:()=>clone(d),metadata:{hasPendingWrites:false}};}
function collMatch(q,path,data){if(!path.startsWith(q.coll+'/'))return false;const rest=path.slice(q.coll.length+1);if(!rest||rest.includes('/'))return false;return !q.field||(data&&data[q.field]===q.val);}
function collSnap(q){const docs=[];for(const [p,d] of cache){if(collMatch(q,p,d))docs.push({id:p.slice(q.coll.length+1),data:()=>clone(d),metadata:{hasPendingWrites:false}});}return {docs,size:docs.length,empty:!docs.length};}
function scheduleNotify(path){if(path==null)notifyAll=true;else pendingNotify.add(path);if(notifyQueued)return;notifyQueued=true;
  queueMicrotask(()=>{notifyQueued=false;const all=notifyAll,paths=pendingNotify;notifyAll=false;pendingNotify=new Set();
    if(!NET.ready)return;
    for(const [p,set] of docL){if(all||paths.has(p))set.forEach(cb=>{try{cb(docSnap(p));}catch(e){console.error(e);}});}
    collL.forEach(q=>{let hit=all;if(!hit)for(const p of paths){if(p.startsWith(q.coll+'/')){hit=true;break;}}if(hit){try{q.cb(collSnap(q));}catch(e){console.error(e);}}});});}

/* ---------- 실시간 연결 (서버가 보내는 변경 사항) ----------
   브라우저는 한 주소에 동시에 6개까지만 연결합니다. 노트북 한 대에서 운영석·전광판·본부 등 여러 화면을 열면
   화면마다 붙잡은 실시간 연결 때문에 저장·클릭 요청이 줄을 서서 멈춘 것처럼 보였습니다.
   이제 같은 종목의 화면들은 실시간 연결 하나를 나눠 씁니다: 한 화면(대표)만 서버와 연결하고 받은 내용을 다른 화면에 전해 줍니다.
   대표 화면을 닫으면 남은 화면 중 하나가 곧바로 대표가 됩니다. */
let es=null,lastSeq=0,lastMsg=0;
const SHARE=!!(navigator.locks&&window.BroadcastChannel);
let LEADER=!SHARE,BC=null;
function relay(t,data){if(LEADER&&BC){try{BC.postMessage({t,data});}catch(e){}}}
function lost(){if(NET.connected){NET.connected=false;NET.lastFail=Date.now();NET.since=Date.now();netChanged();}}
function connect(){
  try{if(es)es.close();}catch(e){}
  es=new EventSource(API+'events?cid='+encodeURIComponent(CID));
  ['init','chg','peers','ka'].forEach(t=>es.addEventListener(t,()=>{lastMsg=Date.now();}));
  es.addEventListener('init',ev=>{const m=JSON.parse(ev.data);relay('init',{seq:m.seq,docs:m.docs});onInit(m);});
  es.addEventListener('chg',ev=>{const m=JSON.parse(ev.data);relay('chg',m);onChg(m);});
  es.addEventListener('peers',ev=>{const ps=JSON.parse(ev.data)||[];relay('peers',ps);onPeers(ps);});
  es.addEventListener('ka',()=>relay('ka',null));
  es.onopen=()=>{NET.lastOk=Date.now();};
  es.onerror=()=>{lost();relay('net',false);};
  lastMsg=Date.now();
}
function onInit(m){cache.clear();for(const [k,v] of Object.entries(m.docs||{}))cache.set(k,v);lastSeq=m.seq||0;
    const first=!NET.ready;NET.ready=true;NET.connected=true;NET.lastOk=Date.now();NET.since=Date.now();netChanged();scheduleNotify(null);
    if(myPresence)sendPresence();if(first)readyWaiters.splice(0).forEach(f=>f());}
function onChg(m){if(m.seq&&m.seq<=lastSeq&&cache.has(m.path)===(m.data!=null)&&JSON.stringify(cache.get(m.path))===JSON.stringify(m.data))return;
    lastSeq=Math.max(lastSeq,m.seq||0);if(m.data==null)cache.delete(m.path);else cache.set(m.path,m.data);NET.lastOk=Date.now();scheduleNotify(m.path);}
function onPeers(ps){PEERS=ps;peerL.forEach(f=>{try{f({peers:PEERS});}catch(e){}});}
/* 나눠 쓰기: 대표 정하기 · 대표가 받은 내용 전달 */
if(SHARE){
  BC=new BroadcastChannel('ksf:'+(F.app||'poomsae'));
  BC.onmessage=ev=>{const m=ev.data||{};
    if(LEADER){if(m.t==='hello'&&NET.ready){try{BC.postMessage({t:'init',data:{seq:lastSeq,docs:Object.fromEntries(cache)}});BC.postMessage({t:'peers',data:PEERS});}catch(e){}}return;}
    lastMsg=Date.now();
    if(m.t==='init'){onInit(m.data);}
    else if(m.t==='chg'){onChg(m.data);}
    else if(m.t==='peers'){onPeers(m.data||[]);}
    else if(m.t==='net'){if(m.data===false)lost();}
    else if(m.t==='ka'){if(NET.ready&&!NET.connected){NET.connected=true;NET.since=Date.now();netChanged();}}
  };
  try{BC.postMessage({t:'hello'});}catch(e){}
  navigator.locks.request('ksf:'+(F.app||'poomsae'),()=>new Promise(()=>{LEADER=true;connect();}));
  /* 대표가 아닌 화면도 접속 표시는 따로 서버에 알림 (6초마다) */
  setInterval(()=>{if(!LEADER&&myPresence&&NET.connected)sendPresence();},6000);
  window.addEventListener('pagehide',()=>{if(!LEADER&&myPresence){try{navigator.sendBeacon(API+'presence',new Blob([JSON.stringify({cid:CID,presence:null})],{type:'application/json'}));}catch(e){}}});
}
const readyWaiters=[];
const whenReady=()=>NET.ready?Promise.resolve():new Promise(r=>readyWaiters.push(r));
/* 서버는 4초마다 신호를 보냄. 12초 동안 아무 신호가 없으면(와이파이가 조용히 끊김) 끊김으로 보고 다시 연결 */
setInterval(()=>{
  if(!LEADER){if(Date.now()-lastMsg>12000){lost();try{BC.postMessage({t:'hello'});}catch(e){}lastMsg=Date.now()-6000;}return;}
  if(!es)return;if(es.readyState===2){connect();return;}if(Date.now()-lastMsg>12000){lost();connect();}},2000);
window.addEventListener('online',()=>{if(!NET.connected&&LEADER)connect();});
/* 휴대폰 화면이 꺼졌다 켜지면(대기실 진행 요원 등) 12초를 기다리지 않고 바로 다시 연결 */
function wake(){if(document.hidden)return;if(LEADER){if(!es||es.readyState===2||Date.now()-lastMsg>5000){lost();connect();}}else{try{BC&&BC.postMessage({t:'hello'});}catch(e){}}}
document.addEventListener('visibilitychange',wake);window.addEventListener('pageshow',wake);window.addEventListener('focus',wake);
if(!SHARE)connect();

/* ---------- 서버 요청 (시간 제한) ---------- */
async function call(op,body,ms){
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),ms||6000);
  try{const r=await fetch(API+op,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl.signal,cache:'no-store'});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw {code:j.error||'unavailable'};
    NET.lastOk=Date.now();return j;}
  catch(e){NET.lastFail=Date.now();const appErr=e&&typeof e.code==='string';if(!appErr){lost();setTimeout(()=>{if(!NET.connected&&LEADER)connect();},500);}throw appErr?e:{code:'unavailable',message:String(e&&e.message||e)};}
  finally{clearTimeout(t);}
}

/* ---------- db (Claude 저장소와 같은 모양) ---------- */
function docRef(path){
  return {
    id:path.split('/').pop(),path,
    async get(){if(NET.connected&&NET.ready)return docSnap(path);
      const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),5000);
      try{const r=await fetch(API+'get?path='+encodeURIComponent(path),{signal:ctl.signal,cache:'no-store'});const j=await r.json();const id=path.split('/').pop();
        return {id,exists:!!j.exists,data:()=>clone(j.data),metadata:{hasPendingWrites:false}};}
      catch(e){throw {code:'unavailable'};}finally{clearTimeout(t);}},
    async set(data){const d=clone(data);await call('put',{path,data:d});cache.set(path,d);scheduleNotify(path);},
    async delete(){await call('del',{path});cache.delete(path);scheduleNotify(path);},
    async acquire(o){return call('acquire',{path,holder:(o&&o.holder)||UID,ttlMs:(o&&o.ttlMs)||3000},4000);},
    onSnapshot(cb,err){let set=docL.get(path);if(!set){set=new Set();docL.set(path,set);}set.add(cb);
      if(NET.ready)queueMicrotask(()=>{if(set.has(cb))cb(docSnap(path));});
      return ()=>{set.delete(cb);};}
  };
}
function query(coll,field,val){
  return {
    where(f,op,v){return query(coll,f,v);},
    async get(){await whenReady();return collSnap({coll,field,val});},
    onSnapshot(cb,err){const q={coll,field,val,cb};collL.add(q);if(NET.ready)queueMicrotask(()=>{if(collL.has(q))cb(collSnap(q));});return ()=>{collL.delete(q);};}
  };
}
const db={doc:docRef,collection:c=>query(c,null,null),open:p=>docRef(p)};

/* ---------- 접속 표시 (room) ---------- */
let PEERS=[],myPresence=null;const peerL=new Set();
function sendPresence(){call('presence',{cid:CID,presence:myPresence},4000).catch(()=>{});}
const room={
  onPeers(cb,onClose){peerL.add(cb);queueMicrotask(()=>cb({peers:PEERS}));return ()=>peerL.delete(cb);},
  presence(pr){myPresence=clone(pr);if(NET.connected)sendPresence();return Promise.resolve();},
  get peers(){return PEERS;}
};

/* ---------- 사용자 ---------- */
const user={id:async()=>UID,canEdit:async()=>true,profiles:async()=>({}),name:async()=>''};

/* ---------- 파일 저장: 노트북에서는 「대회결과」 폴더에, 다른 기기는 그 기기에 내려받기 ---------- */
function toBlob(data,filename){
  if(data instanceof Blob)return data;
  if(data instanceof ArrayBuffer||ArrayBuffer.isView(data))return new Blob([data]);
  if(typeof data==='string'){
    const m=/^data:([^;,]*)(;base64)?,(.*)$/s.exec(data);
    if(m){if(m[2]){const bin=atob(m[3]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:m[1]});}return new Blob([decodeURIComponent(m[3])],{type:m[1]});}
    return new Blob([data],{type:/\.json$/i.test(filename)?'application/json':/\.csv$/i.test(filename)?'text/csv':'text/plain;charset=utf-8'});
  }
  return new Blob([JSON.stringify(data)],{type:'application/json'});
}
function browserDownload(blob,filename){const a=document.createElement('a');const u=URL.createObjectURL(blob);a.href=u;a.download=filename||'download';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove();},4000);}
function note(msg){try{if(typeof toast==='function')toast(msg);}catch(e){}}
const downloads={
  async save(o){
    const filename=(o&&(o.filename||o.name))||'download';const blob=toBlob(o&&o.data,filename);
    if(F.local){
      const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),20000);
      try{const r=await fetch(API+'save?name='+encodeURIComponent(filename),{method:'POST',body:blob,signal:ctl.signal});const j=await r.json();
        if(j&&j.ok){setTimeout(()=>note(`노트북 「대회결과」 폴더에 저장했습니다: ${filename}`),50);return {saved:true,path:j.path};}}
      catch(e){}finally{clearTimeout(t);}
    }
    browserDownload(blob,filename);return {saved:true};
  }
};

F.db=db;
window.claude={
  use:async n=>{
    if(n==='db'){if(!es&&LEADER)connect();return db;}
    if(n==='room')return room;
    if(n==='user')return user;
    if(n==='downloads')return downloads;
    return null; // assets 등: 현장 모드에서는 없음 (노트북 폴더 음악 사용)
  },
  field:true
};
})();
