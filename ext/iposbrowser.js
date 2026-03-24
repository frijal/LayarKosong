(()=>{var X={Firefox:"/ext/icons/firefox.svg",Chrome:"/ext/icons/chrome.svg",Edge:"/ext/icons/edge.svg",Safari:"/ext/icons/safari.svg",Unknown:"/ext/icons/unknown.svg"},Y={Windows:"/ext/icons/windows.svg",macOS:"/ext/icons/macios.svg",Linux:"/ext/icons/linux.svg",Android:"/ext/icons/android.svg",iOS:"/ext/icons/macios.svg",Unknown:"/ext/icons/unknown.svg"};document.addEventListener("DOMContentLoaded",async()=>{let O=document.getElementById("iposbrowser");if(!O)return;let j=navigator.userAgent,x=/(firefox|fxios)/i.test(j)?"Firefox":/edg/i.test(j)?"Edge":/chrome|crios/i.test(j)?"Chrome":/safari/i.test(j)?"Safari":"Unknown",z=/android/i.test(j)?"Android":/iphone|ipad|ipod/i.test(j)?"iOS":j.includes("Windows")?"Windows":j.includes("Mac")?"macOS":j.includes("Linux")?"Linux":"Unknown";async function _(){try{let k=window.location.pathname,q=await fetch(`/hit?url=${encodeURIComponent(k)}`);if(!q.ok)return null;return(await q.json()).views}catch{return null}}async function $(){try{while(!window.siteDataProvider)await new Promise((G)=>setTimeout(G,100));let k=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",q=k.endsWith(".html")?k:`${k}.html`,B=await window.siteDataProvider.getData(),F=null;for(let G in B){let W=B[G].find((K)=>K[1]===q);if(W){F=W[3];break}}if(F)return new Date(F).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}catch(k){console.warn("Gagal ambil tanggal:",k)}return null}let[Q,R]=await Promise.all([_(),$()]),U=(k,q)=>`<img src="${k}" alt="${q}" class="pc-icon">`,A=Q?`
<div class="pc-block">
<span class="pc-label">∞</span>
<span class="pc-value">${Q.toLocaleString("id-ID")}</span>
</div>`:"",J=R?`
<div class="pc-block">
<span>\uD83D\uDDD3️ ${R}</span>
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
gap: 12px;
flex-wrap: wrap;
margin: 15px 0;
font-size: 0.75rem;
}
.pc-group {
    display: flex;
    gap: 10px;
    align-items: center;
}
.pc-block {
    display: flex;
    align-items: center;
    gap: 6px;
}
.pc-icon {
    width: 16px;
    height: 16px;
    display: block;
    object-fit: contain;
}
.pc-label {
    font-weight: 700;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
}
.pc-value {
    font-weight: 600;
}
@media (max-width: 480px) {
    #pagecounter-wrapper { gap: 8px; font-size: 0.7rem; }
}
`;document.head.appendChild(Z);})();
