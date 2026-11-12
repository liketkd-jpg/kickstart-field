/* ===== v1.6.4 접수 홈페이지 「모든 종목 현장 노트북으로 보내기」: 품새 → 격파 → (겨루기) 차례로 한 창에서 =====
   홈페이지가 #ksreg-<대회>~chain=poomsae.gyeokpa 로 열면 이 창(탭)에 차례를 기억하고, 종목마다 「가져오기」를 마치면
   오른쪽 아래 안내에서 다음 종목 앱으로 이어서 엽니다. 종목마다 가져온 건수를 보여 줍니다. */
(function(){
if(window.KS_CHAIN)return;
const APP=(location.pathname.split('/').filter(Boolean)[0]||'');
const NM={poomsae:'품새',gyeokpa:'격파',kyorugi:'겨루기'};
const K='ks_chain';
const get=()=>{try{return JSON.parse(sessionStorage.getItem(K)||'null');}catch(e){return null;}};
const put=c=>{try{if(c)sessionStorage.setItem(K,JSON.stringify(c));else sessionStorage.removeItem(K);}catch(e){}};
(function start(){const m=(location.hash||'').match(/^#ksreg-([0-9A-Za-z_-]+)~chain=([a-z.]+)/);if(!m)return;
  const list=m[2].split('.').filter(x=>NM[x]);if(list.length)put({cid:m[1],list,done:{},at:Date.now()});})();
function draw(){let b=document.getElementById('ksChain');const c=get();
  if(!c||!c.list.includes(APP)||Date.now()-c.at>6*3600e3){if(b)b.remove();return;}
  if(!b){b=document.createElement('div');b.id='ksChain';b.setAttribute('data-noi18n','');document.body.appendChild(b);}
  const i=c.list.indexOf(APP),next=c.list[i+1],me=c.done[APP];
  const st=c.list.map(s=>`<span class="kc-s ${c.done[s]!=null?'ok':s===APP?'now':''}">${NM[s]} ${c.done[s]!=null?'✓ '+c.done[s]+'건':s===APP?'· 지금':'· 대기'}</span>`).join('');
  b.innerHTML=`<b>📡 모든 종목 보내기</b><div class="kc-row">${st}</div>
    ${me==null?`<div class="kc-t">이 ${NM[APP]} 앱에서 「가져오기」를 눌러 명단을 받으세요.</div>`:next?`<div class="kc-t">${NM[APP]} ${me}건을 가져왔습니다. 부문 만들기까지 끝냈으면 다음 종목으로 가세요.</div>`:`<div class="kc-t">✅ 모든 종목을 가져왔습니다.</div>`}
    <div class="kc-row">${next?`<button type="button" class="btn ${me!=null?'primary':''}" data-kc="next">➡ ${NM[next]} 앱으로 이어서${me==null?' (건너뛰기)':''}</button>`:''}<button type="button" class="btn" data-kc="end">${next?'그만하기':'닫기'}</button></div>`;}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-kc]');if(!t)return;const c=get();if(!c)return;
  if(t.dataset.kc==='end'){put(null);draw();return;}
  const next=c.list[c.list.indexOf(APP)+1];if(next)location.href=`/${next}/#ksreg-${c.cid}`;});
window.KS_CHAIN={done(cid,sp,n){const c=get();if(!c||c.cid!==cid)return;c.done[sp]=n;put(c);draw();},draw};
const css=`#ksChain{position:fixed;right:16px;bottom:16px;z-index:99995;width:min(380px,calc(100vw - 32px));background:#141821;color:#F2EEE3;border:2px solid #C9A45A;border-radius:14px;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:8px;font:14px/1.4 "Noto Sans KR",sans-serif}
#ksChain .kc-row{display:flex;gap:6px;flex-wrap:wrap}#ksChain .kc-s{padding:3px 9px;border-radius:12px;border:1px solid #555;font-size:13px}#ksChain .kc-s.ok{border-color:#3FA46A;color:#7FE0A6}#ksChain .kc-s.now{border-color:#C9A45A;color:#E2C27F}#ksChain .kc-t{font-size:13px;opacity:.9}`;
const s=document.createElement('style');s.textContent=css;(document.head||document.documentElement).appendChild(s);
const go=()=>{draw();setInterval(draw,3000);};if(document.body)go();else document.addEventListener('DOMContentLoaded',go);
})();
