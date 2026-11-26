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
  function textFit(){if(tfBusy)return;const b=document.body;if(!b||!b.classList.contains('jdg'))return;
    const W=innerWidth,H=innerHeight;const tab=Math.min(W,H)>=600;
    if(!tab){if(b.classList.contains('ksTF')){b.classList.remove('ksTF');document.querySelectorAll('[data-kstf]').forEach(e=>{e.style.fontSize='';e.removeAttribute('data-kstf');});}return;}
    tfBusy=true;b.classList.add('ksTF');
    try{const main=document.querySelector('main')||b;
      main.querySelectorAll('.jsheet.two .jo').forEach(g=>{const on=g.children.length>6;if(g.classList.contains('ksTwo')!==on)g.classList.toggle('ksTwo',on);});
      main.querySelectorAll('button').forEach(el=>{const t=(el.innerText||'').trim();if(!t||t.length>7||!NUMRE.test(t.replace(/\s+/g,'')))return;
        const r=el.getBoundingClientRect();if(r.height<30||r.width<30)return;
        const n=t.replace(/\s+/g,'').length;const zz=jz||1;let fs=Math.min(r.height*0.5,(r.width-10)/(n*0.62),64*zz)/zz;fs=Math.max(fs,16);
        const cur=parseFloat(el.style.fontSize)||0;if(Math.abs(cur-fs)>1){el.style.fontSize=fs.toFixed(0)+'px';el.style.lineHeight='1';}el.dataset.kstf='1';});
      const walk=main.querySelectorAll('b,span,small,div,label,h3,h4,p,em,strong');
      walk.forEach(el=>{if(el.dataset.kstf||el.closest('button')||(el.parentElement&&el.parentElement.closest('[data-kstf="t"]')))return;if(el.children.length>2)return;const t=(el.textContent||'').trim();if(!t||t.length>48)return;
        const fs0=parseFloat(getComputedStyle(el).fontSize);if(!(fs0>0)||fs0>=20)return;
        el.dataset.kstf='t';el.style.fontSize=Math.min(26,fs0*1.4).toFixed(1)+'px';});
    }catch(e){}
    tfBusy=false;}
  /* 태블릿 채점판 공통 모양: 청·홍 점수 단추는 두 줄(6+4), 항목 이름 크게 */
  (function(){try{const st=document.createElement('style');st.id='ksTFcss';st.textContent=
   'body.ksTF .jsheet.two .jo.ksTwo{grid-template-columns:repeat(var(--c),minmax(0,1fr))!important;grid-auto-rows:minmax(0,1fr)}'+
   'body.ksTF .jsheet.two .jrl span{font-size:clamp(14px,2.3vh,19px)!important;font-weight:800;white-space:normal;word-break:keep-all;line-height:1.15}'+
   'body.ksTF .jsheet.two .jrl b{font-size:clamp(14px,2.3vh,19px)!important}'+
   'body.ksTF .gjrl{font-size:17px!important}body.ksTF .gjrl b{font-size:22px!important}'+
   'body.ksTF .jct b{font-size:21px!important}';
   (document.head||document.documentElement).appendChild(st);}catch(e){}})();
  function tfQueue(){if(tfBusy)return;textFit();}
  const tfStart=()=>{textFit();try{new MutationObserver(()=>tfQueue()).observe(document.body,{childList:true,subtree:true,characterData:true});}catch(e){}addEventListener('resize',()=>{clearTimeout(tfT);tfT=setTimeout(()=>{document.querySelectorAll('[data-kstf]').forEach(e=>{e.style.fontSize='';e.removeAttribute('data-kstf');});textFit();},200);});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tfStart);else tfStart();
})();
