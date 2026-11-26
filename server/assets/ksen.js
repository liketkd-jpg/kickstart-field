/* v1.7.90 한/영 걱정 없애기
   노트북이 「한글」 입력 상태여도 영문·숫자를 넣어야 하는 칸(허가 코드, 주소, 이메일 등)은
   한글 자판으로 들어온 글자를 같은 자리의 영문 글자로 바꿔 읽습니다.
   (두벌식: ㄱ=r, ㅏ=k … / 바코드·QR 스캐너처럼 키를 아주 빠르게 보내는 기계는 어느 칸이든 실제 누른 키로 다시 맞춤) */
(function(){
  if(window.__ksen)return;window.__ksen=1;
  /* v1.7.94 오래된 태블릿 브라우저: 화면 높이 단위 dvh·svh·lvh를 모르면 그 줄을 통째로 버려 화면이 위쪽에만 작게 나옴
     → 그런 브라우저에서만 <style> 안의 dvh를 vh로 바꿔 다시 읽게 함 (?nodvh=1 로 시험) */
  const NODVH=/[?&]nodvh=1/.test(location.search)||!(window.CSS&&CSS.supports&&CSS.supports('height','100dvh'));
  function dvhFallback(root){if(!NODVH)return;let ch=0;try{(root||document).querySelectorAll('style').forEach(st=>{if(st.__ksdvh)return;const t=st.textContent;if(/[\d.]\s*[dsl]vh\b/.test(t)){st.textContent=t.replace(/([\d.])\s*[dsl]vh\b/g,'$1vh');ch=1;}st.__ksdvh=1;});
    document.querySelectorAll('[style*="dvh"],[style*="svh"],[style*="lvh"]').forEach(e=>{e.setAttribute('style',e.getAttribute('style').replace(/([\d.])\s*[dsl]vh\b/g,'$1vh'));});}catch(e){}
    if(ch&&window.__ksVhRefresh)try{window.__ksVhRefresh();}catch(e){}}
  window.ksDvhFallback=dvhFallback;
  if(NODVH){dvhFallback();document.addEventListener('DOMContentLoaded',()=>{dvhFallback();try{new MutationObserver(()=>dvhFallback()).observe(document.head,{childList:true});}catch(e){}});
    let dt=0;try{new MutationObserver(()=>{clearTimeout(dt);dt=setTimeout(()=>{try{document.querySelectorAll('[style*="dvh"]').forEach(e=>{e.setAttribute('style',e.getAttribute('style').replace(/([\d.])\s*[dsl]vh\b/g,'$1vh'));});}catch(e){}},60);}).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}}
  const J={'ㄱ':'r','ㄲ':'R','ㄴ':'s','ㄷ':'e','ㄸ':'E','ㄹ':'f','ㅁ':'a','ㅂ':'q','ㅃ':'Q','ㅅ':'t','ㅆ':'T','ㅇ':'d','ㅈ':'w','ㅉ':'W','ㅊ':'c','ㅋ':'z','ㅌ':'x','ㅍ':'v','ㅎ':'g',
    'ㅏ':'k','ㅐ':'o','ㅑ':'i','ㅒ':'O','ㅓ':'j','ㅔ':'p','ㅕ':'u','ㅖ':'P','ㅗ':'h','ㅘ':'hk','ㅙ':'ho','ㅚ':'hl','ㅛ':'y','ㅜ':'n','ㅝ':'nj','ㅞ':'np','ㅟ':'nl','ㅠ':'b','ㅡ':'m','ㅢ':'ml','ㅣ':'l',
    'ㄳ':'rt','ㄵ':'sw','ㄶ':'sg','ㄺ':'fr','ㄻ':'fa','ㄼ':'fq','ㄽ':'ft','ㄾ':'fx','ㄿ':'fv','ㅀ':'fg','ㅄ':'qt'};
  const L='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ',V='ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ',T=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const HAN=/[ㄱ-ㆎ가-힣]/;
  function toEn(s){let o='';for(const ch of String(s)){const c=ch.charCodeAt(0);
      if(c>=0xAC00&&c<=0xD7A3){const i=c-0xAC00;o+=J[L[Math.floor(i/588)]]+J[V[Math.floor(i%588/28)]]+(i%28?J[T[i%28]]:'');}
      else o+=J[ch]!=null?J[ch]:ch;}
    return o;}
  window.ksToEn=toEn;
  /* 영문만 들어가야 하는 칸인지 */
  function enField(el){if(!el||el.tagName!=='INPUT')return false;const ty=(el.type||'text').toLowerCase();
    if(/^(url|email)$/.test(ty))return true;if(ty!=='text'&&ty!=='search'&&ty!=='')return false;
    if(el.dataset&&el.dataset.en!=null)return true;
    const k=(el.id||'')+' '+(el.name||'');if(/code|Code|lic|addr|Addr|ip\b|Ip\b|url|Url|email|Email|host/.test(k))return true;
    const ph=el.getAttribute('placeholder')||'';return /[A-Za-z0-9]/.test(ph)&&!HAN.test(ph)&&/^[\x20-\x7E·…]+$/.test(ph);}
  function fix(el){if(!el||!HAN.test(el.value||''))return;let v=toEn(el.value);if(el.id==='kslCode'||/^KS-/i.test(v))v=v.toUpperCase();
    const at=el.selectionStart===el.value.length;el.value=v;try{if(at)el.setSelectionRange(v.length,v.length);}catch(e){}
    try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}}
  let busy=false;
  addEventListener('compositionend',e=>{const el=e.target;if(enField(el))setTimeout(()=>{if(busy)return;busy=true;fix(el);busy=false;},0);},true);
  addEventListener('input',e=>{const el=e.target;if(busy||e.isComposing||!enField(el))return;busy=true;fix(el);busy=false;},true);
  addEventListener('blur',e=>{if(enField(e.target))fix(e.target);},true);
  addEventListener('submit',e=>{const f=e.target;if(!f||!f.querySelectorAll)return;f.querySelectorAll('input').forEach(i=>{if(enField(i)){if(i.id==='kslCode'&&i.value)i.value=toEn(i.value).toUpperCase();else fix(i);}});},true);
  /* 바코드·QR 스캐너: 키가 아주 빠르게(한 글자 40ms 안쪽) 6개 넘게 들어오고 Enter로 끝나면, 실제 누른 키(code)로 글자를 다시 맞춤 */
  const CODE=(c,sh)=>{let m;if((m=/^Key([A-Z])$/.exec(c)))return sh?m[1]:m[1].toLowerCase();if((m=/^(?:Digit|Numpad)([0-9])$/.exec(c)))return sh&&/^Digit/.test(c)?')!@#$%^&*('[m[1]]:m[1];
    const P={Minus:['-','_'],Equal:['=','+'],Slash:['/','?'],Period:['.','>'],Comma:[',','<'],Semicolon:[';',':'],Quote:["'",'"'],BracketLeft:['[','{'],BracketRight:[']','}'],Backslash:['\\','|'],Backquote:['`','~'],Space:[' ',' '],NumpadSubtract:['-','-'],NumpadDecimal:['.','.'],NumpadAdd:['+','+'],NumpadDivide:['/','/'],NumpadMultiply:['*','*']};
    return P[c]?P[c][sh?1:0]:null;};
  let buf=[],last=0,startVal=null,tgt=null;
  addEventListener('keydown',e=>{const now=performance.now(),el=e.target;
    if(!el||!/^(INPUT|TEXTAREA)$/.test(el.tagName)){buf=[];return;}
    if(now-last>60||el!==tgt){buf=[];startVal=el.value;tgt=el;}
    last=now;
    if(e.key==='Enter'||e.code==='Enter'||e.code==='NumpadEnter'){
      if(buf.length>=6&&HAN.test(el.value||'')){const s=buf.join('');el.value=(startVal||'')+s;try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(x){}}
      buf=[];return;}
    const ch=CODE(e.code||'',e.shiftKey);if(ch!=null)buf.push(ch);},true);
  /* v1.7.92 「🆘 도움말」 떠 있는 단추 — 본부·운영석에만 (심판·전광판·관중 화면에는 안 보임) */
  function helpBtn(){try{
    const P=location.pathname,Hh=location.hash||'';
    const show=(/^\/hq\/?/.test(P)||/^#admin/.test(Hh))&&!/^\/(judge|view|help|staff|emergency)/.test(P);
    let b=document.getElementById('ksHelpBtn');
    if(!show){if(b)b.remove();return;}
    if(b)return;
    b=document.createElement('a');b.id='ksHelpBtn';b.href='/help';b.target='ks_help';b.title='돌발 상황 도움말 — 무슨 일이 생겼는지 찾아보기';
    b.textContent='🆘 도움말';
    b.style.cssText='position:fixed;right:170px;bottom:12px;z-index:99995;background:#7A1E1E;color:#fff;border:2px solid #FFB4A8;border-radius:999px;padding:8px 14px;font:800 15px "Noto Sans KR",sans-serif;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.45)';
    document.body.appendChild(b);}catch(e){}}
  addEventListener('hashchange',helpBtn);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',helpBtn);else helpBtn();
  /* v1.7.93 심판 채점판 — 태블릿에서는 모든 채점판을 같은 비율로 화면 가득
     1280×800(가로)·800×1280(세로) 기준으로 짠 화면을 태블릿 크기만큼 키움. 휴대폰(짧은 쪽 600 미만)은 그대로 */
  let jz=0;
  /* 확대(zoom)하면 화면 높이(vh) 기준 크기도 같이 커져 넘치므로, 채점판 화면에서만 vh 값을 확대 배율로 나눠 맞춤 */
  const VH0=new WeakMap();
  function vhFix(z){try{
    const walk=rules=>{for(const r of rules){
      if(r.cssRules&&!r.style){walk(r.cssRules);continue;}
      if(!r.style)continue;
      let orig=VH0.get(r);
      if(!orig){orig=null;for(let i=0;i<r.style.length;i++){const k=r.style[i],v=r.style.getPropertyValue(k);if(/[\d.]\s*[dsl]?vh\b/.test(v)){orig=orig||{};orig[k]=[v,r.style.getPropertyPriority(k)];}}VH0.set(r,orig||0);}
      if(!orig)continue;
      for(const k in orig){const [v,pr]=orig[k];r.style.setProperty(k,z===1?v:v.replace(/(-?[\d.]+)([dsl]?vh)\b/g,(m,n,u)=>`calc(${n}${u} / ${z})`),pr);}
    }};
    for(const sh of document.styleSheets){try{walk(sh.cssRules);}catch(e){}}
  }catch(e){}}
  window.__ksVhRefresh=()=>{if(jz&&jz!==1)vhFix(jz);};
  function judgeZoom(){try{
    const b=document.body;if(!b)return;
    const on=b.classList.contains('jdg');
    const W=innerWidth,Hh=innerHeight;/* 확대해도 innerWidth는 실제 화면 크기 그대로 */
    let z=1;
    if(on&&Math.min(W,Hh)>=600){const land=W>=Hh;const bw=land?1280:800,bh=land?800:1280;z=Math.min(W/bw,Hh/bh);if(z<1.04)z=1;z=Math.min(z,2.4);}
    z=Math.round(z*100)/100;
    if(z!==(jz||1)){jz=z;document.documentElement.style.zoom=z===1?'':String(z);vhFix(z);}
  }catch(e){}}
  addEventListener('resize',()=>{clearTimeout(judgeZoom.t);judgeZoom.t=setTimeout(judgeZoom,150);});
  try{new MutationObserver(()=>{if(jz&&jz!==1)vhFix(jz);}).observe(document.documentElement,{childList:true,subtree:false});document.addEventListener('DOMContentLoaded',()=>{try{new MutationObserver(()=>{if(jz&&jz!==1)vhFix(jz);}).observe(document.head,{childList:true});}catch(x){}});}catch(e){}
  new MutationObserver(()=>judgeZoom()).observe(document.documentElement,{attributes:true,subtree:false,attributeFilter:['class']});
  const jzStart=()=>{judgeZoom();try{new MutationObserver(judgeZoom).observe(document.body,{attributes:true,attributeFilter:['class']});}catch(e){}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',jzStart);else jzStart();
  /* v1.7.95 심판 채점판 글씨 키우기 (태블릿) — 단추가 커져도 글씨가 작던 문제
     ① 점수 단추: 숫자가 단추 높이의 절반 가까이 되게 맞춤  ② 항목 이름·라벨 등 작은 글씨: 1.4배 (최대 26px) */
  const NUMRE=/^[−\-+]?\d+(\.\d+)?(점대)?$|^[−\-]\d|^↺$/;
  let tfBusy=false,tfT=0;
  /* v1.8.0 떨림 방지: 한 화면에서 한 번 맞춘 글씨 크기는 기억해 두고 그대로 씀 (다시 재지 않음)
     — 다시 그려도(점수 누름·시계) 크기가 바뀌지 않아 화면이 떨리지 않습니다. 화면 크기·전체 화면이 바뀔 때만 새로 맞춤 */
  const TFC=new Map(),TFP=new Set();let tfSig='';
  const clsOf=el=>String(el.className||'').split(/\s+/).filter(c=>c&&!/^(on|ok|nv|miss|sel|act|active|done|warn|live|armed|primary)$/.test(c)).sort().join('.');
  function ordOf(el){const p=el.parentElement;if(!p)return 0;let i=0;for(const c of p.children){if(c===el)return i;if(c.tagName===el.tagName&&clsOf(c)===clsOf(el))i++;}return i;}
  function keyOf(el,depth){let k='',e=el;for(let d=0;d<depth&&e&&e.tagName!=='MAIN';d++){k=e.tagName+'.'+clsOf(e)+':'+ordOf(e)+'>'+k;e=e.parentElement;}return k;}
  /* v1.8.1 자동 맞춤 끔: 글자 크기는 각 채점판의 고정 크기(CSS)로만 — 기기마다 커졌다 작아졌다 하던 문제. 다시 켜려면 주소에 ?fit=1 */
  const FITON=/[?&]fit=1/.test(location.search);
  function textFit(){if(!FITON){const b0=document.body;if(b0&&b0.classList.contains('jdg')&&Math.min(innerWidth,innerHeight)>=600&&!b0.classList.contains('ksTF'))b0.classList.add('ksTF');return;}if(tfBusy)return;const b=document.body;if(!b||!b.classList.contains('jdg'))return;
    const W=innerWidth,H=innerHeight;const tab=Math.min(W,H)>=600;
    if(!tab){if(b.classList.contains('ksTF')){b.classList.remove('ksTF');document.querySelectorAll('[data-kstf]').forEach(e=>{e.style.fontSize='';e.removeAttribute('data-kstf');});}return;}
    tfBusy=true;if(!b.classList.contains('ksTF'))b.classList.add('ksTF');
    try{const main=document.querySelector('main')||b;
      const sheet=main.querySelector('.gjsheet,.jsheet,[class*="jv-"]');
      const sig=W+'x'+(Math.round(H/40)*40)+'|'+(document.fullscreenElement?'F':'')+'|'+clsOf(b)+'|'+(sheet?clsOf(sheet):'');
      if(tfSig&&sig.split('|').slice(0,2).join('|')!==tfSig.split('|').slice(0,2).join('|')){TFC.clear();TFP.clear();main.querySelectorAll('[data-kstf]').forEach(e=>{e.style.fontSize='';e.removeAttribute('data-kstf');});}tfSig=sig;
      const fresh=[];
      main.querySelectorAll('.jsheet.two .jo').forEach(g=>{const on=g.children.length>6;if(g.classList.contains('ksTwo')!==on)g.classList.toggle('ksTwo',on);});
      const setFS=(el,v,lh,mark)=>{if(!el.dataset.kstf0&&!el.style.fontSize)el.dataset.kstf0=parseFloat(getComputedStyle(el).fontSize)||14;const t=v?v.toFixed(1)+'px':'';if(el.style.fontSize!==t)el.style.fontSize=t;if(lh&&el.style.lineHeight!==lh)el.style.lineHeight=lh;el.dataset.kstf=mark;};
      /* ① 점수 단추 — 같은 줄(부모)은 같은 크기 */
      const groups=new Map();
      main.querySelectorAll('button').forEach(el=>{const t=(el.innerText||el.textContent||'').trim();if(!t||t.length>7||!NUMRE.test(t.replace(/\s+/g,'')))return;const pa=el.parentElement;if(!groups.has(pa))groups.set(pa,[]);groups.get(pa).push(el);});
      groups.forEach((els,pa)=>{const k='N|'+sig+'|'+keyOf(pa,4)+'#'+pa.children.length;
        if(TFC.has(k)){const v=TFC.get(k);els.forEach(el=>v?setFS(el,v,'1','1'):0);return;}
        let mn=999,ok=false;els.forEach(el=>{const bh=el.offsetHeight,bw=el.offsetWidth;if(bh<30||bw<30)return;ok=true;
          const c=(el.innerText||el.textContent||'').trim().replace(/\s+/g,''),n=Math.max(1,c.length-(c.split('.').length-1)*0.55);mn=Math.min(mn,Math.max(16,Math.min(bh*0.52,(bw-10)/(n*0.62),110)));});
        if(!ok)return;TFC.set(k,mn);fresh.push(k);els.forEach(el=>setFS(el,mn,'1','1'));});
      /* ② 글자 단추 */
      main.querySelectorAll('button').forEach(el=>{if(el.dataset.kstf==='1')return;const t=(el.innerText||el.textContent||'').trim();if(!t||t.length<=7&&NUMRE.test(t.replace(/\s+/g,'')))return;
        const k='B|'+sig+'|'+keyOf(el,4)+'|'+t.length;
        if(TFC.has(k)){const v=TFC.get(k);if(v)setFS(el,v,'','b');return;}
        const bh=el.offsetHeight;if(bh<36)return;if(!el.dataset.kstf0)el.dataset.kstf0=parseFloat(getComputedStyle(el).fontSize)||14;const f0=+el.dataset.kstf0;
        const want=Math.min(bh*0.34,30);const v=want>f0+0.5?want:0;TFC.set(k,v);fresh.push(k);if(v)setFS(el,v,'','b');});
      /* ③ 항목 이름·라벨: 점수 단추 높이(refH)를 기준으로 짧은 말 30% · 보통 24% · 긴 줄 18% */
      const rk='R|'+sig;let refH=TFC.get(rk);
      if(refH==null){const hs=[...main.querySelectorAll('button[data-kstf="1"]')].map(e=>e.offsetHeight).filter(h=>h>20).sort((a,b)=>a-b);
        refH=hs.length?hs[Math.floor(hs.length/2)]:Math.min(innerWidth,innerHeight)/9;if(hs.length){TFC.set(rk,refH);fresh.push(rk);}}
      main.querySelectorAll('b,span,small,div,label,h3,h4,p,em,strong,i').forEach(el=>{if(el.closest('button')||el.closest('[data-timer]')||(el.parentElement&&el.parentElement.closest('[data-kstf="t"]')))return;
        let own='';for(const n of el.childNodes)if(n.nodeType===3)own+=n.textContent;own=own.trim();if(!own)return;
        const t=(el.textContent||'').trim();if(t.length>60)return;const L=t.length;
        const k='T|'+sig+'|'+keyOf(el,3)+'|'+L;
        if(TFC.has(k)){const v=TFC.get(k);if(v){setFS(el,v,'1.15','t');if(L<=16){el.style.whiteSpace='nowrap';el.style.wordBreak='keep-all';}}return;}
        if(!el.dataset.kstf0)el.dataset.kstf0=parseFloat(getComputedStyle(el).fontSize)||14;const fs0=+el.dataset.kstf0;
        const isName=el.matches('.jsh .nm, .nm, .jname b, .jwho b, .gjtop b, .jname, .jwho .nm')&&L<=12;
        let want=isName?Math.min(refH*0.5,44):refH*(L<=8?0.30:L<=16?0.24:0.18);if(!isName)want=Math.min(want,L<=8?36:L<=16?30:24);
        if(want<=fs0+0.5){TFC.set(k,0);if(el.dataset.kstf==='t')el.style.fontSize='';return;}
        el.style.fontSize=want.toFixed(1)+'px';el.style.lineHeight='1.15';if(L<=16){el.style.whiteSpace='nowrap';el.style.wordBreak='keep-all';}
        const par=el.parentElement;if(par){const ps=getComputedStyle(par);const avail=par.clientWidth-parseFloat(ps.paddingLeft)-parseFloat(ps.paddingRight);
          const need=el.scrollWidth;if(avail>0&&need>avail+1)want=Math.max(fs0,want*(avail/need)*0.96);}
        TFC.set(k,want);fresh.push(k);setFS(el,want,'1.15','t');});
      /* 처음 맞춘 화면은 0.4초 뒤 딱 한 번만 다시 재서 확정 (그 뒤로는 고정) */
      const prov=fresh.filter(k=>!TFP.has(k));if(prov.length){prov.forEach(k=>TFP.add(k));clearTimeout(textFit.st);textFit.st=setTimeout(()=>{prov.forEach(k=>TFC.delete(k));textFit();},400);}
    }catch(e){}
    tfBusy=false;}
  /* 태블릿 채점판 공통 모양: 청·홍 점수 단추는 두 줄(6+4), 항목 이름 크게 */
  (function(){try{const st=document.createElement('style');st.id='ksTFcss';st.textContent=
   'body.ksTF .jsheet.two .jo.ksTwo{grid-template-columns:repeat(var(--c),minmax(0,1fr))!important;grid-auto-rows:minmax(0,1fr)}'+
   'body.ksTF .jsheet.two .jrl span{font-weight:800;white-space:normal;word-break:keep-all}'+
   'body.ksTF .gjr>.gjrl{flex:0 0 auto;min-width:clamp(96px,13%,180px)}'+
   /* v1.8.1 고정 글씨 크기 (자동 맞춤 대신): 화면 높이·너비 기준이라 다시 그려도 변하지 않음 */
   'body.ksTF .gjo .opt:not(.pen){font-size:clamp(20px,min(4.4vh,2.6vw),40px);line-height:1}'+
   'body.ksTF .gjrl span{font-size:clamp(17px,2.8vh,26px);font-weight:800}body.ksTF .gjrl b{font-size:clamp(18px,3.2vh,30px)}'+
   'body.ksTF .jsheet .jo .opt:not(.ded){font-size:clamp(20px,min(4vh,2.3vw),36px);line-height:1}'+
   'body.ksTF .jsheet .jl span,body.ksTF .jsheet .jrl span{font-size:clamp(15px,2.4vh,22px);font-weight:800}'+
   'body.ksTF .jsheet.two .jr{grid-template-columns:minmax(84px,17%) minmax(0,1fr)!important}';
   (document.head||document.documentElement).appendChild(st);}catch(e){}})();
  const tfQueue=()=>{if(!tfBusy)textFit();};
  const tfStart=()=>{textFit();setTimeout(textFit,600);
    try{let lastCls=document.body.className;new MutationObserver(()=>{const c=document.body.className;if(c!==lastCls){lastCls=c;tfQueue();}}).observe(document.body,{attributes:true,attributeFilter:['class']});}catch(e){}
    document.addEventListener('fullscreenchange',()=>setTimeout(tfQueue,250));document.addEventListener('webkitfullscreenchange',()=>setTimeout(tfQueue,250));
    /* 화면을 새로 그리면 그리기 전에 바로 기억한 크기를 입힘 (깜빡임 없음). 시계 숫자 바뀜은 무시 */
    try{new MutationObserver(ms=>{for(const m of ms){if(m.type==='childList'&&!(m.target.closest&&m.target.closest('[data-timer]'))){tfQueue();return;}}}).observe(document.body,{childList:true,subtree:true});}catch(e){}
    let lw=innerWidth,lh=innerHeight;addEventListener('resize',()=>{clearTimeout(tfT);tfT=setTimeout(()=>{if(Math.abs(innerWidth-lw)<2&&Math.abs(innerHeight-lh)<60)return;lw=innerWidth;lh=innerHeight;textFit();},300);});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tfStart);else tfStart();
})();
