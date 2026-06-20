(()=>{(function(){function P(){return window.innerWidth<=768||"ontouchstart"in window||navigator.maxTouchPoints>0}function Z(j){return j?j.replace(/\.html$/,""):""}function z(){let K=window.location.pathname.split("/").filter(Boolean).pop();if(!K||K==="artikel")return"";return K.endsWith(".html")?K:`${K}.html`}function _(j,K){for(let[J,E]of Object.entries(K))if(E.some((H)=>H.id===j))return`/${J.toLowerCase().replace(/\s+/g,"-")}/${j.replace(".html","")}`;return`/${Z(j)}`}function B(j,K){for(let[J,E]of Object.entries(K)){let Q=E;if(Q.some((H)=>H.id===j))return{name:J,slug:J.toLowerCase().replace(/\s+/g,"-"),list:Q}}return null}function L(){let j=document.getElementById("related-marquee-container");if(!j)return;let K=getComputedStyle(document.body).backgroundColor,[J,E,Q]=(K.match(/\d+/g)||["0","0","0"]).map(Number),H=0.299*J+0.587*E+0.114*Q;j.classList.toggle("theme-light",H>128)}function R(){let j=document.getElementById("related-marquee-container");if(!j)return;j.addEventListener("click",(K)=>{let E=K.target.closest("a");if(!E)return;let Q=E.dataset.articleId;if(!Q)return;let H=JSON.parse(localStorage.getItem("read_marquee_articles")||"[]");if(!H.includes(Q))H.push(Q),localStorage.setItem("read_marquee_articles",JSON.stringify(H))})}function q(){let j=document.getElementById("progress");if(!j)return;let K=()=>{let{documentElement:J,body:E}=document,Q=J.scrollTop||E.scrollTop,H=J.scrollHeight||E.scrollHeight,X=J.clientHeight,V=H-X;j.style.width=V>0?Q/V*100+"%":"0%"};window.addEventListener("scroll",K,{passive:!0}),K()}function y(j,K){let J=document.getElementById("related-marquee-container");if(!J)return;let E=B(K,j);if(!E)return;let Q=E.list.filter((Y)=>Y.id!==K),H=JSON.parse(localStorage.getItem("read_marquee_articles")||"[]"),X=Q.filter((Y)=>!H.includes(Y.id));if(X.length===0){J.innerHTML='<p class="marquee-message">Semua artikel terkait sudah dibaca. \uD83D\uDE0A</p>';return}X.sort(()=>0.5-Math.random());let V=P(),W=X.map((Y)=>{let G=_(Y.id,j),T=V?Y.title:Y.description||Y.title;return`<a href="${G}" data-article-id="${Y.id}" title="${T}">${Y.title}</a> • `}).join("");J.innerHTML=`<div class="marquee-content">${W.repeat(10)}</div>`;let $=J.querySelector(".marquee-content");if($){let Y=$.offsetWidth,G=V?40:75;$.style.animationDuration=`${Y/2/G}s`}R()}function w(j){let K=document.querySelector(".search-floating-container"),J=document.getElementById("floatingSearchInput"),E=K?.querySelector(".clear-button"),Q=K?.querySelector(".floating-results-container");if(!K||!J||!E||!Q)return;J.addEventListener("input",()=>{let H=J.value.trim().toLowerCase();if(E.style.display=H.length?"block":"none",H.length<3){Q.style.display="none";return}let X=[];for(let V in j)for(let W of j[V])if((W.title+" "+(W.description||"")).toLowerCase().includes(H))X.push(W);if(X.length>0)Q.innerHTML=X.slice(0,5).map((V)=>`
    <a href="${_(V.id,j)}">
    <strong>${V.title}</strong>
    <small>${V.description?V.description.substring(0,60)+"...":"Lihat artikel"}</small>
    </a>
    `).join(""),Q.style.display="block";else Q.innerHTML='<div class="no-results">❌ Tekan Tombol Enter untuk Selanjutnya...</div>',Q.style.display="block"}),J.addEventListener("keydown",(H)=>{if(H.key==="Enter")H.preventDefault(),window.location.href=`/search/?q=${encodeURIComponent(J.value)}`}),E.addEventListener("click",()=>{J.value="",Q.style.display="none",E.style.display="none"})}function S(j,K){let J=document.getElementById("related-articles-grid");if(!J)return;let E=B(K,j);if(!E)return;let Q=E.list.findIndex(($)=>$.id===K);if(Q===-1)return;let H=E.list.length,X=(Q-1+H)%H,V=(Q+1)%H,W=document.getElementById("dynamic-nav-container");if(!W)W=document.createElement("div"),W.id="dynamic-nav-container",W.className="floating-nav",J.appendChild(W);W.innerHTML=`
<div class="nav-left"><a href="/${E.slug}" class="category-link visible">${E.name}</a></div>
<div class="nav-right">
<a href="/" title="Home" class="btn-emoji">\uD83C\uDFE0</a>
<a href="/sitemap" title="Daftar Isi" class="btn-emoji">\uD83D\uDCC4</a>
<a href="/feed" title="RSS Feed" class="btn-emoji">\uD83D\uDCE1</a>
${H>1?`
  <a href="${_(E.list[X].id,j)}" title="${E.list[X].title}" class="btn-emoji">⏪</a>
  <a href="${_(E.list[V].id,j)}" title="${E.list[V].title}" class="btn-emoji">⏩</a>
  `:""}
  </div>`}function U(){let j=document.getElementById("internal-nav");if(!j)return;let J=Array.from(document.querySelectorAll("h2, h3, h4")).filter((E)=>E.innerText.trim().length>0&&!E.closest(".floating-nav")&&!j.contains(E));if(J.length===0){j.style.display="none";return}j.innerHTML='<ul class="nav-list">'+J.map((E,Q)=>{if(!E.id)E.id=E.innerText.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||`section-${Q}`;return`<li class="nav-item nav-${E.tagName.toLowerCase()}"><a href="#${E.id}" class="nav-link">${E.innerText.trim()}</a></li>`}).join("")+"</ul>"}function k(j,K){let J=document.getElementById("related-articles-grid");if(!J)return;let E=B(K,j);if(!E){J.style.display="none";return}let Q=E.list.filter((H)=>H.id!==K).sort(()=>0.5-Math.random()).slice(0,6);J.innerHTML=Q.map((H)=>{let V=(H.image?H.image.replace(/\.[^/.]+$/,"")+"-sm.webp":null)??"/thumbnail.webp",W=H.image?`this.onerror=function(){this.onerror=null;this.src='/thumbnail.webp'};this.src='${H.image}'`:"this.onerror=null;this.src='/thumbnail.webp'";return`
    <div class="rel-card-mini">
    <a href="${_(H.id,j)}">
    <div class="rel-img-mini">
    <img
    src="${V}"
    alt="${H.title}"
    loading="lazy"
    onerror="${W}">
    </div>
    <div class="rel-info-mini">
    <h4>${H.title}</h4>
    </div>
    </a>
    </div>
    `}).join("")}async function O(){while(!window.siteDataProvider)await new Promise((J)=>setTimeout(J,100));let j=await window.siteDataProvider.getFor("marquee-url.ts"),K=z();if(j)U(),q(),y(j,K),w(j),k(j,K),S(j,K),L(),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",L)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",O):O()})();})();
