(()=>{(function(){function K(){return window.innerWidth<=768||"ontouchstart"in window||navigator.maxTouchPoints>0}function P(Q){return Q?Q.replace(/\.html$/,""):""}function w(){let W=window.location.pathname.split("/").filter(Boolean).pop();if(!W||W==="artikel")return"";return W.endsWith(".html")?W:`${W}.html`}function O(Q,W){for(let[X,j]of Object.entries(W))if(j.some((J)=>J.id===Q))return`/${X.toLowerCase().replace(/\s+/g,"-")}/${Q.replace(".html","")}`;return`/${P(Q)}`}function Z(Q,W){for(let[X,j]of Object.entries(W)){let V=j;if(V.some((J)=>J.id===Q))return{name:X,slug:X.toLowerCase().replace(/\s+/g,"-"),list:V}}return null}function C(){let Q=document.getElementById("related-marquee-container");if(!Q)return;Q.addEventListener("click",(W)=>{let j=W.target.closest("a");if(!j)return;let V=j.dataset.articleId;if(!V)return;let J=JSON.parse(localStorage.getItem("read_marquee_articles")||"[]");if(!J.includes(V))J.push(V),localStorage.setItem("read_marquee_articles",JSON.stringify(J))})}function H(){let Q=document.getElementById("progress");if(!Q)return;let W=()=>{let{documentElement:X,body:j}=document,V=X.scrollTop||j.scrollTop,J=X.scrollHeight||j.scrollHeight,Y=X.clientHeight,_=J-Y;Q.style.width=_>0?V/_*100+"%":"0%"};window.addEventListener("scroll",W,{passive:!0}),W()}function L(){let Q=document.querySelector(".search-floating-container"),W=document.getElementById("floatingSearchInput"),X=Q?.querySelector(".clear-button"),j=Q?.querySelector(".floating-results-container");if(!Q||!W||!X||!j)return;let V,J=(Y)=>{return Y.replace(/[&<>'"]/g,(_)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[_]||_)};W.addEventListener("input",()=>{let Y=W.value.trim();if(X.style.display=Y.length?"block":"none",Y.length<3){j.style.display="none";return}clearTimeout(V),V=setTimeout(async()=>{try{j.innerHTML='<div class="no-results">⏳ Memindai data...</div>',j.style.display="block";let $=`/cari?q=${encodeURIComponent(Y)}&page=1&limit=10`,B=await fetch($);if(!B.ok)throw Error(`HTTP Error: ${B.status}`);let R=await B.json(),z=R.results||R.data||[];if(z.length>0)j.innerHTML=z.map((G)=>{let S=G.id?G.id.replace(".html",""):"tanpa-judul",U=`/${(G.category||"Lainnya").toLowerCase().replace(/\s+/g,"-")}/${S}`,A=G.snippet_text?G.snippet_text.substring(0,60)+"...":"Lihat artikel selengkapnya";return`
        <a href="${U}">
        <strong>${J(G.title||"Tanpa Judul")}</strong>
        <small>${J(A)}</small>
        </a>
        `}).join("");else j.innerHTML=`<div class="no-results">❌ Pencarian "${J(Y)}" nihil. Tekan Enter untuk detail.</div>`}catch(_){console.error("❌ Gagal fetch Floating Search D1:",_),j.innerHTML='<div class="no-results">⚠️ Ups, database sedang sibuk. Coba sesaat lagi.</div>'}},300)}),W.addEventListener("keydown",(Y)=>{if(Y.key==="Enter"){Y.preventDefault();let _=W.value.trim();if(_)window.location.href=`/search/?q=${encodeURIComponent(_)}`}}),X.addEventListener("click",()=>{W.value="",j.style.display="none",X.style.display="none",clearTimeout(V),W.focus()})}function k(Q,W){let X=document.getElementById("related-articles-grid");if(!X)return;let j=Z(W,Q);if(!j)return;let V=j.list.findIndex((B)=>B.id===W);if(V===-1)return;let J=j.list.length,Y=(V-1+J)%J,_=(V+1)%J,$=document.getElementById("dynamic-nav-container");if(!$)$=document.createElement("div"),$.id="dynamic-nav-container",$.className="floating-nav",X.appendChild($);$.innerHTML=`
  <div class="nav-left"><a href="/${j.slug}" class="category-link visible">${j.name}</a></div>
  <div class="nav-right">
  <a href="/" title="Home" class="btn-emoji">\uD83C\uDFE0</a>
  <a href="/sitemap" title="Daftar Isi" class="btn-emoji">\uD83D\uDCC4</a>
  <a href="/feed" title="RSS Feed" class="btn-emoji">\uD83D\uDCE1</a>
  ${J>1?`
    <a href="${O(j.list[Y].id,Q)}" title="${j.list[Y].title}" class="btn-emoji">⏪</a>
    <a href="${O(j.list[_].id,Q)}" title="${j.list[_].title}" class="btn-emoji">⏩</a>
    `:""}
    </div>`}function M(){let Q=document.getElementById("internal-nav");if(!Q)return;let X=Array.from(document.querySelectorAll("h2, h3, h4")).filter((j)=>{return(j.textContent||"").trim().length>0&&!j.closest(".floating-nav")&&!Q.contains(j)});if(X.length===0){Q.style.display="none";return}Q.innerHTML='<ul class="nav-list">'+X.map((j,V)=>{let J=(j.textContent||"").trim();if(!j.id)j.id=J.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||`section-${V}`;return`<li class="nav-item nav-${j.tagName.toLowerCase()}"><a href="#${j.id}" class="nav-link">${J}</a></li>`}).join("")+"</ul>",Q.addEventListener("click",(j)=>{let V=j.target;if(V.tagName.toLowerCase()==="a"&&V.classList.contains("nav-link")){let J=V.getAttribute("href");if(!J||!J.startsWith("#"))return;let Y=J.substring(1),_=document.getElementById(Y);if(_){let $=_.closest("details");while($){if(!$.open)$.open=!0;$=$.parentElement?.closest("details")||null}}}})}function E(Q,W){let X=document.getElementById("related-articles-grid");if(!X)return;let j=Z(W,Q);if(!j){X.style.display="none";return}let V=j.list.filter((J)=>J.id!==W).sort(()=>0.5-Math.random()).slice(0,6);X.innerHTML=V.map((J)=>{let _=(J.image?J.image.replace(/\.[^/.]+$/,"")+"-sm.webp":null)??"/thumbnail-sm.webp",$=J.image?`this.onerror=function(){this.onerror=function(){this.onerror=null;this.src='/thumbnail.webp'};this.src='/thumbnail-sm.webp'};this.src='${J.image}'`:"this.onerror=null;this.src='/thumbnail.webp'";return`
  <div class="rel-card-mini">
  <a href="${O(J.id,Q)}">
  <div class="rel-img-mini">
  <img
  class="lk-related-thumb"
  src="${_}"
  alt="${J.title}"
  loading="eager"
  decoding="async"
  fetchpriority="low"
  onerror="${$}">
  </div>
  <div class="rel-info-mini">
  <h4>${J.title}</h4>
  </div>
  </a>
  </div>
  `}).join("")}function y(Q,W){function X(j){if(j==="down"){window.location.href="/";return}let V=Z(W,Q);if(!V)return;if(j==="up"){window.location.href=`/${V.slug}`;return}if(V.list.length<=1)return;let J=V.list.findIndex((R)=>R.id===W);if(J===-1)return;let Y=V.list.length,_=j==="next"?(J+1)%Y:(J-1+Y)%Y,$=V.list[_].id,B=O($,Q);if(B)window.location.href=B}document.addEventListener("keydown",(j)=>{if(K())return;let V=document.activeElement;if(V.tagName==="INPUT"||V.tagName==="TEXTAREA"||V.isContentEditable||V.closest("#disqus_thread"))return;if(j.ctrlKey&&j.key==="ArrowDown")j.preventDefault(),X("down");if(j.ctrlKey&&j.key==="ArrowUp")j.preventDefault(),X("up");if(j.ctrlKey&&j.key==="ArrowRight")j.preventDefault(),X("next");if(j.ctrlKey&&j.key==="ArrowLeft")j.preventDefault(),X("prev")})}async function q(){while(!window.siteDataProvider)await new Promise((X)=>setTimeout(X,100));let Q=await window.siteDataProvider.getFor("marquee-url.ts"),W=w();if(Q)M(),H(),L(),E(Q,W),k(Q,W),y(Q,W)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",q):q()})();})();
