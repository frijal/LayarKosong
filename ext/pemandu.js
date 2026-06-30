(()=>{(function(){function H(){return window.innerWidth<=768||"ontouchstart"in window||navigator.maxTouchPoints>0}function k(Q){return Q?Q.replace(/\.html$/,""):""}function B(){let X=window.location.pathname.split("/").filter(Boolean).pop();if(!X||X==="artikel")return"";return X.endsWith(".html")?X:`${X}.html`}function K(Q,X){for(let[W,J]of Object.entries(X))if(J.some((Y)=>Y.id===Q))return`/${W.toLowerCase().replace(/\s+/g,"-")}/${Q.replace(".html","")}`;return`/${k(Q)}`}function O(Q,X){for(let[J,V]of Object.entries(X)){let Y=V;if(Y.some((Z)=>Z.id===Q))return{name:J,slug:J.toLowerCase().replace(/\s+/g,"-"),list:Y}}let W=window.location.pathname.split("/").filter(Boolean);if(W.length>0){let J=W[0];for(let[V,Y]of Object.entries(X)){let Z=V.toLowerCase().replace(/\s+/g,"-");if(Z===J)return{name:V,slug:Z,list:Y}}}return null}let R="img-broken-placeholder",w=!1;function M(){if(w)return;w=!0;let Q=document.createElement("style");Q.textContent=`
    .${R} {
      display: flex !important;
      align-items: center;
      justify-content: center;
      background-color: #1a1a1c;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='M21 15l-5-5L5 21'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
      background-size: 32%;
    }
  `,document.head.appendChild(Q)}function _(Q,X){let W=[...new Set(X.filter(Boolean))],J=0;function V(){if(J<W.length)Q.src=W[J],J++;else Q.removeEventListener("error",V),M(),Q.classList.add(R),Q.removeAttribute("src"),Q.alt=Q.alt||"Gambar tidak tersedia"}Q.addEventListener("error",V)}function E(){let Q=document.getElementById("progress");if(!Q)return;let X=()=>{let{documentElement:W,body:J}=document,V=W.scrollTop||J.scrollTop,Y=W.scrollHeight||J.scrollHeight,Z=W.clientHeight,$=Y-Z;Q.style.width=$>0?V/$*100+"%":"0%"};window.addEventListener("scroll",X,{passive:!0}),X()}function y(){let Q=document.querySelector(".search-floating-container"),X=document.getElementById("floatingSearchInput"),W=Q?.querySelector(".clear-button"),J=Q?.querySelector(".floating-results-container");if(!Q||!X||!W||!J)return;if(!W.innerHTML.trim())W.innerHTML="❌";let V,Y=(Z)=>{return Z.replace(/[&<>'"]/g,($)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[$]||$)};X.addEventListener("input",()=>{let Z=X.value.trim();if(W.style.display=Z.length?"block":"none",Z.length<3){J.style.display="none";return}clearTimeout(V),V=setTimeout(async()=>{try{J.innerHTML='<div class="no-results">⏳ Memindai data...</div>',J.style.display="block";let q=`/cari?q=${encodeURIComponent(Z)}&page=1&limit=10`,z=await fetch(q);if(!z.ok)throw Error(`HTTP Error: ${z.status}`);let P=await z.json(),j=P.results||P.data||[];if(j.length>0)J.innerHTML=j.map((G)=>{let F=G.id?G.id.replace(".html",""):"tanpa-judul",A=`/${(G.category||"Lainnya").toLowerCase().replace(/\s+/g,"-")}/${F}`,C=G.snippet_text?G.snippet_text.substring(0,60)+"...":"Lihat artikel selengkapnya";return`
        <a href="${A}">
        <strong>${Y(G.title||"Tanpa Judul")}</strong>
        <small>${Y(C)}</small>
        </a>
        `}).join("");else J.innerHTML=`<div class="no-results">❌ Pencarian "${Y(Z)}" nihil. Tekan Enter untuk detail.</div>`}catch($){console.error("❌ Gagal fetch Floating Search D1:",$),J.innerHTML='<div class="no-results">⚠️ Ups, database sedang sibuk. Coba sesaat lagi.</div>'}},300)}),X.addEventListener("keydown",(Z)=>{if(Z.key==="Enter"){Z.preventDefault();let $=X.value.trim();if($)window.location.href=`/search/?q=${encodeURIComponent($)}`}}),W.addEventListener("click",()=>{X.value="",J.style.display="none",W.style.display="none",clearTimeout(V),X.focus()})}function x(Q,X){let W=document.getElementById("related-articles-grid");if(!W)return;let J=O(X,Q);if(!J)return;let V=document.getElementById("dynamic-nav-container");if(!V)V=document.createElement("div"),V.id="dynamic-nav-container",V.className="floating-nav",W.appendChild(V);let Y=document.querySelector('link[rel="prev"]'),Z=document.querySelector('link[rel="next"]'),$="";if(Y){let q=Y.getAttribute("title")||"Artikel Sebelumnya";$+=`<a href="${Y.getAttribute("href")}" title="${q}" class="btn-emoji">⏪</a>`}if(Z){let q=Z.getAttribute("title")||"Artikel Selanjutnya";$+=`<a href="${Z.getAttribute("href")}" title="${q}" class="btn-emoji">⏩</a>`}V.innerHTML=`
<div class="nav-left"><a href="/${J.slug}" class="category-link visible">${J.name}</a></div>
<div class="nav-right">
<a href="/" title="Beranda" class="btn-emoji">\uD83C\uDFE0</a>
<a href="/sitemap" title="Daftar Isi" class="btn-emoji">\uD83D\uDCC4</a>
<a href="/feed" title="RSS Feed" class="btn-emoji">\uD83D\uDCE1</a>
${$}
</div>`}function L(){let Q=document.getElementById("internal-nav");if(!Q)return;let W=Array.from(document.querySelectorAll("h2, h3, h4")).filter((J)=>{return(J.textContent||"").trim().length>0&&!J.closest(".floating-nav")&&!Q.contains(J)});if(W.length===0){Q.style.display="none";return}Q.innerHTML='<ul class="nav-list">'+W.map((J,V)=>{let Y=(J.textContent||"").trim();if(!J.id)J.id=Y.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||`section-${V}`;return`<li class="nav-item nav-${J.tagName.toLowerCase()}"><a href="#${J.id}" class="nav-link">${Y}</a></li>`}).join("")+"</ul>",Q.addEventListener("click",(J)=>{let V=J.target;if(V.tagName.toLowerCase()==="a"&&V.classList.contains("nav-link")){let Y=V.getAttribute("href");if(!Y||!Y.startsWith("#"))return;let Z=Y.substring(1),$=document.getElementById(Z);if($){let q=$.closest("details");while(q){if(!q.open)q.open=!0;q=q.parentElement?.closest("details")||null}}}})}function b(Q,X){let W=document.getElementById("related-articles-grid");if(!W)return;let J=O(X,Q);if(!J){W.style.display="none";return}let V="/thumbnail-sm.webp",Y=J.list.filter(($)=>$.id!==X).sort(()=>0.5-Math.random()).slice(0,6);if(Y.length===0){W.style.display="none";return}W.innerHTML=Y.map(($,q)=>{let z=$.image||V,P=$.image?`${$.image.replace(/\.[^/.]+$/,"")}-rg.webp`:V;return`
    <div class="rel-card-mini">
    <a href="${K($.id,Q)}">
    <div class="rel-img-mini">
    <img
    class="lk-related-thumb"
    data-fallback-idx="${q}"
    src="${P}"
    alt="${$.title}"
    width="120"
    height="100"
    loading="lazy"
    decoding="async">
    </div>
    <div class="rel-info-mini">
    <h4>${$.title}</h4>
    </div>
    </a>
    </div>
    `}).join(""),W.querySelectorAll(".lk-related-thumb[data-fallback-idx]").forEach(($)=>{let q=Number($.dataset.fallbackIdx),z=Y[q];if(!z)return;let P=z.image||V;_($,[P,V])})}function D(Q,X){function W(J){if(J==="down"){window.location.href="/";return}if(J==="up"){let Y=O(X,Q);if(Y)window.location.href=`/${Y.slug}`;return}let V=document.querySelector(`link[rel="${J}"]`);if(V){let Y=V.getAttribute("href");if(Y)window.location.href=Y}}document.addEventListener("keydown",(J)=>{if(H())return;let V=document.activeElement;if(V.tagName==="INPUT"||V.tagName==="TEXTAREA"||V.isContentEditable||V.closest("#disqus_thread"))return;if(J.ctrlKey&&J.key==="ArrowDown")J.preventDefault(),W("down");if(J.ctrlKey&&J.key==="ArrowUp")J.preventDefault(),W("up");if(J.ctrlKey&&J.key==="ArrowRight")J.preventDefault(),W("next");if(J.ctrlKey&&J.key==="ArrowLeft")J.preventDefault(),W("prev")})}async function U(){while(!window.siteDataProvider)await new Promise((W)=>setTimeout(W,100));let Q=await window.siteDataProvider.getFor("pemandu.ts"),X=B();if(Q)L(),E(),y(),b(Q,X),x(Q,X),D(Q,X)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",U):U()})();})();
