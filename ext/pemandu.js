(()=>{(function(){function P(){return window.innerWidth<=768||"ontouchstart"in window||navigator.maxTouchPoints>0}function C(V){return V?V.replace(/\.html$/,""):""}function w(){let Z=window.location.pathname.split("/").filter(Boolean).pop();if(!Z||Z==="artikel")return"";return Z.endsWith(".html")?Z:`${Z}.html`}function k(V){if(!V)return"Lainnya";return V.split("-").map((Z)=>Z.charAt(0).toUpperCase()+Z.slice(1)).join(" ")}function M(V,Z){for(let[J,X]of Object.entries(Z))if(X.some(($)=>$.id===V))return{name:k(J),slug:J,list:X};let Y=window.location.pathname.split("/").filter(Boolean);if(Y.length>0){let J=Y[0];for(let[X,$]of Object.entries(Z))if(X===J)return{name:k(X),slug:X,list:$}}return null}let B="img-broken-placeholder",N=!1;function F(){if(N)return;N=!0;let V=document.createElement("style");V.textContent=`
  .${B} {
    display: flex !important;
    align-items: center;
    justify-content: center;
    background-color: #1a1a1c;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='M21 15l-5-5L5 21'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 32%;
  }
  `,document.head.appendChild(V)}function L(V,Z){let Y=[...new Set(Z.filter(Boolean))],J=0;function X(){if(J<Y.length)V.src=Y[J],J++;else V.removeEventListener("error",X),F(),V.classList.add(B),V.removeAttribute("src"),V.alt=V.alt||"Gambar tidak tersedia"}V.addEventListener("error",X)}function S(){let V=document.getElementById("progress");if(!V)return;let Z=()=>{let{documentElement:Y,body:J}=document,X=Y.scrollTop||J.scrollTop,$=Y.scrollHeight||J.scrollHeight,q=Y.clientHeight,Q=$-q;V.style.width=Q>0?X/Q*100+"%":"0%"};window.addEventListener("scroll",Z,{passive:!0}),Z()}function A(){let V=document.querySelector(".search-floating-container"),Z=document.getElementById("floatingSearchInput"),Y=V?.querySelector(".clear-button"),J=V?.querySelector(".floating-results-container");if(!V||!Z||!Y||!J)return;if(!Y.innerHTML.trim())Y.innerHTML="❌";let X,$=(q)=>q.replace(/[&<>'"]/g,(Q)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[Q]||Q);Z.addEventListener("input",()=>{let q=Z.value.trim();if(Y.style.display=q.length?"block":"none",q.length<3){J.style.display="none";return}clearTimeout(X),X=setTimeout(async()=>{try{J.innerHTML='<div class="no-results">⏳ Memindai data...</div>',J.style.display="block";let Q=encodeURIComponent(q),z=await fetch(`/cari?q=${Q}&page=1&limit=10`);if(!z.ok)throw Error(`HTTP Error: ${z.status}`);let O=await z.json(),W=O.results||O.data||[];if(W.length>0)J.innerHTML=W.map((U)=>{let K=U.id?U.id.replace(".html",""):"tanpa-judul",H=(U.category||"Lainnya").toLowerCase().replace(/\s+/g,"-"),j=U.snippet_text?U.snippet_text.substring(0,60)+"...":"Lihat artikel selengkapnya";return`<a href="/${H}/${K}"><strong>${$(U.title||"Tanpa Judul")}</strong><small>${$(j)}</small></a>`}).join("");else J.innerHTML=`<div class="no-results">❌ Pencarian "${$(q)}" nihil. Tekan Enter untuk detail.</div>`}catch(Q){console.error("❌ Gagal fetch Floating Search D1:",Q),J.innerHTML='<div class="no-results">⚠️ Ups, database sedang sibuk. Coba sesaat lagi.</div>'}},300)}),Z.addEventListener("keydown",(q)=>{if(q.key==="Enter"){q.preventDefault();let Q=Z.value.trim();if(Q)window.location.href=`/search/?q=${encodeURIComponent(Q)}`}}),Y.addEventListener("click",()=>{Z.value="",J.style.display="none",Y.style.display="none",clearTimeout(X),Z.focus()})}function x(V,Z){let Y=document.getElementById("related-articles-grid");if(!Y)return;let J=M(Z,V);if(!J)return;let X=J.list.find((G)=>G.id===Z),$=X?X.title:document.title,q="";if(X&&X.description)q=X.description;else{let G=document.querySelector('meta[name="description"]');if(G)q=G.getAttribute("content")||""}let Q=q?q:$,z=encodeURIComponent(Q),O=encodeURIComponent(window.location.href),W=document.getElementById("dynamic-nav-container");if(!W)if(W=document.createElement("div"),W.id="dynamic-nav-container",W.className="floating-nav",Y.parentNode)Y.parentNode.insertBefore(W,Y.nextSibling);else document.body.appendChild(W);let U=document.querySelector('link[rel="prev"]'),K=document.querySelector('link[rel="next"]'),_="";if(U){let G=U.getAttribute("title")||"Artikel Sebelumnya";_+=`<a href="${U.getAttribute("href")}" title="${G}" class="btn-emoji">⏪</a>`}if(K){let G=K.getAttribute("title")||"Artikel Selanjutnya";_+=`<a href="${K.getAttribute("href")}" title="${G}" class="btn-emoji">⏩</a>`}W.innerHTML=`
<div class="nav-left">
<a href="/${J.slug}" class="category-link visible">${J.name}</a>
</div>
<div class="nav-right">
<a href="/" title="Beranda" class="btn-emoji">\uD83C\uDFE0</a>
<a href="/sitemap" title="Daftar Isi" class="btn-emoji">\uD83D\uDCC4</a>
<a href="/feed" title="RSS Feed" class="btn-emoji">\uD83D\uDCE1</a>
${_}
<div class="lk-share-wrapper">
<button id="btn-share-main" class="lk-share-main-btn" title="Bagikan" aria-label="Bagikan">
<svg viewBox="0 0 3791 3729" width="20" height="20" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd"><path d="M713 1152c197 0 375 80 504 209 29 29 56 61 80 95l1125-468c-36-85-55-178-55-275 0-197 80-375 209-504S2883 0 3080 0s375 80 504 209 209 307 209 504-80 375-209 504-307 209-504 209-375-80-504-209c-22-22-43-46-62-71l-1132 471c29 77 45 161 45 248 0 54-6 106-17 157l1131 530c11-13 23-26 36-39 129-129 307-209 504-209s375 80 504 209 209 307 209 504-80 375-209 504-307 209-504 209-375-80-504-209-209-307-209-504c0-112 26-219 73-313l-1092-512c-34 66-78 126-130 177-129 129-307 209-504 209s-375-80-504-209S2 2062 2 1865s80-375 209-504 307-209 504-209zm2742-815c-96-96-229-156-376-156s-280 60-376 156-156 229-156 376 60 280 156 376 229 156 376 156 280-60 376-156 156-229 156-376-60-280-156-376zm0 2303c-96-96-229-156-376-156s-280 60-376 156-156 229-156 376 60 280 156 376 229 156 376 156 280-60 376-156 156-229 156-376-60-280-156-376zM1089 1488c-96-96-229-156-376-156s-280 60-376 156-156 229-156 376 60 280 156 376 229 156 376 156 280-60 376-156 156-229 156-376-60-280-156-376z" fill="currentColor" fill-rule="nonzero"/></svg>
</button>
<div id="lk-share-providers" class="lk-share-providers-hidden">
<a href="https://x.com/intent/post?text=${z}&url=${O}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke X" aria-label="Bagikan ke X"><svg width="20" height="20" viewBox="0 0 512 462.799"><path fill="currentColor" fill-rule="nonzero" d="M403.229 0h78.506L310.219 196.04 512 462.799H354.002L230.261 301.007 88.669 462.799h-78.56l183.455-209.683L0 0h161.999l111.856 147.88L403.229 0zm-27.556 415.805h43.505L138.363 44.527h-46.68l283.99 371.278z"/></svg></a>
<a href="https://www.linkedin.com/shareArticle?mini=true&url=${O}&title=${z}&summary=${z}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=600');return false;" title="Bagikan ke LinkedIn" aria-label="Bagikan ke LinkedIn"><svg width="20" height="20" viewBox="0 0 122.88 122.31"><path fill="currentColor" d="M27.75,0H95.13a27.83,27.83,0,0,1,27.75,27.75V94.57a27.83,27.83,0,0,1-27.75,27.74H27.75A27.83,27.83,0,0,1,0,94.57V27.75A27.83,27.83,0,0,1,27.75,0Z"/><path fill="#fff" d="M49.19,47.41H64.72v8h.22c2.17-3.88,7.45-8,15.34-8,16.39,0,19.42,23.47V98.94H83.51V74c0-5.71-.12-13.06-8.42-13.06s-9.72,6.21-9.72,12.65v25.4H49.19V47.41ZM40,31.79a8.42,8.42,0,1,1-8.42-8.42A8.43,8.43,0,0,1,40,31.79ZM23.18,47.41H40V98.94H23.18V47.41Z"/></svg></a>
<a href="https://t.me/share/url?url=${O}&text=${z}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Telegram" aria-label="Bagikan ke Telegram"><svg width="20" height="20" viewBox="0 0 512 512"><circle fill="#229ED9" cx="256" cy="256" r="256"/><path fill="#fff" d="M115.88 253.3c74.63-32.52 124.39-53.95 149.29-64.31 71.1-29.57 85.87-34.71 95.5-34.88 2.12-.03 6.85.49 9.92 2.98 2.59 2.1 3.3 4.94 3.64 6.93.34 2 .77 6.53.43 10.08-3.85 40.48-20.52 138.71-29 184.05-3.59 19.19-10.66 25.62-17.5 26.25-14.86 1.37-26.15-9.83-40.55-19.27-22.53-14.76-35.26-23.96-57.13-38.37-25.28-16.66-8.89-25.81 5.51-40.77 3.77-3.92 69.27-63.5 70.54-68.9.16-.68.31-3.2-1.19-4.53s-3.71-.87-5.3-.51c-2.26.51-38.25 24.3-107.98 71.37-10.22 7.02-19.48 10.43-27.77 10.26-9.14-.2-26.72-5.17-39.79-9.42-16.03-5.21-28.77-7.97-27.66-16.82.57-4.61 6.92-9.32 19.04-14.14z"/></svg></a>
<a href="https://www.facebook.com/sharer/sharer.php?u=${O}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Facebook" aria-label="Bagikan ke Facebook"><svg width="20" height="20" viewBox="0 0 509 509"><g fill-rule="nonzero"><path fill="#0866FF" d="M509 254.5C509 113.94 395.06 0 254.5 0S0 113.94 0 254.5C0 373.86 82.17 474 193.02 501.51V332.27h-52.48V254.5h52.48v-33.51c0-86.63 39.2-126.78 124.24-126.78 16.13 0 43.95 3.17 55.33 6.33v70.5c-6.01-.63-16.44-.95-29.4-.95-41.73 0-57.86 15.81-57.86 56.91v27.5h83.13l-14.28 77.77h-68.85v174.87C411.35 491.92 509 384.62 509 254.5z"/><path fill="var(--bg-card)" d="M354.18 332.27l14.28-77.77h-83.13V227c0-41.1 16.13-56.91 57.86-56.91 12.96 0 23.39.32 29.4.95v-70.5c-11.38-3.16-39.2-6.33-55.33-6.33-85.04 0-124.24 40.16-124.24 126.78v33.51h-52.48v77.77h52.48v169.24c19.69 4.88 40.28 7.49 61.48 7.49 10.44 0 20.72-.64 30.83-1.86V332.27h68.85z"/></g></svg></a>
<a href="https://api.whatsapp.com/send?text=${z}%0A%0A${O}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke WhatsApp" aria-label="Bagikan ke WhatsApp"><svg width="20" height="20" viewBox="0 0 240 241.19"><path fill="#25d366" fill-rule="evenodd" d="M205,35.05A118.61,118.61,0,0,0,120.46,0C54.6,0,1,53.61,1,119.51a119.5,119.5,0,0,0,16,59.74L0,241.19l63.36-16.63a119.43,119.43,0,0,0,57.08,14.57h0A119.54,119.54,0,0,0,205,35.07v0ZM120.5,219A99.18,99.18,0,0,1,69.91,205.1l-3.64-2.17-37.6,9.85,10-36.65-2.35-3.76A99.37,99.37,0,0,1,190.79,49.27,99.43,99.43,0,0,1,120.49,219ZM175,144.54c-3-1.51-17.67-8.71-20.39-9.71s-4.72-1.51-6.75,1.51-7.72,9.71-9.46,11.72-3.49,2.27-6.45.76-12.63-4.66-24-14.84A91.1,91.1,0,0,1,91.25,113.3c-1.75-3-.19-4.61,1.33-6.07s3-3.48,4.47-5.23a19.65,19.65,0,0,0,3-5,5.51,5.51,0,0,0-.24-5.23C99,90.27,93,75.57,90.6,69.58s-4.89-5-6.73-5.14-3.73-.09-5.7-.09a11,11,0,0,0-8,3.73C67.48,71.05,59.75,78.3,59.75,93s10.69,28.88,12.19,30.9S93,156.07,123,169c7.12,3.06,12.68,4.9,17,6.32a41.18,41.18,0,0,0,18.8,1.17c5.74-.84,17.66-7.21,20.17-14.18s2.5-13,1.75-14.19-2.69-2.06-5.7-3.59l0,0Z"/></svg></a>
<a href="https://www.threads.com/intent/post?text=${z}&url=${O}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Threads" aria-label="Bagikan ke Threads"><svg width="20" height="20" viewBox="0 0 512 512"><path d="M105 0h302c57.75 0 105 47.25 105 105v302c0 57.75-47.25 105-105 105H105C47.25 512 0 464.75 0 407V105C0 47.25 47.25 0 105 0z"/><path fill="var(--bg-card)" fill-rule="nonzero" d="M337.36 243.58c-1.46-.7-2.95-1.38-4.46-2.02-2.62-48.36-29.04-76.05-73.41-76.33-25.6-.17-48.52 10.27-62.8 31.94l24.4 16.74c10.15-15.4 26.08-18.68 37.81-18.68h.4c14.61.09 25.64 4.34 32.77 12.62 5.19 6.04 8.67 14.37 10.39 24.89-12.96-2.2-26.96-2.88-41.94-2.02-42.18 2.43-69.3 27.03-67.48 61.21.92 17.35 9.56 32.26 24.32 42.01 12.48 8.24 28.56 12.27 45.26 11.35 22.07-1.2 39.37-9.62 51.45-25.01 9.17-11.69 14.97-26.84 17.53-45.92 10.51 6.34 18.3 14.69 22.61 24.73 7.31 17.06 7.74 45.1-15.14 67.96-20.04 20.03-44.14 28.69-80.55 28.96-40.4-.3-70.95-13.26-90.81-38.51-18.6-23.64-28.21-57.79-28.57-101.5.36-43.71 9.97-77.86 28.57-101.5 19.86-25.25 50.41-38.21 90.81-38.51 40.68.3 71.76 13.32 92.39 38.69 10.11 12.44 17.73 28.09 22.76 46.33l28.59-7.63c-6.09-22.45-15.67-41.8-28.72-57.85-26.44-32.53-65.1-49.19-114.92-49.54h-.2c-49.72.35-87.96 17.08-113.64 49.73-22.86 29.05-34.65 69.48-35.04 120.16v.24c.39 50.68 12.18 91.11 35.04 120.16 25.68 32.65 63.92 49.39 113.64 49.73h.2c44.2-.31 75.36-11.88 101.03-37.53 33.58-33.55 32.57-75.6 21.5-101.42-7.94-18.51-23.08-33.55-43.79-43.48zm-76.32 71.76c-18.48 1.04-37.69-7.26-38.64-25.03-.7-13.18 9.38-27.89 39.78-29.64 3.48-.2 6.9-.3 10.25-.3 11.04 0 21.37 1.07 30.76 3.13-3.5 43.74-24.04 50.84-42.15 51.84z"/></svg></a>
<a href="https://share.flipboard.com/bookmarklet/popout?v=2&title=${z}&url=${O}&utm_source=dalam.web.id" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=600');return false;" title="Bagikan ke Flipboard" aria-label="Bagikan ke Flipboard"><svg width="20" height="20" viewBox="0 0 122.88 122.88"><path fill="#F52828" d="M0,0v122.88h122.88V0H0L0,0z M98.3,49.15H73.73v24.58H49.15V98.3H24.58V24.58H98.3V49.15L98.3,49.15z"/></svg></a>
</div>
</div>
</div>`;let H=document.getElementById("btn-share-main"),j=document.getElementById("lk-share-providers");if(H&&j)H.addEventListener("click",async()=>{if(navigator.share&&P())try{await navigator.share({title:$,text:Q,url:window.location.href})}catch(G){console.error(G)}else{let G=j.classList.contains("lk-share-providers-hidden");j.classList.toggle("lk-share-providers-hidden",!G),j.classList.toggle("lk-share-providers-visible",G)}})}function y(){let V=document.getElementById("internal-nav");if(!V)return;let Y=Array.from(document.querySelectorAll("h2, h3, h4")).filter((J)=>{return(J.textContent||"").trim().length>0&&!J.closest(".floating-nav")&&!V.contains(J)});if(Y.length===0){V.style.display="none";return}V.innerHTML='<ul class="nav-list">'+Y.map((J,X)=>{let $=(J.textContent||"").trim();if(!J.id)J.id=$.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||`section-${X}`;return`<li class="nav-item nav-${J.tagName.toLowerCase()}"><a href="#${J.id}" class="nav-link">${$}</a></li>`}).join("")+"</ul>",V.addEventListener("click",(J)=>{let X=J.target;if(X.tagName.toLowerCase()==="a"&&X.classList.contains("nav-link")){let $=X.getAttribute("href");if(!$||!$.startsWith("#"))return;let q=$.substring(1),Q=document.getElementById(q);if(Q){let z=Q.closest("details");while(z){if(!z.open)z.open=!0;z=z.parentElement?.closest("details")||null}}}})}async function D(V){let Z=document.getElementById("related-articles-grid");if(!Z)return;try{let Y=await window.siteDataProvider.getRelatedLiteData();if(!Y||Object.keys(Y).length===0){Z.style.display="none";return}let J=M(V,Y);if(!J){Z.style.display="none";return}let X="/thumbnail-sm.webp",$=J.list.filter((Q)=>Q.id!==V).sort(()=>0.5-Math.random()).slice(0,6);if($.length===0){Z.style.display="none";return}Z.innerHTML=$.map((Q,z)=>{let O=Q.image?`${Q.image.replace(/\.[^/.]+$/,"")}-rg.webp`:X;return`
  <div class="rel-card-mini">
  <a href="${`/${J.slug}/${Q.id.replace(".html","")}`}">
  <div class="rel-img-mini">
  <img class="lk-related-thumb" data-fallback-idx="${z}" src="${O}" alt="${Q.title}" width="120" height="100" loading="lazy" decoding="async">
  </div>
  <div class="rel-info-mini">
  <h4>${Q.title}</h4>
  </div>
  </a>
  </div>
  `}).join(""),Z.querySelectorAll(".lk-related-thumb[data-fallback-idx]").forEach((Q)=>{let z=Number(Q.dataset.fallbackIdx),O=$[z];if(!O)return;let W=O.image||X;L(Q,[W,X])})}catch(Y){console.error(Y),Z.style.display="none"}}function I(V,Z){function Y(J){if(J==="down"){window.location.href="/";return}if(J==="up"){let $=M(Z,V);if($)window.location.href=`/${$.slug}`;return}let X=document.querySelector(`link[rel="${J}"]`);if(X){let $=X.getAttribute("href");if($)window.location.href=$}}document.addEventListener("keydown",(J)=>{if(P())return;let X=document.activeElement;if(X.tagName==="INPUT"||X.tagName==="TEXTAREA"||X.isContentEditable||X.closest("#disqus_thread"))return;if(J.ctrlKey&&J.key==="ArrowDown")J.preventDefault(),Y("down");if(J.ctrlKey&&J.key==="ArrowUp")J.preventDefault(),Y("up");if(J.ctrlKey&&J.key==="ArrowRight")J.preventDefault(),Y("next");if(J.ctrlKey&&J.key==="ArrowLeft")J.preventDefault(),Y("prev")})}let R=[];function v(){if(document.getElementById("playground-styles"))return;let V=document.createElement("style");V.id="playground-styles",V.innerHTML=`
:root {
  --thumb-size: 4.5rem;
  --item-gap: 1.25rem;
}

/* WIDGET SEBAGAI FLEX CONTAINER */
#random-playground-widget {
position: fixed;
top: 6rem;
right: 1.25rem;
width: 18.75rem;
background-color: transparent;
border: none;
z-index: 999;
display: flex;
flex-direction: column;
}

/* WADAH LIST ARTIKEL — tinggi dikunci fix: 7 item x thumb-size + 6 jarak antar item */
#playground-list {
display: flex;
flex-direction: column;
gap: var(--item-gap);
order: 1;
height: calc((var(--thumb-size) * 7) + (var(--item-gap) * 6));
overflow: hidden;
}

/* WADAH TOMBOL AKSI (Hide + Shuffle sejajar horizontal) */
#playground-controls {
order: 2;
display: flex;
gap: 0.5rem;
margin-top: 0.5rem;
}

/* TOMBOL SHUFFLE */
#shuffle-btn {
flex: 1 1 auto;
padding: 0.75rem;
margin: 0;
cursor: pointer;
border-radius: 0.5rem;
background-color: transparent;
color: inherit;
border: 1px solid var(--border, #ccc);
transition: all 0.2s ease;
font-family: inherit;
}

#shuffle-btn:hover {
background-color: var(--border, #eee);
}

/* TOMBOL HIDE (default tampil, disembunyikan lewat media query di mobile) */
#hide-btn {
flex: 0 0 auto;
padding: 0.75rem 1rem;
margin: 0;
cursor: pointer;
border-radius: 0.5rem;
background-color: transparent;
color: inherit;
border: 1px solid var(--border, #ccc);
transition: all 0.2s ease;
font-family: inherit;
}

#hide-btn:hover {
background-color: var(--border, #eee);
}

/* POSISI MOBILE (< 1024px) */
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

  #playground-controls {
  order: -1;
  margin-top: 0;
  margin-bottom: 1.5rem;
  }

  /* Tombol hide cuma buat desktop, di mobile ditiadakan total */
  #hide-btn {
  display: none;
  }
}

/* STYLING PLAYGROUND ITEM */
.playground-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-decoration: none;
  color: inherit;
  cursor: pointer; /* Memastikan ikon tangan selalu muncul */
  flex-shrink: 0; /* Biar tinggi tiap item konsisten 4.5rem, nggak ketekan sama height fix parent */
}

.playground-item:hover {
  opacity: 0.85; /* Sedikit efek interaktif pas di-hover */
}

.playground-thumb {
  width: var(--thumb-size);
  height: var(--thumb-size);
  object-fit: cover;
  border-radius: 0.5rem;
  flex-shrink: 0;
  background-color: var(--border, #f3f4f6);
}

.playground-title {
  max-height: var(--thumb-size);
  font-size: calc(var(--thumb-size) / 5);
  line-height: calc(var(--thumb-size) / 5);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  flex-grow: 1;

  /* Trik multiline ellipsis (Maksimal 4 baris) */
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}
`,document.head.appendChild(V)}function E(V){V.innerHTML="",[...R].sort(()=>0.5-Math.random()).slice(0,7).forEach((Y)=>{let J=document.createElement("a");J.href=Y.url||"#",J.className="playground-item";let X=Y.image||Y.thumbnail||"",$=X,q=X.lastIndexOf(".");if(q!==-1)$=X.substring(0,q)+"-sm.webp";let z=(Y.title||"Judul Tanpa Kategori").replace(/\s*-\s*Layar Kosong$/i,"");J.innerHTML=`
  <img
  class="playground-thumb"
  src="${$}"
  data-orig="${X}"
  onerror="this.onerror=null; this.src=this.dataset.orig;"
  alt="${z}"
  loading="lazy"
  >
  <h4 class="playground-title">${z}</h4>
  `,V.appendChild(J)})}async function f(){v();let V=document.getElementById("random-playground-widget");if(!V){V=document.createElement("aside"),V.id="random-playground-widget";let Y=document.createElement("div");Y.id="playground-list";let J=document.createElement("div");J.id="playground-controls";let X=document.createElement("button");X.id="hide-btn",X.textContent="❌",X.title="Sembunyikan widget",X.setAttribute("aria-label","Sembunyikan widget"),X.onclick=()=>{V.style.display="none"};let $=document.createElement("button");if($.id="shuffle-btn",$.textContent="\uD83C\uDFB2 Acak Artikel",$.onclick=()=>{E(Y)},J.appendChild(X),J.appendChild($),V.appendChild(Y),V.appendChild(J),window.matchMedia("(max-width: 1024px)").matches)document.body.appendChild(V);else{let Q=document.querySelector(".article-content, main, article, #main-wrapper");if(Q&&Q.parentNode)Q.parentNode.insertBefore(V,Q.nextSibling);else document.body.appendChild(V)}}if(typeof R>"u"||R.length===0)try{let Y=await window.siteDataProvider.getFor("pemandu.ts");if(Y){R=[];for(let[J,X]of Object.entries(Y))X.forEach(($)=>{let q=$.id?$.id.replace(".html",""):"",Q=$.url||`/${J}/${q}`;R.push({...$,url:Q})})}}catch(Y){console.error("Gagal memuat data playground:",Y);return}let Z=document.getElementById("playground-list");if(Z&&typeof E==="function")E(Z)}async function b(){try{while(!window.siteDataProvider)await new Promise((Y)=>setTimeout(Y,100));let V=await window.siteDataProvider.getFor("pemandu.ts"),Z=w();if(V&&Object.keys(V).length>0)y(),S(),A(),x(V,Z),I(V,Z);D(Z),f()}catch(V){console.error("Gagal inisialisasi Pemandu:",V)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",b):b()})();})();
