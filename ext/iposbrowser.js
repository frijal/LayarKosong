var j={Firefox:"/ext/icons/firefox.svg",Chrome:"/ext/icons/chrome.svg",Edge:"/ext/icons/edge.svg",Safari:"/ext/icons/safari.svg",Unknown:"/ext/icons/unknown.svg"},v={Windows:"/ext/icons/windows.svg",macOS:"/ext/icons/macios.svg",Linux:"/ext/icons/linux.svg",Android:"/ext/icons/android.svg",iOS:"/ext/icons/macios.svg",Unknown:"/ext/icons/unknown.svg"};document.addEventListener("DOMContentLoaded",async()=>{let X=document.getElementById("iposbrowser");if(!X)return;let q=navigator.userAgent,Q=/(firefox|fxios)/i.test(q)?"Firefox":/edg/i.test(q)?"Edge":/chrome|crios/i.test(q)?"Chrome":/safari/i.test(q)?"Safari":"Unknown",U=/android/i.test(q)?"Android":/iphone|ipad|ipod/i.test(q)?"iOS":q.includes("Windows")?"Windows":q.includes("Mac")?"macOS":q.includes("Linux")?"Linux":"Unknown";async function J(){try{while(!window.siteDataProvider)await new Promise((W)=>setTimeout(W,100));let x=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",z=x.endsWith(".html")?x:`${x}.html`,_=await window.siteDataProvider.getData(),V=null;for(let W in _){let $=_[W].find((p)=>p[1]===z);if($){V=$[3];break}}if(V)return new Date(V).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}catch(x){console.warn("Gagal mengambil tanggal via Provider:",x)}return null}async function K(){try{let z=await(await fetch("https://ipapi.co/json/")).json();return z.error?null:z}catch{return null}}let[B,Y]=await Promise.all([K(),J()]),Z=(x,z)=>`<img src="${x}" alt="${z}" style="width:18px; height:18px; display:block;">`,O=B?`
<div class="info-block" style="display:flex; align-items:center; gap:6px;">
<img src="https://flagcdn.com/24x18/${B.country_code.toLowerCase()}.png" alt="${B.country_code}" style="width:18px; height:auto; border-radius:2px;">
<span>${B.city||B.country_name}</span>
</div>`:"",m=Y?`
<div class="info-block" style="display:flex; align-items:center; gap:6px;">
<span><i class="fa-solid fa-code"></i> ${Y}</span>
</div>`:"";X.innerHTML=`
<div id="ipos-browser-info" style="display:flex; align-items:center; justify-content:center; gap:12px; font-size:0.8rem; padding:5px; flex-wrap: wrap;">
<div class="info-block" style="display:flex; align-items:center; gap:6px;">
${Z(j[Q]||j.Unknown,Q)}
<span>${Q}</span>
</div>
<div class="info-block" style="display:flex; align-items:center; gap:6px;">
${Z(v[U]||v.Unknown,U)}
<span>${U}</span>
</div>
${O}
${m}
</div>`});var F=document.createElement("style");F.textContent=`
#ipos-browser-info { color: #444; }
@media (prefers-color-scheme: dark) { #ipos-browser-info { color: #ccc; } }
@media (max-width: 480px) { #ipos-browser-info { font-size: 0.7rem; gap: 8px; } }
`;document.head.appendChild(F);
