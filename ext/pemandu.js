(()=>{(function(){function B(){return window.innerWidth<=768||"ontouchstart"in window||navigator.maxTouchPoints>0}function v(J){return J?J.replace(/\.html$/,""):""}function F(){let W=window.location.pathname.split("/").filter(Boolean).pop();if(!W||W==="artikel")return"";return W.endsWith(".html")?W:`${W}.html`}function E(J){if(!J)return"Lainnya";return J.split("-").map((W)=>W.charAt(0).toUpperCase()+W.slice(1)).join(" ")}function H(J,W){for(let[V,Y]of Object.entries(W))if(Y.some(($)=>$.id===J))return{name:E(V),slug:V,list:Y};let Z=window.location.pathname.split("/").filter(Boolean);if(Z.length>0){let V=Z[0];for(let[Y,$]of Object.entries(W))if(Y===V)return{name:E(Y),slug:Y,list:$}}return null}let M="img-broken-placeholder",k=!1;function L(){if(k)return;k=!0;let J=document.createElement("style");J.textContent=`
  .${M} {
    display: flex !important;
    align-items: center;
    justify-content: center;
    background-color: #1a1a1c;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='M21 15l-5-5L5 21'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 32%;
  }
  `,document.head.appendChild(J)}function A(J,W){let Z=[...new Set(W.filter(Boolean))],V=0;function Y(){if(V<Z.length)J.src=Z[V],V++;else J.removeEventListener("error",Y),L(),J.classList.add(M),J.removeAttribute("src"),J.alt=J.alt||"Gambar tidak tersedia"}J.addEventListener("error",Y)}function S(){let J=document.getElementById("progress");if(!J)return;let W=()=>{let{documentElement:Z,body:V}=document,Y=Z.scrollTop||V.scrollTop,$=Z.scrollHeight||V.scrollHeight,q=Z.clientHeight,X=$-q;J.style.width=X>0?Y/X*100+"%":"0%"};window.addEventListener("scroll",W,{passive:!0}),W()}function w(){let J=document.querySelector(".search-floating-container"),W=document.getElementById("floatingSearchInput"),Z=J?.querySelector(".clear-button"),V=J?.querySelector(".floating-results-container");if(!J||!W||!Z||!V)return;if(!Z.innerHTML.trim())Z.innerHTML="❌";let Y,$=(q)=>q.replace(/[&<>'"]/g,(X)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[X]||X);W.addEventListener("input",()=>{let q=W.value.trim();if(Z.style.display=q.length?"block":"none",q.length<3){V.style.display="none";return}clearTimeout(Y),Y=setTimeout(async()=>{try{V.innerHTML='<div class="no-results">⏳ Memindai data...</div>',V.style.display="block";let X=encodeURIComponent(q),Q=await fetch(`/cari?q=${X}&page=1&limit=10`);if(!Q.ok)throw Error(`HTTP Error: ${Q.status}`);let z=await Q.json(),O=z.results||z.data||[];if(O.length>0)V.innerHTML=O.map((G)=>{let j=G.id?G.id.replace(".html",""):"tanpa-judul",_=(G.category||"Lainnya").toLowerCase().replace(/\s+/g,"-"),R=G.snippet_text?G.snippet_text.substring(0,60)+"...":"Lihat artikel selengkapnya";return`<a href="/${_}/${j}"><strong>${$(G.title||"Tanpa Judul")}</strong><small>${$(R)}</small></a>`}).join("");else V.innerHTML=`<div class="no-results">❌ Pencarian "${$(q)}" nihil. Tekan Enter untuk detail.</div>`}catch(X){console.error("❌ Gagal fetch Floating Search D1:",X),V.innerHTML='<div class="no-results">⚠️ Ups, database sedang sibuk. Coba sesaat lagi.</div>'}},300)}),W.addEventListener("keydown",(q)=>{if(q.key==="Enter"){q.preventDefault();let X=W.value.trim();if(X)window.location.href=`/search/?q=${encodeURIComponent(X)}`}}),Z.addEventListener("click",()=>{W.value="",V.style.display="none",Z.style.display="none",clearTimeout(Y),W.focus()})}function x(J,W){let Z=document.getElementById("related-articles-grid");if(!Z)return;let V=H(W,J);if(!V)return;let Y=V.list.find((U)=>U.id===W),$=Y?Y.title:document.title,q="";if(Y&&Y.description)q=Y.description;else{let U=document.querySelector('meta[name="description"]');if(U)q=U.getAttribute("content")||""}let X=q?q:$,Q=encodeURIComponent(X),z=encodeURIComponent(window.location.href),O=document.getElementById("dynamic-nav-container");if(!O)if(O=document.createElement("div"),O.id="dynamic-nav-container",O.className="floating-nav",Z.parentNode)Z.parentNode.insertBefore(O,Z.nextSibling);else document.body.appendChild(O);let G=document.querySelector('link[rel="prev"]'),j=document.querySelector('link[rel="next"]'),K="";if(G){let U=G.getAttribute("title")||"Artikel Sebelumnya";K+=`<a href="${G.getAttribute("href")}" title="${U}" class="btn-emoji">⏪</a>`}if(j){let U=j.getAttribute("title")||"Artikel Selanjutnya";K+=`<a href="${j.getAttribute("href")}" title="${U}" class="btn-emoji">⏩</a>`}O.innerHTML=`
<div class="nav-left">
<a href="/${V.slug}" class="category-link visible">${V.name}</a>
</div>
<div class="nav-right">
<a href="/" title="Beranda" class="btn-emoji">\uD83C\uDFE0</a>
<a href="/sitemap" title="Daftar Isi" class="btn-emoji">\uD83D\uDCC4</a>
<a href="/feed" title="RSS Feed" class="btn-emoji">\uD83D\uDCE1</a>
${K}
<div class="lk-share-wrapper">
<button id="btn-share-main" class="lk-share-main-btn" title="Bagikan" aria-label="Bagikan">
<svg viewBox="0 0 3791 3729" width="20" height="20" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd"><path d="M713 1152c197 0 375 80 504 209 29 29 56 61 80 95l1125-468c-36-85-55-178-55-275 0-197 80-375 209-504S2883 0 3080 0s375 80 504 209 209 307 209 504-80 375-209 504-307 209-504 209-375-80-504-209c-22-22-43-46-62-71l-1132 471c29 77 45 161 45 248 0 54-6 106-17 157l1131 530c11-13 23-26 36-39 129-129 307-209 504-209s375 80 504 209 209 307 209 504-80 375-209 504-307 209-504 209-375-80-504-209-209-307-209-504c0-112 26-219 73-313l-1092-512c-34 66-78 126-130 177-129 129-307 209-504 209s-375-80-504-209S2 2062 2 1865s80-375 209-504 307-209 504-209zm2742-815c-96-96-229-156-376-156s-280 60-376 156-156 229-156 376 60 280 156 376 229 156 376 156 280-60 376-156 156-229 156-376-60-280-156-376zm0 2303c-96-96-229-156-376-156s-280 60-376 156-156 229-156 376 60 280 156 376 229 156 376 156 280-60 376-156 156-229 156-376-60-280-156-376zM1089 1488c-96-96-229-156-376-156s-280 60-376 156-156 229-156 376 60 280 156 376 229 156 376 156 280-60 376-156 156-229 156-376-60-280-156-376z" fill="currentColor" fill-rule="nonzero"/></svg>
</button>
<div id="lk-share-providers" class="lk-share-providers-hidden">
<a href="https://x.com/intent/post?text=${Q}&url=${z}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke X" aria-label="Bagikan ke X"><svg width="20" height="20" viewBox="0 0 512 462.799"><path fill="currentColor" fill-rule="nonzero" d="M403.229 0h78.506L310.219 196.04 512 462.799H354.002L230.261 301.007 88.669 462.799h-78.56l183.455-209.683L0 0h161.999l111.856 147.88L403.229 0zm-27.556 415.805h43.505L138.363 44.527h-46.68l283.99 371.278z"/></svg></a>
<a href="https://www.linkedin.com/shareArticle?mini=true&url=${z}&title=${Q}&summary=${Q}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=600');return false;" title="Bagikan ke LinkedIn" aria-label="Bagikan ke LinkedIn"><svg width="20" height="20" viewBox="0 0 122.88 122.31"><path fill="currentColor" d="M27.75,0H95.13a27.83,27.83,0,0,1,27.75,27.75V94.57a27.83,27.83,0,0,1-27.75,27.74H27.75A27.83,27.83,0,0,1,0,94.57V27.75A27.83,27.83,0,0,1,27.75,0Z"/><path fill="#fff" d="M49.19,47.41H64.72v8h.22c2.17-3.88,7.45-8,15.34-8,16.39,0,19.42,23.47V98.94H83.51V74c0-5.71-.12-13.06-8.42-13.06s-9.72,6.21-9.72,12.65v25.4H49.19V47.41ZM40,31.79a8.42,8.42,0,1,1-8.42-8.42A8.43,8.43,0,0,1,40,31.79ZM23.18,47.41H40V98.94H23.18V47.41Z"/></svg></a>
<a href="https://t.me/share/url?url=${z}&text=${Q}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Telegram" aria-label="Bagikan ke Telegram"><svg width="20" height="20" viewBox="0 0 512 512"><circle fill="#229ED9" cx="256" cy="256" r="256"/><path fill="#fff" d="M115.88 253.3c74.63-32.52 124.39-53.95 149.29-64.31 71.1-29.57 85.87-34.71 95.5-34.88 2.12-.03 6.85.49 9.92 2.98 2.59 2.1 3.3 4.94 3.64 6.93.34 2 .77 6.53.43 10.08-3.85 40.48-20.52 138.71-29 184.05-3.59 19.19-10.66 25.62-17.5 26.25-14.86 1.37-26.15-9.83-40.55-19.27-22.53-14.76-35.26-23.96-57.13-38.37-25.28-16.66-8.89-25.81 5.51-40.77 3.77-3.92 69.27-63.5 70.54-68.9.16-.68.31-3.2-1.19-4.53s-3.71-.87-5.3-.51c-2.26.51-38.25 24.3-107.98 71.37-10.22 7.02-19.48 10.43-27.77 10.26-9.14-.2-26.72-5.17-39.79-9.42-16.03-5.21-28.77-7.97-27.66-16.82.57-4.61 6.92-9.32 19.04-14.14z"/></svg></a>
<a href="https://www.facebook.com/sharer/sharer.php?u=${z}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Facebook" aria-label="Bagikan ke Facebook"><svg width="20" height="20" viewBox="0 0 509 509"><g fill-rule="nonzero"><path fill="#0866FF" d="M509 254.5C509 113.94 395.06 0 254.5 0S0 113.94 0 254.5C0 373.86 82.17 474 193.02 501.51V332.27h-52.48V254.5h52.48v-33.51c0-86.63 39.2-126.78 124.24-126.78 16.13 0 43.95 3.17 55.33 6.33v70.5c-6.01-.63-16.44-.95-29.4-.95-41.73 0-57.86 15.81-57.86 56.91v27.5h83.13l-14.28 77.77h-68.85v174.87C411.35 491.92 509 384.62 509 254.5z"/><path fill="var(--bg-card)" d="M354.18 332.27l14.28-77.77h-83.13V227c0-41.1 16.13-56.91 57.86-56.91 12.96 0 23.39.32 29.4.95v-70.5c-11.38-3.16-39.2-6.33-55.33-6.33-85.04 0-124.24 40.16-124.24 126.78v33.51h-52.48v77.77h52.48v169.24c19.69 4.88 40.28 7.49 61.48 7.49 10.44 0 20.72-.64 30.83-1.86V332.27h68.85z"/></g></svg></a>
<a href="https://api.whatsapp.com/send?text=${Q}%0A%0A${z}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke WhatsApp" aria-label="Bagikan ke WhatsApp"><svg width="20" height="20" viewBox="0 0 240 241.19"><path fill="#25d366" fill-rule="evenodd" d="M205,35.05A118.61,118.61,0,0,0,120.46,0C54.6,0,1,53.61,1,119.51a119.5,119.5,0,0,0,16,59.74L0,241.19l63.36-16.63a119.43,119.43,0,0,0,57.08,14.57h0A119.54,119.54,0,0,0,205,35.07v0ZM120.5,219A99.18,99.18,0,0,1,69.91,205.1l-3.64-2.17-37.6,9.85,10-36.65-2.35-3.76A99.37,99.37,0,0,1,190.79,49.27,99.43,99.43,0,0,1,120.49,219ZM175,144.54c-3-1.51-17.67-8.71-20.39-9.71s-4.72-1.51-6.75,1.51-7.72,9.71-9.46,11.72-3.49,2.27-6.45.76-12.63-4.66-24-14.84A91.1,91.1,0,0,1,91.25,113.3c-1.75-3-.19-4.61,1.33-6.07s3-3.48,4.47-5.23a19.65,19.65,0,0,0,3-5,5.51,5.51,0,0,0-.24-5.23C99,90.27,93,75.57,90.6,69.58s-4.89-5-6.73-5.14-3.73-.09-5.7-.09a11,11,0,0,0-8,3.73C67.48,71.05,59.75,78.3,59.75,93s10.69,28.88,12.19,30.9S93,156.07,123,169c7.12,3.06,12.68,4.9,17,6.32a41.18,41.18,0,0,0,18.8,1.17c5.74-.84,17.66-7.21,20.17-14.18s2.5-13,1.75-14.19-2.69-2.06-5.7-3.59l0,0Z"/></svg></a>
<a href="https://www.threads.com/intent/post?text=${Q}&url=${z}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Threads" aria-label="Bagikan ke Threads"><svg width="20" height="20" viewBox="0 0 512 512"><path d="M105 0h302c57.75 0 105 47.25 105 105v302c0 57.75-47.25 105-105 105H105C47.25 512 0 464.75 0 407V105C0 47.25 47.25 0 105 0z"/><path fill="var(--bg-card)" fill-rule="nonzero" d="M337.36 243.58c-1.46-.7-2.95-1.38-4.46-2.02-2.62-48.36-29.04-76.05-73.41-76.33-25.6-.17-48.52 10.27-62.8 31.94l24.4 16.74c10.15-15.4 26.08-18.68 37.81-18.68h.4c14.61.09 25.64 4.34 32.77 12.62 5.19 6.04 8.67 14.37 10.39 24.89-12.96-2.2-26.96-2.88-41.94-2.02-42.18 2.43-69.3 27.03-67.48 61.21.92 17.35 9.56 32.26 24.32 42.01 12.48 8.24 28.56 12.27 45.26 11.35 22.07-1.2 39.37-9.62 51.45-25.01 9.17-11.69 14.97-26.84 17.53-45.92 10.51 6.34 18.3 14.69 22.61 24.73 7.31 17.06 7.74 45.1-15.14 67.96-20.04 20.03-44.14 28.69-80.55 28.96-40.4-.3-70.95-13.26-90.81-38.51-18.6-23.64-28.21-57.79-28.57-101.5.36-43.71 9.97-77.86 28.57-101.5 19.86-25.25 50.41-38.21 90.81-38.51 40.68.3 71.76 13.32 92.39 38.69 10.11 12.44 17.73 28.09 22.76 46.33l28.59-7.63c-6.09-22.45-15.67-41.8-28.72-57.85-26.44-32.53-65.1-49.19-114.92-49.54h-.2c-49.72.35-87.96 17.08-113.64 49.73-22.86 29.05-34.65 69.48-35.04 120.16v.24c.39 50.68 12.18 91.11 35.04 120.16 25.68 32.65 63.92 49.39 113.64 49.73h.2c44.2-.31 75.36-11.88 101.03-37.53 33.58-33.55 32.57-75.6 21.5-101.42-7.94-18.51-23.08-33.55-43.79-43.48zm-76.32 71.76c-18.48 1.04-37.69-7.26-38.64-25.03-.7-13.18 9.38-27.89 39.78-29.64 3.48-.2 6.9-.3 10.25-.3 11.04 0 21.37 1.07 30.76 3.13-3.5 43.74-24.04 50.84-42.15 51.84z"/></svg></a>
<a href="https://share.flipboard.com/bookmarklet/popout?v=2&title=${Q}&url=${z}&utm_source=dalam.web.id" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=600');return false;" title="Bagikan ke Flipboard" aria-label="Bagikan ke Flipboard"><svg width="20" height="20" viewBox="0 0 122.88 122.88"><path fill="#F52828" d="M0,0v122.88h122.88V0H0L0,0z M98.3,49.15H73.73v24.58H49.15V98.3H24.58V24.58H98.3V49.15L98.3,49.15z"/></svg></a>
</div>
</div>
</div>`;let _=document.getElementById("btn-share-main"),R=document.getElementById("lk-share-providers");if(_&&R)_.addEventListener("click",async()=>{if(navigator.share&&B())try{await navigator.share({title:$,text:X,url:window.location.href})}catch(U){console.error(U)}else{let U=R.classList.contains("lk-share-providers-hidden");R.classList.toggle("lk-share-providers-hidden",!U),R.classList.toggle("lk-share-providers-visible",U)}})}function I(){let J=document.getElementById("internal-nav");if(!J)return;let Z=Array.from(document.querySelectorAll("h2, h3, h4")).filter((V)=>{return(V.textContent||"").trim().length>0&&!V.closest(".floating-nav")&&!J.contains(V)});if(Z.length===0){J.style.display="none";return}J.innerHTML='<ul class="nav-list">'+Z.map((V,Y)=>{let $=(V.textContent||"").trim();if(!V.id)V.id=$.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||`section-${Y}`;return`<li class="nav-item nav-${V.tagName.toLowerCase()}"><a href="#${V.id}" class="nav-link">${$}</a></li>`}).join("")+"</ul>",J.addEventListener("click",(V)=>{let Y=V.target;if(Y.tagName.toLowerCase()==="a"&&Y.classList.contains("nav-link")){let $=Y.getAttribute("href");if(!$||!$.startsWith("#"))return;let q=$.substring(1),X=document.getElementById(q);if(X){let Q=X.closest("details");while(Q){if(!Q.open)Q.open=!0;Q=Q.parentElement?.closest("details")||null}}}})}async function y(J){let W=document.getElementById("related-articles-grid");if(!W)return;try{let Z=await window.siteDataProvider.getRelatedLiteData();if(!Z||Object.keys(Z).length===0){W.style.display="none";return}let V=H(J,Z);if(!V){W.style.display="none";return}let Y="/thumbnail-sm.webp",$=V.list.filter((X)=>X.id!==J).sort(()=>0.5-Math.random()).slice(0,6);if($.length===0){W.style.display="none";return}W.innerHTML=$.map((X,Q)=>{let z=X.image?`${X.image.replace(/\.[^/.]+$/,"")}-rg.webp`:Y;return`
  <div class="rel-card-mini">
  <a href="${`/${V.slug}/${X.id.replace(".html","")}`}">
  <div class="rel-img-mini">
  <img class="lk-related-thumb" data-fallback-idx="${Q}" src="${z}" alt="${X.title}" width="120" height="100" loading="lazy" decoding="async">
  </div>
  <div class="rel-info-mini">
  <h4>${X.title}</h4>
  </div>
  </a>
  </div>
  `}).join(""),W.querySelectorAll(".lk-related-thumb[data-fallback-idx]").forEach((X)=>{let Q=Number(X.dataset.fallbackIdx),z=$[Q];if(!z)return;let O=z.image||Y;A(X,[O,Y])})}catch(Z){console.error(Z),W.style.display="none"}}function C(J,W){function Z(V){if(V==="down"){window.location.href="/";return}if(V==="up"){let $=H(W,J);if($)window.location.href=`/${$.slug}`;return}let Y=document.querySelector(`link[rel="${V}"]`);if(Y){let $=Y.getAttribute("href");if($)window.location.href=$}}document.addEventListener("keydown",(V)=>{if(B())return;let Y=document.activeElement;if(Y.tagName==="INPUT"||Y.tagName==="TEXTAREA"||Y.isContentEditable||Y.closest("#disqus_thread"))return;if(V.ctrlKey&&V.key==="ArrowDown")V.preventDefault(),Z("down");if(V.ctrlKey&&V.key==="ArrowUp")V.preventDefault(),Z("up");if(V.ctrlKey&&V.key==="ArrowRight")V.preventDefault(),Z("next");if(V.ctrlKey&&V.key==="ArrowLeft")V.preventDefault(),Z("prev")})}let P=[];function f(){if(document.getElementById("playground-styles"))return;let J=document.createElement("style");J.id="playground-styles",J.innerHTML=`
/* POSISI DESKTOP (STICKY) */
#random-playground-widget {
position: fixed;
top: 6rem;
right: 1.25rem;
width: 18.75rem;
background-color: transparent;
border: none;
z-index: 999;
}

/* POSISI MOBILE (PINDAH KE BAWAH) */
@media (max-width: 1024px) {
  #random-playground-widget {
  position: relative;
  top: auto;
  right: auto;
  width: 100%;
  margin-top: 2rem;
  padding: 1rem;
  border-top: 1px solid var(--border);
  }
}

.playground-item { /* ... styling tetap sama ... */ }
#shuffle-btn { /* ... styling tetap sama ... */ }
.shake-anim { animation: shakeAndFade 0.4s ease-in-out forwards; }
@keyframes shakeAndFade { /* ... keyframe tetap sama ... */ }
`,document.head.appendChild(J)}function N(J){let W=window.location.pathname,V=P.filter((X)=>!W.includes(X.id.replace(".html",""))).sort(()=>0.5-Math.random()).slice(0,5),Y=`
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.75rem;">
  <h3 style="font-size:1.1rem; margin:0; font-weight:700; color:var(--text, #fff); display:flex; align-items:center; gap:8px;">
  <i class="fa-solid fa-dice" style="color:var(--primary, #F6821F);"></i> Artikel Acak
  </h3>
  <button id="shuffle-btn" title="Kocok Artikel Lain!">
  <i class="fa-solid fa-arrows-rotate"></i>
  </button>
  </div>
  <div id="playground-list" style="display:flex; flex-direction:column; gap:4px;"></div>
  `;if(!document.getElementById("shuffle-btn"))J.innerHTML=`
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:0.75rem;">
  <h3 style="font-size:1.1rem; margin:0; font-weight:700; color:var(--text, #fff); display:flex; align-items:center; gap:8px;">
  <i class="fa-solid fa-dice" style="color:var(--primary, #F6821F);"></i> Artikel Acak
  </h3>
  <button id="shuffle-btn" title="Kocok Artikel Lain!">
  <i class="fa-solid fa-arrows-rotate"></i>
  </button>
  </div>
  <div id="playground-list" style="display:flex; flex-direction:column; gap:4px;"></div>
  `;let $=document.getElementById("playground-list");if(!$)return;$.innerHTML=V.map((X)=>{let Q=X.title.replace(/\s*-\s*Layar Kosong$/i,""),z=X.image?X.image.replace(/\.(jpg|jpeg|png|webp)$/i,"-sm.webp"):"/thumbnail-sm.webp",O=(X.category||"lainnya").toLowerCase().replace(/\s+/g,"-"),G=X.id.replace(".html","");return`
    <a href="${`/${O}/${G}`}" class="playground-item">
    <img src="${z}" alt="${Q}" style="width:65px; height:65px; object-fit:cover; border-radius:8px; flex-shrink:0; background:var(--border);">
    <div style="flex-grow:1; min-width:0;">
    <h4 style="margin:0 0 4px 0; font-size:0.85rem; line-height:1.4; font-weight:600; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
    ${Q}
    </h4>
    <span style="font-size:0.65rem; color:var(--primary, #F6821F); font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">${X.category}</span>
    </div>
    </a>
    `}).join("");let q=document.getElementById("shuffle-btn");if(q)q.addEventListener("click",function(){let X=this.querySelector("i");if(X)X.style.transition="transform 0.4s ease",X.style.transform=`rotate(${Math.random()>0.5?180:-180}deg)`,setTimeout(()=>{X.style.transition="none",X.style.transform="rotate(0deg)"},400);$.querySelectorAll(".playground-item").forEach((z)=>z.classList.add("shake-anim")),setTimeout(()=>{N(J)},400)})}async function D(){f();let J=document.getElementById("random-playground-widget");if(!J)if(J=document.createElement("aside"),J.id="random-playground-widget",B())document.body.appendChild(J);else{let W=document.querySelector(".article-content, main, article, #main-wrapper");if(W&&W.parentNode)W.parentNode.insertBefore(J,W.nextSibling);else document.body.appendChild(J)}if(P.length===0)try{let W=await window.siteDataProvider.getFor("pemandu.ts");P=Object.values(W).flat()}catch(W){return}N(J)}async function b(){try{while(!window.siteDataProvider)await new Promise((Z)=>setTimeout(Z,100));let J=await window.siteDataProvider.getFor("pemandu.ts"),W=F();if(J&&Object.keys(J).length>0)I(),S(),w(),x(J,W),C(J,W);y(W),D()}catch(J){console.error("Gagal inisialisasi Pemandu:",J)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",b):b()})();})();
