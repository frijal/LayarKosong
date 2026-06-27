(()=>{(function(){function P(){return window.innerWidth<=768||"ontouchstart"in window||navigator.maxTouchPoints>0}function H(J){return J?J.replace(/\.html$/,""):""}function k(){let V=window.location.pathname.split("/").filter(Boolean).pop();if(!V||V==="artikel")return"";return V.endsWith(".html")?V:`${V}.html`}function G(J,V){for(let[W,j]of Object.entries(V))if(j.some((O)=>O.id===J))return`/${W.toLowerCase().replace(/\s+/g,"-")}/${J.replace(".html","")}`;return`/${H(J)}`}function K(J,V){for(let[W,j]of Object.entries(V)){let Q=j;if(Q.some((O)=>O.id===J))return{name:W,slug:W.toLowerCase().replace(/\s+/g,"-"),list:Q}}return null}function R(){let J=document.getElementById("related-marquee-container");if(!J)return;let V=getComputedStyle(document.body).backgroundColor,[W,j,Q]=(V.match(/\d+/g)||["0","0","0"]).map(Number),O=0.299*W+0.587*j+0.114*Q;J.classList.toggle("theme-light",O>128)}function q(){let J=document.getElementById("related-marquee-container");if(!J)return;J.addEventListener("click",(V)=>{let j=V.target.closest("a");if(!j)return;let Q=j.dataset.articleId;if(!Q)return;let O=JSON.parse(localStorage.getItem("read_marquee_articles")||"[]");if(!O.includes(Q))O.push(Q),localStorage.setItem("read_marquee_articles",JSON.stringify(O))})}function A(){let J=document.getElementById("progress");if(!J)return;let V=()=>{let{documentElement:W,body:j}=document,Q=W.scrollTop||j.scrollTop,O=W.scrollHeight||j.scrollHeight,X=W.clientHeight,Y=O-X;J.style.width=Y>0?Q/Y*100+"%":"0%"};window.addEventListener("scroll",V,{passive:!0}),V()}function L(J,V){let W=document.getElementById("related-marquee-container");if(!W)return;let j=K(V,J);if(!j)return;let Q=j.list.filter((_)=>_.id!==V),O=JSON.parse(localStorage.getItem("read_marquee_articles")||"[]"),X=Q.filter((_)=>!O.includes(_.id)),Y=X.length>0?X:Q;Y.sort(()=>0.5-Math.random());let Z=P(),$=Y.map((_)=>{let z=G(_.id,J),B=Z?_.title:_.description||_.title;return`<a href="${z}" data-article-id="${_.id}" title="${B}">${_.title}</a> <span class="dot">•</span> `}).join("");W.innerHTML=`
  <div class="marquee-track">
  <div class="marquee-content">${$}</div>
  <div class="marquee-content" aria-hidden="true">${$}</div>
  </div>
  `,q()}function E(){let J=document.querySelector(".search-floating-container"),V=document.getElementById("floatingSearchInput"),W=J?.querySelector(".clear-button"),j=J?.querySelector(".floating-results-container");if(!J||!V||!W||!j)return;let Q,O=(X)=>{return X.replace(/[&<>'"]/g,(Y)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[Y]||Y)};V.addEventListener("input",()=>{let X=V.value.trim();if(W.style.display=X.length?"block":"none",X.length<3){j.style.display="none";return}clearTimeout(Q),Q=setTimeout(async()=>{try{j.innerHTML='<div class="no-results">⏳ Memindai data...</div>',j.style.display="block";let Z=`/cari?q=${encodeURIComponent(X)}&page=1&limit=10`,$=await fetch(Z);if(!$.ok)throw Error(`HTTP Error: ${$.status}`);let _=await $.json(),z=_.results||_.data||[];if(z.length>0)j.innerHTML=z.map((B)=>{let T=B.id?B.id.replace(".html",""):"tanpa-judul",C=`/${(B.category||"Lainnya").toLowerCase().replace(/\s+/g,"-")}/${T}`,b=B.snippet_text?B.snippet_text.substring(0,60)+"...":"Lihat artikel selengkapnya";return`
        <a href="${C}">
        <strong>${O(B.title||"Tanpa Judul")}</strong>
        <small>${O(b)}</small>
        </a>
        `}).join("");else j.innerHTML=`<div class="no-results">❌ Pencarian "${O(X)}" nihil. Tekan Enter untuk detail.</div>`}catch(Y){console.error("❌ Gagal fetch Floating Search D1:",Y),j.innerHTML='<div class="no-results">⚠️ Ups, database sedang sibuk. Coba sesaat lagi.</div>'}},300)}),V.addEventListener("keydown",(X)=>{if(X.key==="Enter"){X.preventDefault();let Y=V.value.trim();if(Y)window.location.href=`/search/?q=${encodeURIComponent(Y)}`}}),W.addEventListener("click",()=>{V.value="",j.style.display="none",W.style.display="none",clearTimeout(Q),V.focus()})}function S(J,V){let W=document.getElementById("related-articles-grid");if(!W)return;let j=K(V,J);if(!j)return;let Q=j.list.findIndex(($)=>$.id===V);if(Q===-1)return;let O=j.list.length,X=(Q-1+O)%O,Y=(Q+1)%O,Z=document.getElementById("dynamic-nav-container");if(!Z)Z=document.createElement("div"),Z.id="dynamic-nav-container",Z.className="floating-nav",W.appendChild(Z);Z.innerHTML=`
  <div class="nav-left"><a href="/${j.slug}" class="category-link visible">${j.name}</a></div>
  <div class="nav-right">
  <a href="/" title="Home" class="btn-emoji">\uD83C\uDFE0</a>
  <a href="/sitemap" title="Daftar Isi" class="btn-emoji">\uD83D\uDCC4</a>
  <a href="/feed" title="RSS Feed" class="btn-emoji">\uD83D\uDCE1</a>
  ${O>1?`
    <a href="${G(j.list[X].id,J)}" title="${j.list[X].title}" class="btn-emoji">⏪</a>
    <a href="${G(j.list[Y].id,J)}" title="${j.list[Y].title}" class="btn-emoji">⏩</a>
    `:""}
    </div>`}function U(){let J=document.getElementById("internal-nav");if(!J)return;let W=Array.from(document.querySelectorAll("h2, h3, h4")).filter((j)=>{return(j.textContent||"").trim().length>0&&!j.closest(".floating-nav")&&!J.contains(j)});if(W.length===0){J.style.display="none";return}J.innerHTML='<ul class="nav-list">'+W.map((j,Q)=>{let O=(j.textContent||"").trim();if(!j.id)j.id=O.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||`section-${Q}`;return`<li class="nav-item nav-${j.tagName.toLowerCase()}"><a href="#${j.id}" class="nav-link">${O}</a></li>`}).join("")+"</ul>",J.addEventListener("click",(j)=>{let Q=j.target;if(Q.tagName.toLowerCase()==="a"&&Q.classList.contains("nav-link")){let O=Q.getAttribute("href");if(!O||!O.startsWith("#"))return;let X=O.substring(1),Y=document.getElementById(X);if(Y){let Z=Y.closest("details");while(Z){if(!Z.open)Z.open=!0;Z=Z.parentElement?.closest("details")||null}}}})}function M(J,V){let W=document.getElementById("related-articles-grid");if(!W)return;let j=K(V,J);if(!j){W.style.display="none";return}let Q=j.list.filter((O)=>O.id!==V).sort(()=>0.5-Math.random()).slice(0,6);W.innerHTML=Q.map((O)=>{let Y=(O.image?O.image.replace(/\.[^/.]+$/,"")+"-sm.webp":null)??"/thumbnail-sm.webp",Z=O.image?`this.onerror=function(){this.onerror=function(){this.onerror=null;this.src='/thumbnail.webp'};this.src='/thumbnail-sm.webp'};this.src='${O.image}'`:"this.onerror=null;this.src='/thumbnail.webp'";return`
  <div class="rel-card-mini">
  <a href="${G(O.id,J)}">
  <div class="rel-img-mini">
  <img
  class="lk-related-thumb"
  src="${Y}"
  alt="${O.title}"
  loading="eager"
  decoding="async"
  fetchpriority="low"
  onerror="${Z}">
  </div>
  <div class="rel-info-mini">
  <h4>${O.title}</h4>
  </div>
  </a>
  </div>
  `}).join("")}function y(J,V){function W(j){if(j==="down"){window.location.href="/";return}let Q=K(V,J);if(!Q)return;if(j==="up"){window.location.href=`/${Q.slug}`;return}if(Q.list.length<=1)return;let O=Q.list.findIndex((_)=>_.id===V);if(O===-1)return;let X=Q.list.length,Y=j==="next"?(O+1)%X:(O-1+X)%X,Z=Q.list[Y].id,$=G(Z,J);if($)window.location.href=$}document.addEventListener("keydown",(j)=>{if(P())return;let Q=document.activeElement;if(Q.tagName==="INPUT"||Q.tagName==="TEXTAREA"||Q.isContentEditable||Q.closest("#disqus_thread"))return;if(j.ctrlKey&&j.key==="ArrowDown")j.preventDefault(),W("down");if(j.ctrlKey&&j.key==="ArrowUp")j.preventDefault(),W("up");if(j.ctrlKey&&j.key==="ArrowRight")j.preventDefault(),W("next");if(j.ctrlKey&&j.key==="ArrowLeft")j.preventDefault(),W("prev")})}async function w(){while(!window.siteDataProvider)await new Promise((W)=>setTimeout(W,100));let J=await window.siteDataProvider.getFor("marquee-url.ts"),V=k();if(J)U(),A(),L(J,V),E(),M(J,V),S(J,V),y(J,V),R(),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",R)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",w):w()})();})();
