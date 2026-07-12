(()=>{var G=[],L=[],V=[],K=0,O=null,A=6,I=6,E=5;function y(j){if(!j)return"Lainnya";return j.split("-").map((q)=>q.charAt(0).toUpperCase()+q.slice(1)).join(" ")}function N(j){return(j||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function C(j,q){let z=N(j.title),X=q.priority?"eager":"lazy",$=q.priority?' fetchpriority="high"':"",Q=q.width??1000,Z=q.height??563;return`
    <picture>
    <source media="(max-width: 640px)" srcset="${j.img}">
    <img src="${j.fullImg}" alt="${z}" class="${q.className}" width="${Q}" height="${Z}" loading="${X}"${$} decoding="async" onerror="if(this.src.includes('-sm.webp')){this.src='${j.img}';}else{this.onerror=null;this.src='/thumbnail-sm.webp';}">
    </picture>`}async function T(){let j=document.getElementById("newsFeed"),q=document.getElementById("hero"),z=j?.dataset.ssr==="true";if(!z)H(),D();try{let X=await window.siteDataProvider.getFor("homepage.ts");G=[];for(let Q in X){let Z=Q.toLowerCase().replace(/\s+/g,"-"),J=y(Q);X[Q].forEach((W)=>{let P=W.id.replace(/\.html$/,""),U=W.image||"/thumbnail.webp",w=U.replace(/\.(jpg|jpeg|png|webp)$/i,"-sm.webp"),v=W.title.replace(/\s*-\s*Layar Kosong$/i,"");G.push({category:J,title:v,id:W.id,url:`/${Z}/${P}`,img:w,fullImg:U,date:W.date?new Date(W.date):new Date,summary:W.description||""})})}if(G.sort((Q,Z)=>Z.date.getTime()-Q.date.getTime()),L=[...G],V=[...new Set(G.map((Q)=>Q.category))].map((Q)=>G.find((Z)=>Z.category===Q)),z){if(q)q.classList.remove("skeleton");B(),f(),_()}else u(),_()}catch(X){if(console.error("Gagal ambil data via provider D1",X),j)j.innerHTML='<p class="feed-error">Gagal memuat konten. Periksa koneksi atau coba muat ulang.</p>'}}function H(){let j=document.getElementById("newsFeed");if(!j)return;j.setAttribute("aria-busy","true"),j.innerHTML=Array(I).fill(`
    <div class="card card-skeleton" aria-hidden="true">
    <div class="card-img skeleton" style="aspect-ratio: 16/9;"></div>
    <div class="card-body">
    <div class="skeleton skeleton-line" style="width:40%; height:12px; margin-bottom:12px;"></div>
    <div class="skeleton skeleton-line" style="width:90%; height:16px; margin-bottom:8px;"></div>
    <div class="skeleton skeleton-line" style="width:70%; height:16px;"></div>
    </div>
    </div>
    `).join("")}function D(){let j=document.getElementById("sidebarRandom");if(!j)return;j.setAttribute("aria-busy","true"),j.innerHTML=Array(E).fill(`
    <div class="mini-item mini-item-skeleton" aria-hidden="true">
    <div class="mini-thumb skeleton"></div>
    <div class="mini-text" style="flex:1">
    <div class="skeleton skeleton-line" style="width:90%; height:12px; margin-bottom:6px;"></div>
    <div class="skeleton skeleton-line" style="width:50%; height:10px;"></div>
    </div>
    </div>
    `).join("")}function u(){S(),h(),s(),Y(),R(),f()}function S(j=!1){if(V.length===0)return;let q=document.getElementById("hero");if(!q)return;if(q.classList.remove("skeleton"),!j)p();B(),M()}function p(){let j=document.getElementById("heroSliderWrapper");if(!j)return;j.innerHTML=V.map((q,z)=>{let X=C(q,{className:"hero-img",priority:z===0,width:1000,height:563});return`
        <a href="${q.url}" class="hero-slide" aria-hidden="${z===0?"false":"true"}" tabindex="${z===0?"0":"-1"}">
        ${X}
        <div class="hero-overlay"></div>
        <div class="hero-content">
        <span class="hero-cat">${q.category}</span>
        ${z===0?`<h2 class="hero-title">${q.title}</h2>`:`<p class="hero-title" role="heading" aria-level="2">${q.title}</p>`}
        <p class="hero-summary">${q.summary.substring(0,150)}... <strong class="hero-cta">Baca Selengkapnya &rarr;</strong></p>
        </div>
        </a>
        `}).join("")}function R(j=!1){if(j)A=6;let q=document.getElementById("newsFeed");if(!q)return;let z=document.getElementById("hero"),X=!!z&&z.style.display!=="none",$=V.map((W)=>W.title),Q=L.filter((W)=>{if(X&&$.includes(W.title))return!1;return!0}),Z=Q.slice(0,A);q.removeAttribute("aria-busy"),q.innerHTML=Z.map((W)=>{let P=N(W.title);return`
        <article class="card">
        ${C(W,{className:"card-img",width:400,height:225})}
        <div class="card-body">
        <div class="card-meta">
        <time datetime="${W.date.toISOString()}">${W.date.toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})}</time>
        <span class="card-category">${W.category}</span>
        </div>
        <a href="${W.url}" class="card-link">
        <h3 class="card-title">${P}</h3>
        <p class="card-excerpt">${N(W.summary).substring(0,120)}...</p>
        </a>
        </div>
        </article>
        `}).join("");let J=document.getElementById("loadMore");if(J)if(J.style.display="inline-block",A>=Q.length)J.innerHTML="Kembali ke Atas &uarr;",J.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else J.innerHTML="Muat Lebih Banyak",J.onclick=()=>{A+=6,R(),Y()}}function Y(j){let q=document.getElementById("sidebarRandom");if(!q)return;let z=document.querySelector('.pill[aria-pressed="true"]'),X=j||(z?z.textContent?.trim():"All"),$=X==="All"||X==="Kategori"?[...G]:G.filter((W)=>W.category===X),Q=L.slice(0,A).map((W)=>W.title),J=[...$.filter((W)=>!Q.includes(W.title))].sort(()=>0.5-Math.random()).slice(0,8);q.removeAttribute("aria-busy"),q.innerHTML=J.map((W)=>{let P=N(W.title),U=W.date,w=`${String(U.getDate()).padStart(2,"0")}.${String(U.getMonth()+1).padStart(2,"0")}.${String(U.getFullYear())}`;return`
        <div class="mini-item">
        ${C(W,{className:"mini-thumb",width:60,height:60})}
        <div class="mini-text">
        <h4 title="${N(W.summary)}"><a href="${W.url}">${P}</a></h4>
        <div class="mini-meta">
        <time datetime="${U.toISOString()}">${w}</time>
        <span>&bull;</span>
        <span class="mini-cat">${W.category}</span>
        </div>
        </div>
        </div>
        `}).join("")}function B(){let j=document.getElementById("hero");if(!j)return;if(!j.querySelector(".hero-nav"))j.insertAdjacentHTML("beforeend",`
        <div class="hero-nav">
        <button class="nav-btn prev" id="heroPrev" type="button" aria-label="Slide sebelumnya"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
        <button class="nav-btn next" id="heroNext" type="button" aria-label="Slide berikutnya"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
        </div>`);if(document.getElementById("heroPrev")?.addEventListener("click",(q)=>{q.preventDefault(),b(-1)}),document.getElementById("heroNext")?.addEventListener("click",(q)=>{q.preventDefault(),b(1)}),!j.dataset.hoverBound)j.dataset.hoverBound="true",j.addEventListener("mouseenter",k),j.addEventListener("mouseleave",_)}function M(){let j=document.getElementById("heroSliderWrapper");if(!j)return;let q=K*100;j.style.transform=`translateX(-${q}%)`,document.querySelectorAll(".hero-slide").forEach((X,$)=>{let Q=$===K;X.classList.toggle("active",Q),X.setAttribute("aria-hidden",Q?"false":"true"),X.setAttribute("tabindex",Q?"0":"-1")})}function _(){if(O)clearInterval(O);if(V.length<=1)return;O=setInterval(()=>{K=(K+1)%V.length,M()},5000)}function k(){if(O)clearInterval(O),O=null}function b(j){if(K+=j,K>=V.length)K=0;else if(K<0)K=V.length-1;M(),k(),_()}function h(){let j=[...new Set(G.map((z)=>z.category))],q=document.getElementById("categoryPills");if(!q)return;q.innerHTML='<button type="button" class="pill" id="pill-all" aria-pressed="true">Kategori</button>'+j.map((z)=>`<button type="button" class="pill" id="pill-${z.replace(/\s+/g,"-")}" aria-pressed="false">${z}</button>`).join(""),document.getElementById("pill-all")?.addEventListener("click",function(){x("All",this)}),j.forEach((z)=>{document.getElementById(`pill-${z.replace(/\s+/g,"-")}`)?.addEventListener("click",function(){x(z,this)})})}function x(j,q){if(document.querySelectorAll(".pill").forEach((z)=>z.setAttribute("aria-pressed","false")),q)q.setAttribute("aria-pressed","true");L=j==="All"?[...G]:G.filter((z)=>z.category===j),R(!0),Y(j)}function s(){let j=[...new Set(G.map((z)=>z.date.getFullYear()))].sort((z,X)=>X-z),q=document.getElementById("yearFilter");if(!q)return;q.innerHTML='<option value="">Tahun</option>',j.forEach((z)=>{let X=document.createElement("option");X.value=z.toString(),X.textContent=z.toString(),q.appendChild(X)}),F()}function F(){let j=document.getElementById("yearFilter"),q=document.getElementById("monthFilter");if(!j||!q)return;let z=j.value,X=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(q.innerHTML='<option value="">Bulan</option>',z)[...new Set(G.filter((Q)=>Q.date.getFullYear().toString()===z).map((Q)=>Q.date.getMonth()))].sort((Q,Z)=>Q-Z).forEach((Q)=>{let Z=document.createElement("option");Z.value=Q.toString(),Z.textContent=X[Q],q.appendChild(Z)}),q.disabled=!1;else q.disabled=!0}function g(){let j=document.getElementById("yearFilter").value,q=document.getElementById("monthFilter").value,z=document.getElementById("hero");if(j!==""){if(z)z.style.display="none";k()}else{if(z)z.style.display="";_()}L=G.filter((X)=>{let $=j?X.date.getFullYear().toString()===j:!0,Q=q!==""?X.date.getMonth().toString()===q:!0;return $&&Q}),R(!0),Y()}function f(){let j=document.getElementById("searchInput"),q=document.getElementById("clearSearch"),z=document.getElementById("hero");if(j&&!j.dataset.bound)j.dataset.bound="true",j.addEventListener("input",(Z)=>{let J=Z.target.value.toLowerCase();if(q)q.style.display=J.length?"block":"none";if(J.length>0){if(z)z.style.display="none";k()}else{if(z)z.style.display="";_()}L=G.filter((W)=>W.title.toLowerCase().includes(J)||W.summary&&W.summary.toLowerCase().includes(J)),R(!0),Y()});if(q&&j&&!q.dataset.bound)q.dataset.bound="true",q.addEventListener("click",()=>{if(j.value="",q.style.display="none",z)z.style.display="";L=[...G],R(!0),Y(),_(),j.focus()});let X=document.getElementById("yearFilter"),$=document.getElementById("monthFilter");if(X&&!X.dataset.bound)X.dataset.bound="true",X.addEventListener("change",()=>{F(),g()});if($&&!$.dataset.bound)$.dataset.bound="true",$.addEventListener("change",g);let Q=document.getElementById("shuffleSidebar");if(Q&&!Q.dataset.bound)Q.dataset.bound="true",Q.addEventListener("click",()=>Y())}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",T);else T();})();
