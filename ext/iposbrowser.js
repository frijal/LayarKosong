(()=>{(function(){async function J(){let O=document.getElementById("iposbrowser");if(!O)return;let q=navigator.userAgent.toLowerCase(),Q=q.includes("android")?"Android":/iphone|ipad|ipod/.test(q)?"iOS":q.includes("windows")?"Windows":q.includes("mac")?"macOS":q.includes("linux")?"Linux":"Unknown",R=q.includes("firefox")||q.includes("fxios")?"Firefox":q.includes("edg")?"Edge":q.includes("chrome")||q.includes("crios")?"Chrome":q.includes("safari")?"Safari":"Unknown",U=(x)=>{return`<img src="/ext/icons/${x==="iOS"||x==="macOS"?"macios":x.toLowerCase()}.svg" alt="${x}" onerror="this.src='/ext/icons/unknown.svg'" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;display:inline-block;border-radius:2px;">`},_=fetch(`/hit?url=${encodeURIComponent(window.location.pathname)}`).then((x)=>x.ok?x.json():null).catch(()=>null),$=new Promise((x)=>{let E=async(z)=>{try{let A=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",K=A.endsWith(".html")?A:`${A}.html`,Z=await z.getFor("iposbrowser.ts");for(let L in Z){let F=Z[L].find((N)=>N.slug===K);if(F&&F.date)return new Date(F.date).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}}catch(A){}return null},X=window.siteDataProvider;if(X){E(X).then(x);return}let H=0,Y=setInterval(async()=>{let z=window.siteDataProvider;if(z)clearInterval(Y),E(z).then(x);else if(++H>30)clearInterval(Y),x(null)},100)}),[C,W]=await Promise.all([_,$]),j='<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;"><circle cx="32" cy="32" fill="currentColor" r="5"/><ellipse cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/><ellipse transform="rotate(60 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/><ellipse transform="rotate(120 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/></svg>',k='<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;"><rect fill="currentColor" height="48" rx="10" width="48" x="8" y="8"/><circle cx="22" cy="44" fill="white" r="5"/><path d="M17 30c9.4 0 17 7.6 17 17" stroke="white" stroke-linecap="round" stroke-width="6"/><path d="M17 18c16 0 29 13 29 29" stroke="white" stroke-linecap="round" stroke-width="6"/></svg>';O.innerHTML=`
      <div id="pagecounter-wrapper" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:15px;margin:20px 0 30px;font-size:0.85em;color:var(--text-muted);line-height:1.5;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        
        <span style="display:inline-flex;align-items:center;white-space:nowrap;">${U(R)}${R}</span>
        <span style="display:inline-flex;align-items:center;white-space:nowrap;">${U(Q)}${Q}</span>
        
        ${W?`<span style="display:inline-flex;align-items:center;white-space:nowrap;">\uD83D\uDDD3️ <span style="margin-left:4px;">${W}</span></span>`:""}
        
        ${C?`<span style="display:inline-flex;align-items:center;white-space:nowrap;" title="Views / Visitors">
          <strong style="margin-right:4px;">∞</strong> 
          ${C.v.toLocaleString("id-ID")} <small style="margin:0 4px;opacity:0.5;">|</small> ${C.t.toLocaleString("id-ID")}
        </span>`:""}
        
        <span style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap;margin-left:5px;">
          <a aria-label="Atom Feed" rel="noopener noreferrer" title="Atom Feed" href="/atom.xml" target="_blank" style="color:#2563eb;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            ${j}
          </a>
          <a aria-label="RSS Feed" rel="noopener noreferrer" title="RSS Feed" href="/rss.xml" target="_blank" style="color:#f97316;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            ${k}
          </a>
        </span>

      </div>`}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",J);else J()})();})();
