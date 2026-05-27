(()=>{(function(){function P(){return window.innerWidth<=768||"ontouchstart"in window||navigator.maxTouchPoints>0}function Z(j){return j?j.replace(/\.html$/,""):""}function z(){let J=window.location.pathname.split("/").filter(Boolean).pop();if(!J||J==="artikel")return"";return J.endsWith(".html")?J:`${J}.html`}function _(j,J){for(let[E,H]of Object.entries(J))if(H.some((K)=>K.id===j))return`/${E.toLowerCase().replace(/\s+/g,"-")}/${j.replace(".html","")}/`;return`/${Z(j)}/`}function $(j,J){for(let[E,H]of Object.entries(J)){let Q=H;if(Q.some((K)=>K.id===j))return{name:E,slug:E.toLowerCase().replace(/\s+/g,"-"),list:Q}}return null}function L(){let j=document.getElementById("related-marquee-container");if(!j)return;let J=getComputedStyle(document.body).backgroundColor,[E,H,Q]=(J.match(/\d+/g)||["0","0","0"]).map(Number),K=0.299*E+0.587*H+0.114*Q;j.classList.toggle("theme-light",K>128)}function R(){let j=document.getElementById("related-marquee-container");if(!j)return;j.addEventListener("click",(J)=>{let H=J.target.closest("a");if(!H)return;let Q=H.dataset.articleId;if(!Q)return;let K=JSON.parse(localStorage.getItem("read_marquee_articles")||"[]");if(!K.includes(Q))K.push(Q),localStorage.setItem("read_marquee_articles",JSON.stringify(K))})}function q(){let j=document.getElementById("progress");if(!j)return;let J=()=>{let{documentElement:E,body:H}=document,Q=E.scrollTop||H.scrollTop,K=E.scrollHeight||H.scrollHeight,W=E.clientHeight,V=K-W;j.style.width=V>0?Q/V*100+"%":"0%"};window.addEventListener("scroll",J,{passive:!0}),J()}function y(j,J){let E=document.getElementById("related-marquee-container");if(!E)return;let H=$(J,j);if(!H)return;let Q=H.list.filter((X)=>X.id!==J),K=JSON.parse(localStorage.getItem("read_marquee_articles")||"[]"),W=Q.filter((X)=>!K.includes(X.id));if(W.length===0){E.innerHTML='<p class="marquee-message">Semua artikel terkait sudah dibaca. \uD83D\uDE0A</p>';return}W.sort(()=>0.5-Math.random());let V=P(),Y=W.map((X)=>{let G=_(X.id,j),T=V?X.title:X.description||X.title;return`<a href="${G}" data-article-id="${X.id}" title="${T}">${X.title}</a> • `}).join("");E.innerHTML=`<div class="marquee-content">${Y.repeat(10)}</div>`;let B=E.querySelector(".marquee-content");if(B){let X=B.offsetWidth,G=V?40:75;B.style.animationDuration=`${X/2/G}s`}R()}function w(j){let J=document.querySelector(".search-floating-container"),E=document.getElementById("floatingSearchInput"),H=J?.querySelector(".clear-button"),Q=J?.querySelector(".floating-results-container");if(!J||!E||!H||!Q)return;E.addEventListener("input",()=>{let K=E.value.trim().toLowerCase();if(H.style.display=K.length?"block":"none",K.length<3){Q.style.display="none";return}let W=[];for(let V in j)for(let Y of j[V])if((Y.title+" "+(Y.description||"")).toLowerCase().includes(K))W.push(Y);if(W.length>0)Q.innerHTML=W.slice(0,5).map((V)=>`
    <a href="${_(V.id,j)}">
    <strong>${V.title}</strong>
    <small>${V.description?V.description.substring(0,60)+"...":"Lihat artikel"}</small>
    </a>
    `).join(""),Q.style.display="block";else Q.innerHTML='<div class="no-results">❌ Tekan Tombol Enter untuk Selanjutnya...</div>',Q.style.display="block"}),E.addEventListener("keydown",(K)=>{if(K.key==="Enter")K.preventDefault(),window.location.href=`/search/?q=${encodeURIComponent(E.value)}`}),H.addEventListener("click",()=>{E.value="",Q.style.display="none",H.style.display="none"})}function S(j,J){let E=$(J,j);if(!E)return;let H=E.list.findIndex((Y)=>Y.id===J);if(H===-1)return;let Q=E.list.length,K=(H-1+Q)%Q,W=(H+1)%Q,V=document.getElementById("dynamic-nav-container");if(!V)V=document.createElement("div"),V.id="dynamic-nav-container",V.className="floating-nav",document.body.appendChild(V);V.innerHTML=`
<div class="nav-left"><a href="/${E.slug}/" class="category-link visible">${E.name}</a></div>
<div class="nav-right">
<a href="/" title="Home" class="btn-emoji">\uD83C\uDFE0</a>
<a href="/sitemap/" title="Daftar Isi" class="btn-emoji">\uD83D\uDCC4</a>
<a href="/feed/" title="RSS Feed" class="btn-emoji">\uD83D\uDCE1</a>
${Q>1?`
  <a href="${_(E.list[K].id,j)}" title="${E.list[K].title}" class="btn-emoji">⏪</a>
  <a href="${_(E.list[W].id,j)}" title="${E.list[W].title}" class="btn-emoji">⏩</a>
  `:""}
  </div>`}function U(){let j=document.getElementById("internal-nav");if(!j)return;let E=Array.from(document.querySelectorAll("h2, h3, h4")).filter((H)=>H.innerText.trim().length>0&&!H.closest(".floating-nav")&&!j.contains(H));if(E.length===0){j.style.display="none";return}j.innerHTML='<ul class="nav-list">'+E.map((H,Q)=>{if(!H.id)H.id=H.innerText.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||`section-${Q}`;return`<li class="nav-item nav-${H.tagName.toLowerCase()}"><a href="#${H.id}" class="nav-link">${H.innerText.trim()}</a></li>`}).join("")+"</ul>"}function k(j,J){let E=document.getElementById("related-articles-grid");if(!E)return;let H=$(J,j);if(!H){E.style.display="none";return}let Q=H.list.filter((K)=>K.id!==J).sort(()=>0.5-Math.random()).slice(0,6);E.innerHTML=Q.map((K)=>{let V=(K.image?K.image.replace(/\.[^/.]+$/,"")+"-sm.webp":null)??"/thumbnail.webp",Y=K.image?`this.onerror=function(){this.onerror=null;this.src='/thumbnail.webp'};this.src='${K.image}'`:"this.onerror=null;this.src='/thumbnail.webp'";return`
    <div class="rel-card-mini">
    <a href="${_(K.id,j)}">
    <div class="rel-img-mini">
    <img
    src="${V}"
    alt="${K.title}"
    loading="lazy"
    onerror="${Y}">
    </div>
    <div class="rel-info-mini">
    <h4>${K.title}</h4>
    </div>
    </a>
    </div>
    `}).join("")}async function O(){while(!window.siteDataProvider)await new Promise((E)=>setTimeout(E,100));let j=await window.siteDataProvider.getFor("marquee-url.ts"),J=z();if(j)U(),q(),y(j,J),w(j),S(j,J),k(j,J),L(),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",L)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",O):O()})();})();
