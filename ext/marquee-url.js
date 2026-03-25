(()=>{(function(){function P(){return window.innerWidth<=768||"ontouchstart"in window||navigator.maxTouchPoints>0}function Z(E){return E?E.replace(/\.html$/,""):""}function z(){let J=window.location.pathname.split("/").filter(Boolean).pop();if(!J||J==="artikel")return"";return J.endsWith(".html")?J:`${J}.html`}function B(E,J){for(let[j,K]of Object.entries(J))if(K.some((V)=>V.id===E))return`/${j.toLowerCase().replace(/\s+/g,"-")}/${E.replace(".html","")}/`;return`/${Z(E)}/`}function G(E,J){for(let[j,K]of Object.entries(J)){let Q=K;if(Q.some((V)=>V.id===E))return{name:j,slug:j.toLowerCase().replace(/\s+/g,"-"),list:Q}}return null}function L(){let E=document.getElementById("related-marquee-container");if(!E)return;let J=getComputedStyle(document.body).backgroundColor,[j,K,Q]=(J.match(/\d+/g)||["0","0","0"]).map(Number),V=0.299*j+0.587*K+0.114*Q;E.classList.toggle("theme-light",V>128)}function q(){let E=document.getElementById("related-marquee-container");if(!E)return;E.addEventListener("click",(J)=>{let K=J.target.closest("a");if(!K)return;let Q=K.dataset.articleId;if(!Q)return;let V=JSON.parse(localStorage.getItem("read_marquee_articles")||"[]");if(!V.includes(Q))V.push(Q),localStorage.setItem("read_marquee_articles",JSON.stringify(V))})}function w(){let E=document.getElementById("progress");if(!E)return;let J=()=>{let{documentElement:j,body:K}=document,Q=j.scrollTop||K.scrollTop,V=j.scrollHeight||K.scrollHeight,X=j.clientHeight,W=V-X;E.style.width=W>0?Q/W*100+"%":"0%"};window.addEventListener("scroll",J,{passive:!0}),J()}function y(E,J){let j=document.getElementById("related-marquee-container");if(!j)return;let K=G(J,E);if(!K)return;let Q=K.list.filter((_)=>_.id!==J),V=JSON.parse(localStorage.getItem("read_marquee_articles")||"[]"),X=Q.filter((_)=>!V.includes(_.id));if(X.length===0){j.innerHTML='<p class="marquee-message">Semua artikel terkait sudah dibaca. \uD83D\uDE0A</p>';return}X.sort(()=>0.5-Math.random());let W=P(),Y=X.map((_)=>{let H=B(_.id,E),T=W?_.title:_.description||_.title;return`<a href="${H}" data-article-id="${_.id}" title="${T}">${_.title}</a> • `}).join("");j.innerHTML=`<div class="marquee-content">${Y.repeat(10)}</div>`;let $=j.querySelector(".marquee-content");if($){let _=$.offsetWidth,H=W?40:75;$.style.animationDuration=`${_/2/H}s`}q()}function R(E){let J=document.querySelector(".search-floating-container"),j=document.getElementById("floatingSearchInput"),K=J?.querySelector(".clear-button"),Q=J?.querySelector(".floating-results-container");if(!J||!j||!K||!Q)return;j.addEventListener("input",()=>{let V=j.value.trim().toLowerCase();if(K.style.display=V.length?"block":"none",V.length<3){Q.style.display="none";return}let X=[];for(let W in E)for(let Y of E[W])if((Y.title+" "+(Y.description||"")).toLowerCase().includes(V))X.push(Y);if(X.length>0)Q.innerHTML=X.slice(0,5).map((W)=>`
    <a href="${B(W.id,E)}">
    <strong>${W.title}</strong>
    <small>${W.description?W.description.substring(0,60)+"...":"Lihat artikel"}</small>
    </a>
    `).join(""),Q.style.display="block";else Q.innerHTML='<div class="no-results">❌ Tidak ditemukan</div>',Q.style.display="block"}),j.addEventListener("keydown",(V)=>{if(V.key==="Enter")V.preventDefault(),window.location.href=`/search/?q=${encodeURIComponent(j.value)}`}),K.addEventListener("click",()=>{j.value="",Q.style.display="none",K.style.display="none"})}function k(E,J){let j=G(J,E);if(!j)return;let K=j.list.findIndex((Y)=>Y.id===J);if(K===-1)return;let Q=j.list.length,V=(K-1+Q)%Q,X=(K+1)%Q,W=document.getElementById("dynamic-nav-container");if(!W)W=document.createElement("div"),W.id="dynamic-nav-container",W.className="floating-nav",document.body.appendChild(W);W.innerHTML=`
  <div class="nav-left"><a href="/${j.slug}/" class="category-link visible">${j.name}</a></div>
  <div class="nav-right">
  <a href="/" title="Home" class="btn-emoji">\uD83C\uDFE0</a>
  <a href="/sitemap/" title="Daftar Isi" class="btn-emoji">\uD83D\uDCC4</a>
  <a href="/feed/" title="RSS Feed" class="btn-emoji">\uD83D\uDCE1</a>
  ${Q>1?`
    <a href="${B(j.list[V].id,E)}" title="${j.list[V].title}" class="btn-emoji">⏩</a>
    <a href="${B(j.list[X].id,E)}" title="${j.list[X].title}" class="btn-emoji">⏪</a>
    `:""}
    </div>`}function S(){let E=document.getElementById("internal-nav");if(!E)return;let j=Array.from(document.querySelectorAll("h2, h3, h4")).filter((K)=>K.innerText.trim().length>0&&!K.closest(".floating-nav")&&!E.contains(K));if(j.length===0){E.style.display="none";return}E.innerHTML='<ul class="nav-list">'+j.map((K,Q)=>{if(!K.id)K.id=K.innerText.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||`section-${Q}`;return`<li class="nav-item nav-${K.tagName.toLowerCase()}"><a href="#${K.id}" class="nav-link">${K.innerText.trim()}</a></li>`}).join("")+"</ul>"}async function A(E,J){let j=document.getElementById("related-articles-grid");if(!j)return;let K=G(J,E);if(!K){j.style.display="none";return}let Q={};try{let X=await fetch("/shorturl.json");if(X.ok){let W=await X.json();for(let[Y,$]of Object.entries(W))Q[$]=Y}}catch(X){console.warn("Gagal memuat shorturl")}let V=K.list.filter((X)=>X.id!==J).sort(()=>0.5-Math.random()).slice(0,6);j.innerHTML=V.map((X)=>{let W=B(X.id,E),Y=Q[W]||"";return`
      <div class="rel-wrapper">
        ${Y?`<div class="shorturl" 
              title="Klik untuk salin link" 
              onclick="copyToClipboard('dalam.web.id/${Y}', this)">
           dalam.web.id/${Y}
         </div>`:""}
        <div class="rel-card-mini">
          <a href="${W}">
            <div class="rel-img-mini">
              <img src="${X.image||"/thumbnail.webp"}" alt="${X.title}" loading="lazy" onerror="this.src='/thumbnail.webp'">
            </div>
            <div class="rel-info-mini">
              <h4>${X.title}</h4>
            </div>
          </a>
        </div>
      </div>
    `}).join("")}function U(E,J){navigator.clipboard.writeText("https://"+E).then(()=>{let j=J.innerText;J.innerText="✅ Tersalin!",J.style.color="#27ae60",setTimeout(()=>{J.innerText=j,J.style.color=""},1500)}).catch((j)=>{console.error("Gagal menyalin: ",j)})}async function O(){while(!window.siteDataProvider)await new Promise((j)=>setTimeout(j,100));let E=await window.siteDataProvider.getFor("marquee-url.ts"),J=z();if(E)S(),w(),y(E,J),R(E),k(E,J),A(E,J),L(),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",L)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",O):O()})();})();
