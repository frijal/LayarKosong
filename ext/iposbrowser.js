(()=>{var U={Firefox:"/ext/icons/firefox.svg",Chrome:"/ext/icons/chrome.svg",Edge:"/ext/icons/edge.svg",Safari:"/ext/icons/safari.svg",Unknown:"/ext/icons/unknown.svg"},V={Windows:"/ext/icons/windows.svg",macOS:"/ext/icons/macios.svg",Linux:"/ext/icons/linux.svg",Android:"/ext/icons/android.svg",iOS:"/ext/icons/macios.svg",Unknown:"/ext/icons/unknown.svg"};document.addEventListener("DOMContentLoaded",async()=>{let J=document.getElementById("iposbrowser");if(!J)return;let q=navigator.userAgent,z=/(firefox|fxios)/i.test(q)?"Firefox":/edg/i.test(q)?"Edge":/chrome|crios/i.test(q)?"Chrome":/safari/i.test(q)?"Safari":"Unknown",B=/android/i.test(q)?"Android":/iphone|ipad|ipod/i.test(q)?"iOS":q.includes("Windows")?"Windows":q.includes("Mac")?"macOS":q.includes("Linux")?"Linux":"Unknown";async function W(){try{let v=await fetch(`/hit?url=${encodeURIComponent(window.location.pathname)}`);return v.ok?await v.json():null}catch{return null}}async function X(){try{while(!window.siteDataProvider)await new Promise((G)=>setTimeout(G,100));let v=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",F=v.endsWith(".html")?v:`${v}.html`,Q=await window.siteDataProvider.getData();for(let G in Q){let R=Q[G].find((Y)=>Y[1]===F);if(R)return new Date(R[3]).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}}catch{}return null}let[E,K]=await Promise.all([W(),X()]),O=(v,F)=>`<img src="${v}" alt="${F}" style="width:14px; height:14px; vertical-align:middle; margin-right:4px; display:inline-block;">`;J.innerHTML=`
<div id="pagecounter-wrapper" style="display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:12px; margin:10px 0 20px; font-size:0.85em; color:var(--text-muted); line-height:1.5;">
<span style="white-space:nowrap;">${O(U[z]||U.Unknown,z)}${z}</span>
<span style="white-space:nowrap;">${O(V[B]||V.Unknown,B)}${B}</span>
${K?`<span style="white-space:nowrap;">\uD83D\uDDD3️ ${K}</span>`:""}
${E?`
    <span style="white-space:nowrap;">
    <strong>∞</strong>
    ${E.v.toLocaleString("id-ID")} <small>~</small> ${E.t.toLocaleString("id-ID")}
    </span>`:""}
    </div>`});})();
