(()=>{(function(){async function $(){let H=document.getElementById("iposbrowser");if(!H)return;let q=navigator.userAgent.toLowerCase(),O=q.includes("android")?"Android":/iphone|ipad|ipod/.test(q)?"iOS":q.includes("windows")?"Windows":q.includes("mac")?"macOS":q.includes("linux")?"Linux":"Unknown",Z=q.includes("firefox")||q.includes("fxios")?"Firefox":q.includes("edg")?"Edge":q.includes("chrome")||q.includes("crios")?"Chrome":q.includes("safari")?"Safari":"Unknown",k=(j)=>{return`<img src="/ext/icons/${j==="iOS"||j==="macOS"?"macios":j.toLowerCase()}.svg" alt="${j}" onerror="this.src='/ext/icons/unknown.svg'" style="width:1.2em;height:1.2em;vertical-align:middle;margin-right:4px;display:inline-block;border-radius:2px;">`},N=(async()=>{let j=new AbortController,E=window.setTimeout(()=>j.abort(),2500),K=`https://hit.dalam.web.id/?url=${encodeURIComponent(window.location.pathname)}`;try{let Q=await fetch(K,{method:"GET",mode:"cors",cache:"no-store",signal:j.signal});if(!Q.ok)return null;let F=await Q.json();return{t:Number(F.t||0),v:Number(F.v||0)}}catch{return null}finally{window.clearTimeout(E)}})(),U=new Promise((j)=>{let E=async(W)=>{try{let Y=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",D=Y.endsWith(".html")?Y:`${Y}.html`,L=await W.getFor("iposbrowser.ts");for(let b in L){let _=L[b].find((v)=>v.slug===D);if(_&&_.date)return new Date(_.date).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}}catch{}return null},K=window.siteDataProvider;if(K){E(K).then(j);return}let Q=0,F=window.setInterval(async()=>{let W=window.siteDataProvider;if(W)window.clearInterval(F),E(W).then(j);else if(++Q>30)window.clearInterval(F),j(null)},100)}),[X,B]=await Promise.all([N,U]),M=X?`
<span style="display:inline-flex;align-items:center;white-space:nowrap;" title="Views Title / Visit">
<strong style="margin-right:4px;">∞</strong>
${Number(X.t||0).toLocaleString("id-ID")}
<small style="margin:0 4px;opacity:0.5;">-</small>
${Number(X.v||0).toLocaleString("id-ID")}
</span>`:"",R=`
<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<circle cx="32" cy="32" fill="currentColor" r="5"/>
<ellipse cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/>
<ellipse transform="rotate(60 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/>
<ellipse transform="rotate(120 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/>
</svg>`,T=`
<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<rect fill="currentColor" height="48" rx="10" width="48" x="8" y="8"/>
<circle cx="22" cy="44" fill="white" r="5"/>
<path d="M17 30c9.4 0 17 7.6 17 17" stroke="white" stroke-linecap="round" stroke-width="6"/>
<path d="M17 18c16 0 29 13 29 29" stroke="white" stroke-linecap="round" stroke-width="6"/>
</svg>`,f=`
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<rect x="9" y="9" width="13" height="13" rx="2"/>
<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
</svg>`,A=`
<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<polyline points="20 6 9 17 4 12"></polyline>
</svg>`,z=window.location.pathname.split("/").filter(Boolean),J=z.length>=2?z[0]:z.length===1&&!z[0].endsWith(".html")?z[0]:"",G=J?`/${J}.rss`:"/rss.rss",P=J?`/${J}.atom`:"/atom.atom",V=`/lainnya/feed-preview?feed=${encodeURIComponent(G)}`,C=`/lainnya/feed-preview?feed=${encodeURIComponent(P)}`;H.innerHTML=`
<div id="pagecounter-wrapper" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:15px;margin:20px 0 30px;font-size:0.85em;color:var(--text-muted);line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<span style="display:inline-flex;align-items:center;white-space:nowrap;">${k(Z)}${Z}</span>

<span style="display:inline-flex;align-items:center;white-space:nowrap;">${k(O)}${O}</span>

${B?`
    <span style="display:inline-flex;align-items:center;white-space:nowrap;">
    \uD83D\uDDD3️ <span style="margin-left:4px;">${B}</span>
    </span>`:""}

    ${M}

    <span style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap;margin-left:5px;">
    <!-- Link langsung ke halaman Preview Feed Interaktif -->
    <a
    aria-label="Buka Interaktif Atom Feed"
    title="Lihat Feed Atom"
    href="${C}"
    target="_blank"
    rel="noopener noreferrer"
    style="color:#2563eb;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;"
    onmouseover="this.style.transform='scale(1.1)'"
    onmouseout="this.style.transform='scale(1)'"
    >${R}</a>

    <a
    aria-label="Buka Interaktif RSS Feed"
    title="Lihat Feed RSS"
    href="${V}"
    target="_blank"
    rel="noopener noreferrer"
    style="color:#f97316;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;"
    onmouseover="this.style.transform='scale(1.1)'"
    onmouseout="this.style.transform='scale(1)'"
    >${T}</a>

    <!-- Tombol Copy URL Artikel tetap dipertahankan -->
    <button
    id="btn-copy-url"
    aria-label="Copy Page URL"
    title="Salin Tautan Artikel"
    type="button"
    style="background:none;border:none;padding:0;cursor:pointer;color:inherit;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s,color 0.2s;"
    onmouseover="this.style.transform='scale(1.1)';this.style.color='var(--text-main)'"
    onmouseout="this.style.transform='scale(1)';this.style.color='inherit'"
    >${f}</button>
    </span>
    </div>`;let x=document.getElementById("btn-copy-url");if(x)x.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(window.location.href),x.innerHTML=A,x.title="Tautan Artikel Tersalin!",window.setTimeout(()=>{x.innerHTML=f,x.title="Salin Tautan Artikel"},2000)}catch(j){console.error("Gagal menyalin:",j)}})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",$);else $()})();})();
