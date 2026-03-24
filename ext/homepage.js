(()=>{var Q=[],$=[],L=[],Z=0,V=null,Y=6;function T(q,z,j={}){let G=q.split("?")[0],J=G.lastIndexOf("."),O=J!==-1?G.slice(J):"",R=J!==-1?G.slice(0,J):G,X=new Set([".svg",".gif"]),K=G.includes("/img/")&&!X.has(O.toLowerCase()),w=K?`${R}.webp`:q,E=K?`${R}-sm.webp`:q,N=z.replace(/"/g,"&quot;"),C=q.replace(/'/g,"&#39;"),f=j.loading??"lazy",b=j.fetchpriority?' fetchpriority="high"':"",g=j.imgStyle?` style="${j.imgStyle}"`:"",x=j.cls?` class="${j.cls}"`:"";return`
  <picture${j.style?` style="${j.style}"`:""}>
  ${K?`<source media="(max-width: 500px)" srcset="${E}">`:""}
  ${K?`<source srcset="${w}">`:""}
  <img src="${q}"${x} alt="${N}"
  loading="${f}" decoding="async"${b}${g}
  onerror="this.onerror=null;this.src='${C}'">
  </picture>`}async function U(){try{let q=await window.siteDataProvider.getFor("homepage.ts");Q=[];for(let j in q){let G=j.toLowerCase().replace(/\s+/g,"-");q[j].forEach((J)=>{let O=J.id.replace(/\.html$/,"");Q.push({category:j,title:J.title,id:J.id,url:`/${G}/${O}`,img:J.image,date:J.date?new Date(J.date):new Date,summary:J.description||""})})}Q.sort((j,G)=>G.date.getTime()-j.date.getTime()),$=[...Q],L=[...new Set(Q.map((j)=>j.category))].map((j)=>Q.find((G)=>G.category===j)),I(),A()}catch(q){console.error("Gagal ambil data via provider",q);let z=document.getElementById("newsFeed");if(z)z.innerHTML="<p>Gagal memuat konten.</p>"}}function I(){H(),y(),D(),_(),k();let q=document.getElementById("searchInput"),z=document.getElementById("clearSearch"),j=document.getElementById("hero");if(q)q.addEventListener("input",(O)=>{let R=O.target.value.toLowerCase();if(R.length>0){if(j)j.style.display="none";W()}else{if(j)j.style.display="block";A()}$=Q.filter((X)=>X.title.toLowerCase().includes(R)||X.summary&&X.summary.toLowerCase().includes(R)),k(!0),_()});if(z&&q)z.addEventListener("click",()=>{if(q.value="",j)j.style.display="block";$=[...Q],k(!0),_(),A(),q.focus()});let G=document.getElementById("yearFilter"),J=document.getElementById("monthFilter");if(G)G.addEventListener("change",()=>{B(),F()});if(J)J.addEventListener("change",F)}function H(){if(L.length===0)return;let q=document.getElementById("hero"),z=document.getElementById("heroSliderWrapper");if(!q||!z)return;q.classList.remove("skeleton"),z.innerHTML=L.map((J,O)=>`
  <a href="${J.url}" class="hero-slide">
  ${T(J.img,J.title,{fetchpriority:O===0,loading:O===0?"eager":"lazy",style:"position:absolute;inset:0;width:100%;height:100%;",imgStyle:"width:100%;height:100%;object-fit:cover;display:block;"})}
  <div class="hero-overlay"></div>
  <div class="hero-content">
  <span class="hero-cat">${J.category}</span>
  <h1 class="hero-title">${J.title}</h1>
  <p class="hero-summary">
  ${J.summary.substring(0,270)}...
  <strong style="color:var(--secondary);">Ungkap Faktanya →</strong>
  </p>
  </div>
  </a>`).join("");let j=`<div class="hero-nav">
  <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
  </div>`,G=q.querySelector(".hero-nav");if(G)G.remove();q.insertAdjacentHTML("beforeend",j),document.getElementById("heroPrev")?.addEventListener("click",(J)=>{J.preventDefault(),P(-1)}),document.getElementById("heroNext")?.addEventListener("click",(J)=>{J.preventDefault(),P(1)}),q.addEventListener("mouseenter",W),q.addEventListener("mouseleave",A),v()}function v(){let q=document.getElementById("heroSliderWrapper");if(!q)return;let z=Z*100;q.style.transform=`translateX(-${z}%)`,document.querySelectorAll(".hero-slide").forEach((G,J)=>{G.classList.toggle("active",J===Z)})}function A(){if(V)clearInterval(V);V=setInterval(()=>{Z=(Z+1)%L.length,v()},4600)}function W(){if(V)clearInterval(V),V=null}function P(q){if(Z+=q,Z>=L.length)Z=0;else if(Z<0)Z=L.length-1;v(),W(),A()}function k(q=!1){if(q)Y=6;let z=document.getElementById("newsFeed");if(!z)return;z.innerHTML="";let j=document.getElementById("hero"),G=j&&j.style.display!=="none",J=L.map((K)=>K.title),O=$.filter((K)=>{if(G&&J.includes(K.title))return!1;return!0});O.slice(0,Y).forEach((K)=>{z.innerHTML+=`
    <div class="card" style="animation: fadeIn 0.5s ease">
    ${T(K.img,K.title,{cls:"card-img",loading:"lazy"})}
    <div class="card-body">
    <a href="${K.url}" class="card-link">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <time style="font-size: 0.8rem; opacity: 0.7;" datetime="${K.date.toISOString()}">
    ${K.date.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
    </time>
    <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${K.category}</small>
    </div>
    <h3 class="card-title">${K.title}</h3>
    <p class="card-excerpt">${K.summary.substring(0,200)}...</p>
    </a>
    </div>
    </div>`});let X=document.getElementById("loadMore");if(X)if(Y>=O.length)X.innerHTML="Kembali ke Atas ↑",X.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else X.innerHTML="Klik Selanjutnya...",X.onclick=()=>{Y+=6,k(),_()}}function _(q){let z=document.getElementById("sidebarRandom");if(!z)return;z.innerHTML="";let j=document.querySelector(".pill.active"),G=q||(j?j.textContent.trim():"All"),J=G==="All"||G==="Kategori"?[...Q]:Q.filter((K)=>K.category===G),O=$.slice(0,Y).map((K)=>K.title),X=[...J.filter((K)=>!O.includes(K.title))].sort(()=>0.5-Math.random()).slice(0,11);z.innerHTML=X.map((K)=>{let w=(K.summary||"").replace(/"/g,"&quot;"),E=K.title.replace(/"/g,"&quot;"),N=K.date,C=`${String(N.getDate()).padStart(2,"0")}.${String(N.getMonth()+1).padStart(2,"0")}.${String(N.getFullYear())}`;return`
    <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    ${T(K.img,E,{cls:"mini-thumb",loading:"lazy",imgStyle:"width:55px;height:55px;object-fit:cover;border-radius:8px;flex-shrink:0;"})}
    <div class="mini-text">
    <h4 title="${w}" style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3; font-weight: 600;">
    <a href="${K.url}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${K.title}
    </a>
    </h4>
    <div style="display: flex; align-items: center; gap: 5px;">
    <small style="color: #888; font-size: 0.65rem;">${C} •</small>
    <span style="color: var(--primary); font-weight: bold; font-size: 0.65rem; text-transform: uppercase;">${K.category}</span>
    </div>
    </div>
    </div>`}).join("")}window.renderSidebar=_;function M(q,z){if(z)document.querySelectorAll(".pill").forEach((j)=>j.classList.remove("active")),z.classList.add("active");$=q==="All"?[...Q]:Q.filter((j)=>j.category===q),k(!0),_(q)}window.filterByCat=M;function y(){let q=[...new Set(Q.map((j)=>j.category))],z=document.getElementById("categoryPills");if(!z)return;z.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',q.forEach((j)=>{let G=`pill-${j.replace(/\s+/g,"-")}`;z.innerHTML+=`<div class="pill" id="${G}">${j}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){M("All",this)}),q.forEach((j)=>{let G=`pill-${j.replace(/\s+/g,"-")}`;document.getElementById(G)?.addEventListener("click",function(){M(j,this)})})}function D(){let q=[...new Set(Q.map((j)=>j.date.getFullYear()))].sort((j,G)=>G-j),z=document.getElementById("yearFilter");if(!z)return;z.innerHTML='<option value="">Pilih Tahun</option>',q.forEach((j)=>{let G=document.createElement("option");G.value=j.toString(),G.textContent=j.toString(),z.appendChild(G)}),B()}function B(){let q=document.getElementById("yearFilter"),z=document.getElementById("monthFilter");if(!q||!z)return;let j=q.value,G=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(z.innerHTML='<option value="">Bulan</option>',j)[...new Set(Q.filter((O)=>O.date.getFullYear().toString()===j).map((O)=>O.date.getMonth()))].sort((O,R)=>O-R).forEach((O)=>{let R=document.createElement("option");R.value=O.toString(),R.textContent=G[O],z.appendChild(R)}),z.disabled=!1;else z.disabled=!0}function F(){let q=document.getElementById("yearFilter").value,z=document.getElementById("monthFilter").value,j=document.getElementById("hero");if(q!==""){if(j)j.style.display="none";W()}else{if(j)j.style.display="block";A()}$=Q.filter((G)=>{let J=q?G.date.getFullYear().toString()===q:!0,O=z!==""?G.date.getMonth().toString()===z:!0;return J&&O}),k(!0),_()}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",U);else U();})();
