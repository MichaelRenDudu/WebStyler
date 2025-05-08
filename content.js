/* ==============================================================
 *  content.js — auto-applies Per-Site Style Profiles
 *  and preserves the original Daltonization features
 * ==============================================================*/

/* ---------- 1. Auto-apply last-used profile ------------------- */
(async () => {
    const domain   = location.hostname;
    const lastName = await ProfileManager.getLastUsedProfile(domain);
    if (!lastName) return;
  
    const profiles = await ProfileManager.getDomainProfiles(domain);
    const p        = profiles[lastName];
    if (!p) return;
  
    injectProfileCSS(p);
    if (p.enableSize) resizeDocumentFonts(p.size);
  })();
  
  function injectProfileCSS(p) {
    const STYLE_ID = 'ws-style-profile';
    document.getElementById(STYLE_ID)?.remove();
  
    let rules = '*{';
    if (p.enableFont)  rules += `font-family:${p.font} !important;`;
    if (p.enableColor) rules += `color:${p.color} !important;`;
    rules += '}';
  
    if (p.enableBgColor) {
      rules += `body{background-color:${p.bgColor} !important;}`;
    }
  
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = rules;
    document.head.appendChild(st);
  }
  
  function resizeDocumentFonts(sizeValue) {
    function walk(el) {
      el.style.fontSize = '';
      Array.from(el.children).forEach(walk);
      const fs = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = (fs * (sizeValue / 50.0)) + 'px';
    }
    walk(document.body);
  }
  
  /* ==============================================================
   * 2. Original color-blind (Daltonization) logic — unchanged
   * ==============================================================*/
  
  chrome.runtime.onMessage.addListener((req) => {
    if (req.mode)    applyColorblindMode(req.mode);
    if (req.action === 'refresh') location.reload();
  });
  
  function applyColorblindMode(type) {
    const CVD = {
      protanopia:  [0,2.02344,-2.52581,   0,1,0,   0,0,1],
      deuteranopia:[1,0,0,               0.494207,0,1.24827, 0,0,1],
      tritanopia:  [1,0,0,               0,1,0,  -0.395913,0.801109,0]
    };
    const m = CVD[type];
    if (!m) return;
  
    /* ---------- images ---------- */
    document.querySelectorAll('img').forEach(img => {
      if (img.complete && img.naturalWidth) {
        needsProxy(img) ? proxy(img) : daltonizeImage(img);
      } else {
        img.crossOrigin = 'anonymous';
        img.addEventListener('load', () => needsProxy(img) ? proxy(img) : daltonizeImage(img));
      }
    });
  
    function needsProxy(i){ return i.crossOrigin!=='anonymous' && !i.src.startsWith(location.origin); }
    function proxy(i){
      const p = new Image(); p.crossOrigin='anonymous'; p.src=i.src;
      p.onload = () => daltonizeImage(p,i);
    }
  
    function daltonizeImage(srcImg, target=srcImg){
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      c.width = srcImg.width; c.height = srcImg.height;
      ctx.drawImage(srcImg,0,0);
      const imgData = ctx.getImageData(0,0,c.width,c.height);
      const d = imgData.data;
  
      for (let k=0;k<d.length;k+=4) {
        let [r,g,b]=[d[k],d[k+1],d[k+2]];
        const L=17.8824*r+43.5161*g+4.11935*b;
        const M=3.45565*r+27.1554*g+3.86714*b;
        const S=0.0299566*r+0.184309*g+1.46709*b;
  
        const l=m[0]*L+m[1]*M+m[2]*S;
        const n=m[3]*L+m[4]*M+m[5]*S;
        const s=m[6]*L+m[7]*M+m[8]*S;
  
        r = 0.0809444479*l -0.130504409*n +0.116721066*s;
        g =-0.0102485335*l +0.0540193266*n -0.113614708*s;
        b =-0.000365296938*l-0.00412161469*n+0.693511405*s;
  
        d[k]   = clamp(r); d[k+1] = clamp(g); d[k+2] = clamp(b);
      }
      ctx.putImageData(imgData,0,0);
      target.src = c.toDataURL();
      target.width = c.width; target.height = c.height;
    }
  
    /* ---------- text / background colours ---------- */
    document.querySelectorAll('*').forEach(el=>{
      const style = getComputedStyle(el);
      const col = style.color.match(/\d+/g)?.map(Number);
      const bg  = style.backgroundColor.match(/\d+/g)?.map(Number);
  
      if (col?.length===3) el.style.color = rgb(daltonizeRGB(col));
      if (bg ?.length===3) el.style.backgroundColor = rgb(daltonizeRGB(bg));
    });
  
    /* helpers */
    function daltonizeRGB([r,g,b]){
      const L=17.8824*r+43.5161*g+4.11935*b;
      const M=3.45565*r+27.1554*g+3.86714*b;
      const S=0.0299566*r+0.184309*g+1.46709*b;
      const l=m[0]*L+m[1]*M+m[2]*S;
      const n=m[3]*L+m[4]*M+m[5]*S;
      const s=m[6]*L+m[7]*M+m[8]*S;
      return [
        clamp(0.0809444479*l -0.130504409*n +0.116721066*s),
        clamp(-0.0102485335*l+0.0540193266*n -0.113614708*s),
        clamp(-0.000365296938*l-0.00412161469*n+0.693511405*s)
      ];
    }
    function clamp(v){ return Math.max(0, Math.min(255, v)); }
    function rgb([r,g,b]){ return `rgb(${r},${g},${b})`; }
  }
  
  function resetColorblindMode(){ location.reload(); }
