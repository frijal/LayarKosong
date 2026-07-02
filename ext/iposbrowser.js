(()=>{(function(){async function Q(){let U=document.getElementById("iposbrowser");if(!U)return;let q=navigator.userAgent.toLowerCase(),W=q.includes("android")?"Android":/iphone|ipad|ipod/.test(q)?"iOS":q.includes("windows")?"Windows":q.includes("mac")?"macOS":q.includes("linux")?"Linux":"Unknown",X=q.includes("firefox")||q.includes("fxios")?"Firefox":q.includes("edg")?"Edge":q.includes("chrome")||q.includes("crios")?"Chrome":q.includes("safari")?"Safari":"Unknown",Y=(j)=>{return`<img src="/ext/icons/${j==="iOS"||j==="macOS"?"macios":j.toLowerCase()}.svg" alt="${j}" onerror="this.src='/ext/icons/unknown.svg'" style="width:1.2em;height:1.2em;vertical-align:middle;margin-right:4px;display:inline-block;border-radius:2px;">`},O=fetch(`/hit?url=${encodeURIComponent(window.location.pathname)}`).then((j)=>j.ok?j.json():null).catch(()=>null),R=new Promise((j)=>{let J=async(z)=>{try{let E=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",A=E.endsWith(".html")?E:`${E}.html`,L=await z.getFor("iposbrowser.ts");for(let M in L){let K=L[M].find((N)=>N.slug===A);if(K&&K.date)return new Date(K.date).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}}catch(E){}return null},k=window.siteDataProvider;if(k){J(k).then(j);return}let f=0,F=setInterval(async()=>{let z=window.siteDataProvider;if(z)clearInterval(F),J(z).then(j);else if(++f>30)clearInterval(F),j(null)},100)}),[H,_]=await Promise.all([O,R]),Z='<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;"><circle cx="32" cy="32" fill="currentColor" r="5"/><ellipse cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/><ellipse transform="rotate(60 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/><ellipse transform="rotate(120 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/></svg>',B='<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;"><rect fill="currentColor" height="48" rx="10" width="48" x="8" y="8"/><circle cx="22" cy="44" fill="white" r="5"/><path d="M17 30c9.4 0 17 7.6 17 17" stroke="white" stroke-linecap="round" stroke-width="6"/><path d="M17 18c16 0 29 13 29 29" stroke="white" stroke-linecap="round" stroke-width="6"/></svg>',$='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.2em;height:1.2em;display:block;overflow:visible;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';U.innerHTML=`
      <div id="pagecounter-wrapper" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:15px;margin:20px 0 30px;font-size:0.85em;color:var(--text-muted);line-height:1.5;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        
        <span style="display:inline-flex;align-items:center;white-space:nowrap;">${Y(X)}${X}</span>
        <span style="display:inline-flex;align-items:center;white-space:nowrap;">${Y(W)}${W}</span>
        
        ${_?`<span style="display:inline-flex;align-items:center;white-space:nowrap;">\uD83D\uDDD3️ <span style="margin-left:4px;">${_}</span></span>`:""}
        
        ${H?`<span style="display:inline-flex;align-items:center;white-space:nowrap;" title="Views / Visitors">
          <strong style="margin-right:4px;">∞</strong> 
          ${H.v.toLocaleString("id-ID")} <small style="margin:0 4px;opacity:0.5;">|</small> ${H.t.toLocaleString("id-ID")}
        </span>`:""}
        
        <span style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap;margin-left:5px;">
          <a aria-label="Atom Feed" rel="noopener noreferrer" title="Atom Feed" href="/atom.xml" target="_blank" style="color:#2563eb;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            ${Z}
          </a>
          
          <a aria-label="RSS Feed" rel="noopener noreferrer" title="RSS Feed" href="/rss.xml" target="_blank" style="color:#f97316;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            ${B}
          </a>

          <span style="opacity:0.3;margin:0 2px;">|</span>

          <button id="btn-copy-url" aria-label="Copy Page URL" title="Salin Tautan" style="background:none;border:none;padding:0;cursor:pointer;color:inherit;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s, color 0.2s;" onmouseover="this.style.transform='scale(1.1)'; this.style.color='var(--text-main)'" onmouseout="this.style.transform='scale(1)'; this.style.color='inherit'">
            ${$}
          </button>
        </span>

      </div>`;let x=document.getElementById("btn-copy-url");if(x)x.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(window.location.href);let j='<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:1.2em;height:1.2em;display:block;overflow:visible;"><polyline points="20 6 9 17 4 12"></polyline></svg>';x.innerHTML=j,x.title="Tautan Tersalin!",setTimeout(()=>{x.innerHTML=$,x.title="Salin Tautan"},2000)}catch(j){console.error("Gagal menyalin tautan:",j)}})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",Q);else Q()})();})();
