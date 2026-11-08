/* v1.4.54 운영석 종목 자동 전환 (코트 노트북)
   이 코트의 다음 순서가 다른 종목이면(예: 품새 부문이 다 끝나고 다음이 격파), 운영석 위에 안내를 띄우고 10초 뒤 그 종목 운영석으로 넘어갑니다.
   「이 종목에 머물기」를 누르면 그 순서에서는 다시 묻지 않습니다. 지금 이 종목 경기가 진행 중이면 넘어가지 않습니다. */
(function(){
  const F=window.KS_FIELD||{};if(!F.status||!F.court)return;
  if(!/^(localhost|127\.|\[?::1)/.test(location.hostname))return;   /* 코트 노트북 자체에서 연 운영석만 */
  const APPK=location.pathname.split('/').filter(Boolean)[0]||'';
  const ICON={recognized:'🥋',freestyle:'🎵',gym:'🤸',team100:'👥',gyeokpa:'🪵',kyorugi:'🥊'};
  const isAdmin=()=>/^#admin/.test(location.hash||'')||!location.hash;
  let box=null,timer=null,left=0,target=null;
  const skipK=()=>'ks_next_skip_'+APPK;
  function close(){if(box){box.remove();box=null;}clearInterval(timer);timer=null;target=null;}
  function show(b){if(box&&target&&target.key===b.key)return;close();target=b;left=10;
    box=document.createElement('div');box.setAttribute('data-noi18n','');
    box.style.cssText='position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:99995;background:linear-gradient(160deg,#2A2519,#14110B);color:#F6F1E6;border:2px solid #C9A262;border-radius:18px;padding:16px 20px;box-shadow:0 24px 60px rgba(0,0,0,.6);display:flex;gap:16px;align-items:center;font:600 16px/1.4 "Malgun Gothic",sans-serif;max-width:min(760px,calc(100vw - 24px))';
    const draw=()=>{box.innerHTML=`<span style="font-size:38px">${ICON[b.ev]||'➡️'}</span><div style="flex:1"><div style="font-size:13px;color:#C9A262;font-weight:800;letter-spacing:.08em">이 코트의 지금 순서는 다른 종목입니다</div>
      <div style="font-size:21px;font-weight:900">${b.name} <span style="font-size:15px;color:#CFC6B4">${String(b.divs[0].num).padStart(2,'0')}~${String(b.divs[b.n-1].num).padStart(2,'0')}번 · ${b.n}부문</span></div>
      <div style="font-size:14px;color:#CFC6B4">${left}초 뒤 ${b.name} 운영석으로 넘어갑니다</div></div>
      <button data-nx="go" style="background:linear-gradient(180deg,#EBD5A3,#B8904E);color:#1A1306;border:0;border-radius:12px;padding:12px 16px;font:900 16px 'Malgun Gothic',sans-serif;cursor:pointer">지금 넘어가기</button>
      <button data-nx="stay" style="background:transparent;color:#EAD7A8;border:1px solid rgba(201,162,98,.5);border-radius:12px;padding:12px 14px;font:800 14px 'Malgun Gothic',sans-serif;cursor:pointer">이 종목에 머물기</button>`;};
    draw();document.body.appendChild(box);
    box.addEventListener('click',e=>{const k=e.target.closest('[data-nx]');if(!k)return;if(k.dataset.nx==='go')go(b);else{try{sessionStorage.setItem(skipK(),b.key);}catch(x){}close();}});
    timer=setInterval(()=>{left--;if(left<=0)go(b);else draw();},1000);}
  function go(b){close();location.href='/'+b.app+'/#admin-run';}
  async function tick(){if(!isAdmin()||!window.KS_SEQ){close();return;}
    try{const plan=await (await fetch('/api/court/plan',{cache:'no-store'})).json(),r=KS_SEQ.seq(plan),b=r.cur;
      const me=(plan.apps||[]).find(a=>a.app===APPK);
      if(!b||b.app===APPK||KS_SEQ.active(me)){close();return;}
      let sk='';try{sk=sessionStorage.getItem(skipK())||'';}catch(e){}if(sk===b.key){close();return;}
      /* 이 종목에 아직 끝나지 않은 앞 순서가 있으면 넘기지 않음 */
      if(r.B.some(x=>x.app===APPK&&!x.fin&&x.i<b.i)){close();return;}
      show(b);}catch(e){}}
  setInterval(tick,6000);setTimeout(tick,4000);
})();
