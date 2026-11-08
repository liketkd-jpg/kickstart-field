/* v1.4.48 심판 채점기 종목 자동 전환
   「코트 심판 링크」(/judge/<번호>)로 들어온 심판 화면만 해당합니다 (sessionStorage ks_jauto).
   이 코트에서 다른 종목(품새·격파·겨루기) 경기가 호출되고, 지금 종목에는 진행 중인 경기가 없으면 그 종목 채점기로 바꿉니다.
   점수를 매기는 도중에는 바꾸지 않습니다. 예전 링크(#judge-번호)로 연 화면은 바뀌지 않습니다(예비). */
(function(){
  let auto=false;try{auto=sessionStorage.getItem('ks_jauto')==='1';}catch(e){}
  if(!auto||!window.KS_FIELD)return;
  const APPK=location.pathname.split('/').filter(Boolean)[0]||'';
  const NAME={poomsae:'품새',gyeokpa:'격파',kyorugi:'겨루기'};
  const jn=()=>{const m=location.hash.replace('#','').match(/^judge-([1-7])$/);return m?m[1]:'';};
  try{localStorage.setItem('ks_jauto_last',APPK);}catch(e){}
  function badge(){if(!jn())return;let b=document.getElementById('ksJauto');if(!b){b=document.createElement('div');b.id='ksJauto';b.setAttribute('data-noi18n','');b.translate=false;
      b.style.cssText='position:fixed;right:10px;top:8px;z-index:99990;background:rgba(201,163,92,.95);color:#1A1306;font:800 13px/1.3 "Malgun Gothic",sans-serif;padding:4px 10px;border-radius:999px;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.35)';
      (document.body||document.documentElement).appendChild(b);}
    b.textContent='🔄 지금 '+(NAME[APPK]||APPK)+' 채점 · 종목 자동 전환';}
  let busy=false,seen='',seenN=0;
  async function tick(){if(busy||!jn())return;busy=true;
    try{const j=await (await fetch('/api/court/active',{cache:'no-store'})).json();const to=j&&j.active;
      const mine=j&&j.apps&&j.apps[APPK];
      /* 두 번 연속 같은 결과일 때만 바꿈 (잠깐 흔들리는 값으로 오가지 않게) */
      if(to&&to!==APPK&&NAME[to]&&!(mine&&mine.now)){if(seen===to)seenN++;else{seen=to;seenN=1;}
        if(seenN>=2){location.replace('/'+to+'/#judge-'+jn());return;}}
      else{seen='';seenN=0;}
    }catch(e){}finally{busy=false;}badge();}
  setInterval(tick,3000);setTimeout(()=>{badge();tick();},1200);
})();
