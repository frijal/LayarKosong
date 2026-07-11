(()=>{(function(){async function Y(){let _=document.getElementById("iposbrowser");if(!_)return;let q=navigator.userAgent.toLowerCase(),$=q.includes("android")?"Android":/iphone|ipad|ipod/.test(q)?"iOS":q.includes("windows")?"Windows":q.includes("mac")?"macOS":q.includes("linux")?"Linux":"Unknown",O=q.includes("firefox")||q.includes("fxios")?"Firefox":q.includes("edg")?"Edge":q.includes("chrome")||q.includes("crios")?"Chrome":q.includes("safari")?"Safari":"Unknown",U=(j)=>{return`<img src="/ext/icons/${j==="iOS"||j==="macOS"?"macios":j.toLowerCase()}.svg" alt="${j}" onerror="this.src='/ext/icons/unknown.svg'" style="width:1.2em;height:1.2em;vertical-align:middle;margin-right:4px;display:inline-block;border-radius:2px;">`},H=(async()=>{let j=new AbortController,z=window.setTimeout(()=>j.abort(),2500),F=`https://hit.dalam.web.id/?url=${encodeURIComponent(window.location.pathname)}`;try{let J=await fetch(F,{method:"GET",mode:"cors",cache:"no-store",signal:j.signal});if(!J.ok)return null;let E=await J.json();return{t:Number(E.t||0),v:Number(E.v||0)}}catch{return null}finally{window.clearTimeout(z)}})(),R=new Promise((j)=>{let z=async(K)=>{try{let W=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",P=W.endsWith(".html")?W:`${W}.html`,B=await K.getFor("iposbrowser.ts");for(let M in B){let X=B[M].find((T)=>T.slug===P);if(X&&X.date)return new Date(X.date).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}}catch{}return null},F=window.siteDataProvider;if(F){z(F).then(j);return}let J=0,E=window.setInterval(async()=>{let K=window.siteDataProvider;if(K)window.clearInterval(E),z(K).then(j);else if(++J>30)window.clearInterval(E),j(null)},100)}),[Q,Z]=await Promise.all([H,R]),f=Q?`
<span style="display:inline-flex;align-items:center;white-space:nowrap;" title="Views Title / Visit">
<strong style="margin-right:4px;">∞</strong>
${Number(Q.t||0).toLocaleString("id-ID")}
<small style="margin:0 4px;opacity:0.5;">-</small>
${Number(Q.v||0).toLocaleString("id-ID")}
</span>`:"",A=`
<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<circle cx="32" cy="32" fill="currentColor" r="5"/>
<ellipse cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/>
<ellipse transform="rotate(60 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/>
<ellipse transform="rotate(120 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/>
</svg>`,L=`
<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<rect fill="currentColor" height="48" rx="10" width="48" x="8" y="8"/>
<circle cx="22" cy="44" fill="white" r="5"/>
<path d="M17 30c9.4 0 17 7.6 17 17" stroke="white" stroke-linecap="round" stroke-width="6"/>
<path d="M17 18c16 0 29 13 29 29" stroke="white" stroke-linecap="round" stroke-width="6"/>
</svg>`,k=`
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<rect x="9" y="9" width="13" height="13" rx="2"/>
<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
</svg>`,N=`
<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<polyline points="20 6 9 17 4 12"></polyline>
</svg>`;_.innerHTML=`
<div id="pagecounter-wrapper" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:15px;margin:20px 0 30px;font-size:0.85em;color:var(--text-muted);line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<span style="display:inline-flex;align-items:center;white-space:nowrap;">${U(O)}${O}</span>

<span style="display:inline-flex;align-items:center;white-space:nowrap;">${U($)}${$}</span>

${Z?`
  <span style="display:inline-flex;align-items:center;white-space:nowrap;">
  \uD83D\uDDD3️ <span style="margin-left:4px;">${Z}</span>
  </span>`:""}

  ${f}

  <span style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap;margin-left:5px;">
  <a
  aria-label="Atom Feed"
  rel="noopener noreferrer"
  title="Atom Feed"
  href="/atom.atom"
  target="_blank"
  style="color:#2563eb;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;"
  onmouseover="this.style.transform='scale(1.1)'"
  onmouseout="this.style.transform='scale(1)'"
  >${A}</a>

  <a
  aria-label="RSS Feed"
  rel="noopener noreferrer"
  title="RSS Feed"
  href="/rss.rss"
  target="_blank"
  style="color:#f97316;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;"
  onmouseover="this.style.transform='scale(1.1)'"
  onmouseout="this.style.transform='scale(1)'"
  >${L}</a>

  <button
  id="btn-copy-url"
  aria-label="Copy Page URL"
  title="Salin Tautan"
  type="button"
  style="background:none;border:none;padding:0;cursor:pointer;color:inherit;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s,color 0.2s;"
  onmouseover="this.style.transform='scale(1.1)';this.style.color='var(--text-main)'"
  onmouseout="this.style.transform='scale(1)';this.style.color='inherit'"
  >${k}</button>
  </span>
  </div>`;let x=document.getElementById("btn-copy-url");if(x)x.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(window.location.href),x.innerHTML=N,x.title="Tautan Tersalin!",window.setTimeout(()=>{x.innerHTML=k,x.title="Salin Tautan"},2000)}catch(j){console.error("Gagal menyalin tautan:",j)}})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",Y);else Y()})();})();
