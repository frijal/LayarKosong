(()=>{(function(){function Z(){return window.innerWidth<=768||"ontouchstart"in window||navigator.maxTouchPoints>0}function j(E){return E?E.replace(/\.html$/,""):""}function z(){let K=window.location.pathname.split("/").filter(Boolean).pop();if(!K||K==="artikel")return"";return K.endsWith(".html")?K:`${K}.html`}function $(E,K){for(let[H,J]of Object.entries(K))if(J.some((Q)=>Q.id===E))return`/${H.toLowerCase().replace(/\s+/g,"-")}/${E.replace(".html","")}/`;return`/${j(E)}/`}function B(E,K){for(let[H,J]of Object.entries(K)){let V=J;if(V.some((Q)=>Q.id===E))return{name:H,slug:H.toLowerCase().replace(/\s+/g,"-"),list:V}}return null}function O(){let E=document.getElementById("related-marquee-container");if(!E)return;let K=getComputedStyle(document.body).backgroundColor,[H,J,V]=(K.match(/\d+/g)||["0","0","0"]).map(Number),Q=0.299*H+0.587*J+0.114*V;E.classList.toggle("theme-light",Q>128)}function R(){let E=document.getElementById("related-marquee-container");if(!E)return;E.addEventListener("click",(K)=>{let J=K.target.closest("a");if(!J)return;let V=J.dataset.articleId;if(!V)return;let Q=JSON.parse(localStorage.getItem("read_marquee_articles")||"[]");if(!Q.includes(V))Q.push(V),localStorage.setItem("read_marquee_articles",JSON.stringify(Q))})}function q(){let E=document.getElementById("progress");if(!E)return;let K=()=>{let{documentElement:H,body:J}=document,V=H.scrollTop||J.scrollTop,Q=H.scrollHeight||J.scrollHeight,X=H.clientHeight,W=Q-X;E.style.width=W>0?V/W*100+"%":"0%"};window.addEventListener("scroll",K,{passive:!0}),K()}function k(E,K){let H=document.getElementById("related-marquee-container");if(!H)return;let J=B(K,E);if(!J)return;let V=J.list.filter((Y)=>Y.id!==K),Q=JSON.parse(localStorage.getItem("read_marquee_articles")||"[]"),X=V.filter((Y)=>!Q.includes(Y.id));if(X.length===0){H.innerHTML='<p class="marquee-message">Semua artikel terkait sudah dibaca. \uD83D\uDE0A</p>';return}X.sort(()=>0.5-Math.random());let W=Z(),_=X.map((Y)=>{let L=$(Y.id,E),A=W?Y.title:Y.description||Y.title;return`<a href="${L}" data-article-id="${Y.id}" title="${A}">${Y.title}</a> • `}).join("");H.innerHTML=`<div class="marquee-content">${_.repeat(10)}</div>`;let G=H.querySelector(".marquee-content");if(G){let Y=G.offsetWidth,L=W?40:75;G.style.animationDuration=`${Y/2/L}s`}R()}function y(E){let K=document.querySelector(".search-floating-container"),H=document.getElementById("floatingSearchInput"),J=K?.querySelector(".clear-button"),V=K?.querySelector(".floating-results-container");if(!K||!H||!J||!V)return;H.addEventListener("input",()=>{let Q=H.value.trim().toLowerCase();if(J.style.display=Q.length?"block":"none",Q.length<3){V.style.display="none";return}let X=[];for(let W in E)for(let _ of E[W])if((_.title+" "+(_.description||"")).toLowerCase().includes(Q))X.push(_);if(X.length>0)V.innerHTML=X.slice(0,5).map((W)=>`
    <a href="${$(W.id,E)}">
    <strong>${W.title}</strong>
    <small>${W.description?W.description.substring(0,60)+"...":"Lihat artikel"}</small>
    </a>
    `).join(""),V.style.display="block";else V.innerHTML='<div class="no-results">❌ Tekan Tombol Enter untuk Selanjutnya...</div>',V.style.display="block"}),H.addEventListener("keydown",(Q)=>{if(Q.key==="Enter")Q.preventDefault(),window.location.href=`/search/?q=${encodeURIComponent(H.value)}`}),J.addEventListener("click",()=>{H.value="",V.style.display="none",J.style.display="none"})}function S(E,K){let H=B(K,E);if(!H)return;let J=H.list.findIndex((_)=>_.id===K);if(J===-1)return;let V=H.list.length,Q=(J-1+V)%V,X=(J+1)%V,W=document.getElementById("dynamic-nav-container");if(!W)W=document.createElement("div"),W.id="dynamic-nav-container",W.className="floating-nav",document.body.appendChild(W);W.innerHTML=`
  <div class="nav-left"><a href="/${H.slug}/" class="category-link visible">${H.name}</a></div>
  <div class="nav-right">
  <a href="/" title="Home" class="btn-emoji">\uD83C\uDFE0</a>
  <a href="/sitemap/" title="Daftar Isi" class="btn-emoji">\uD83D\uDCC4</a>
  <a href="/feed/" title="RSS Feed" class="btn-emoji">\uD83D\uDCE1</a>
  ${V>1?`
    <a href="${$(H.list[Q].id,E)}" title="${H.list[Q].title}" class="btn-emoji">⏩</a>
    <a href="${$(H.list[X].id,E)}" title="${H.list[X].title}" class="btn-emoji">⏪</a>
    `:""}
    </div>`}function w(){let E=document.getElementById("internal-nav");if(!E)return;let H=Array.from(document.querySelectorAll("h2, h3, h4")).filter((J)=>J.innerText.trim().length>0&&!J.closest(".floating-nav")&&!E.contains(J));if(H.length===0){E.style.display="none";return}E.innerHTML='<ul class="nav-list">'+H.map((J,V)=>{if(!J.id)J.id=J.innerText.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||`section-${V}`;return`<li class="nav-item nav-${J.tagName.toLowerCase()}"><a href="#${J.id}" class="nav-link">${J.innerText.trim()}</a></li>`}).join("")+"</ul>"}function T(E,K){let H=document.getElementById("related-articles-grid");if(!H)return;let J=B(K,E);if(!J){H.style.display="none";return}let V=J.list.filter((Q)=>Q.id!==K).sort(()=>0.5-Math.random()).slice(0,6);H.innerHTML=V.map((Q)=>{let X="/thumbnail.webp";if(Q.image)X=Q.image.replace(/\.[^/.]+$/,"")+"-sm.webp";return`
    <div class="rel-card-mini">
      <a href="${$(Q.id,E)}">
        <div class="rel-img-mini">
          <img 
            src="${X}" 
            alt="${Q.title}" 
            loading="lazy" 
            onerror="this.src='/thumbnail.webp'">
        </div>
        <div class="rel-info-mini">
          <h4>${Q.title}</h4>
        </div>
      </a>
    </div>
    `}).join("")}async function P(){while(!window.siteDataProvider)await new Promise((H)=>setTimeout(H,100));let E=await window.siteDataProvider.getFor("marquee-url.ts"),K=z();if(E)w(),q(),k(E,K),y(E),S(E,K),T(E,K),O(),window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",O)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",P):P()})();})();
