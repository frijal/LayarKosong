(()=>{var Q={Firefox:"/ext/icons/firefox.svg",Chrome:"/ext/icons/chrome.svg",Edge:"/ext/icons/edge.svg",Safari:"/ext/icons/safari.svg",Unknown:"/ext/icons/unknown.svg"},R={Windows:"/ext/icons/windows.svg",macOS:"/ext/icons/macios.svg",Linux:"/ext/icons/linux.svg",Android:"/ext/icons/android.svg",iOS:"/ext/icons/macios.svg",Unknown:"/ext/icons/unknown.svg"};document.addEventListener("DOMContentLoaded",async()=>{let F=document.getElementById("iposbrowser");if(!F)return;let j=navigator.userAgent,q=/(firefox|fxios)/i.test(j)?"Firefox":/edg/i.test(j)?"Edge":/chrome|crios/i.test(j)?"Chrome":/safari/i.test(j)?"Safari":"Unknown",v=/android/i.test(j)?"Android":/iphone|ipad|ipod/i.test(j)?"iOS":j.includes("Windows")?"Windows":j.includes("Mac")?"macOS":j.includes("Linux")?"Linux":"Unknown";async function V(){try{let k=await fetch(`/hit?url=${encodeURIComponent(window.location.pathname)}`);return k.ok?await k.json():null}catch{return null}}async function W(){try{while(!window.siteDataProvider)await new Promise((B)=>setTimeout(B,100));let k=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",z=k.endsWith(".html")?k:`${k}.html`,K=await window.siteDataProvider.getData();for(let B in K){let O=K[B].find((X)=>X[1]===z);if(O)return new Date(O[3]).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}}catch{}return null}let[x,G]=await Promise.all([V(),W()]),J=(k,z)=>`<img src="${k}" alt="${z}" class="pc-icon">`;F.innerHTML=`
<div id="pagecounter-wrapper">
<div class="pc-group">
<div class="pc-block">${J(Q[q]||Q.Unknown,q)} <span>${q}</span></div>
<div class="pc-block">${J(R[v]||R.Unknown,v)} <span>${v}</span></div>
</div>
<div class="pc-group">
${G?`<div class="pc-block">\uD83D\uDDD3️ ${G}</div>`:""}
${x?`
    <div class="pc-block">
    <span class="pc-label">∞</span>
    <span class="pc-value">${x.v.toLocaleString("id-ID")} ~ ${x.t.toLocaleString("id-ID")}</span>
    </div>`:""}
    </div>
    </div>`});var U=document.createElement("style");U.textContent=`
#pagecounter-wrapper { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; margin: 15px 0; font-size: 0.75rem; }
.pc-group { display: flex; gap: 10px; align-items: center; }
.pc-block { display: flex; align-items: center; gap: 6px; }
.pc-icon { width: 16px; height: 16px; display: block; object-fit: contain; }
.pc-label { font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; }
.pc-value { font-weight: 600; }
@media (max-width: 480px) { #pagecounter-wrapper { gap: 8px; font-size: 0.7rem; } }
`;document.head.appendChild(U);})();
