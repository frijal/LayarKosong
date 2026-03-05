var R={Firefox:"/ext/icons/firefox.svg",Chrome:"/ext/icons/chrome.svg",Edge:"/ext/icons/edge.svg",Safari:"/ext/icons/safari.svg",Unknown:"/ext/icons/unknown.svg"},U={Windows:"/ext/icons/windows.svg",macOS:"/ext/icons/macios.svg",Linux:"/ext/icons/linux.svg",Android:"/ext/icons/android.svg",iOS:"/ext/icons/macios.svg",Unknown:"/ext/icons/unknown.svg"};document.addEventListener("DOMContentLoaded",async()=>{let O=document.getElementById("iposbrowser");if(!O)return;let j=navigator.userAgent,x=/(firefox|fxios)/i.test(j)?"Firefox":/edg/i.test(j)?"Edge":/chrome|crios/i.test(j)?"Chrome":/safari/i.test(j)?"Safari":"Unknown",z=/android/i.test(j)?"Android":/iphone|ipad|ipod/i.test(j)?"iOS":j.includes("Windows")?"Windows":j.includes("Mac")?"macOS":j.includes("Linux")?"Linux":"Unknown",W=()=>{let k=null,q=document.querySelector('meta[property="article:published_time"]');if(q)k=q.getAttribute("content");if(!k)document.querySelectorAll('script[type="application/ld+json"]').forEach(($)=>{try{let F=JSON.parse($.textContent||"");k=F.datePublished||F.dateModified||k}catch(F){}});if(k)return new Date(k).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});return null};async function X(){try{let q=await(await fetch("https://ipapi.co/json/")).json();return q.error?null:{city:q.city,country:q.country_name,code:q.country_code}}catch{return null}}let[v,P]=await Promise.all([X(),Promise.resolve(W())]),Q=(k,q)=>`<img src="${k}" alt="${q}" style="width:18px; height:18px; display:block; transition:transform 0.3s ease;">`,Y=v?`
<div class="info-block" style="display:flex; align-items:center; gap:6px;">
<img src="https://flagcdn.com/24x18/${v.code.toLowerCase()}.png" alt="${v.code}" style="width:18px; height:auto; border-radius:2px;">
<span>${v.city||v.country}</span>
</div>`:"",Z=P?`
<div class="info-block" style="display:flex; align-items:center; gap:6px; border-left: 1px solid rgba(128,128,128,0.3); padding-left: 10px;">
<span style="opacity: 0.8;"><i class="fa-solid fa-code"></i> ${P}</span>
</div>`:"";O.innerHTML=`
<div id="ipos-browser-info" style="display:flex; align-items:center; justify-content:center; gap:12px; font-size:0.8rem; padding:5px; flex-wrap: wrap;">
<div class="info-block" style="display:flex; align-items:center; gap:6px;">
${Q(R[x]||R.Unknown,x)}
<span>${x}</span>
</div>
<div class="info-block" style="display:flex; align-items:center; gap:6px;">
${Q(U[z]||U.Unknown,z)}
<span>${z}</span>
</div>
${Y}
${Z}
</div>`});var V=document.createElement("style");V.textContent=`
:root { --ipos-text: #444; --ipos-shadow: rgba(255, 255, 255, 0.5); }
@media (prefers-color-scheme: dark) { :root { --ipos-text: #ccc; --ipos-shadow: rgba(0, 0, 0, 0.5); } }
body.dark-mode :root, body.dark :root { --ipos-text: #e6e6e6; --ipos-shadow: rgba(0, 0, 0, 0.5); }
#ipos-browser-info { color: var(--ipos-text); transition: all 0.3s ease; }
#ipos-browser-info .info-block:hover { opacity: 0.7; }
@media (max-width: 480px) { #ipos-browser-info { font-size: 0.7rem; gap: 8px; } }
`;document.head.appendChild(V);
