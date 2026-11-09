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
  async function poll(){try{const j=await (await fetch('/api/mode',{cache:'no-store'})).json();if(j&&j.mode){M=j;ok=true;}}catch(e){}paint();}
  poll();setInterval(poll,5000);document.addEventListener('DOMContentLoaded',paint);
  window.KS_MODE={get:()=>M,refresh:poll,LOCK};
})();
