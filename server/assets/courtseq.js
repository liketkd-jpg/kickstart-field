/* v1.4.54 코트 순서 계산 (현장 첫 화면 · 운영석 종목 자동 전환 공통)
   부문 이름 앞 번호(01, 02 …) = 본부 운영표의 이 코트 순서. 같은 종목이 이어지는 부문끼리 한 덩어리(블록)로 묶음 */
window.KS_SEQ=(function(){
  const EVN={recognized:'공인 품새',freestyle:'자유 품새',gym:'태권체조',team100:'팀 대항 종합경연',gyeokpa:'격파',kyorugi:'겨루기'};
  function evOf(app,name){if(app==='gyeokpa')return 'gyeokpa';if(app==='kyorugi')return 'kyorugi';const n=String(name||'');
    if(/자유/.test(n))return 'freestyle';if(/체조/.test(n))return 'gym';if(/경연|종합|시범/.test(n))return 'team100';return 'recognized';}
  const active=a=>!!(a&&a.now&&a.fresh&&!/점수 공개|경기 끝/.test(a.now.status||''));
  function seq(plan){const all=[];((plan&&plan.apps)||[]).forEach((a,ai)=>(a.divs||[]).forEach((d,i)=>{const m=/^(\d{1,3})\s/.exec(d.name||'');
      all.push({app:a.app,name:d.name,done:d.done||0,total:d.total||0,num:m?+m[1]:1000+ai*500+i,ev:evOf(a.app,d.name),fin:(d.total||0)>0&&(d.done||0)>=(d.total||0),pending:!!a.pending});}));
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
