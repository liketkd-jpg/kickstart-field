/* KICKSTART UP 관람객용 실시간 결과 화면 (현장 와이파이 /view · 접수 홈페이지 #live 공통)
   LV.html(snap, st) → 화면 글.  snap = {v,at,comp,courts:[{court,online,apps:[{app,appName,board,results}]}]} */
(function(){
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const APPN={poomsae:'품새',kyorugi:'겨루기',gyeokpa:'격파',hero:'태권 히어로'};
const MD={1:['금','g'],2:['은','s'],3:['동','b']};
function ago(at,now){if(!at)return '';const s=Math.max(0,Math.round(((now||Date.now())-at)/1000));if(s<10)return '방금';if(s<60)return s+'초 전';if(s<3600)return Math.floor(s/60)+'분 전';return Math.floor(s/3600)+'시간 전';}
const hm=t=>{if(!t)return '';const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
const nt=s=>String(s||'').replace(/\s+/g,'');
/* 화면에 보이는 도장 이름 모두 (「⭐ 내 도장」 고르기) */
function teamsOf(snap){const S=new Set();flat(snap).forEach(({b,r})=>{if(b){(b.now&&b.now.names||[]).forEach(p=>p.team&&S.add(p.team));(b.next||[]).forEach(n=>(n.names||[]).forEach(p=>p.team&&S.add(p.team)));(b.upcoming||[]).forEach(u=>(u.names||[]).forEach(p=>p.team&&S.add(p.team)));}
  (r&&r.divs||[]).forEach(d=>(d.podium||[]).forEach(p=>p.team&&S.add(p.team)));});return [...S].sort((a,b)=>a.localeCompare(b,'ko'));}
/* 내 도장 선수: 지금 · 곧(다음 순서) · 이어지는 부문(예상 시각) · 입상 */
function mine(F,my){const L=[],seen=new Set(),m=nt(my);if(!m)return L;
  F.forEach(({c,a,b,r})=>{const where=`${c.court?c.court+'코트':''} · ${a.appName||APPN[a.app]||''}`,eta=a.eta||{};
    if(b&&b.now)(b.now.names||[]).forEach(p=>{if(nt(p.team)===m){seen.add(p.name+'|'+b.now.div);L.push({k:'now',p,where,div:b.now.div,txt:'지금 경기 중'});}});
    if(b)(b.next||[]).forEach((n,i)=>(n.names||[]).forEach(p=>{if(nt(p.team)===m&&!seen.has(p.name+'|'+n.div)){seen.add(p.name+'|'+n.div);L.push({k:'next',p,where,div:n.div,txt:i===0?'바로 다음':`${i+1}번째 뒤`});}}));
    if(b)(b.upcoming||[]).forEach(u=>(u.names||[]).forEach(p=>{if(nt(p.team)===m&&!seen.has(p.name+'|'+u.name)){seen.add(p.name+'|'+u.name);const t=(eta.divs||[]).find(d=>d.name===u.name);
      L.push({k:'soon',p,where,div:u.name,txt:u.name===b.curDiv?'이 부문 대기':t&&t.start?`약 ${hm(t.start)} 시작`:'곧 이어서'});}}));
    (r&&r.divs||[]).forEach(d=>(d.podium||[]).forEach(p=>{if(nt(p.team)===m)L.push({k:'medal',p,where,div:d.div,rank:p.rank});}));});
  const o={now:0,next:1,soon:2,medal:3};return L.sort((x,y)=>o[x.k]-o[y.k]).slice(0,80);}
function hit(q,...v){if(!q)return false;const t=v.join(' ').toLowerCase().replace(/\s+/g,'');return t.includes(q);}
function mark(s,q){s=String(s||'');if(!q)return E(s);const i=s.toLowerCase().indexOf(q);if(i<0)return E(s);return E(s.slice(0,i))+'<mark>'+E(s.slice(i,i+q.length))+'</mark>'+E(s.slice(i+q.length));}
function person(p,q,my){return `<span class="lv-p ${p.side?'lv-'+p.side:''} ${my&&nt(p.team)===nt(my)?'lv-me':''}" data-notr>${p.side?'<i></i>':''}<b>${mark(p.name,q)}</b>${p.team?` <small>${mark(p.team,q)}</small>`:''}</span>`;}
function flat(snap){const out=[];(snap&&snap.courts||[]).forEach(c=>(c.apps||[]).forEach(a=>out.push({c,a,b:a.board||null,r:a.results||null})));return out;}
/* 도장 종합: 금 3점 · 은 2점 · 동 1점 */
function teamTable(F){const T=new Map();
  F.forEach(({r})=>(r&&r.divs||[]).forEach(d=>(d.podium||[]).forEach(p=>{if(!p.team||!MD[p.rank])return;const t=T.get(p.team)||{team:p.team,g:0,s:0,b:0};t[MD[p.rank][1]]++;T.set(p.team,t);})));
  return [...T.values()].map(t=>({...t,pt:t.g*3+t.s*2+t.b})).sort((a,b)=>b.pt-a.pt||b.g-a.g||b.s-a.s||a.team.localeCompare(b.team,'ko'));}
function find(F,q){const L=[];if(!q)return L;
  F.forEach(({c,a,b,r})=>{const where=`${c.court?c.court+'코트 · ':''}${a.appName||APPN[a.app]||''}`;
    if(b&&b.now)(b.now.names||[]).forEach(p=>{if(hit(q,p.name,p.team))L.push({k:'now',p,where,div:b.now.div,txt:b.now.status||'경기 중'});});
    if(b)(b.next||[]).forEach((n,i)=>(n.names||[]).forEach(p=>{if(hit(q,p.name,p.team))L.push({k:'next',p,where,div:n.div,txt:i===0?'바로 다음':`${i+1}번째 뒤`});}));
    if(r)(r.divs||[]).forEach(d=>(d.podium||[]).forEach(p=>{if(hit(q,p.name,p.team))L.push({k:'medal',p,where,div:d.div,rank:p.rank});}));});
  const ord={now:0,next:1,medal:2};return L.sort((x,y)=>ord[x.k]-ord[y.k]).slice(0,60);}
function court(c,a,b,q,my){const eta=a.eta||null;const off=c.online===false,pr=b&&b.progress,pc=pr&&pr.total?Math.round(pr.done/pr.total*100):0;
  const nx=(b&&b.next||[]).slice(0,5);
  return `<section class="lv-court ${off?'off':''}"><header><span class="lv-c">${E(c.court||'')}</span><b>${E(c.court?c.court+'코트':'코트')}</b><span class="lv-app">${E(a.appName||APPN[a.app]||'')}</span>
      <span class="lv-st ${off?'off':b&&b.now?'on':''}">${off?'연결 끊김':b&&b.now?E(b.now.status||'경기 중'):'대기'}</span></header>
    ${b?`<div class="lv-div"><span data-notr>${E(b.curDiv||'—')}</span>${pr?`<small>${pr.done}/${pr.total}</small>`:''}</div>${pr?`<div class="lv-bar"><i style="width:${pc}%"></i></div>`:''}
    ${b.now?`<div class="lv-now"><small>지금${b.now.label?' · '+E(b.now.label):''}</small>${(b.now.names||[]).map(p=>person(p,q,my)).join('')}</div>`:'<div class="lv-now lv-mute">아직 시작한 경기가 없습니다</div>'}
    ${nx.length?`<div class="lv-next"><small>다음 순서</small><ol>${nx.map(n=>`<li data-notr>${n.div!==b.curDiv?`<em>${E(n.div)}</em>`:''}${(n.names||[]).map(p=>`<span class="${my&&nt(p.team)===nt(my)?'lv-me':''}">${mark(p.name,q)}${p.team?` <small>${mark(p.team,q)}</small>`:''}</span>`).join(' <i>vs</i> ')}</li>`).join('')}</ol></div>`:''}
    ${b.nextDiv&&b.nextDiv!==b.curDiv?`<div class="lv-nd">다음 부문 · <b data-notr>${E(b.nextDiv)}</b>${eta&&eta.next?` <span class="lv-t">약 ${hm(eta.next)}</span>`:''}</div>`:''}
    ${eta&&eta.end?`<div class="lv-eta"><span>⏱ 이 코트 끝 약 <b>${hm(eta.end)}</b></span>${eta.real?'':'<small>예상</small>'}</div>`:''}`
    :'<div class="lv-now lv-mute">진행 정보를 기다리는 중</div>'}</section>`;}
function results(F,q){const D=[];F.forEach(({c,a,r})=>(r&&r.divs||[]).forEach(d=>{if((d.podium||[]).length)D.push({c,a,d});}));
  if(!D.length)return '<div class="lv-empty">아직 나온 입상 결과가 없습니다. 부문이 끝나면 여기에 바로 나옵니다.</div>';
  D.sort((x,y)=>(y.d.done?0:1)-(x.d.done?0:1));
  const show=q?D.filter(({d})=>hit(q,d.div)||(d.podium||[]).some(p=>hit(q,p.name,p.team))):D;
  return `<div class="lv-res">${show.map(({c,a,d})=>`<article><header><b data-notr>${mark(d.div,q)}</b><small>${E(a.appName||APPN[a.app]||'')}${c.court?' · '+E(c.court)+'코트':''}${d.done?'':' · 진행 중'}</small></header>
    <ol>${(d.podium||[]).slice().sort((x,y)=>x.rank-y.rank).map(p=>`<li class="${hit(q,p.name,p.team)?'hit':''}"><span class="lv-m ${MD[p.rank]?MD[p.rank][1]:''}" aria-label="${p.rank}위">${p.rank}</span><b data-notr>${mark(p.name,q)}</b><small data-notr>${mark(p.team,q)}</small></li>`).join('')}</ol></article>`).join('')||'<div class="lv-empty">찾는 이름이 결과에 없습니다</div>'}</div>`;}
function html(snap,st){st=st||{};const q=String(st.q||'').toLowerCase().replace(/\s+/g,''),tab=st.tab||'courts',now=st.now||Date.now();
  if(!snap||!(snap.courts||[]).length)return {head:snap&&snap.comp?`<div class="lv-top"><h2>${E(snap.comp)}</h2></div>`:'',body:`<div class="lv-empty lv-wait"><b>경기 소식을 기다리는 중입니다</b><br>대회가 시작되면 코트별 진행 상황과 입상 결과가 여기에 바로 나옵니다.</div>`};
  const F=flat(snap),T=teamTable(F),stale=snap.at&&now-snap.at>60000;
  const found=find(F,q);
  const nRes=F.reduce((n,{r})=>n+((r&&r.divs)||[]).filter(d=>(d.podium||[]).length).length,0);
  const MY=st.my?mine(F,st.my):null,nOn=F.filter(({b})=>b&&b.now).length,nCt=new Set((snap.courts||[]).map(c=>c.court)).size;
  const myBox=st.my?`<section class="lv-mybox"><h3><span>⭐ ${E(st.my)}</span><small>${MY.length?`지금 ${MY.filter(x=>x.k==='now').length} · 곧 ${MY.filter(x=>x.k==='next'||x.k==='soon').length} · 입상 ${MY.filter(x=>x.k==='medal').length}`:'지금·다음 부문에 이 도장 선수가 없습니다'}</small></h3>
    ${MY.length?`<ul>${MY.map(f=>`<li class="lv-f-${f.k}">${f.k==='medal'?`<span class="lv-m ${MD[f.rank]?MD[f.rank][1]:''}">${f.rank}</span>`:`<span class="lv-tag">${f.k==='now'?'지금':f.k==='next'?'곧':'예정'}</span>`}<div><b data-notr>${E(f.p.name)}</b><span class="lv-sub" data-notr>${E(f.where)} · ${E(f.div)}</span></div>${f.txt?`<em>${E(f.txt)}</em>`:''}</li>`).join('')}</ul>`:''}</section>`:'';
  return {head:`<div class="lv-top"><div class="lv-kpis"><span><b>${nCt}</b>코트</span><span><b>${nOn}</b>경기 중</span><span><b>${nRes}</b>입상 부문</span></div><div><span class="lv-live ${stale?'stale':''}"><i></i>${stale?'잠시 끊김':'LIVE'}</span> <small>${E(ago(snap.at,now))} 갱신</small></div>${snap.comp?`<h2 data-notr>${E(snap.comp)}</h2>`:''}</div>`,body:`
    ${myBox}${q?`<section class="lv-found"><h3>「${E(st.q)}」 찾은 곳 <small>${found.length}</small></h3>${found.length?`<ul>${found.map(f=>`<li class="lv-f-${f.k}">${f.k==='medal'?`<span class="lv-m ${MD[f.rank]?MD[f.rank][1]:''}">${f.rank}</span>`:`<span class="lv-tag">${f.k==='now'?'지금':'곧'}</span>`}<div><b data-notr>${mark(f.p.name,q)}</b> <small data-notr>${mark(f.p.team,q)}</small><div class="lv-sub">${E(f.where)} · <span data-notr>${E(f.div||'')}</span>${f.k==='next'?' · '+E(f.txt):f.k==='now'?' · '+E(f.txt):''}</div></div></li>`).join('')}</ul>`:'<div class="lv-empty">지금 진행·다음 순서·입상 결과에 없습니다</div>'}</section>`:''}
    <div class="lv-tabs" role="tablist">${[['courts','코트 현황'],['results',`입상 결과${nRes?` <small>${nRes}</small>`:''}`],['teams','도장 종합']].map(([k,l])=>`<button type="button" role="tab" aria-selected="${tab===k}" class="${tab===k?'on':''}" data-lv="tab" data-t="${k}">${l}</button>`).join('')}</div>
    ${tab==='courts'?`<div class="lv-courts">${F.map(({c,a,b})=>court(c,a,b,q,st.my)).join('')}</div>`
     :tab==='results'?results(F,q)
     :T.length?`<div class="lv-teams"><table><tr><th>순위</th><th>도장</th><th>금</th><th>은</th><th>동</th><th>점수</th></tr>${T.map((t,i)=>`<tr class="${hit(q,t.team)?'hit':''}"><td>${i&&T[i-1].pt===t.pt?'':i+1}</td><td><b data-notr>${mark(t.team,q)}</b></td><td>${t.g}</td><td>${t.s}</td><td>${t.b}</td><td><b>${t.pt}</b></td></tr>`).join('')}</table><p class="lv-sub">금 3점 · 은 2점 · 동 1점으로 더한 참고 순위입니다. 공식 종합 순위는 대회 본부 발표를 따릅니다.</p></div>`:'<div class="lv-empty">아직 입상한 도장이 없습니다</div>'}`};}
const CSS=`.lv{--g1:#F3DFAE;--g2:#C9A262;--g3:#8E6A30;--bg:#0B0D12;--p1:#14171D;--p2:#1B1F27;--ln:rgba(255,255,255,.09);--tx:#F2EEE6;--mu:#A39C8E;display:flex;flex-direction:column;gap:14px;color:var(--tx);font-family:"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;word-break:keep-all}
.lv small{color:var(--mu);font-weight:600}
.lv-top{display:flex;flex-direction:column;gap:4px}.lv-top h2{margin:0;font-size:clamp(20px,5vw,28px);line-height:1.25}
.lv-live{display:inline-flex;align-items:center;gap:6px;font:800 12px/1 "Archivo",sans-serif;letter-spacing:.12em;color:#FF5C6C;background:rgba(255,92,108,.12);border:1px solid rgba(255,92,108,.35);border-radius:999px;padding:5px 10px}
.lv-live i{width:8px;height:8px;border-radius:50%;background:#FF5C6C;animation:lvp 1.4s infinite}.lv-live.stale{color:#E3A64A;background:rgba(227,166,74,.12);border-color:rgba(227,166,74,.35)}.lv-live.stale i{background:#E3A64A;animation:none}
@keyframes lvp{50%{opacity:.25}}
.lv-q{display:flex;align-items:center;gap:8px;background:var(--p1);border:1px solid rgba(201,162,98,.45);border-radius:14px;padding:0 14px}.lv-q input{flex:1;min-width:0;background:none;border:0;color:var(--tx);font:inherit;font-size:16px;padding:13px 0;outline:none}
.lv mark{background:rgba(243,223,174,.85);color:#1A1306;border-radius:3px;padding:0 1px}
.lv-tabs{display:flex;gap:6px;border-bottom:1px solid var(--ln);overflow-x:auto}.lv-tabs button{background:none;border:0;border-bottom:3px solid transparent;color:var(--mu);font:inherit;font-weight:800;font-size:15px;padding:10px 12px;cursor:pointer;white-space:nowrap}.lv-tabs button.on{color:var(--g1);border-bottom-color:var(--g2)}
.lv-courts{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.lv-court{background:linear-gradient(160deg,var(--p2),var(--p1));border:1px solid var(--ln);border-radius:18px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}.lv-court.off{opacity:.6}
.lv-court header{display:flex;align-items:center;gap:8px}.lv-court header b{font-size:18px}
.lv-c{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:linear-gradient(180deg,#EBD5A3,#B8904E);color:#1A1306;font:900 16px/1 "Archivo",sans-serif}
.lv-app{font-size:13px;font-weight:800;color:var(--g1);border:1px solid rgba(201,162,98,.4);border-radius:999px;padding:2px 9px}
.lv-st{margin-left:auto;font-size:12.5px;font-weight:800;border-radius:999px;padding:3px 10px;background:rgba(255,255,255,.07);color:var(--mu)}.lv-st.on{background:rgba(67,201,133,.16);color:#6BE0A4}.lv-st.off{background:rgba(255,92,108,.14);color:#FF8A96}
.lv-div{display:flex;justify-content:space-between;gap:8px;font-weight:800;font-size:15px}.lv-bar{height:5px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden}.lv-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--g3),var(--g1))}
.lv-now{display:flex;flex-direction:column;gap:6px;background:rgba(0,0,0,.25);border:1px solid rgba(201,162,98,.25);border-radius:12px;padding:10px 12px}.lv-now.lv-mute{color:var(--mu);font-size:14px}
.lv-p{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.lv-p b{font-size:22px;font-weight:900}.lv-p i{align-self:center;width:10px;height:10px;border-radius:3px}.lv-blue i{background:#2F6BD6}.lv-red i{background:#D7263D}
.lv-next ol{margin:4px 0 0;padding-left:22px;display:flex;flex-direction:column;gap:4px;font-size:14.5px}.lv-next em{display:block;font-style:normal;font-size:12px;color:var(--g2);font-weight:800}.lv-next i{color:var(--mu);font-style:normal;font-size:12px}
.lv-nd{font-size:13.5px;color:var(--mu)}.lv-nd b{color:var(--tx)}
.lv-res{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}.lv-res article{background:var(--p1);border:1px solid var(--ln);border-radius:16px;padding:12px 14px}.lv-res header{display:flex;flex-direction:column;margin-bottom:8px}.lv-res header b{font-size:15.5px}
.lv-res ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.lv-res li{display:flex;align-items:center;gap:10px;padding:4px 6px;border-radius:10px}.lv-res li.hit,.lv-teams tr.hit td{background:rgba(243,223,174,.12)}.lv-res li b{font-size:16px}.lv-res li small{margin-left:auto;text-align:right}
.lv-m{display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:50%;font-weight:900;font-size:13px;color:#1A1306;background:#888}.lv-m.g{background:linear-gradient(135deg,#F6E3A6,#B88A2E)}.lv-m.s{background:linear-gradient(135deg,#F1F3F6,#9AA2AD)}.lv-m.b{background:linear-gradient(135deg,#F0C29E,#9A5E33)}
.lv-teams table{width:100%;border-collapse:collapse;font-size:15px}.lv-teams th{text-align:left;color:var(--mu);font-size:12.5px;padding:6px 8px;border-bottom:1px solid var(--ln)}.lv-teams td{padding:9px 8px;border-bottom:1px solid var(--ln)}.lv-teams td:nth-child(n+3){text-align:center;font-variant-numeric:tabular-nums}.lv-teams th:nth-child(n+3){text-align:center}
.lv-found{background:linear-gradient(160deg,#2A2519,#14110B);border:1px solid rgba(201,162,98,.5);border-radius:16px;padding:12px 14px}.lv-found h3{margin:0 0 8px;font-size:16px}.lv-found ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}.lv-found li{display:flex;gap:10px;align-items:flex-start}
.lv-tag{flex:none;font-size:12px;font-weight:900;border-radius:8px;padding:4px 8px;background:#43C985;color:#06210F}.lv-f-next .lv-tag{background:#E3A64A;color:#2A1A02}
.lv-sub{font-size:13px;color:var(--mu)}
.lv-empty{color:var(--mu);text-align:center;padding:26px 12px;border:1px dashed var(--ln);border-radius:16px}.lv-wait b{color:var(--tx);font-size:17px}
.lv-kpis{display:flex;gap:8px;margin:2px 0 4px}.lv-kpis span{display:flex;align-items:baseline;gap:4px;padding:6px 12px;border-radius:12px;background:linear-gradient(160deg,rgba(201,162,98,.16),rgba(201,162,98,.04));border:1px solid rgba(201,162,98,.35);font-size:12.5px;font-weight:800;color:var(--mu)}.lv-kpis b{font-size:19px;color:var(--g1);font-family:"Archivo",sans-serif}
.lv-top h2{background:linear-gradient(180deg,#FFF6DE,#E6C98C 60%,#C9A262);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;letter-spacing:-.01em}
.lv-myrow{display:flex;align-items:center;gap:10px;background:linear-gradient(160deg,#2A2519,#14110B);border:1px solid rgba(201,162,98,.55);border-radius:14px;padding:6px 6px 6px 14px}
.lv-myrow span{font-weight:900;color:var(--g1);white-space:nowrap;font-size:15px}.lv-myrow select{flex:1;min-width:0;background:#0E1015;color:var(--tx);border:1px solid rgba(201,162,98,.4);border-radius:10px;padding:10px 12px;font:inherit;font-size:15px;font-weight:700;color-scheme:dark}
.lv-myrow select option{background:#14171D;color:#F2EEE6}
.lv-mybox{background:linear-gradient(160deg,#2E2716,#15120B 70%);border:1px solid rgba(243,223,174,.6);border-radius:18px;padding:14px 16px;box-shadow:0 14px 40px -20px rgba(201,162,98,.6)}
.lv-mybox h3{margin:0 0 10px;display:flex;flex-direction:column;gap:2px}.lv-mybox h3 span{font-size:19px;color:var(--g1)}
.lv-mybox ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}.lv-mybox li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.06)}
.lv-mybox li>div{flex:1;min-width:0;display:flex;flex-direction:column}.lv-mybox li b{font-size:17px}.lv-mybox li em{font-style:normal;font-weight:900;font-size:13px;color:var(--g1);white-space:nowrap}
.lv-mybox .lv-f-now{border-color:rgba(67,201,133,.5)}.lv-mybox .lv-f-soon .lv-tag{background:#5B6577;color:#fff}
.lv-me{position:relative}.lv-p.lv-me b,.lv-next span.lv-me{color:var(--g1)}.lv-p.lv-me b::after,.lv-next span.lv-me::after{content:" ⭐";font-size:.7em}
.lv-eta{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13.5px;color:var(--mu);border-top:1px dashed var(--ln);padding-top:8px}.lv-eta b{color:var(--g1);font-size:15px}.lv-t{color:var(--g1);font-weight:800}
@media (max-width:420px){.lv-courts,.lv-res{grid-template-columns:minmax(0,1fr)}.lv-p b{font-size:20px}}`;
/* 화면 붙이기: 찾기 칸은 다시 그리지 않음 (한글 입력이 끊기지 않게) */
function mount(el,st0){const st=Object.assign({q:'',tab:'courts'},st0||{});let snap=null;
  if(!document.getElementById('lv-css')){const c=document.createElement('style');c.id='lv-css';c.textContent=CSS;document.head.appendChild(c);}
  el.innerHTML=`<div class="lv"><div data-lv="head"></div><label class="lv-q"><span aria-hidden="true">🔍</span><input type="search" data-lv="q" placeholder="선수 이름이나 도장 이름 찾기" aria-label="선수·도장 찾기" autocomplete="off" enterkeyhint="search"></label><div data-lv="body"></div></div>`;
  try{st.my=st.my||localStorage.getItem('lv_my')||'';}catch(e){}
  const qL=el.querySelector('.lv-q');qL.insertAdjacentHTML('afterend','<label class="lv-myrow"><span>⭐ 내 도장</span><select data-lv="my"><option value="">도장을 고르면 우리 선수만 위에 모아 보여 드려요</option></select></label>');
  const H=el.querySelector('[data-lv=head]'),B=el.querySelector('[data-lv=body]'),SEL=el.querySelector('[data-lv=my]');el.querySelector('[data-lv=q]').value=st.q||'';
  let teamsKey='';const fillTeams=()=>{const T=teamsOf(snap);if(st.my&&!T.includes(st.my))T.unshift(st.my);const k=T.join('|');if(k===teamsKey||document.activeElement===SEL)return;teamsKey=k;
    SEL.innerHTML='<option value="">도장을 고르면 우리 선수만 위에 모아 보여 드려요</option>'+T.map(t=>`<option value="${E(t)}" ${t===st.my?'selected':''}>${E(t)}</option>`).join('');};
  el.addEventListener('change',e=>{if(e.target.dataset.lv==='my'){st.my=e.target.value;try{localStorage.setItem('lv_my',st.my);}catch(x){}draw();}});
  const draw=()=>{fillTeams();const o=html(snap,st);if(H.innerHTML!==o.head)H.innerHTML=o.head;B.innerHTML=o.body;};
  el.addEventListener('input',e=>{if(e.target.dataset.lv==='q'){st.q=e.target.value;draw();}});
  el.addEventListener('click',e=>{const b=e.target.closest('[data-lv=tab]');if(b){st.tab=b.dataset.t;draw();}});
  const tk=setInterval(()=>{if(!el.isConnected){clearInterval(tk);return;}H.innerHTML=html(snap,st).head;},5000);
  return {set(s){snap=s;draw();},get snap(){return snap;},st,draw};}
window.LV={html,CSS,ago,teamTable,mount};
})();
