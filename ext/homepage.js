(()=>{var R=[],Z=[],_=[],W=0,$=null,V=6;function v(q){if(!q)return"Lainnya";return q.split("-").map((z)=>z.charAt(0).toUpperCase()+z.slice(1)).join(" ")}async function M(){try{let q=await window.siteDataProvider.getFor("homepage.ts");R=[];for(let j in q){let G=j.toLowerCase().replace(/\s+/g,"-"),O=v(j);q[j].forEach((K)=>{let U=K.id.replace(/\.html$/,""),Q=K.image||"/thumbnail.webp",J=Q.replace(/\.(jpg|jpeg|png|webp)$/i,"-sm.webp"),L=K.title.replace(/\s*-\s*Layar Kosong$/i,"");R.push({category:O,title:L,id:K.id,url:`/${G}/${U}`,img:J,fullImg:Q,date:K.date?new Date(K.date):new Date,summary:K.description||""})})}R.sort((j,G)=>G.date.getTime()-j.date.getTime()),Z=[...R],_=[...new Set(R.map((j)=>j.category))].map((j)=>R.find((G)=>G.category===j)),f(),A()}catch(q){console.error("Gagal ambil data via provider",q);let z=document.getElementById("newsFeed");if(z)z.innerHTML="<p>Gagal memuat konten.</p>"}}function f(){F(),b(),g(),X(),k();let q=document.getElementById("searchInput"),z=document.getElementById("clearSearch"),j=document.getElementById("hero"),G=document.getElementById("searchForm");if(q)q.addEventListener("input",(U)=>{let Q=U.target.value.toLowerCase();if(Q.length>0){if(j)j.style.display="none";Y()}else{if(j)j.style.display="block";A()}Z=R.filter((J)=>J.title.toLowerCase().includes(Q)||J.summary&&J.summary.toLowerCase().includes(Q)),k(!0),X()});if(G&&q)G.addEventListener("submit",(U)=>{U.preventDefault();let Q=q.value.trim();if(Q.length>0)window.location.href=`https://dalam.web.id/search/?q=${encodeURIComponent(Q)}`});if(z&&q)z.addEventListener("click",()=>{if(q.value="",j)j.style.display="block";Z=[...R],k(!0),X(),A(),q.focus()});let O=document.getElementById("yearFilter"),K=document.getElementById("monthFilter");if(O)O.addEventListener("change",()=>{C(),B()});if(K)K.addEventListener("change",B)}function X(q){let z=document.getElementById("sidebarRandom");if(!z)return;z.innerHTML="";let j=document.querySelector(".pill.active"),G=q||(j?j.textContent?.trim():"All"),O=G==="All"||G==="Kategori"?[...R]:R.filter((J)=>J.category===G),K=Z.slice(0,V).map((J)=>J.title),Q=[...O.filter((J)=>!K.includes(J.title))].sort(()=>0.5-Math.random()).slice(0,10);z.innerHTML=Q.map((J)=>{let L=(J.summary||"").replace(/"/g,"&quot;"),T=J.title.replace(/"/g,"&quot;"),N=J.date,x=`${String(N.getDate()).padStart(2,"0")}.${String(N.getMonth()+1).padStart(2,"0")}.${String(N.getFullYear())}`;return`
    <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <img src="${J.img}" class="mini-thumb" alt="${T}" onerror="if(this.src.includes('-sm.webp')) { this.src='${J.fullImg}'; } else { this.onerror=null; this.src='/thumbnail-sm.webp'; }" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; flex-shrink:0;">
    <div class="mini-text">
    <h4 title="${L}" style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3; font-weight: 600;">
    <a href="${J.url}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${J.title}
    </a>
    </h4>
    <div style="display: flex; align-items: center; gap: 5px;">
    <small style="color: var(--text-muted); font-size: 0.65rem;">${x} •</small>
    <span style="color: var(--primary); font-weight: bold; font-size: 0.65rem; text-transform: uppercase;">${J.category}</span>
    </div>
    </div>
    </div>`}).join("")}window.renderSidebar=X;function E(q,z){if(z)document.querySelectorAll(".pill").forEach((j)=>j.classList.remove("active")),z.classList.add("active");Z=q==="All"?[...R]:R.filter((j)=>j.category===q),k(!0),X(q)}window.filterByCat=E;function F(){if(_.length===0)return;let q=document.getElementById("hero"),z=document.getElementById("heroSliderWrapper");if(!q||!z)return;q.classList.remove("skeleton"),z.innerHTML=_.map((O)=>`
  <a href="${O.url}" class="hero-slide" style="background-image: url('${O.fullImg}')">
  <div class="hero-overlay"></div>
  <div class="hero-content">
  <span class="hero-cat">${O.category}</span>
  <h1 class="hero-title">${O.title}</h1>
  <p class="hero-summary">
  ${O.summary.substring(0,270)}...
  <strong style="color:var(--secondary);">Ungkap Faktanya →</strong>
  </p>
  </div>
  </a>`).join("");let j=`
  <div class="hero-nav">
  <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
  </div>`,G=q.querySelector(".hero-nav");if(G)G.remove();q.insertAdjacentHTML("beforeend",j),document.getElementById("heroPrev")?.addEventListener("click",(O)=>{O.preventDefault(),w(-1)}),document.getElementById("heroNext")?.addEventListener("click",(O)=>{O.preventDefault(),w(1)}),q.addEventListener("mouseenter",Y),q.addEventListener("mouseleave",A),P()}function P(){let q=document.getElementById("heroSliderWrapper");if(!q)return;let z=W*100;q.style.transform=`translateX(-${z}%)`,document.querySelectorAll(".hero-slide").forEach((G,O)=>{G.classList.toggle("active",O===W)})}function A(){if($)clearInterval($);$=setInterval(()=>{W=(W+1)%_.length,P()},4600)}function Y(){if($)clearInterval($),$=null}function w(q){if(W+=q,W>=_.length)W=0;else if(W<0)W=_.length-1;P(),Y(),A()}function k(q=!1){if(q)V=6;let z=document.getElementById("newsFeed");if(!z)return;z.innerHTML="";let j=document.getElementById("hero"),G=j&&j.style.display!=="none",O=_.map((J)=>J.title),K=Z.filter((J)=>{if(G&&O.includes(J.title))return!1;return!0});K.slice(0,V).forEach((J)=>{let L=J.title.replace(/"/g,"&quot;");z.innerHTML+=`
    <div class="card" style="animation: fadeIn 0.5s ease">
    <img src="${J.img}" class="card-img" alt="${L}" onerror="if(this.src.includes('-sm.webp')) { this.src='${J.fullImg}'; } else { this.onerror=null; this.src='/thumbnail-sm.webp'; }">
    <div class="card-body">
    <a href="${J.url}" class="card-link">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <time style="color: var(--text-muted); font-size: 0.8rem;" datetime="${J.date.toISOString()}">
    ${J.date.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
    </time>
    <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${J.category}</small>
    </div>
    <h3 class="card-title">${J.title}</h3>
    <p class="card-excerpt">${J.summary.substring(0,200)}...</p>
    </a>
    </div>
    </div>`});let Q=document.getElementById("loadMore");if(Q)if(V>=K.length)Q.innerHTML="Kembali ke Atas ↑",Q.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else Q.innerHTML="Klik Selanjutnya...",Q.onclick=()=>{V+=6,k(),X()}}function b(){let q=[...new Set(R.map((j)=>j.category))],z=document.getElementById("categoryPills");if(!z)return;z.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',q.forEach((j)=>{let G=`pill-${j.replace(/\s+/g,"-")}`;z.innerHTML+=`<div class="pill" id="${G}">${j}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){E("All",this)}),q.forEach((j)=>{let G=`pill-${j.replace(/\s+/g,"-")}`;document.getElementById(G)?.addEventListener("click",function(){E(j,this)})})}function g(){let q=[...new Set(R.map((j)=>j.date.getFullYear()))].sort((j,G)=>G-j),z=document.getElementById("yearFilter");if(!z)return;z.innerHTML='<option value="">Pilih Tahun</option>',q.forEach((j)=>{let G=document.createElement("option");G.value=j.toString(),G.textContent=j.toString(),z.appendChild(G)}),C()}function C(){let q=document.getElementById("yearFilter"),z=document.getElementById("monthFilter");if(!q||!z)return;let j=q.value,G=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(z.innerHTML='<option value="">Bulan</option>',j)[...new Set(R.filter((K)=>K.date.getFullYear().toString()===j).map((K)=>K.date.getMonth()))].sort((K,U)=>K-U).forEach((K)=>{let U=document.createElement("option");U.value=K.toString(),U.textContent=G[K],z.appendChild(U)}),z.disabled=!1;else z.disabled=!0}function B(){let q=document.getElementById("yearFilter").value,z=document.getElementById("monthFilter").value,j=document.getElementById("hero");if(q!==""){if(j)j.style.display="none";Y()}else{if(j)j.style.display="block";A()}Z=R.filter((G)=>{let O=q?G.date.getFullYear().toString()===q:!0,K=z!==""?G.date.getMonth().toString()===z:!0;return O&&K}),k(!0),X()}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",M);else M();})();
