# 결승 3라운드 — 히어로 2 앱에 넣기 (한 번만 실행)
import sys,re
f=sys.argv[1];s=open(f).read()
assert 'F3:START' not in s,'already'
L=s.split('\n')
K=[1548,1634,1663,1666,1669,1941,1949,2264,2633,2635,2636,2638,2698,2705,2796]
T=[1625,1658,2571,2794,2795]
N=[1661,2148,2159,2196,2610]
for n in K: assert 'isBoss()' in L[n-1],n; L[n-1]=L[n-1].replace('isBoss()','kickNow()')
for n in T: assert 'isBoss()' in L[n-1],n; L[n-1]=L[n-1].replace('isBoss()','kTimed()').replace('Math.max(5,+S.cfg.bossSec||20)','kSec()')
for n in N: assert 'isBoss()' in L[n-1],n; L[n-1]=L[n-1].replace('isBoss()','sensNow()')
s='\n'.join(L)
def rep(o,n,cnt=1):
    global s
    assert s.count(o)>=1,('missing',o[:80]); s=s.replace(o,n,cnt)
# 기본 설정
rep("bossSec:20,bossHP:60,","bossSec:20,f3:false,f3Sec:20,bossHP:60,")
# 핵심
core=r"""
/* F3:START — 결승 3라운드: 1라운드 장애물 달리기(시간) → 2라운드 스피드 발차기(횟수, 센서) → 3라운드 격파(장 수)
   라운드마다 1등 100점, 나머지는 기록에 비례. 세 라운드 합계(300점 만점)로 우승. 합계는 h.time 에 -(1e9+점수*1000) 으로 넣어
   기존 순위·메달·우승 화면이 그대로 돌아가게 함 (fmt 가 '점'으로 보여 줌) */
function isFinalRound(r){return !!r&&(((r.kind==='tour'||r.kind==='kok')&&!!r.final)||(r.kind==='grp'&&r.heats.length===1))}
function f3Of(h){if(!h)return null;if(h.f3)return h.f3;if(!S.cfg.f3||!f3Race()||h.done||h.time.some(x=>x!=null))return null;
  const r=curRound();if(!r||!isFinalRound(r)||r.heats.indexOf(h)<0)return null;h.f3={st:1,raw:[[],[],[]]};return h.f3}
function f3Now(){const f=f3Of(curHeat());return f&&!f.done?f.st:0}
const kickNow=()=>isBoss()||f3Now()>=2,kTimed=()=>isBoss()||f3Now()===2,sensNow=()=>isBoss()||f3Now()===2;
const kSec=()=>Math.max(5,+(f3Now()===2?S.cfg.f3Sec:S.cfg.bossSec)||20);
const F3EV=['f3R1','f3R2','f3R3'];
function f3Scores(f){const I=[0,1,2,3],sc=[[],[],[]];
  const t0=I.map(i=>f.raw[0][i]).filter(x=>x!=null&&isFinite(x)&&x>0),best=t0.length?Math.min(...t0):0;
  I.forEach(i=>{const x=f.raw[0][i];sc[0][i]=x===undefined?null:(x!=null&&isFinite(x)&&x>0&&best?100*best/x:0)});
  [1,2].forEach(k=>{const v=I.map(i=>f.raw[k][i]).filter(x=>x!=null),mx=v.length?Math.max(...v):0;
    I.forEach(i=>{const x=f.raw[k][i];sc[k][i]=x===undefined?null:(x!=null&&mx>0?100*x/mx:0)})});
  const tot=I.map(i=>{let a=0,any=false;sc.forEach(r=>{if(r[i]!=null){a+=r[i];any=true}});return any?Math.round(a*10)/10:null});
  return{sc,tot}}
function f3Rank(h){const f=f3Of(h),X=f3Scores(f);return[0,1,2,3].filter(i=>h.lanes[i]!=null).map(i=>({i,tot:X.tot[i],sc:X.sc.map(r=>r[i]),raw:f.raw.map(r=>r[i])}))
  .sort((a,b)=>(b.tot??-1)-(a.tot??-1)||a.i-b.i)}
function f3Reset(h){const n=newHeat(h.lanes);h.time=n.time;h.pen=n.pen;h.dnf=n.dnf;h.kicks=[0,0,0,0];delete h.legs}
function f3Advance(){ // 라운드 확정. 1·2라운드면 다음 라운드로 넘어가고 true, 3라운드면 합계를 넣고 false (그다음은 원래 확정 흐름)
  const h=ensureHeat(),f=f3Of(h);if(!f||f.done)return false;const k=f.st-1;
  [0,1,2,3].forEach(i=>{if(h.lanes[i]==null)return;f.raw[k][i]=h.dnf[i]?null:(k===0?(h.time[i]!=null?total(h,i):null):((h.kicks||[])[i]||0))});
  if(f.st<3){f.st++;f3Reset(h);R={phase:'idle',count:0,start:0,go:0};clearFlow();S.board='f3res';commit();sfx('whoosh');
    schedule(Math.max(6,(+S.cfg.medalSec||5)+4),'f3next',()=>{if(S.board==='f3res'){S.board='live';commit()}});return true}
  const X=f3Scores(f);f.done=true;f.tot=X.tot;
  [0,1,2,3].forEach(i=>{if(h.lanes[i]==null)return;if(X.tot[i]==null){h.dnf[i]=true;h.time[i]=null}else{h.dnf[i]=false;h.time[i]=-(1e9+Math.round(X.tot[i]*10)*100)}});
  return false}
const f3U=(r,v)=>v==null?t('dnf'):r===0?fmt(v)+(S.lang==='en'?'s':'초'):v+(r===1?(S.lang==='en'?' kicks':'회'):(S.lang==='en'?' boards':'장'));
/* F3:END */
"""
rep("const isTeamGame=()=>","\n"+core.strip()+"\nconst isTeamGame=()=>")
# 점수 표시
rep("function fmt(ms){if(ms==null)return'—';if(!isFinite(ms))return t('dnf');","function fmt(ms){if(ms==null)return'—';if(!isFinite(ms))return t('dnf');if(ms<=-1e9){const v=(-ms-1e9)/1000;return v.toFixed(1)+(S.lang==='en'?' pts':'점')}")
rep("const kU=n=>S.lang==='en'?(n===1?'kick':'kicks'):'회';","const kU=n=>f3Now()===3?(S.lang==='en'?(n===1?'board':'boards'):'장'):S.lang==='en'?(n===1?'kick':'kicks'):'회';")
# 발차기: 보스 체력은 보스전에서만
rep("  if(d>0){R.dmg=(R.dmg||0)+d;let down=false;if(R.dmg>=bossMax(R.stage)){R.dmg=0;R.stage=(R.stage||1)+1;down=true}\n    sfx('kick',i);commit();fx('hit',{lane:i,n:h.kicks[i]});if(down)fx('bossdown',{stage:R.stage})}\n  else{R.dmg=Math.max(0,(R.dmg||0)+d);commit()}}",
    "  if(!isBoss()){if(d>0)sfx('kick',i);commit();if(d>0)fx('hit',{lane:i,n:h.kicks[i]});return}\n  if(d>0){R.dmg=(R.dmg||0)+d;let down=false;if(R.dmg>=bossMax(R.stage)){R.dmg=0;R.stage=(R.stage||1)+1;down=true}\n    sfx('kick',i);commit();fx('hit',{lane:i,n:h.kicks[i]});if(down)fx('bossdown',{stage:R.stage})}\n  else{R.dmg=Math.max(0,(R.dmg||0)+d);commit()}}")
rep("R.phase='done';commit();sfx('gong');fx('timeup');","R.phase='done';commit();sfx('gong');if(f3Now()!==3)fx('timeup');")
# 확정
rep("function confirmHeat(){\n  const h=ensureHeat();if(!h||!heatComplete(h))return;",
    "function confirmHeat(){\n  const h=ensureHeat();if(!h||!heatComplete(h))return;\n  if(f3Now()){if(R.phase==='running'||R.phase==='countdown')return;if(f3Advance())return}")
rep("const rec=o.length?checkRecord(h,o[0]):null;","const rec=o.length&&!h.f3?checkRecord(h,o[0]):null;")
rep("function maybeAutoConfirm(){\n  const h=curHeat();","function maybeAutoConfirm(){\n  const h=curHeat();if(f3Now())return;")
rep("function redoHeat(){clearFlow();const h=curHeat();if(!h)return;","function redoHeat(){clearFlow();const h=curHeat();if(!h)return;if(f3Now()){f3Reset(h);R={phase:'idle',count:0,start:0,go:0};commit();return}")
rep("function queueHeat(h,hk){const c=official();if(!c||!isRace()||!approved()||!code())return;","function queueHeat(h,hk){const c=official();if(!c||!isRace()||!approved()||!code()||h.f3)return;")
# 운영 화면
rep("    ${kickNow()?`<button class=\"finish kickb\" data-act=\"fin\" data-v=\"${i}\" ${R.phase!=='running'||tm!=null||dnf||h.done?'disabled':''}>👊 ${esc(t('kickBtn'))}</button>`",
    "    ${kickNow()?`<button class=\"finish kickb\" data-act=\"fin\" data-v=\"${i}\" ${R.phase!=='running'||tm!=null||dnf||h.done?'disabled':''}>${f3Now()===3?'🧱 '+esc(t('brkBtn')):'👊 '+esc(t('kickBtn'))}</button>`")
rep("aria-label=\"${esc(t('kicks'))}\"><span class=\"kunit\">${esc(t('kicks'))}</span>","aria-label=\"${esc(t(f3Now()===3?'boards':'kicks'))}\"><span class=\"kunit\">${esc(t(f3Now()===3?'boards':'kicks'))}</span>")
rep("""    <button class="btn gold" data-act="confirm" ${h.done||live||!complete||R.phase==='idle'&&!h.time.some(x=>x!=null)&&!h.dnf.some(Boolean)?'disabled':''}>${esc(t('confirm'))}</button>""",
    """    ${f3Now()===3&&R.phase==='running'?`<button class="btn red" data-act="f3End">${esc(t('f3End'))}</button>`:''}
    <button class="btn gold" data-act="confirm" ${h.done||live||!complete||R.phase==='idle'&&!h.time.some(x=>x!=null)&&!h.dnf.some(Boolean)?'disabled':''}>${esc(f3Now()?(f3Now()<3?t('f3Next',{n:f3Now()}):t('f3Fin')):t('confirm'))}</button>""")
rep("""['champion','sChamp'],['cards','sCards']].map(""","""['champion','sChamp'],['cards','sCards']].concat(f3Of(h)?[['f3res','sF3Res']]:[]).map(""")
rep("""  return`<div class="runview">
  ${banner}""","""  const f3=f3Of(h);if(f3&&!f3.done)banner=`<div class="banner f3ban">🏆 <b>${esc(t('f3Ban'))}</b> · ${esc(t('f3RoundN',{n:f3.st}))} ${esc(t(F3EV[f3.st-1]))} — ${esc(t(F3EV[f3.st-1]+'D',{s:+S.cfg.f3Sec||20}))}<span class="f3dots">${[1,2,3].map(n=>`<i class="${n<f3.st?'d':n===f3.st?'c':''}">${n}</i>`).join('')}</span></div>`+banner;
  return`<div class="runview">
  ${banner}""")
rep("case'start':startHeat();break;","case'start':startHeat();break;\n    case'f3End':if(f3Now()===3)endBoss();break;")
# 설정
rep("""    ${isComm()?`<label class="f" style="width:11rem;margin-top:8px">${esc(t('grpN'))}""","""    <label class="chk" style="margin-top:10px"><input type="checkbox" id="f3" data-in="cfg.f3" ${S.cfg.f3?'checked':''} ${isRace()&&S.mode!=='cut'?'':'disabled'}>🏆 ${esc(t('f3'))}</label><p class="note">${esc(t(isRace()&&S.mode!=='cut'?'f3D':'f3No'))}</p>
    ${S.cfg.f3&&isRace()?`<label class="f" style="width:13rem">${esc(t('f3Sec'))}<input type="number" id="f3Sec" min="5" max="60" data-in="cfg.f3Sec" value="${+S.cfg.f3Sec||20}"></label>`:''}
    ${isComm()?`<label class="f" style="width:11rem;margin-top:8px">${esc(t('grpN'))}""")
# 전광판
rep("  else if(S.board==='live'&&h)body=boardLive(h);","  else if(S.board==='f3res'&&h&&f3Of(h))body=boardF3Res(h);\n  else if(S.board==='live'&&h)body=f3Now()&&R.phase==='idle'?boardF3Intro(h):boardLive(h);")
rep("<div class=\"bpen\">${pens}</div></div>`;","<div class=\"bpen\">${pens}${f3Chip(h,i)}</div></div>`;")
rep("<div class=\"bclock\" data-clock>${R.phase==='countdown'?'0.00':fmt(R.phase==='running'?0:last)}</div>${bestLine()}</div>",
    "<div class=\"bclock\" data-clock>${R.phase==='countdown'?'0.00':fmt(R.phase==='running'?0:last)}</div>${f3Now()?f3Strip():bestLine()}</div>")
boards=r"""
/* F3 전광판: 라운드 소개 · 라운드 점수표 */
function f3Icon(n){const a='fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  if(n===1)return`<svg viewBox="0 0 120 80" ${a}><circle cx="44" cy="14" r="7"/><path d="M42 22l-6 22 14 10-4 18M36 44l-14 8M40 30l16 6 8-8M30 30l10-8"/><path d="M78 72V46h30v26M78 54h30" opacity=".7"/><path d="M8 72h108" opacity=".5"/></svg>`;
  if(n===2)return`<svg viewBox="0 0 120 80" ${a}><circle cx="34" cy="16" r="7"/><path d="M36 24l4 22-8 26M38 34l-14 6M40 46l38-12M62 26l8-4"/><path d="M84 22a26 26 0 0 1 0 28M94 16a36 36 0 0 1 0 40M104 10a46 46 0 0 1 0 52" opacity=".6"/></svg>`;
  return`<svg viewBox="0 0 120 80" ${a}><path d="M18 30h38l4 10-4 10H18zM102 30H64l-4 10 4 10h38z"/><path d="M60 8v14M48 12l6 12M72 12l-6 12" opacity=".7"/><path d="M30 64l6-8M90 64l-6-8M60 70v-10" opacity=".5"/></svg>`}
function f3Strip(){const f=f3Of(curHeat());if(!f)return'';const n=f.st;return`<div class="f3strip"><b>${esc(inLang('en',()=>t('f3RoundN',{n})).toUpperCase())} / 3</b><span>${stt(()=>t(F3EV[n-1]))}</span></div>`}
function f3Chip(h,i){const f=h.f3;if(!f||f.done||f.st<2||h.lanes[i]==null)return'';const x=f3Scores(f).tot[i];return`<span class="f3chip">Σ ${x==null?'—':x.toFixed(1)}</span>`}
function boardF3Intro(h){const f=f3Of(h),n=f.st,rk=f3Rank(h);
  const ev=bil(()=>t(F3EV[n-1])),ds=bil(()=>t(F3EV[n-1]+'D',{s:+S.cfg.f3Sec||20}));
  return`<div class="f3wrap f3in"><div class="f3kick">${stt(()=>t('final'))}</div>
   <div class="f3steps">${[1,2,3].map(k=>`<span class="${k<n?'d':k===n?'c':''}"><i>${k}</i>${esc(inLang('en',()=>t(F3EV[k-1])).toUpperCase())}</span>`).join('<em></em>')}</div>
   <div class="f3main"><div class="f3ic">${f3Icon(n)}</div><div class="f3tt"><small>${esc(inLang('en',()=>t('f3RoundN',{n})).toUpperCase())}</small><b>${esc(ev.a.toUpperCase())}</b>${ev.b?`<em>${esc(ev.b)}</em>`:''}<p>${esc(ds.b||ds.a)}</p></div></div>
   ${n>1?`<div class="f3lead">${stt(()=>n===3?t('f3Lead'):t('f3ResN',{n:1}))}</div>`:''}
   <div class="f3cards">${rk.map((x,k)=>{const p=P(h.lanes[x.i])||{};return`<div class="f3c ${n>1&&k===0?'top':''}" style="--c:var(${HEROES[x.i].v});--d:${k*140}ms">${n>1?`<span class="f3pos">${k+1}</span>`:''}<div class="f3fig">${heroFig(x.i,'',n>1&&k===0?'p1':'ready',undefined,lvLane(h,x.i))}</div><b>${esc(pn(p))}</b><small>${esc(p.team||'')}</small>${n>1?`<span class="f3pt">${x.tot==null?'—':x.tot.toFixed(1)}<i>${esc(t('ptsU'))}</i></span>`:`<span class="f3ln">${esc(heroEn(x.i))}</span>`}</div>`}).join('')}</div></div>`}
function boardF3Res(h){const f=f3Of(h),dn=f.done?3:f.st-1,rk=f3Rank(h);
  return`<div class="f3wrap f3rs"><div class="f3kick">${stt(()=>t('final'))}</div><div class="f3title">${stt(()=>dn>=2&&!f.done?t('f3Lead'):t('f3ResN',{n:Math.max(1,dn)}))}</div>
   <div class="f3tbl"><div class="f3row f3hd"><span></span><span></span>${[1,2,3].map(k=>`<span class="${k===dn?'cur':''}">R${k}<small>${esc(t(F3EV[k-1]))}</small></span>`).join('')}<span class="f3t">${stt(()=>t('f3Tot'))}</span></div>
   ${rk.map((x,k)=>`<div class="f3row ${k===0?'lead':''}" style="--c:var(${HEROES[x.i].v});--w:${((x.tot||0)/3).toFixed(1)}%;--d:${k*150}ms"><span class="f3pos">${k+1}</span><span class="f3nm">${emSvg(x.i,30)}<b>${esc(pn(P(h.lanes[x.i])||{}))}</b></span>${[0,1,2].map(r=>`<span class="f3v ${r===dn-1?'cur':''}">${x.sc[r]==null?'<i>—</i>':`<b>${x.sc[r].toFixed(1)}</b><small>${esc(f3U(r,x.raw[r]))}</small>`}</span>`).join('')}<span class="f3t"><b>${x.tot==null?'—':x.tot.toFixed(1)}</b><i class="f3bar"></i></span></div>`).join('')}</div></div>`}
"""
rep("function boardChamp(){",boards.strip()+"\nfunction boardChamp(){")
# 글자
ko="f3:'결승 3라운드 (달리기 · 스피드 발차기 · 격파)',f3D:'결승을 세 라운드로 치릅니다. 라운드마다 1등이 100점, 나머지는 기록에 비례한 점수를 받고, 세 라운드를 더한 점수(300점 만점)로 우승을 정합니다. 2라운드는 발차기 센서로 셀 수 있습니다.',f3No:'달리기 경기에서 결승이 있는 방식(토너먼트·컷오프 후 토너먼트·생활체육)일 때 쓸 수 있습니다.',f3Sec:'2라운드 발차기 시간(초)',f3R1:'장애물 달리기',f3R1D:'통과 · 점프 · 돌아오기 — 빠를수록 높은 점수',f3R2:'스피드 발차기',f3R2D:'{s}초 동안 연속 발차기 — 많이 찰수록 높은 점수',f3R3:'격파',f3R3D:'깨뜨린 송판 수 — 많을수록 높은 점수',f3RoundN:'{n}라운드',f3ResN:'{n}라운드 결과',f3Lead:'마지막 라운드 전 순위',f3Tot:'합계',f3Next:'{n}라운드 확정 → 다음 라운드',f3Fin:'3라운드 확정 · 우승 발표',f3End:'격파 기록 마감',brkBtn:'격파 +1',boards:'장',ptsU:'점',sF3Res:'라운드 점수',flow_f3next:'{s}초 뒤 다음 라운드 소개',f3Ban:'결승 3라운드',"
en="f3:'3-round final (run · speed kicks · board break)',f3D:'The final is played over three rounds. In each round the winner gets 100 points and the others get points in proportion to their record. The best total (out of 300) wins. Round 2 can be counted with the kick sensors.',f3No:'Available for race finals (tournament, cut-off + tournament, community groups).',f3Sec:'Round 2 kick time (sec)',f3R1:'Obstacle Run',f3R1D:'Crawl · jump · come back — faster scores more',f3R2:'Speed Kicks',f3R2D:'Kick as many as you can in {s} sec',f3R3:'Board Break',f3R3D:'Boards broken — more scores more',f3RoundN:'Round {n}',f3ResN:'Round {n} result',f3Lead:'Standings before the last round',f3Tot:'Total',f3Next:'Confirm round {n} → next round',f3Fin:'Confirm round 3 · crown the champion',f3End:'Close break scores',brkBtn:'Break +1',boards:'boards',ptsU:'pts',sF3Res:'Round scores',flow_f3next:'Next round intro in {s}s',f3Ban:'3-round final',"
rep("final:'결승',semi:'준결승',","final:'결승',semi:'준결승',"+ko)
rep("final:'Final',semi:'Semifinal',","final:'Final',semi:'Semifinal',"+en)
open(f,'w').write(s);print('ok')
