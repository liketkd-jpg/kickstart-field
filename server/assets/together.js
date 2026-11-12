/* ===== v1.6.0 같이 경기하기 (품새 컷오프 · 격파) =====
   본부 「코트 진행 · 부문 옮기기」에서 아직 시작하지 않은 부문 여러 개를 묶으면(hqtog/main) 이 코트에서
   · 운영석: 묶인 부문들의 선수를 한 목록으로 이어서 호출 (부문을 바꿔 고를 필요 없음)
   · 전광판: 순위 화면에서 묶인 부문들의 결과를 함께 보여 줌 (부문마다 따로 순위)
   점수·순위·메달·상장은 원래 부문 그대로 (부문을 실제로 합치지 않음). 묶음을 풀면 원래대로. */
(function(){
if(window.KS_TOG)return;
const F=window.KS_FIELD||{},APP=F.app||'';
if(APP!=='poomsae'&&APP!=='gyeokpa')return;
const g=n=>{try{return (0,eval)(n);}catch(e){return undefined;}};
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let TOG={groups:[]};
const short=n=>String(n||'').replace(/^\d{1,3}\s+/,'');
/* 이 부문이 들어 있는 묶음 → {name, ds:[부문]} */
function groupOf(divId){const S=g('S');if(!S||!S.divs||!divId)return null;const d=S.divs.find(x=>x.id===divId);if(!d)return null;
  for(const gr of (TOG.groups||[])){const names=gr.divs||[];if(!names.includes(d.name))continue;
    const ds=names.map(n=>S.divs.find(x=>x.name===n)).filter(Boolean);if(ds.length>1)return {id:gr.id,ds};}
  return null;}
/* 부문 순위 (지금 단계) */
function ranks(d){try{
  if(APP==='gyeokpa'){const stg=g('curStage')(d),ids=g('stIds')(stg),RT=g('resultText');return g('rankList')(d,stg.key,ids).filter(x=>x.ok).map(x=>{const a=g('athlete')(x.id)||{};return {id:x.id,rank:x.rank,name:a.name||'',team:a.team||'',score:RT(x.r)};});}
  const st=g('curStage')(d),S=g('S');return (g('stageRanked')(d,st)||[]).map(x=>{const a=(S.athletes||[]).find(y=>y.id===x.id)||{};return {id:x.id,rank:x.rank,name:a.name||a.team||'',team:a.team||'',score:x.agg&&x.agg.final!=null?(+x.agg.final).toFixed(2):''};});
}catch(e){return [];}}
/* ---------- 운영석: 묶인 부문 선수를 한 목록으로 ---------- */
function opPanel(){const ui=g('ui'),S=g('S');if(!ui||!S)return '';const cur=g('curOf')(),gr=groupOf(ui.div)||(cur&&groupOf(cur.divId));if(!gr)return '';
  const st=g('ST')(),open=cur&&st.status==='open';let n=0,done=0;
  const rows=gr.ds.map(d=>{const cs=g('callsOf')(d)||[];return `<div class="tg-dh">${E(short(d.name))}</div>`+cs.map(c=>{n++;
    if(APP==='gyeokpa'){const a=g('athlete')(c.athleteId)||{},r=S.results[c.perfId],on=cur&&cur.callId===c.callId;if(r)done++;
      return `<div class="tg-r ${on?'on':''} ${r?'done':''}"><span>${on?'▶':r?'✓':'○'}</span><b>${E(a.name||'')}</b><small>${E(a.team||'')}</small><em>${r?E(g('resultText')(r)):''}</em>${on&&open?'<span class="chip live">진행 중</span>':`<button class="btn sm ${r?'':'primary'}" data-act="${r||open?'armed':'call'}" data-do="call" data-id="${c.callId}">${r?'다시 호출':'호출'}</button>`}</div>`;}
    const isCur=cur&&cur.callId===c.callId,dn=g('callDone')(c);if(dn)done++;const e0=c.entries[0]||{},res=S.results[e0.perfId],a=(S.athletes||[]).find(y=>y.id===e0.athleteId)||{};
    return `<div class="tg-r ${isCur?'on':''} ${dn?'done':''}"><span>${isCur?'▶':dn?'✓':'○'}</span><b>${E(c.entries.map(x=>g('aName')(x.athleteId)).join(' · '))}</b><small>${E(a.team||'')}</small><em>${res?E(g('fmt3')(res.final)):''}</em><button class="btn sm ${dn?'':'primary'}" data-act="call" data-c="${c.callId}" ${isCur?'disabled':''}>${dn?'다시 호출':'호출'}</button></div>`;}).join('');}).join('');
  return `<div class="panel tg-op"><div class="row between"><h2 style="margin:0">🤝 같이 경기 · ${gr.ds.length}개 부문</h2><span class="chip">${done}/${n} 끝</span></div>
    <span class="small muted">본부에서 묶은 부문입니다. 아래 순서대로 호출하면 부문을 바꾸지 않고 이어서 진행됩니다. 순위·메달·상장은 원래 부문마다 따로 나옵니다.</span>
    <div class="tg-list">${rows}</div></div>`;}
/* ---------- 전광판: 순위 화면에서 묶인 부문 결과를 함께 ---------- */
function board(cur){const K=window.KS_SKIN;if(!K)return null;const gr=groupOf(cur&&cur.divId);if(!gr)return null;
  let m=null;try{m=APP==='poomsae'?K.modelPm():K.modelGp();}catch(e){return null;}if(!m||m.scr!=='rank')return null;
  const th=K.skinFor(cur)||'royal',meId=APP==='gyeokpa'?cur.athleteId:(cur.entries&&cur.entries[0]&&cur.entries[0].athleteId);
  const cards=gr.ds.map((d,i)=>{const R=ranks(d).slice(0,3),isCur=d.id===cur.divId;
    return `<div class="tg-c ${isCur?'cur':''}" style="--i:${i}"><div class="tg-cn">${E(short(d.name))}</div>${R.length?R.map(r=>`<div class="tg-cr ${r.id===meId?'me':''}">${r.id===meId?'<i class="cbr me sk-mk" style="--dl:0ms"></i>':''}<span class="tg-m m${r.rank}">${r.rank}</span><b>${E(r.name)}</b><small>${E(r.team)}</small><em>${E(r.score)}</em></div>`).join(''):'<div class="tg-wait">경기 전</div>'}</div>`;}).join('');
  const comp=E(m.comp||''),court=m.court?`<span class="sk-court">${E(m.court)} 코트</span>`:'<span></span>';
  return `<div class="board ksb-solo sk sk-${th} sk-rank rankv tg"><div class="sk-bg"></div><div class="sk-s" style="--t:-${Math.max(0,m.el||0)}ms">
    <div class="sk-top"><span class="sk-brand">KICKSTART UP</span><span class="sk-comp">${comp}</span>${court}</div>
    <div class="sk-rkh"><span>${th==='fire'?'RESULTS':'STANDINGS'}</span><b>🤝 같이 경기 · 부문마다 순위</b></div>
    <div class="tg-g n${Math.min(gr.ds.length,6)}">${cards}</div></div></div>`;}
/* ---------- 감싸기 ---------- */
function installDisp(){const o=window.vDisplay;if(typeof o!=='function')return false;if(o.__tg)return true;
  if(!o.__sk)return false;   /* 컷오프 전광판 디자인(skin.js)을 감싼 다음에 */
  const w=function(){try{const cur=g('curOf')();if(cur&&(TOG.groups||[]).length){const h=board(cur);if(h)return h;}}catch(e){console.error('[KS_TOG]',e);}return o.apply(this,arguments);};
  for(const k of ['__sk','__ksb','__kst'])w[k]=true;w.__tg=true;window.vDisplay=w;return true;}
function installOp(){const o=window.aBoard;if(typeof o!=='function')return false;if(o.__tg)return true;
  const w=function(){const h=o.apply(this,arguments);try{const p=opPanel();if(!p)return h;const i=h.indexOf('<div class="col">');return i<0?p+h:h.slice(0,i+17)+p.replace('class="panel tg-op"','class="panel bp tg-op"')+h.slice(i+17);}catch(e){return h;}};
  w.__tg=true;Object.keys(o).forEach(x=>{w[x]=o[x];});window.aBoard=w;return true;}
let watched=false;
function watch(){if(watched)return true;const st=g('store');if(!st||!st.watchDoc)return false;
  st.watchDoc('hqtog/main',d=>{TOG=d&&Array.isArray(d.groups)?d:{groups:[]};try{g('schedule')();}catch(e){try{g('render')();}catch(x){}}});watched=true;return true;}
let k=0;const tm=setInterval(()=>{const a=watch(),b=installDisp(),c=installOp();if((a&&b&&c)||++k>240)clearInterval(tm);},250);
const css=`.tg-op{border-color:#C9A45A!important}.tg-list{display:flex;flex-direction:column;gap:4px;max-height:46vh;overflow:auto}
.tg-dh{font-weight:800;font-size:13px;color:#B8924A;margin-top:6px}.tg-r{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;border:1px solid var(--line,#333)}
.tg-r.on{border-color:#C9A45A;background:rgba(201,164,90,.15)}.tg-r.done{opacity:.7}.tg-r b{flex:none}.tg-r small{flex:1;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tg-r em{font-style:normal;font-weight:800}
.board.tg .tg-g{position:absolute;left:calc(80*var(--u));right:calc(80*var(--u));top:calc(250*var(--u));bottom:calc(60*var(--u));display:grid;gap:calc(24*var(--u));grid-template-columns:repeat(3,1fr);align-content:center}
.board.tg .tg-g.n1{grid-template-columns:1fr;padding:0 calc(500*var(--u))}.board.tg .tg-g.n2,.board.tg .tg-g.n4{grid-template-columns:repeat(2,1fr)}
.tg-c{position:relative;border-radius:calc(22*var(--u));padding:calc(22*var(--u)) calc(26*var(--u));background:rgba(255,255,255,.06);border:1px solid rgba(226,194,127,.35);animation:skup .7s cubic-bezier(.2,1.2,.3,1) both;animation-delay:calc(var(--t) + var(--i)*.12s)}
.tg-c.cur{border:2px solid #E2C27F;box-shadow:0 0 calc(40*var(--u)) rgba(226,194,127,.3)}.sk-fire .tg-c{border-color:rgba(255,138,0,.4)}.sk-fire .tg-c.cur{border-color:#FF8A00;box-shadow:0 0 calc(40*var(--u)) rgba(255,90,0,.45)}
.tg-cn{font:800 calc(30*var(--u)) "Noto Sans KR";margin-bottom:calc(12*var(--u));color:#E2C27F}.sk-fire .tg-cn{color:#FF8A00}
.tg-cr{position:relative;display:flex;align-items:center;gap:calc(14*var(--u));padding:calc(8*var(--u)) calc(10*var(--u));border-radius:calc(10*var(--u));font-size:calc(30*var(--u))}
.tg-cr.me{background:rgba(226,194,127,.22)}.sk-fire .tg-cr.me{background:rgba(255,59,31,.45)}
.tg-cr b{font-size:calc(40*var(--u));white-space:nowrap}.tg-cr small{flex:1;opacity:.7;font-size:calc(22*var(--u));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tg-cr em{font-style:normal;font:900 calc(38*var(--u)) Cinzel,"Noto Sans KR"}
.tg-m{flex:none;width:calc(54*var(--u));height:calc(54*var(--u));border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 calc(30*var(--u)) Cinzel,"Noto Sans KR";color:#2a1d00;background:radial-gradient(circle at 35% 30%,#FFE2C4,#C9864A 55%,#7E4A20)}
.tg-m.m1{background:radial-gradient(circle at 35% 30%,#FFF6D2,#E2B54A 55%,#9C7120)}.tg-m.m2{background:radial-gradient(circle at 35% 30%,#FFFFFF,#C2C8D2 55%,#7C8594)}
.tg-wait{opacity:.6;font-size:calc(26*var(--u));padding:calc(10*var(--u))}`;
const st=document.createElement('style');st.id='ks-tog-css';st.textContent=css;(document.head||document.documentElement).appendChild(st);
window.KS_TOG={groupOf,ranks,state:()=>TOG};
})();
