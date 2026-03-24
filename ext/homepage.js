(()=>{var O=[],Z=[],_=[],W=0,$=null,N=6;function P(k,q,j={}){let z=k.replace(".webp","-sm.webp"),G=q.replace(/"/g,"&quot;"),K=j.loading??"lazy",Q=j.fetchpriority?' fetchpriority="high"':"",R=j.cls?` class="${j.cls}"`:"",J=`max-width: 100%; height: auto; object-fit: cover; border-radius: 12px; ${j.imgStyle||""}`,A=j.width?` width="${j.width}"`:"",E=j.height?` height="${j.height}"`:"";return`
  <picture${j.style?` style="${j.style}"`:""}>
  <source media="(max-width: 500px)" srcset="${z}">
  <img src="${k}"${R}${A}${E}
  alt="${G}"
  loading="${K}"
  decoding="async"${Q}
  style="${J}"
  onerror="this.onerror=null; this.src='${k}';">
  </picture>`.trim()}async function M(){try{let k=await window.siteDataProvider.getFor("homepage.ts");O=[];for(let j in k){let z=j.toLowerCase().replace(/\s+/g,"-");k[j].forEach((G)=>{let K=G.id.replace(/\.html$/,"");O.push({category:j,title:G.title,id:G.id,url:`/${z}/${K}`,img:G.image,date:G.date?new Date(G.date):new Date,summary:G.description||""})})}O.sort((j,z)=>z.date.getTime()-j.date.getTime()),Z=[...O],_=[...new Set(O.map((j)=>j.category))].map((j)=>O.find((z)=>z.category===j)),b(),V()}catch(k){console.error("Gagal ambil data via provider",k);let q=document.getElementById("newsFeed");if(q)q.innerHTML="<p>Gagal memuat konten.</p>"}}function b(){f(),x(),g(),X(),L();let k=document.getElementById("searchInput"),q=document.getElementById("clearSearch"),j=document.getElementById("hero");if(k)k.addEventListener("input",(K)=>{let Q=K.target.value.toLowerCase();if(Q.length>0){if(j)j.style.display="none";Y()}else{if(j)j.style.display="block";V()}Z=O.filter((R)=>R.title.toLowerCase().includes(Q)||R.summary&&R.summary.toLowerCase().includes(Q)),L(!0),X()});if(q&&k)q.addEventListener("click",()=>{if(k.value="",j)j.style.display="block";Z=[...O],L(!0),X(),V(),k.focus()});let z=document.getElementById("yearFilter"),G=document.getElementById("monthFilter");if(z)z.addEventListener("change",()=>{v(),B()});if(G)G.addEventListener("change",B)}function f(){if(_.length===0)return;let k=document.getElementById("hero"),q=document.getElementById("heroSliderWrapper");if(!k||!q)return;k.classList.remove("skeleton"),q.innerHTML=_.map((G,K)=>`
  <a href="${G.url}" class="hero-slide">
  ${P(G.img,G.title,{fetchpriority:K===0,loading:K===0?"eager":"lazy",width:1000,height:500,style:"position:absolute;inset:0;width:100%;height:100%;",imgStyle:"width:100%;height:100%;"})}
  <div class="hero-overlay"></div>
  <div class="hero-content">
  <span class="hero-cat">${G.category}</span>
  <h1 class="hero-title">${G.title}</h1>
  <p class="hero-summary">
  ${G.summary.substring(0,270)}...
  <strong style="color:var(--secondary);">Ungkap Faktanya →</strong>
  </p>
  </div>
  </a>`).join("");let j=`<div class="hero-nav">
  <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
  </div>`,z=k.querySelector(".hero-nav");if(z)z.remove();k.insertAdjacentHTML("beforeend",j),document.getElementById("heroPrev")?.addEventListener("click",(G)=>{G.preventDefault(),T(-1)}),document.getElementById("heroNext")?.addEventListener("click",(G)=>{G.preventDefault(),T(1)}),k.addEventListener("mouseenter",Y),k.addEventListener("mouseleave",V),C()}function C(){let k=document.getElementById("heroSliderWrapper");if(!k)return;let q=W*100;k.style.transform=`translateX(-${q}%)`,document.querySelectorAll(".hero-slide").forEach((z,G)=>{z.classList.toggle("active",G===W)})}function V(){if($)clearInterval($);$=setInterval(()=>{W=(W+1)%_.length,C()},4600)}function Y(){if($)clearInterval($),$=null}function T(k){if(W+=k,W>=_.length)W=0;else if(W<0)W=_.length-1;C(),Y(),V()}function L(k=!1){if(k)N=6;let q=document.getElementById("newsFeed");if(!q)return;q.innerHTML="";let j=document.getElementById("hero"),z=j&&j.style.display!=="none",G=_.map((J)=>J.title),K=Z.filter((J)=>{if(z&&G.includes(J.title))return!1;return!0});K.slice(0,N).forEach((J)=>{q.innerHTML+=`
    <div class="card" style="animation: fadeIn 0.5s ease">
    ${P(J.img,J.title,{cls:"card-img",loading:"lazy",width:480,height:270})}
    <div class="card-body">
    <a href="${J.url}" class="card-link">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <time style="font-size: 0.8rem; opacity: 0.7;" datetime="${J.date.toISOString()}">
    ${J.date.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
    </time>
    <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${J.category}</small>
    </div>
    <h3 class="card-title">${J.title}</h3>
    <p class="card-excerpt">${J.summary.substring(0,200)}...</p>
    </a>
    </div>
    </div>`});let R=document.getElementById("loadMore");if(R)if(N>=K.length)R.innerHTML="Kembali ke Atas ↑",R.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else R.innerHTML="Klik Selanjutnya...",R.onclick=()=>{N+=6,L(),X()}}function X(k){let q=document.getElementById("sidebarRandom");if(!q)return;q.innerHTML="";let j=document.querySelector(".pill.active"),z=k||(j?j.textContent.trim():"All"),G=z==="All"||z==="Kategori"?[...O]:O.filter((J)=>J.category===z),K=Z.slice(0,N).map((J)=>J.title),R=[...G.filter((J)=>!K.includes(J.title))].sort(()=>0.5-Math.random()).slice(0,11);q.innerHTML=R.map((J)=>{let A=(J.summary||"").replace(/"/g,"&quot;"),E=J.title.replace(/"/g,"&quot;"),U=J.date,F=`${String(U.getDate()).padStart(2,"0")}.${String(U.getMonth()+1).padStart(2,"0")}.${String(U.getFullYear())}`;return`
    <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    ${P(J.img,E,{cls:"mini-thumb",loading:"lazy",width:55,height:55,imgStyle:"width:55px;height:55px;border-radius:8px;flex-shrink:0;"})}
    <div class="mini-text">
    <h4 title="${A}" style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3; font-weight: 600;">
    <a href="${J.url}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${J.title}
    </a>
    </h4>
    <div style="display: flex; align-items: center; gap: 5px;">
    <small style="color: #888; font-size: 0.65rem;">${F} •</small>
    <span style="color: var(--primary); font-weight: bold; font-size: 0.65rem; text-transform: uppercase;">${J.category}</span>
    </div>
    </div>
    </div>`}).join("")}window.renderSidebar=X;function w(k,q){if(q)document.querySelectorAll(".pill").forEach((j)=>j.classList.remove("active")),q.classList.add("active");Z=k==="All"?[...O]:O.filter((j)=>j.category===k),L(!0),X(k)}window.filterByCat=w;function x(){let k=[...new Set(O.map((j)=>j.category))],q=document.getElementById("categoryPills");if(!q)return;q.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',k.forEach((j)=>{let z=`pill-${j.replace(/\s+/g,"-")}`;q.innerHTML+=`<div class="pill" id="${z}">${j}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){w("All",this)}),k.forEach((j)=>{let z=`pill-${j.replace(/\s+/g,"-")}`;document.getElementById(z)?.addEventListener("click",function(){w(j,this)})})}function g(){let k=[...new Set(O.map((j)=>j.date.getFullYear()))].sort((j,z)=>z-j),q=document.getElementById("yearFilter");if(!q)return;q.innerHTML='<option value="">Pilih Tahun</option>',k.forEach((j)=>{let z=document.createElement("option");z.value=j.toString(),z.textContent=j.toString(),q.appendChild(z)}),v()}function v(){let k=document.getElementById("yearFilter"),q=document.getElementById("monthFilter");if(!k||!q)return;let j=k.value,z=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(q.innerHTML='<option value="">Bulan</option>',j)[...new Set(O.filter((K)=>K.date.getFullYear().toString()===j).map((K)=>K.date.getMonth()))].sort((K,Q)=>K-Q).forEach((K)=>{let Q=document.createElement("option");Q.value=K.toString(),Q.textContent=z[K],q.appendChild(Q)}),q.disabled=!1;else q.disabled=!0}function B(){let k=document.getElementById("yearFilter").value,q=document.getElementById("monthFilter").value,j=document.getElementById("hero");if(k!==""){if(j)j.style.display="none";Y()}else{if(j)j.style.display="block";V()}Z=O.filter((z)=>{let G=k?z.date.getFullYear().toString()===k:!0,K=q!==""?z.date.getMonth().toString()===q:!0;return G&&K}),L(!0),X()}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",M);else M();})();
