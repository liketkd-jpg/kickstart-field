/* v1.7.7 운영석 「조 자동 넘어가기」 안내 · 「지금 조 한눈에」 줄 (품새·격파 공통 화면 부품)
   - KSFLOW.show({title,sub,sec,go,stop}): 화면 위에 「다음 경기 ○○부 ○조 · 5초」를 띄우고 시간이 되면 go(), 「멈춤」이면 stop()
   - KSFLOW.strip(o): 운영석 가운데 맨 위 「지금 부문·조 + 선수 순서(지금=밝게 · 끝남=점수와 흐리게)」 HTML */
(function(){
  if(window.KSFLOW)return;
  let box=null,timer=null,key='',left=0,cur=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function hide(){clearInterval(timer);timer=null;if(box){box.remove();box=null;}key='';cur=null;}
  function draw(){if(!box||!cur)return;
    box.innerHTML=`<div class="kf-l">다음 경기 · NEXT</div><div class="kf-t">${esc(cur.title)}</div>${cur.sub?`<div class="kf-s">${esc(cur.sub)}</div>`:''}
      <div class="kf-c"><b>${left}</b><span>초 뒤 첫 선수를 자동 호출합니다</span></div>
      <div class="kf-b"><button type="button" data-kf="stop">⏸ 멈춤</button><button type="button" data-kf="go" class="go">▶ 지금 바로</button></div>`;}
  function fire(){const c=cur;hide();try{c&&c.go&&c.go();}catch(e){console.warn(e);}}
  function show(o){if(o.key&&o.key===key)return;hide();key=o.key||String(Date.now());cur=o;left=Math.max(1,o.sec||5);
    box=document.createElement('div');box.id='ksFlow';box.setAttribute('data-noi18n','');document.body.appendChild(box);draw();
    box.addEventListener('click',e=>{const b=e.target.closest('[data-kf]');if(!b)return;if(b.dataset.kf==='go')fire();else{const c=cur;hide();try{c&&c.stop&&c.stop();}catch(x){}}});
    timer=setInterval(()=>{left--;if(left<=0)fire();else draw();},1000);}
  /* o={title,stage,done,total,items:[{no,names:[{t,side}],team,sc,state:'cur'|'done'|''}],auto,toggleAct} */
  function strip(o){if(!o)return '';
    const it=(o.items||[]).map(x=>`<div class="kfi ${x.state||''}"><span class="kfn">${esc(x.no)}</span><span class="kfm">${(x.names||[]).map(n=>`<b class="${n.side||''}">${esc(n.t)}</b>`).join('<i>vs</i>')}${x.team?`<small>${esc(x.team)}</small>`:''}</span>${x.sc!=null&&x.sc!==''?`<span class="kfs">${esc(x.sc)}</span>`:x.state==='cur'?'<span class="kfs live">진행</span>':''}</div>`).join('');
    return `<div class="panel bp kfstrip"><div class="kfh"><div><span class="kfl">지금 경기</span><b class="kft">${esc(o.title)}</b>${o.stage?`<span class="kfst">${esc(o.stage)}</span>`:''}</div>
      <div class="kfr"><span class="kfp"><b>${o.done}</b> / ${o.total} 끝</span><button class="btn sm ${o.auto?'primary':''}" data-act="${o.toggleAct||'toggleAutoDiv'}" title="한 조가 끝나면 5초 뒤 다음 조 첫 선수를 자동 호출">조 넘어가기 ${o.auto?'자동':'수동'}</button></div></div>
      <div class="kfl2">${it||'<span class="small muted">선수가 없습니다</span>'}</div>${o.next?`<div class="kfnx">다음 → <b>${esc(o.next)}</b></div>`:''}</div>`;}
  const css=`#ksFlow{position:fixed;left:50%;top:14%;transform:translateX(-50%);z-index:99996;min-width:min(560px,92vw);max-width:94vw;background:linear-gradient(160deg,#1E1A12,#0E0C08);color:#F6F1E6;border:3px solid #C9A262;border-radius:22px;padding:22px 26px;box-shadow:0 30px 80px rgba(0,0,0,.65);text-align:center;font-family:"Noto Sans KR","Malgun Gothic",sans-serif;animation:kfIn .35s ease}
@keyframes kfIn{from{opacity:0;transform:translate(-50%,-14px) scale(.96)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
#ksFlow .kf-l{font-size:15px;font-weight:900;letter-spacing:.14em;color:#C9A262}
#ksFlow .kf-t{font-size:clamp(28px,4.2vw,46px);font-weight:900;line-height:1.2;margin:6px 0 2px}
#ksFlow .kf-s{font-size:17px;color:#D9CFBC}
#ksFlow .kf-c{display:flex;align-items:baseline;justify-content:center;gap:10px;margin:14px 0 4px}#ksFlow .kf-c b{font-size:56px;color:#F2D27A;line-height:1}#ksFlow .kf-c span{font-size:16px;color:#CFC6B4}
#ksFlow .kf-b{display:flex;gap:12px;justify-content:center;margin-top:12px}#ksFlow .kf-b button{font:900 18px "Noto Sans KR","Malgun Gothic",sans-serif;padding:13px 22px;border-radius:14px;border:2px solid rgba(201,162,98,.6);background:transparent;color:#F2E2BC;cursor:pointer}
#ksFlow .kf-b button.go{background:linear-gradient(180deg,#EBD5A3,#B8904E);color:#1A1306;border-color:transparent}
.kfstrip{padding:10px 12px!important;gap:8px!important}
.kfstrip .kfh{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.kfstrip .kfl{display:inline-block;font-size:12px;font-weight:900;letter-spacing:.08em;color:var(--green-ink,#1F7A4D);margin-right:8px}
.kfstrip .kft{font-size:24px;font-weight:900;line-height:1.2}.kfstrip .kfst{margin-left:8px;font-size:14px;font-weight:800;padding:2px 9px;border-radius:999px;background:rgba(127,127,127,.18)}
.kfstrip .kfr{display:flex;gap:8px;align-items:center}.kfstrip .kfp{font-size:15px}.kfstrip .kfp b{font-size:20px}
.kfstrip .kfl2{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px;max-height:190px;overflow:auto}
.kfstrip .kfi{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:10px;border:1.5px solid rgba(127,127,127,.28);background:rgba(127,127,127,.10);min-width:0}
.kfstrip .kfi .kfn{flex:none;min-width:22px;height:22px;border-radius:7px;background:rgba(127,127,127,.25);font-weight:900;font-size:13px;display:grid;place-items:center;padding:0 4px}
.kfstrip .kfi .kfm{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.2}.kfstrip .kfi .kfm b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kfstrip .kfi .kfm b.blue{color:#5B8DEF}.kfstrip .kfi .kfm b.red{color:#F06464}
.kfstrip .kfi .kfm i{font-style:normal;font-size:11px;opacity:.6}.kfstrip .kfi .kfm small{font-size:11.5px;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kfstrip .kfi .kfs{flex:none;font-weight:900;font-size:14px}.kfstrip .kfi .kfs.live{color:#fff;background:#E5484D;border-radius:999px;padding:2px 8px;font-size:12px}
.kfstrip .kfi.cur{border-color:#E5484D;background:rgba(229,72,77,.16);box-shadow:0 0 0 3px rgba(229,72,77,.22)}.kfstrip .kfi.cur .kfm b{font-size:16.5px}
.kfstrip .kfi.done{opacity:.45}.kfstrip .kfi.done .kfs{opacity:1}.kfstrip .kfnx{font-size:14px;opacity:.8}`;
  const st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st);
  window.KSFLOW={show,hide,strip,get key(){return key;}};
})();
