var _={Firefox:"/ext/icons/firefox.svg",Chrome:"/ext/icons/chrome.svg",Edge:"/ext/icons/edge.svg",Safari:"/ext/icons/safari.svg",Unknown:"/ext/icons/unknown.svg"},$={Windows:"/ext/icons/windows.svg",macOS:"/ext/icons/macios.svg",Linux:"/ext/icons/linux.svg",Android:"/ext/icons/android.svg",iOS:"/ext/icons/macios.svg",Unknown:"/ext/icons/unknown.svg"};document.addEventListener("DOMContentLoaded",async()=>{let W=document.getElementById("iposbrowser");if(!W)return;let j=navigator.userAgent,B=/(firefox|fxios)/i.test(j)?"Firefox":/edg/i.test(j)?"Edge":/chrome|crios/i.test(j)?"Chrome":/safari/i.test(j)?"Safari":"Unknown",Q=/android/i.test(j)?"Android":/iphone|ipad|ipod/i.test(j)?"iOS":j.includes("Windows")?"Windows":j.includes("Mac")?"macOS":j.includes("Linux")?"Linux":"Unknown";async function F(){try{let q=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",v=q.endsWith(".html")?q:`${q}.html`,Z=sessionStorage.getItem("artikel_data_cache"),z;if(Z)z=JSON.parse(Z);else z=await(await fetch("/artikel.json")).json(),sessionStorage.setItem("artikel_data_cache",JSON.stringify(z));let U=Object.values(z).flat().find((V)=>V[1]===v);if(U&&U[3])return new Date(U[3]).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}catch(q){console.warn("Gagal mengambil tanggal:",q)}return null}async function K(){try{let v=await(await fetch("https://ipapi.co/json/")).json();return v.error?null:{city:v.city,country:v.country_name,code:v.country_code}}catch{return null}}let[x,X]=await Promise.all([K(),F()]),Y=(q,v)=>`<img src="${q}" alt="${v}" style="width:18px; height:18px; display:block; transition:transform 0.3s ease;">`,O=x?`
    <div class="info-block" style="display:flex; align-items:center; gap:6px;">
        <img src="https://flagcdn.com/24x18/${x.code.toLowerCase()}.png" alt="${x.code}" style="width:18px; height:auto; border-radius:2px;">
        <span>${x.city||x.country}</span>
    </div>`:"",f=X?`
    <div class="info-block" style="display:flex; align-items:center; gap:6px; border-left: 1px solid rgba(128,128,128,0.3); padding-left: 10px;">
        <span style="opacity: 0.8;"><i class="fa-solid fa-code"></i> ${X}</span>
    </div>`:"";W.innerHTML=`
    <div id="ipos-browser-info" style="display:flex; align-items:center; justify-content:center; gap:12px; font-size:0.8rem; padding:5px; flex-wrap: wrap;">
        <div class="info-block" style="display:flex; align-items:center; gap:6px;">
            ${Y(_[B]||_.Unknown,B)}
            <span>${B}</span>
        </div>
        <div class="info-block" style="display:flex; align-items:center; gap:6px;">
            ${Y($[Q]||$.Unknown,Q)}
            <span>${Q}</span>
        </div>
        ${O}
        ${f}
    </div>`});var A=document.createElement("style");A.textContent=`
:root { --ipos-text: #444; --ipos-shadow: rgba(255, 255, 255, 0.5); }
@media (prefers-color-scheme: dark) { :root { --ipos-text: #ccc; --ipos-shadow: rgba(0, 0, 0, 0.5); } }
body.dark-mode :root, body.dark :root { --ipos-text: #e6e6e6; --ipos-shadow: rgba(0, 0, 0, 0.5); }
#ipos-browser-info { color: var(--ipos-text); transition: all 0.3s ease; }
#ipos-browser-info .info-block:hover { opacity: 0.7; }
@media (max-width: 480px) { #ipos-browser-info { font-size: 0.7rem; gap: 8px; } }
`;document.head.appendChild(A);
