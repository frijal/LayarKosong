(()=>{(function(){async function Q(){let U=document.getElementById("iposbrowser");if(!U)return;let j=navigator.userAgent.toLowerCase(),W=j.includes("android")?"Android":/iphone|ipad|ipod/.test(j)?"iOS":j.includes("windows")?"Windows":j.includes("mac")?"macOS":j.includes("linux")?"Linux":"Unknown",X=j.includes("firefox")||j.includes("fxios")?"Firefox":j.includes("edg")?"Edge":j.includes("chrome")||j.includes("crios")?"Chrome":j.includes("safari")?"Safari":"Unknown",Y=(q)=>{return`<img src="/ext/icons/${q==="iOS"||q==="macOS"?"macios":q.toLowerCase()}.svg" alt="${q}" onerror="this.src='/ext/icons/unknown.svg'" style="width:1.2em;height:1.2em;vertical-align:middle;margin-right:4px;display:inline-block;border-radius:2px;">`},E=fetch(`/hit?url=${encodeURIComponent(window.location.pathname)}`).then((q)=>q.ok?q.json():null).catch(()=>null),J=new Promise((q)=>{let H=async(x)=>{try{let z=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",L=z.endsWith(".html")?z:`${z}.html`,C=await x.getFor("iposbrowser.ts");for(let O in C){let K=C[O].find((V)=>V.slug===L);if(K&&K.date)return new Date(K.date).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}}catch(z){}return null},$=window.siteDataProvider;if($){H($).then(q);return}let G=0,k=setInterval(async()=>{let x=window.siteDataProvider;if(x)clearInterval(k),H(x).then(q);else if(++G>30)clearInterval(k),q(null)},100)}),[F,_]=await Promise.all([E,J]),R='<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;"><circle cx="32" cy="32" fill="currentColor" r="5"/><ellipse cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/><ellipse transform="rotate(60 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/><ellipse transform="rotate(120 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/></svg>',Z='<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;"><rect fill="currentColor" height="48" rx="10" width="48" x="8" y="8"/><circle cx="22" cy="44" fill="white" r="5"/><path d="M17 30c9.4 0 17 7.6 17 17" stroke="white" stroke-linecap="round" stroke-width="6"/><path d="M17 18c16 0 29 13 29 29" stroke="white" stroke-linecap="round" stroke-width="6"/></svg>';U.innerHTML=`
      <div id="pagecounter-wrapper" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:15px;margin:20px 0 30px;font-size:0.85em;color:var(--text-muted);line-height:1.5;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        
        <span style="display:inline-flex;align-items:center;white-space:nowrap;">${Y(X)}${X}</span>
        <span style="display:inline-flex;align-items:center;white-space:nowrap;">${Y(W)}${W}</span>
        
        ${_?`<span style="display:inline-flex;align-items:center;white-space:nowrap;">\uD83D\uDDD3️ <span style="margin-left:4px;">${_}</span></span>`:""}
        
        ${F?`<span style="display:inline-flex;align-items:center;white-space:nowrap;" title="Views / Visitors">
          <strong style="margin-right:4px;">∞</strong> 
          ${F.v.toLocaleString("id-ID")} <small style="margin:0 4px;opacity:0.5;">|</small> ${F.t.toLocaleString("id-ID")}
        </span>`:""}
        
        <span style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap;margin-left:5px;">
          <a aria-label="Atom Feed" rel="noopener noreferrer" title="Atom Feed" href="/atom.xml" target="_blank" style="color:#2563eb;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            ${R}
          </a>
          <a aria-label="RSS Feed" rel="noopener noreferrer" title="RSS Feed" href="/rss.xml" target="_blank" style="color:#f97316;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            ${Z}
          </a>
        </span>

      </div>`}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",Q);else Q()})();})();
