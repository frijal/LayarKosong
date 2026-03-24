(()=>{var X={Firefox:"/ext/icons/firefox.svg",Chrome:"/ext/icons/chrome.svg",Edge:"/ext/icons/edge.svg",Safari:"/ext/icons/safari.svg",Unknown:"/ext/icons/unknown.svg"},Y={Windows:"/ext/icons/windows.svg",macOS:"/ext/icons/macios.svg",Linux:"/ext/icons/linux.svg",Android:"/ext/icons/android.svg",iOS:"/ext/icons/macios.svg",Unknown:"/ext/icons/unknown.svg"};document.addEventListener("DOMContentLoaded",async()=>{let O=document.getElementById("iposbrowser");if(!O)return;let j=navigator.userAgent,x=/(firefox|fxios)/i.test(j)?"Firefox":/edg/i.test(j)?"Edge":/chrome|crios/i.test(j)?"Chrome":/safari/i.test(j)?"Safari":"Unknown",z=/android/i.test(j)?"Android":/iphone|ipad|ipod/i.test(j)?"iOS":j.includes("Windows")?"Windows":j.includes("Mac")?"macOS":j.includes("Linux")?"Linux":"Unknown";async function _(){try{let k=window.location.pathname,q=await fetch(`/hit?url=${encodeURIComponent(k)}`);if(!q.ok)return null;return(await q.json()).views}catch{return null}}async function $(){try{while(!window.siteDataProvider)await new Promise((G)=>setTimeout(G,100));let k=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",q=k.endsWith(".html")?k:`${k}.html`,B=await window.siteDataProvider.getData(),F=null;for(let G in B){let W=B[G].find((K)=>K[1]===q);if(W){F=W[3];break}}if(F)return new Date(F).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}catch(k){console.warn("Gagal ambil tanggal:",k)}return null}let[Q,R]=await Promise.all([_(),$()]),U=(k,q)=>`<img src="${k}" alt="${q}" class="pc-icon">`,A=Q?`
<div class="pc-block pc-views">
<span class="pc-label">VIEWS</span>
<span class="pc-value">${Q.toLocaleString("id-ID")}</span>
</div>`:"",J=R?`
<div class="pc-block">
<span class="pc-icon">\uD83D\uDDD3️</span>
<span>${R}</span>
</div>`:"";O.innerHTML=`
<div id="pagecounter-wrapper">
<div class="pc-group">
<div class="pc-block">
${U(X[x]||X.Unknown,x)}
<span>${x}</span>
</div>
<div class="pc-block">
${U(Y[z]||Y.Unknown,z)}
<span>${z}</span>
</div>
</div>
<div class="pc-group">
${J}
${A}
</div>
</div>`});var Z=document.createElement("style");Z.textContent=`
#pagecounter-wrapper {
display: flex;
align-items: center;
justify-content: center;
gap: 10px;
flex-wrap: wrap;
font-family: var(--font-mono, 'JetBrains Mono', monospace);
font-size: 0.75rem;
margin: 15px 0;
}
.pc-group {
    display: flex;
    gap: 8px;
    align-items: center;
}
.pc-block {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    color: #555;
}
.pc-icon {
    width: 14px;
    height: 14px;
    display: block;
    object-fit: contain;
}
.pc-views {
    background: #222 !important;
    color: #fff !important;
    border: none !important;
    padding: 0 !important;
    overflow: hidden;
    display: flex;
    align-items: stretch;
}
.pc-label {
    background: #555;
    padding: 4px 8px;
    font-weight: bold;
    font-size: 0.6rem;
    display: flex;
    align-items: center;
}
.pc-value {
    padding: 4px 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
}
@media (prefers-color-scheme: dark) {
    .pc-block {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        color: #bbb;
    }
    .pc-views { background: #eee !important; color: #222 !important; }
    .pc-label { background: #ccc; color: #222; }
}
@media (max-width: 480px) {
    #pagecounter-wrapper { gap: 6px; }
    .pc-block { padding: 3px 6px; font-size: 0.7rem; }
}
`;document.head.appendChild(Z);})();
