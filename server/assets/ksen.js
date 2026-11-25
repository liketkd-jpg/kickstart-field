/* v1.7.90 한/영 걱정 없애기
   노트북이 「한글」 입력 상태여도 영문·숫자를 넣어야 하는 칸(허가 코드, 주소, 이메일 등)은
   한글 자판으로 들어온 글자를 같은 자리의 영문 글자로 바꿔 읽습니다.
   (두벌식: ㄱ=r, ㅏ=k … / 바코드·QR 스캐너처럼 키를 아주 빠르게 보내는 기계는 어느 칸이든 실제 누른 키로 다시 맞춤) */
(function(){
  if(window.__ksen)return;window.__ksen=1;
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
})();
