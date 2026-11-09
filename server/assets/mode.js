/* v1.4.64 시험 모드 / 실제 대회 모드 (모든 화면 공통)
   - 시험 모드: 화면 오른쪽 아래에 「시험 중」 띠를 크게 띄웁니다 (실제 대회 기록이 아님)
   - 실제 대회 모드: 초기화·명단 지우기·명단 바꾸기·가상 경기 같은 위험한 단추를 잠급니다
   모드는 본부 첫 화면의 스위치로 바꾸고, 연결된 모든 노트북에 함께 적용됩니다. */
(function(){
  if(window.KS_MODE)return;
  let M={mode:'test'},ok=false;
  const LOCK={clearRoster:'명단 전체 지우기',importReplace:'명단 바꾸기',resetAll:'전체 초기화',resetScores:'점수 초기화',resetResults:'결과 초기화',
    virt:'가상 명단 만들기',simGo:'가상 경기 시작',simReset:'가상 경기 초기화'};
  const css=document.createElement('style');css.textContent=`
#ksmode{position:fixed;bottom:0;right:0;z-index:2147483000;pointer-events:none;width:230px;height:230px;overflow:hidden}
#ksmode b{position:absolute;bottom:44px;right:-62px;transform:rotate(-45deg);width:300px;text-align:center;padding:9px 0 8px;font:900 19px/1.15 "Noto Sans KR",system-ui,sans-serif;letter-spacing:.06em;color:#1A1306;
  background:repeating-linear-gradient(135deg,#F2C14E 0 16px,#E8A93A 16px 32px);box-shadow:0 6px 18px rgba(0,0,0,.45);border-top:2px solid #1A1306;border-bottom:2px solid #1A1306}
#ksmode b small{display:block;font-size:11px;font-weight:800;letter-spacing:.02em}
#ksmode-edge{position:fixed;left:0;right:0;top:0;height:6px;z-index:2147483000;pointer-events:none;background:repeating-linear-gradient(135deg,#F2C14E 0 14px,#1A1306 14px 28px);opacity:.85}
.ksmode-note{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483001;background:#B3261E;color:#fff;font:800 16px/1.35 "Noto Sans KR",system-ui,sans-serif;padding:12px 18px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.45);max-width:min(560px,92vw);text-align:center}
@media (max-width:700px){#ksmode{width:150px;height:150px}#ksmode b{bottom:26px;right:-70px;font-size:14px;width:260px;padding:6px 0}#ksmode b small{display:none}}`;
  (document.head||document.documentElement).appendChild(css);
  function paint(){if(!document.body)return;let el=document.getElementById('ksmode'),ed=document.getElementById('ksmode-edge');const test=ok&&M.mode!=='live';
    if(test&&!el){el=document.createElement('div');el.id='ksmode';el.className='notranslate';el.setAttribute('translate','no');el.setAttribute('data-notr','');el.innerHTML='<b>🧪 시험 중<small>실제 대회 기록이 아닙니다</small></b>';document.body.appendChild(el);
      ed=document.createElement('div');ed.id='ksmode-edge';document.body.appendChild(ed);}
    if(!test){if(el)el.remove();if(ed)ed.remove();}}
  let nt=0;function note(t){let n=document.querySelector('.ksmode-note');if(!n){n=document.createElement('div');n.className='ksmode-note notranslate';n.setAttribute('translate','no');n.setAttribute('data-notr','');document.body.appendChild(n);}n.textContent=t;clearTimeout(nt);nt=setTimeout(()=>n.remove(),4200);}
  document.addEventListener('click',e=>{if(M.mode!=='live')return;const t=e.target.closest&&e.target.closest('[data-act],[data-do],[data-p]');if(!t)return;
    const k=[t.dataset.act,t.dataset.do,t.dataset.p].find(x=>x&&LOCK[x]);if(!k)return;
    e.preventDefault();e.stopImmediatePropagation();note(`🔒 실제 대회 모드에서는 「${LOCK[k]}」이(가) 잠겨 있습니다 · 꼭 필요하면 본부 첫 화면에서 「시험 모드」로 바꾼 뒤 하세요`);},true);
  /* v1.4.67 프로그램이 새 버전으로 바뀌면 열려 있던 화면을 저절로 새로 고침 (심판 채점 화면은 제외) */
  let V0='';
  function verCheck(v){if(!v)return;if(!V0){V0=v;return;}if(v!==V0&&!/^#judge/.test(location.hash||'')){V0=v;setTimeout(()=>location.reload(),400);}}
  async function poll(){try{const j=await (await fetch('/api/mode',{cache:'no-store'})).json();if(j&&j.mode){M=j;ok=true;verCheck(j.version);}}catch(e){}paint();}
  poll();setInterval(poll,5000);
  /* v1.4.67 「새 버전이 있습니다 · 지금 업데이트」 띠 — 그 노트북 화면(첫 화면·본부 운영)에서만 */
  const LOCAL=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const UPG=()=>LOCAL&&(location.pathname==='/'||/^\/hq\/?$/.test(location.pathname))&&!/^#board/.test(location.hash||'');
  const ucss=document.createElement('style');ucss.textContent=`
#ksup{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483002;display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;
  background:#0B1530;color:#fff;border:2px solid #D4AF37;border-radius:14px;padding:10px 12px 10px 16px;box-shadow:0 12px 34px rgba(0,0,0,.45);font:700 16px/1.35 "Noto Sans KR",system-ui,sans-serif;max-width:min(860px,94vw)}
#ksup b{color:#F2D27A}#ksup small{display:block;font-weight:500;font-size:13px;opacity:.8}
#ksup button{font:900 16px/1 "Noto Sans KR",system-ui,sans-serif;padding:11px 16px;border-radius:10px;border:0;background:#D4AF37;color:#14110A;cursor:pointer}
#ksup button.x{background:transparent;color:#fff;opacity:.7;padding:8px 10px;font-size:18px}
#ksup button.arm{background:#E5484D;color:#fff}
#ksup.busy button{display:none}`;
  (document.head||document.documentElement).appendChild(ucss);
  let U=null,hide='',arm=false,going=false;try{hide=sessionStorage.getItem('ksup_hide')||'';}catch(e){}
  function upPaint(){let el=document.getElementById('ksup');
    const show=U&&UPG()&&(going||U.busy||U.error||(U.newer&&hide!==U.latest));
    if(!show){if(el)el.remove();return;}
    if(!el){el=document.createElement('div');el.id='ksup';el.className='notranslate';el.setAttribute('translate','no');el.setAttribute('data-notr','');document.body.appendChild(el);
      el.addEventListener('click',onUp);}
    const busy=going||U.busy;el.classList.toggle('busy',busy);
    let h;
    if(busy)h=`<div>⏳ <b>새 버전 ${U.latest||''}</b>을(를) 받는 중입니다…<small>약 30초~1분 뒤 프로그램이 저절로 다시 켜지고, 이 화면도 새로 고침됩니다. 검은 창을 닫지 마세요.</small></div>`;
    else if(U.error&&!U.newer)h=`<div>⚠️ ${U.error}</div><button class="x" data-up="x">✕</button>`;
    else h=`<div>⬆️ <b>새 버전 ${U.latest}</b>이(가) 있습니다 <span style="opacity:.75">(지금 v${U.version})</span>`+
      `<small>${U.error?'⚠️ '+U.error+' · ':''}${U.live?'실제 대회 모드입니다. 꼭 <b>경기와 경기 사이</b>에만 하세요 · ':''}경기 데이터는 그대로 남습니다</small></div>`+
      `<button data-up="go" class="${arm?'arm':''}">${arm?'한 번 더 누르면 업데이트':'지금 업데이트'}</button><button class="x" data-up="x" title="나중에">✕</button>`;
    if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h;}}
  async function onUp(e){const b=e.target.closest('[data-up]');if(!b)return;
    if(b.dataset.up==='x'){hide=U&&U.latest||'';try{sessionStorage.setItem('ksup_hide',hide);}catch(e){}if(U)U.error='';upPaint();return;}
    if(!arm){arm=true;upPaint();setTimeout(()=>{arm=false;upPaint();},6000);return;}
    arm=false;going=true;upPaint();
    try{const r=await fetch('/api/update',{method:'POST'});const j=await r.json();if(!r.ok){going=false;U=Object.assign(U||{},{error:j.error||'업데이트를 시작하지 못했습니다'});}else U=j;}catch(e){}
    upPaint();upLoop();}
  let ut=0;async function upLoop(){clearTimeout(ut);if(!UPG())return;
    try{const j=await (await fetch('/api/update',{cache:'no-store'})).json();if(j&&j.version){U=j;if(!j.busy&&going&&j.error)going=false;verCheck(j.version);}}catch(e){}
    upPaint();ut=setTimeout(upLoop,(going||(U&&U.busy))?2000:60000);}
  if(UPG())setTimeout(upLoop,1500);document.addEventListener('DOMContentLoaded',paint);
  window.KS_MODE={get:()=>M,refresh:poll,LOCK};
})();
