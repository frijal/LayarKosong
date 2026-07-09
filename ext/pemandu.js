(()=>{(function(){function _(V){if(!V)return"Tanpa Judul";return V.replace(/\s*-\s*Layar Kosong$/i,"")}function M(){return window.matchMedia("(max-width: 1024px)").matches}function P(V){return V?V.replace(/\.html$/,""):""}function L(){let Z=window.location.pathname.split("/").filter(Boolean).pop();if(!Z||Z==="artikel")return"";return Z.endsWith(".html")?Z:`${Z}.html`}function N(V){if(!V)return"Lainnya";return V.split("-").map((Z)=>Z.charAt(0).toUpperCase()+Z.slice(1)).join(" ")}function k(V,Z){for(let[J,X]of Object.entries(Z))if(X.some(($)=>$.id===V))return{name:N(J),slug:J,list:X};let Y=window.location.pathname.split("/").filter(Boolean);if(Y.length>0){let J=Y[0];for(let[X,$]of Object.entries(Z))if(X===J)return{name:N(X),slug:X,list:$}}return null}let w="img-broken-placeholder",F=!1;function S(){if(F)return;F=!0;let V=document.createElement("style");V.textContent=`
  .${w} {
    display: flex !important;
    align-items: center;
    justify-content: center;
    background-color: #1a1a1c;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='M21 15l-5-5L5 21'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 32%;
  }
  `,document.head.appendChild(V)}function x(V,Z){let Y=[...new Set(Z.filter(Boolean))],J=0;function X(){if(J<Y.length)V.src=Y[J],J++;else V.removeEventListener("error",X),S(),V.classList.add(w),V.removeAttribute("src"),V.alt=V.alt||"Gambar tidak tersedia"}V.addEventListener("error",X)}function A(){let V=document.getElementById("progress");if(!V)return;let Z=()=>{let{documentElement:Y,body:J}=document,X=Y.scrollTop||J.scrollTop,$=Y.scrollHeight||J.scrollHeight,q=Y.clientHeight,Q=$-q;V.style.width=Q>0?X/Q*100+"%":"0%"};window.addEventListener("scroll",Z,{passive:!0}),Z()}function y(){let V=document.querySelector(".search-floating-container"),Z=document.getElementById("floatingSearchInput"),Y=V?.querySelector(".clear-button"),J=V?.querySelector(".floating-results-container");if(!V||!Z||!Y||!J)return;if(!Y.innerHTML.trim())Y.innerHTML="❌";let X,$=(q)=>q.replace(/[&<>'"]/g,(Q)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[Q]||Q);Z.addEventListener("input",()=>{let q=Z.value.trim();if(Y.style.display=q.length?"block":"none",q.length<3){J.style.display="none";return}clearTimeout(X),X=setTimeout(async()=>{try{J.innerHTML='<div class="no-results">⏳ Memindai data...</div>',J.style.display="block";let Q=encodeURIComponent(q),z=await fetch(`/cari?q=${Q}&page=1&limit=10`);if(!z.ok)throw Error(`HTTP Error: ${z.status}`);let O=await z.json(),G=O.results||O.data||[];if(G.length>0)J.innerHTML=G.map((U)=>{let K=P(U.id)||"tanpa-judul",E=(U.category||"Lainnya").toLowerCase().replace(/\s+/g,"-"),j=U.snippet_text?U.snippet_text.substring(0,60)+"...":"Lihat artikel selengkapnya",W=_(U.title);return`<a href="/${E}/${K}"><strong>${$(W)}</strong><small>${$(j)}</small></a>`}).join("");else J.innerHTML=`<div class="no-results">❌ Pencarian "${$(q)}" nihil. Tekan Enter untuk detail.</div>`}catch(Q){console.error("❌ Gagal fetch Floating Search D1:",Q),J.innerHTML='<div class="no-results">⚠️ Ups, database sedang sibuk. Coba sesaat lagi.</div>'}},300)}),Z.addEventListener("keydown",(q)=>{if(q.key==="Enter"){q.preventDefault();let Q=Z.value.trim();if(Q)window.location.href=`/search/?q=${encodeURIComponent(Q)}`}}),Y.addEventListener("click",()=>{Z.value="",J.style.display="none",Y.style.display="none",clearTimeout(X),Z.focus()})}function I(V,Z){let Y=document.getElementById("related-articles-grid");if(!Y)return;let J=k(Z,V);if(!J)return;let X=J.list.find((W)=>W.id===Z),$=_(X?X.title:document.title),q="";if(X&&X.description)q=X.description;else{let W=document.querySelector('meta[name="description"]');if(W)q=W.getAttribute("content")||""}let Q=q?q:$,z=encodeURIComponent(Q),O=encodeURIComponent(window.location.href),G=document.getElementById("dynamic-nav-container");if(!G)if(G=document.createElement("div"),G.id="dynamic-nav-container",G.className="floating-nav",Y.parentNode)Y.parentNode.insertBefore(G,Y.nextSibling);else document.body.appendChild(G);let U=document.querySelector('link[rel="prev"]'),K=document.querySelector('link[rel="next"]'),H="";if(U){let W=U.getAttribute("title")||"Artikel Sebelumnya";H+=`<a href="${U.getAttribute("href")}" title="${W}" class="btn-emoji">⏪</a>`}if(K){let W=K.getAttribute("title")||"Artikel Selanjutnya";H+=`<a href="${K.getAttribute("href")}" title="${W}" class="btn-emoji">⏩</a>`}G.innerHTML=`
<div class="nav-left">
<a href="/${J.slug}" class="category-link visible">${J.name}</a>
</div>
<div class="nav-right">
<a href="/" title="Beranda" class="btn-emoji">\uD83C\uDFE0</a>
<a href="/sitemap" title="Daftar Isi" class="btn-emoji">\uD83D\uDCC4</a>
<a href="/feed" title="RSS Feed" class="btn-emoji">\uD83D\uDCE1</a>
${H}
<div class="lk-share-wrapper">
<button id="btn-share-main" class="lk-share-main-btn" title="Bagikan" aria-label="Bagikan">
<img src="/ext/icon-share.svg" width="20" height="20" alt="Share" aria-hidden="true" />
</button>
<div id="lk-share-providers" class="lk-share-providers-hidden">
<a href="https://x.com/intent/post?text=${z}&url=${O}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke X" aria-label="Bagikan ke X">
<img src="/ext/icon-x.svg" width="20" height="20" alt="X" aria-hidden="true" />
</a>
<a href="https://www.linkedin.com/shareArticle?mini=true&url=${O}&title=${z}&summary=${z}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=600');return false;" title="Bagikan ke LinkedIn" aria-label="Bagikan ke LinkedIn">
<img src="/ext/icon-linkedin.svg" width="20" height="20" alt="LinkedIn" aria-hidden="true" />
</a>
<a href="https://t.me/share/url?url=${O}&text=${z}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Telegram" aria-label="Bagikan ke Telegram">
<img src="/ext/icon-telegram.svg" width="20" height="20" alt="Telegram" aria-hidden="true" />
</a>
<a href="https://www.facebook.com/sharer/sharer.php?u=${O}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Facebook" aria-label="Bagikan ke Facebook">
<img src="/ext/icon-facebook.svg" width="20" height="20" alt="Facebook" aria-hidden="true" />
</a>
<a href="https://api.whatsapp.com/send?text=${z}%0A%0A${O}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke WhatsApp" aria-label="Bagikan ke WhatsApp">
<img src="/ext/icon-whatsapp.svg" width="20" height="20" alt="WhatsApp" aria-hidden="true" />
</a>
<a href="https://www.threads.com/intent/post?text=${z}&url=${O}" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=400');return false;" title="Bagikan ke Threads" aria-label="Bagikan ke Threads">
<img src="/ext/icon-threads.svg" width="20" height="20" alt="Threads" aria-hidden="true" />
</a>
<a href="https://share.flipboard.com/bookmarklet/popout?v=2&title=${z}&url=${O}&utm_source=dalam.web.id" onclick="window.open(this.href,'_blank','noopener,noreferrer,width=600,height=600');return false;" title="Bagikan ke Flipboard" aria-label="Bagikan ke Flipboard">
<img src="/ext/icon-flipboard.svg" width="20" height="20" alt="Flipboard" aria-hidden="true" />
</a>
</div>
</div>
</div>`;let E=document.getElementById("btn-share-main"),j=document.getElementById("lk-share-providers");if(E&&j)E.addEventListener("click",async()=>{if(navigator.share&&M())try{await navigator.share({title:$,text:Q,url:window.location.href})}catch(W){console.error(W)}else{let W=j.classList.contains("lk-share-providers-hidden");j.classList.toggle("lk-share-providers-hidden",!W),j.classList.toggle("lk-share-providers-visible",W)}})}function D(){let V=document.getElementById("internal-nav");if(!V)return;let Y=Array.from(document.querySelectorAll("h2, h3, h4")).filter((J)=>{return(J.textContent||"").trim().length>0&&!J.closest(".floating-nav")&&!V.contains(J)});if(Y.length===0){V.style.display="none";return}V.innerHTML='<ul class="nav-list">'+Y.map((J,X)=>{let $=(J.textContent||"").trim();if(!J.id)J.id=$.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||`section-${X}`;return`<li class="nav-item nav-${J.tagName.toLowerCase()}"><a href="#${J.id}" class="nav-link">${$}</a></li>`}).join("")+"</ul>",V.addEventListener("click",(J)=>{let X=J.target;if(X.tagName.toLowerCase()==="a"&&X.classList.contains("nav-link")){let $=X.getAttribute("href");if(!$||!$.startsWith("#"))return;let q=$.substring(1),Q=document.getElementById(q);if(Q){let z=Q.closest("details");while(z){if(!z.open)z.open=!0;z=z.parentElement?.closest("details")||null}}}})}async function f(V){let Z=document.getElementById("related-articles-grid");if(!Z)return;try{let Y=await window.siteDataProvider.getRelatedLiteData();if(!Y||Object.keys(Y).length===0){Z.style.display="none";return}let J=k(V,Y);if(!J){Z.style.display="none";return}let X="/thumbnail-sm.webp",$=J.list.filter((Q)=>Q.id!==V).sort(()=>0.5-Math.random()).slice(0,6);if($.length===0){Z.style.display="none";return}Z.innerHTML=$.map((Q,z)=>{let O=Q.image?`${Q.image.replace(/\.[^/.]+$/,"")}-rg.webp`:X,G=`/${J.slug}/${P(Q.id)}`,U=_(Q.title);return`
  <div class="rel-card-mini">
  <a href="${G}">
  <div class="rel-img-mini">
  <img class="lk-related-thumb" data-fallback-idx="${z}" src="${O}" alt="${U}" width="120" height="100" loading="lazy" decoding="async">
  </div>
  <div class="rel-info-mini">
  <h4>${U}</h4>
  </div>
  </a>
  </div>
  `}).join(""),Z.querySelectorAll(".lk-related-thumb[data-fallback-idx]").forEach((Q)=>{let z=Number(Q.dataset.fallbackIdx),O=$[z];if(!O)return;let G=O.image||X;x(Q,[G,X])})}catch(Y){console.error(Y),Z.style.display="none"}}function v(V,Z){function Y(J){if(J==="down"){window.location.href="/";return}if(J==="up"){let $=k(Z,V);if($)window.location.href=`/${$.slug}`;return}let X=document.querySelector(`link[rel="${J}"]`);if(X){let $=X.getAttribute("href");if($)window.location.href=$}}document.addEventListener("keydown",(J)=>{if(M())return;let X=document.activeElement;if(X.tagName==="INPUT"||X.tagName==="TEXTAREA"||X.isContentEditable||X.closest("#disqus_thread"))return;if(J.ctrlKey&&J.key==="ArrowDown")J.preventDefault(),Y("down");if(J.ctrlKey&&J.key==="ArrowUp")J.preventDefault(),Y("up");if(J.ctrlKey&&J.key==="ArrowRight")J.preventDefault(),Y("next");if(J.ctrlKey&&J.key==="ArrowLeft")J.preventDefault(),Y("prev")})}let R=[];function C(){if(document.getElementById("playground-styles"))return;let V=document.createElement("style");V.id="playground-styles",V.innerHTML=`
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
`,document.head.appendChild(V)}function B(V){V.innerHTML="",[...R].sort(()=>0.5-Math.random()).slice(0,7).forEach((Y)=>{let J=document.createElement("a");J.href=Y.url||"#",J.className="playground-item";let X=Y.image||Y.thumbnail||"",$=X,q=X.lastIndexOf(".");if(q!==-1)$=X.substring(0,q)+"-sm.webp";let Q=_(Y.title);J.innerHTML=`
  <img
  class="playground-thumb"
  src="${$}"
  data-orig="${X}"
  onerror="this.onerror=null; this.src=this.dataset.orig;"
  alt="${Q}"
  loading="lazy"
  >
  <h4 class="playground-title">${Q}</h4>
  `,V.appendChild(J)})}async function p(){C();let V=document.getElementById("random-playground-widget");if(!V){V=document.createElement("aside"),V.id="random-playground-widget";let Y=document.createElement("div");Y.id="playground-list";let J=document.createElement("div");J.id="playground-controls";let X=document.createElement("button");X.id="hide-btn",X.textContent="❌",X.title="Sembunyikan widget",X.setAttribute("aria-label","Sembunyikan widget"),X.onclick=()=>{V.style.display="none"};let $=document.createElement("button");if($.id="shuffle-btn",$.textContent="♻️ Acak Artikel",$.onclick=()=>{B(Y)},J.appendChild(X),J.appendChild($),V.appendChild(Y),V.appendChild(J),M())document.body.appendChild(V);else{let Q=document.querySelector(".article-content, main, article, #main-wrapper");if(Q&&Q.parentNode)Q.parentNode.insertBefore(V,Q.nextSibling);else document.body.appendChild(V)}}if(typeof R>"u"||R.length===0)try{let Y=await window.siteDataProvider.getFor("pemandu.ts");if(Y){R=[];for(let[J,X]of Object.entries(Y))X.forEach(($)=>{let q=P($.id),Q=$.url||`/${J}/${q}`;R.push({...$,url:Q})})}}catch(Y){console.error("Gagal memuat data playground:",Y);return}let Z=document.getElementById("playground-list");if(Z&&typeof B==="function")B(Z)}async function b(){try{while(!window.siteDataProvider)await new Promise((Y)=>setTimeout(Y,100));let V=await window.siteDataProvider.getFor("pemandu.ts"),Z=L();if(V&&Object.keys(V).length>0)D(),A(),y(),I(V,Z),v(V,Z);f(Z),p()}catch(V){console.error("Gagal inisialisasi Pemandu:",V)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",b):b()})();})();
