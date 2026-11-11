/* v1.4.54 코트 순서 계산 (현장 첫 화면 · 운영석 종목 자동 전환 공통)
   부문 이름 앞 번호(01, 02 …) = 본부 운영표의 이 코트 순서. 같은 종목이 이어지는 부문끼리 한 덩어리(블록)로 묶음 */
window.KS_SEQ=(function(){
  const EVN={recognized:'공인 품새',freestyle:'자유 품새',gym:'태권체조',team100:'팀 대항 종합경연',gyeokpa:'격파',kyorugi:'겨루기'};
  function evOf(app,name){if(app==='gyeokpa')return 'gyeokpa';if(app==='kyorugi')return 'kyorugi';const n=String(name||'');
    if(/자유/.test(n))return 'freestyle';if(/체조/.test(n))return 'gym';if(/경연|종합|시범/.test(n))return 'team100';return 'recognized';}
  const active=a=>!!(a&&a.now&&a.fresh&&!/점수 공개|경기 끝/.test(a.now.status||''));
  function seq(plan){const all=[];((plan&&plan.apps)||[]).forEach((a,ai)=>(a.divs||[]).forEach((d,i)=>{const m=/^(\d{1,3})\s/.exec(d.name||'');
      all.push({app:a.app,name:d.name,at:d.at||'',done:d.done||0,total:d.total||0,num:m?+m[1]:1000+ai*500+i,ev:evOf(a.app,d.name),fin:(d.total||0)>0&&(d.done||0)>=(d.total||0),pending:!!a.pending});}));
    all.sort((x,y)=>x.num-y.num);
    const B=[];all.forEach(d=>{const l=B[B.length-1];if(l&&l.ev===d.ev&&l.app===d.app)l.divs.push(d);else B.push({ev:d.ev,app:d.app,divs:[d]});});
    B.forEach((b,i)=>{b.i=i;b.n=b.divs.length;b.done=b.divs.filter(d=>d.fin).length;b.fin=b.done===b.n;b.games=b.divs.reduce((t,d)=>t+d.total,0);b.gdone=b.divs.reduce((t,d)=>t+Math.min(d.done,d.total),0);
      b.key=b.app+'|'+b.divs[0].name;b.name=EVN[b.ev]||b.ev;b.pending=b.divs.some(d=>d.pending);});
    const act=((plan&&plan.apps)||[]).find(active);
    let cur=null;if(act){const nm=act.now&&act.now.div;cur=B.find(b=>b.app===act.app&&!b.fin&&b.divs.some(d=>d.name===nm))||B.find(b=>b.app===act.app&&!b.fin);}
    if(!cur)cur=B.find(b=>!b.fin)||null;
    return {B,cur,all,active:act||null};}
  return {seq,evOf,EVN,active};
})();

/* v1.4.84 홈페이지에서 추첨한 순서로 본부가 보낸 명단이면 → 이 코트에서는 「랜덤 추첨」·「전체 추첨」·「접수 순서로」를 잠금 */
(function(){if(!/\/(poomsae|gyeokpa|kyorugi)\//.test(location.pathname))return;window.KS_HOMEDRAW=false;
  const chk=async()=>{try{const r=await fetch('api/get?path=inbox/roster',{cache:'no-store'});const j=await r.json();window.KS_HOMEDRAW=!!(j&&j.exists&&j.data&&j.data.homeDraw);
    document.documentElement.classList.toggle('kshd',window.KS_HOMEDRAW);}catch(e){}};
  chk();setInterval(chk,4000);
  const st=document.createElement('style');st.textContent='html.kshd [data-do="drawDiv"],html.kshd [data-act="drawDiv"],html.kshd [data-act="drawAll"],html.kshd [data-do="drawAll"],html.kshd [data-act="orderDiv"],html.kshd [data-do="orderDiv"]{opacity:.4;filter:grayscale(1)}'+
    '#kshdt{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:99999;background:#1B2440;color:#FFE7B8;border:2px solid #C9A35A;border-radius:14px;padding:12px 18px;font:800 15px/1.4 "Noto Sans KR",sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.5);max-width:90vw;text-align:center}';
  document.head.appendChild(st);
  const say=t=>{let el=document.getElementById('kshdt');if(!el){el=document.createElement('div');el.id='kshdt';document.body.appendChild(el);}el.textContent=t;clearTimeout(say.t);say.t=setTimeout(()=>el.remove(),4200);};
  window.addEventListener('click',e=>{if(!window.KS_HOMEDRAW)return;const b=e.target.closest&&e.target.closest('[data-act],[data-do]');if(!b)return;
    const k=b.dataset.do||b.dataset.act;if(!/^(drawDiv|drawAll|orderDiv)$/.test(k))return;e.preventDefault();e.stopImmediatePropagation();
    say('🎲 홈페이지에서 추첨한 출전 순서로 고정되어 있습니다 · 지도자에게 공개된 대진이라 코트에서는 다시 추첨할 수 없습니다');},true);
})();
