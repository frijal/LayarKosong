(()=>{var Z=[],U=[],K=[],V=0,O=null,N=6,f=6,B=5;function H(j){if(!j)return"Lainnya";return j.split("-").map((q)=>q.charAt(0).toUpperCase()+q.slice(1)).join(" ")}function k(j){return(j||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function T(j,q){let z=k(j.title),G=q.priority?"eager":"lazy",X=q.priority?' fetchpriority="high"':"",Q=q.width??1000,W=q.height??563;return`<picture>
    <source media="(max-width: 640px)" srcset="${j.img}">
    <img src="${j.fullImg}" alt="${z}" class="${q.className}" width="${Q}" height="${W}" loading="${G}"${X} decoding="async" onerror="if(this.src.includes('-sm.webp')){this.src='${j.img}';}else{this.onerror=null;this.src='/thumbnail-sm.webp';}">
    </picture>`}async function F(){let j=document.getElementById("newsFeed"),q=document.getElementById("hero"),z=j?.dataset.ssr==="true";if(!z)y(),D();try{let G=await window.siteDataProvider.getFor("homepage.ts");Z=[];for(let Q in G){let W=Q.toLowerCase().replace(/\s+/g,"-"),$=H(Q);G[Q].forEach((J)=>{let P=J.id.replace(/\.html$/,""),A=J.image||"/thumbnail.webp",Y=A.replace(/\.(jpg|jpeg|png|webp)$/i,"-sm.webp"),M=J.title.replace(/\s*-\s*Layar Kosong$/i,"");Z.push({category:$,title:M,id:J.id,url:`/${W}/${P}`,img:Y,fullImg:A,date:J.date?new Date(J.date):new Date,summary:J.description||""})})}if(Z.sort((Q,W)=>W.date.getTime()-Q.date.getTime()),U=[...Z],K=[...new Set(Z.map((Q)=>Q.category))].map((Q)=>Z.find((W)=>W.category===Q)),z){if(q)q.classList.remove("skeleton");E(),x(),R()}else u(),R()}catch(G){if(console.error("Gagal ambil data via provider",G),j)j.innerHTML='<p class="feed-error">Gagal memuat konten. Coba muat ulang halaman.</p>'}}function y(){let j=document.getElementById("newsFeed");if(!j)return;j.setAttribute("aria-busy","true");let q="";for(let z=0;z<f;z++)q+=`<div class="card card-skeleton" aria-hidden="true">
        <div class="card-img skeleton"></div>
        <div class="card-body">
        <div class="skeleton skeleton-line" style="width:40%;height:12px;margin-bottom:12px"></div>
        <div class="skeleton skeleton-line" style="width:90%;height:16px;margin-bottom:8px"></div>
        <div class="skeleton skeleton-line" style="width:70%;height:16px"></div>
        </div>
        </div>`;j.innerHTML=q}function D(){let j=document.getElementById("sidebarRandom");if(!j)return;j.setAttribute("aria-busy","true");let q="";for(let z=0;z<B;z++)q+=`<div class="mini-item mini-item-skeleton" aria-hidden="true">
        <div class="mini-thumb skeleton"></div>
        <div class="mini-text" style="flex:1">
        <div class="skeleton skeleton-line" style="width:90%;height:12px;margin-bottom:6px"></div>
        <div class="skeleton skeleton-line" style="width:50%;height:10px"></div>
        </div>
        </div>`;j.innerHTML=q}function u(){p(),h(),s(),L(),_(),x()}function x(){let j=document.getElementById("searchInput"),q=document.getElementById("clearSearch"),z=document.getElementById("hero");if(j&&!j.dataset.bound)j.dataset.bound="true",j.addEventListener("input",(W)=>{let $=W.target.value.toLowerCase();if($.length>0){if(z)z.style.display="none";w()}else{if(z)z.style.display="";R()}U=Z.filter((J)=>J.title.toLowerCase().includes($)||J.summary&&J.summary.toLowerCase().includes($)),_(!0),L()});if(q&&j&&!q.dataset.bound)q.dataset.bound="true",q.addEventListener("click",()=>{if(j.value="",z)z.style.display="";U=[...Z],_(!0),L(),R(),j.focus()});let G=document.getElementById("yearFilter"),X=document.getElementById("monthFilter");if(G&&!G.dataset.bound)G.dataset.bound="true",G.addEventListener("change",()=>{I(),v()});if(X&&!X.dataset.bound)X.dataset.bound="true",X.addEventListener("change",v);let Q=document.getElementById("shuffleSidebar");if(Q&&!Q.dataset.bound)Q.dataset.bound="true",Q.addEventListener("click",()=>L())}function L(j){let q=document.getElementById("sidebarRandom");if(!q)return;let z=document.querySelector('.pill[aria-pressed="true"]'),G=j||(z?z.textContent?.trim():"All"),X=G==="All"||G==="Kategori"?[...Z]:Z.filter((J)=>J.category===G),Q=U.slice(0,N).map((J)=>J.title),$=[...X.filter((J)=>!Q.includes(J.title))].sort(()=>0.5-Math.random()).slice(0,10);q.removeAttribute("aria-busy"),q.innerHTML=$.map((J)=>{let P=k(J.title),A=k(J.summary||""),Y=J.date,M=`${String(Y.getDate()).padStart(2,"0")}.${String(Y.getMonth()+1).padStart(2,"0")}.${String(Y.getFullYear())}`;return`<div class="mini-item">
        ${T(J,{className:"mini-thumb",width:55,height:55})}
        <div class="mini-text">
        <h4 title="${A}">
        <a href="${J.url}">${J.title}</a>
        </h4>
        <div class="mini-meta">
        <time datetime="${Y.toISOString()}">${M}</time>
        <span class="mini-cat">${J.category}</span>
        </div>
        </div>
        </div>`}).join("")}window.renderSidebar=L;function C(j,q){if(document.querySelectorAll(".pill").forEach((z)=>z.setAttribute("aria-pressed","false")),q)q.setAttribute("aria-pressed","true");U=j==="All"?[...Z]:Z.filter((z)=>z.category===j),_(!0),L(j)}window.filterByCat=C;function S(){let j=document.getElementById("heroSliderWrapper");if(!j||K.length===0)return;j.innerHTML=K.map((q,z)=>{let G=T(q,{className:"hero-img",priority:z===0,width:1000,height:563});return`<a href="${q.url}" class="hero-slide" aria-hidden="${z===0?"false":"true"}" tabindex="${z===0?"0":"-1"}">
        ${G}
        <div class="hero-overlay"></div>
        <div class="hero-content">
        <span class="hero-cat">${q.category}</span>
        ${z===0?`<h2 class="hero-title">${q.title}</h2>`:`<p class="hero-title" role="heading" aria-level="2">${q.title}</p>`}
            <p class="hero-summary">${q.summary.substring(0,270)}...
            <strong class="hero-cta">Ungkap Faktanya →</strong>
            </p>
            </div>
            </a>`}).join("")}function E(){let j=document.getElementById("hero");if(!j)return;if(!j.querySelector(".hero-nav"))j.insertAdjacentHTML("beforeend",`<div class="hero-nav">
        <button class="nav-btn prev" id="heroPrev" type="button" aria-label="Slide sebelumnya"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
        <button class="nav-btn next" id="heroNext" type="button" aria-label="Slide berikutnya"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
        </div>`);let q=document.getElementById("heroPrev"),z=document.getElementById("heroNext");if(q&&!q.dataset.bound)q.dataset.bound="true",q.addEventListener("click",(G)=>{G.preventDefault(),b(-1)});if(z&&!z.dataset.bound)z.dataset.bound="true",z.addEventListener("click",(G)=>{G.preventDefault(),b(1)});if(!j.dataset.hoverBound)j.dataset.hoverBound="true",j.addEventListener("mouseenter",w),j.addEventListener("mouseleave",R)}function p(j=!1){if(K.length===0)return;let q=document.getElementById("hero");if(!q)return;if(q.classList.remove("skeleton"),!j)S();E(),g()}function g(){let j=document.getElementById("heroSliderWrapper");if(!j)return;let q=V*100;j.style.transform=`translateX(-${q}%)`,document.querySelectorAll(".hero-slide").forEach((G,X)=>{let Q=X===V;G.classList.toggle("active",Q),G.setAttribute("aria-hidden",Q?"false":"true"),G.setAttribute("tabindex",Q?"0":"-1")})}function R(){if(O)clearInterval(O);if(K.length<=1)return;O=setInterval(()=>{V=(V+1)%K.length,g()},4600)}function w(){if(O)clearInterval(O),O=null}function b(j){if(V+=j,V>=K.length)V=0;else if(V<0)V=K.length-1;g(),w(),R()}function _(j=!1){if(j)N=6;let q=document.getElementById("newsFeed");if(!q)return;let z=document.getElementById("hero"),G=!!z&&z.style.display!=="none",X=K.map((J)=>J.title),Q=U.filter((J)=>{if(G&&X.includes(J.title))return!1;return!0}),W=Q.slice(0,N);q.removeAttribute("aria-busy"),q.innerHTML=W.map((J)=>{let P=k(J.title);return`<div class="card">
        ${T(J,{className:"card-img",width:400,height:225})}
        <div class="card-body">
        <a href="${J.url}" class="card-link">
        <div class="card-meta">
        <time datetime="${J.date.toISOString()}">
        ${J.date.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
        </time>
        <span class="card-category">${J.category}</span>
        </div>
        <h3 class="card-title">${P}</h3>
        <p class="card-excerpt">${J.summary.substring(0,200)}...</p>
        </a>
        </div>
        </div>`}).join("");let $=document.getElementById("loadMore");if($)if(N>=Q.length)$.innerHTML="Kembali ke Atas ↑",$.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else $.innerHTML="Klik Selanjutnya...",$.onclick=()=>{N+=6,_(),L()}}function h(){let j=[...new Set(Z.map((z)=>z.category))],q=document.getElementById("categoryPills");if(!q)return;q.innerHTML='<button type="button" class="pill" id="pill-all" aria-pressed="true">Kategori</button>'+j.map((z)=>`<button type="button" class="pill" id="pill-${z.replace(/\s+/g,"-")}" aria-pressed="false">${z}</button>`).join(""),document.getElementById("pill-all")?.addEventListener("click",function(){C("All",this)}),j.forEach((z)=>{document.getElementById(`pill-${z.replace(/\s+/g,"-")}`)?.addEventListener("click",function(){C(z,this)})})}function s(){let j=[...new Set(Z.map((z)=>z.date.getFullYear()))].sort((z,G)=>G-z),q=document.getElementById("yearFilter");if(!q)return;q.innerHTML='<option value="">Pilih Tahun</option>',j.forEach((z)=>{let G=document.createElement("option");G.value=z.toString(),G.textContent=z.toString(),q.appendChild(G)}),I()}function I(){let j=document.getElementById("yearFilter"),q=document.getElementById("monthFilter");if(!j||!q)return;let z=j.value,G=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(q.innerHTML='<option value="">Bulan</option>',z)[...new Set(Z.filter((Q)=>Q.date.getFullYear().toString()===z).map((Q)=>Q.date.getMonth()))].sort((Q,W)=>Q-W).forEach((Q)=>{let W=document.createElement("option");W.value=Q.toString(),W.textContent=G[Q],q.appendChild(W)}),q.disabled=!1;else q.disabled=!0}function v(){let j=document.getElementById("yearFilter").value,q=document.getElementById("monthFilter").value,z=document.getElementById("hero");if(j!==""){if(z)z.style.display="none";w()}else{if(z)z.style.display="";R()}U=Z.filter((G)=>{let X=j?G.date.getFullYear().toString()===j:!0,Q=q!==""?G.date.getMonth().toString()===q:!0;return X&&Q}),_(!0),L()}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",F);else F();})();
