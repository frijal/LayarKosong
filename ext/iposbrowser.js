var J={Firefox:"/ext/icons/firefox.svg",Chrome:"/ext/icons/chrome.svg",Edge:"/ext/icons/edge.svg",Safari:"/ext/icons/safari.svg",Unknown:"/ext/icons/unknown.svg"},K={Windows:"/ext/icons/windows.svg",macOS:"/ext/icons/macios.svg",Linux:"/ext/icons/linux.svg",Android:"/ext/icons/android.svg",iOS:"/ext/icons/macios.svg",Unknown:"/ext/icons/unknown.svg"};document.addEventListener("DOMContentLoaded",async()=>{let B=document.getElementById("iposbrowser");if(!B)return;let q=navigator.userAgent,z=/(firefox|fxios)/i.test(q)?"Firefox":/edg/i.test(q)?"Edge":/chrome|crios/i.test(q)?"Chrome":/safari/i.test(q)?"Safari":"Unknown",A=/android/i.test(q)?"Android":/iphone|ipad|ipod/i.test(q)?"iOS":q.includes("Windows")?"Windows":q.includes("Mac")?"macOS":q.includes("Linux")?"Linux":"Unknown";async function P(){try{let x=await(await fetch("https://ipapi.co/json/")).json();return x.error?null:{city:x.city,country:x.country_name,code:x.country_code}}catch{return null}}let v=await P(),E=(F,x)=>`<img src="${F}" alt="${x}" style="width:22px; height:22px; display:block; transition:transform 0.3s ease;">`,Q=v?`
    <div class="geo-block" style="display:flex; align-items:center; gap:6px;">
        <img class="geo-flag" src="https://flagcdn.com/24x18/${v.code.toLowerCase()}.png" alt="${v.code}" style="width:20px; height:auto; border-radius:2px; border:1px solid rgba(0,0,0,0.1);">
        <span>${v.city?v.city+", ":""}${v.country}</span>
    </div>`:"";B.innerHTML=`
    <div id="ipos-browser-info" style="display:flex; align-items:center; justify-content:center; gap:15px; font-size:0.85rem; padding:5px;">
        <div class="browser-block" style="display:flex; align-items:center; gap:6px;">
            <span class="icon">${E(J[z]||J.Unknown,z)}</span>
            <span class="text">${z}</span>
        </div>
        <div class="os-block" style="display:flex; align-items:center; gap:6px;">
            <span class="icon">${E(K[A]||K.Unknown,A)}</span>
            <span class="text">${A}</span>
        </div>
        ${Q}
    </div>`});var N=document.createElement("style");N.textContent=`
:root {
    --ipos-text: #222;
    --ipos-shadow: rgba(255, 255, 255, 0.5);
}

@media (prefers-color-scheme: dark) {
    :root { --ipos-text: #eee; --ipos-shadow: rgba(0, 0, 0, 0.5); }
}

/* Dukungan class tema manual di blog kamu */
body.dark-mode :root, body.dark :root {
    --ipos-text: #e6e6e6; --ipos-shadow: rgba(0, 0, 0, 0.5);
}

#ipos-browser-info {
    color: var(--ipos-text);
    text-shadow: 1px 1px 1px var(--ipos-shadow);
    transition: color 0.3s ease;
}

#ipos-browser-info img:hover {
    transform: scale(1.2) rotate(5deg) !important;
}

/* Sembunyikan di layar kecil agar tidak berantakan */
@media (max-width: 600px) {
    #ipos-browser-info { display: none !important; }
}
`;document.head.appendChild(N);
