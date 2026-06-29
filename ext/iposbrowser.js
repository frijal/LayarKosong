(()=>{var U={Firefox:"/ext/icons/firefox.svg",Chrome:"/ext/icons/chrome.svg",Edge:"/ext/icons/edge.svg",Safari:"/ext/icons/safari.svg",Unknown:"/ext/icons/unknown.svg"},V={Windows:"/ext/icons/windows.svg",macOS:"/ext/icons/macios.svg",Linux:"/ext/icons/linux.svg",Android:"/ext/icons/android.svg",iOS:"/ext/icons/macios.svg",Unknown:"/ext/icons/unknown.svg"};document.addEventListener("DOMContentLoaded",async()=>{let J=document.getElementById("iposbrowser");if(!J)return;let q=pemandu.userAgent,z=/(firefox|fxios)/i.test(q)?"Firefox":/edg/i.test(q)?"Edge":/chrome|crios/i.test(q)?"Chrome":/safari/i.test(q)?"Safari":"Unknown",B=/android/i.test(q)?"Android":/iphone|ipad|ipod/i.test(q)?"iOS":q.includes("Windows")?"Windows":q.includes("Mac")?"macOS":q.includes("Linux")?"Linux":"Unknown";async function W(){try{let v=await fetch(`/hit?url=${encodeURIComponent(window.location.pathname)}`);return v.ok?await v.json():null}catch{return null}}async function X(){try{while(!window.siteDataProvider)await new Promise((G)=>setTimeout(G,100));let v=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",F=v.endsWith(".html")?v:`${v}.html`,Q=await window.siteDataProvider.getData();for(let G in Q){let R=Q[G].find((Z)=>Z[1]===F);if(R)return new Date(R[3]).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}}catch{}return null}let[E,K]=await Promise.all([W(),X()]),O=(v,F)=>`<img src="${v}" alt="${F}" style="width:14px; height:14px; vertical-align:middle; margin-right:4px; display:inline-block;">`,Y=`
<span style="display:inline-flex; align-items:center; gap:8px; white-space:nowrap;">
    <a
        aria-label="Atom Feed"
        rel="noopener noreferrer"
        title="Atom Feed"
        href="https://dalam.web.id/atom.xml"
        target="_blank"
        style="width:1em;height:1em;font-size:inherit;color:#2563eb;vertical-align:-.125em;justify-content:center;align-items:center;line-height:1;text-decoration:none;display:inline-flex;"
    >
        <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" role="img" style="width:1em;height:1em;display:block;overflow:visible;" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" fill="currentColor" r="5"></circle>
            <ellipse cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"></ellipse>
            <ellipse transform="rotate(60 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"></ellipse>
            <ellipse transform="rotate(120 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"></ellipse>
        </svg>
    </a>

    <a
        aria-label="RSS Feed"
        rel="noopener noreferrer"
        title="RSS Feed"
        href="https://dalam.web.id/rss.xml"
        target="_blank"
        style="width:1em;height:1em;font-size:inherit;color:#f97316;vertical-align:-.125em;justify-content:center;align-items:center;line-height:1;text-decoration:none;display:inline-flex;"
    >
        <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" role="img" style="width:1em;height:1em;display:block;overflow:visible;" xmlns="http://www.w3.org/2000/svg">
            <rect fill="currentColor" height="48" rx="10" width="48" x="8" y="8"></rect>
            <circle cx="22" cy="44" fill="white" r="5"></circle>
            <path d="M17 30c9.4 0 17 7.6 17 17" stroke="white" stroke-linecap="round" stroke-width="6"></path>
            <path d="M17 18c16 0 29 13 29 29" stroke="white" stroke-linecap="round" stroke-width="6"></path>
        </svg>
    </a>
</span>`;J.innerHTML=`
<div id="pagecounter-wrapper" style="display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:12px; margin:10px 0 20px; font-size:0.85em; color:var(--text-muted); line-height:1.5;">
    <span style="white-space:nowrap;">${O(U[z]||U.Unknown,z)}${z}</span>
    <span style="white-space:nowrap;">${O(V[B]||V.Unknown,B)}${B}</span>
    ${K?`<span style="white-space:nowrap;">\uD83D\uDDD3️ ${K}</span>`:""}
    ${E?`
        <span style="white-space:nowrap;">
            <strong>∞</strong>
            ${E.v.toLocaleString("id-ID")} <small>~</small> ${E.t.toLocaleString("id-ID")}
        </span>`:""}
    ${Y}
</div>`});})();
