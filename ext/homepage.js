(()=>{var U=[],$=[],j=[],Z=0,k=null,O=6;async function E(){try{let z=await window.siteDataProvider.getFor("homepage.ts");U=[];for(let q in z){let J=q.toLowerCase().replace(/\s+/g,"-");z[q].forEach((K)=>{let R=K.id.replace(/\.html$/,"");U.push({category:q,title:K.title,id:K.id,url:`/${J}/${R}`,img:K.image,date:K.date?new Date(K.date):new Date,summary:K.description||""})})}U.sort((q,J)=>J.date.getTime()-q.date.getTime()),$=[...U],j=[...new Set(U.map((q)=>q.category))].map((q)=>U.find((J)=>J.category===q)),x(),L()}catch(z){console.error("Gagal ambil data via provider",z);let G=document.getElementById("newsFeed");if(G)G.innerHTML="<p>Gagal memuat konten.</p>"}}function x(){F(),f(),g(),_(),A();let z=document.getElementById("searchInput"),G=document.getElementById("clearSearch"),q=document.getElementById("hero");if(z)z.addEventListener("input",(R)=>{let W=R.target.value.toLowerCase();if(W.length>0){if(q)q.style.display="none";V()}else{if(q)q.style.display="block";L()}$=U.filter((X)=>X.title.toLowerCase().includes(W)||X.summary&&X.summary.toLowerCase().includes(W)),A(!0),_()});if(G&&z)G.addEventListener("click",()=>{if(z.value="",q)q.style.display="block";$=[...U],A(!0),_(),L(),z.focus()});let J=document.getElementById("yearFilter"),K=document.getElementById("monthFilter");if(J)J.addEventListener("change",()=>{T(),C()});if(K)K.addEventListener("change",C)}function _(z){let G=document.getElementById("sidebarRandom");if(!G)return;G.innerHTML="";let q=document.querySelector(".pill.active"),J=z||(q?q.textContent.trim():"All"),K=J==="All"||J==="Kategori"?[...U]:U.filter((Q)=>Q.category===J),R=$.slice(0,O).map((Q)=>Q.title),X=[...K.filter((Q)=>!R.includes(Q.title))].sort(()=>0.5-Math.random()).slice(0,7);G.innerHTML=X.map((Q)=>{let B=(Q.summary||"").replace(/"/g,"&quot;"),M=Q.title.replace(/"/g,"&quot;"),N=Q.date,v=`${String(N.getDate()).padStart(2,"0")}.${String(N.getMonth()+1).padStart(2,"0")}.${String(N.getFullYear())}`;return`
    <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <img src="${Q.img}" class="mini-thumb" alt="${M}" onerror="this.src='/thumbnail.webp'" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; flex-shrink:0;">
    <div class="mini-text">
    <h4 title="${B}" style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3; font-weight: 600;">
    <a href="${Q.url}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${Q.title}
    </a>
    </h4>
    <div style="display: flex; align-items: center; gap: 5px;">
    <small style="color: #888; font-size: 0.65rem;">${v} •</small>
    <span style="color: var(--primary); font-weight: bold; font-size: 0.65rem; text-transform: uppercase;">${Q.category}</span>
    </div>
    </div>
    </div>`}).join("")}window.renderSidebar=_;function Y(z,G){if(G)document.querySelectorAll(".pill").forEach((q)=>q.classList.remove("active")),G.classList.add("active");$=z==="All"?[...U]:U.filter((q)=>q.category===z),A(!0),_(z)}window.filterByCat=Y;function F(){if(j.length===0)return;let z=document.getElementById("hero"),G=document.getElementById("heroSliderWrapper");if(!z||!G)return;z.classList.remove("skeleton"),G.innerHTML=j.map((K)=>`
  <a href="${K.url}" class="hero-slide" style="background-image: url('${K.img}')">
  <div class="hero-overlay"></div>
  <div class="hero-content">
  <span class="hero-cat">${K.category}</span>
  <h1 class="hero-title">${K.title}</h1>
  <p class="hero-summary">
  ${K.summary.substring(0,270)}...
  <strong style="color:var(--secondary);">Ungkap Faktanya →</strong>
  </p>
  </div>
  </a>`).join("");let q=`<div class="hero-nav">
  <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
  </div>`,J=z.querySelector(".hero-nav");if(J)J.remove();z.insertAdjacentHTML("beforeend",q),document.getElementById("heroPrev")?.addEventListener("click",(K)=>{K.preventDefault(),P(-1)}),document.getElementById("heroNext")?.addEventListener("click",(K)=>{K.preventDefault(),P(1)}),z.addEventListener("mouseenter",V),z.addEventListener("mouseleave",L),w()}function w(){let z=document.getElementById("heroSliderWrapper");if(!z)return;let G=Z*100;z.style.transform=`translateX(-${G}%)`,document.querySelectorAll(".hero-slide").forEach((J,K)=>{J.classList.toggle("active",K===Z)})}function L(){if(k)clearInterval(k);k=setInterval(()=>{Z=(Z+1)%j.length,w()},4600)}function V(){if(k)clearInterval(k),k=null}function P(z){if(Z+=z,Z>=j.length)Z=0;else if(Z<0)Z=j.length-1;w(),V(),L()}function A(z=!1){if(z)O=6;let G=document.getElementById("newsFeed");if(!G)return;G.innerHTML="";let q=document.getElementById("hero"),J=q&&q.style.display!=="none",K=j.map((Q)=>Q.title),R=$.filter((Q)=>{if(J&&K.includes(Q.title))return!1;return!0});R.slice(0,O).forEach((Q)=>{G.innerHTML+=`
    <div class="card" style="animation: fadeIn 0.5s ease">
    <img src="${Q.img}" class="card-img" alt="${Q.title}" onerror="this.src='/thumbnail.webp'">
    <div class="card-body">
    <a href="${Q.url}" class="card-link">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <time style="font-size: 0.8rem; opacity: 0.7;" datetime="${Q.date.toISOString()}">
    ${Q.date.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
    </time>
    <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${Q.category}</small>
    </div>
    <h3 class="card-title">${Q.title}</h3>
    <p class="card-excerpt">${Q.summary.substring(0,200)}...</p>
    </a>
    </div>
    </div>`});let X=document.getElementById("loadMore");if(X)if(O>=R.length)X.innerHTML="Kembali ke Atas ↑",X.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else X.innerHTML="Klik Selanjutnya...",X.onclick=()=>{O+=6,A(),_()}}function f(){let z=[...new Set(U.map((q)=>q.category))],G=document.getElementById("categoryPills");if(!G)return;G.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',z.forEach((q)=>{let J=`pill-${q.replace(/\s+/g,"-")}`;G.innerHTML+=`<div class="pill" id="${J}">${q}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){Y("All",this)}),z.forEach((q)=>{let J=`pill-${q.replace(/\s+/g,"-")}`;document.getElementById(J)?.addEventListener("click",function(){Y(q,this)})})}function g(){let z=[...new Set(U.map((q)=>q.date.getFullYear()))].sort((q,J)=>J-q),G=document.getElementById("yearFilter");if(!G)return;G.innerHTML='<option value="">Pilih Tahun</option>',z.forEach((q)=>{let J=document.createElement("option");J.value=q.toString(),J.textContent=q.toString(),G.appendChild(J)}),T()}function T(){let z=document.getElementById("yearFilter"),G=document.getElementById("monthFilter");if(!z||!G)return;let q=z.value,J=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(G.innerHTML='<option value="">Bulan</option>',q)[...new Set(U.filter((R)=>R.date.getFullYear().toString()===q).map((R)=>R.date.getMonth()))].sort((R,W)=>R-W).forEach((R)=>{let W=document.createElement("option");W.value=R.toString(),W.textContent=J[R],G.appendChild(W)}),G.disabled=!1;else G.disabled=!0}function C(){let z=document.getElementById("yearFilter").value,G=document.getElementById("monthFilter").value,q=document.getElementById("hero");if(z!==""){if(q)q.style.display="none";V()}else{if(q)q.style.display="block";L()}$=U.filter((J)=>{let K=z?J.date.getFullYear().toString()===z:!0,R=G!==""?J.date.getMonth().toString()===G:!0;return K&&R}),A(!0),_()}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",E);else E();})();
