var Q=[],$=[],k=[],V=6,L="All";async function E(){try{let q=await window.siteDataProvider.getFor("homepage.ts");Q=[];for(let j in q){let J=j.toLowerCase().replace(/\s+/g,"-");q[j].forEach((O)=>{let K=O.id.replace(/\.html$/,"");Q.push({category:j,title:O.title,id:O.id,url:`/${J}/${K}/`,img:O.image,date:new Date(O.date),summary:O.description||""})})}Q.sort((j,J)=>J.date.getTime()-j.date.getTime()),$=[...Q],k=[...new Set(Q.map((j)=>j.category))].map((j)=>Q.find((J)=>J.category===j)),N(),U()}catch(q){console.error("Gagal load data via provider",q)}}function N(){C(),A(),M(),_(),G();let q=document.getElementById("searchInput"),z=document.getElementById("clearSearch"),j=document.getElementById("hero");if(q)q.addEventListener("input",(K)=>{let X=K.target.value.toLowerCase();if(X.length>0){if(j)j.style.display="none";W()}else{if(j)j.style.display="block";U()}$=Q.filter((Z)=>Z.title.toLowerCase().includes(X)||Z.summary&&Z.summary.toLowerCase().includes(X)),G(!0),_()});if(z&&q)z.addEventListener("click",()=>{if(q.value="",j)j.style.display="block";$=[...Q],G(!0),_(),U(),q.focus()});let J=document.getElementById("yearFilter"),O=document.getElementById("monthFilter");if(J)J.addEventListener("change",()=>{w(),x()});if(O)O.addEventListener("change",x)}function _(){let q=document.getElementById("sidebarRandom");if(!q)return;let z=L==="All"||L==="Kategori"?[...Q]:Q.filter((K)=>K.category===L),j=$.slice(0,V).map((K)=>K.title),O=[...z.filter((K)=>!j.includes(K.title))].sort(()=>0.5-Math.random()).slice(0,7);q.innerHTML=O.map((K)=>`
  <div class="mini-item">
  <img src="${K.img}" class="mini-thumb" alt="${K.title}" onerror="this.src='/thumbnail.webp'">
  <div class="mini-text">
  <h4><a href="${K.url}">${K.title}</a></h4>
  <small>${K.date.toLocaleDateString("id-ID")} • <span>${K.category}</span></small>
  </div>
  </div>`).join("")}window.renderSidebar=_;function T(q,z){if(z)document.querySelectorAll(".pill").forEach((j)=>j.classList.remove("active")),z.classList.add("active");$=q==="All"?[...Q]:Q.filter((j)=>j.category===q),G(!0),_(q)}window.filterByCat=T;function C(){if(k.length===0)return;let q=document.getElementById("hero"),z=document.getElementById("heroSliderWrapper");if(!q||!z)return;q.classList.remove("skeleton"),z.innerHTML=k.map((O)=>`
  <a href="${O.url}" class="hero-slide" style="background-image: url('${O.img}')">
  <div class="hero-overlay"></div>
  <div class="hero-content">
  <span class="hero-cat">${O.category}</span>
  <h1 class="hero-title">${O.title}</h1>
  <p class="hero-summary">
  ${O.summary.substring(0,270)}...
  <strong style="color:var(--secondary);">Ungkap Faktanya →</strong>
  </p>
  </div>
  </a>`).join("");let j=`<div class="hero-nav">
  <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
  </div>`,J=q.querySelector(".hero-nav");if(J)J.remove();q.insertAdjacentHTML("beforeend",j),document.getElementById("heroPrev")?.addEventListener("click",(O)=>{O.preventDefault(),Y(-1)}),document.getElementById("heroNext")?.addEventListener("click",(O)=>{O.preventDefault(),Y(1)}),q.addEventListener("mouseenter",W),q.addEventListener("mouseleave",U),P()}function P(){let q=document.getElementById("heroSliderWrapper");if(!q)return;let z=currentHeroIndex*100;q.style.transform=`translateX(-${z}%)`,document.querySelectorAll(".hero-slide").forEach((J,O)=>{J.classList.toggle("active",O===currentHeroIndex)})}function U(){if(heroTimer)clearInterval(heroTimer);heroTimer=setInterval(()=>{currentHeroIndex=(currentHeroIndex+1)%k.length,P()},4600)}function W(){if(heroTimer)clearInterval(heroTimer),heroTimer=null}function Y(q){if(currentHeroIndex+=q,currentHeroIndex>=k.length)currentHeroIndex=0;else if(currentHeroIndex<0)currentHeroIndex=k.length-1;P(),W(),U()}function G(q=!1){if(q)V=6;let z=document.getElementById("newsFeed");if(!z)return;z.innerHTML="";let j=document.getElementById("hero"),J=j&&j.style.display!=="none",O=k.map((R)=>R.title),K=$.filter((R)=>{if(J&&O.includes(R.title))return!1;return!0});K.slice(0,V).forEach((R)=>{z.innerHTML+=`
    <div class="card" style="animation: fadeIn 0.5s ease">
    <img src="${R.img}" class="card-img" alt="${R.title}" onerror="this.src='/thumbnail.webp'">
    <div class="card-body">
    <a href="${R.url}" class="card-link">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <time style="font-size: 0.8rem; opacity: 0.7;" datetime="${R.date.toISOString()}">
    ${R.date.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
    </time>
    <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${R.category}</small>
    </div>
    <h3 class="card-title">${R.title}</h3>
    <p class="card-excerpt">${R.summary.substring(0,200)}...</p>
    </a>
    </div>
    </div>`});let Z=document.getElementById("loadMore");if(Z)if(V>=K.length)Z.innerHTML="Kembali ke Atas ↑",Z.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else Z.innerHTML="Klik Selanjutnya...",Z.onclick=()=>{V+=6,G(),_()}}function A(){let q=[...new Set(Q.map((j)=>j.category))],z=document.getElementById("categoryPills");if(!z)return;z.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',q.forEach((j)=>{let J=`pill-${j.replace(/\s+/g,"-")}`;z.innerHTML+=`<div class="pill" id="${J}">${j}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){T("All",this)}),q.forEach((j)=>{let J=`pill-${j.replace(/\s+/g,"-")}`;document.getElementById(J)?.addEventListener("click",function(){T(j,this)})})}function M(){let q=[...new Set(Q.map((j)=>j.date.getFullYear()))].sort((j,J)=>J-j),z=document.getElementById("yearFilter");if(!z)return;z.innerHTML='<option value="">Pilih Tahun</option>',q.forEach((j)=>{let J=document.createElement("option");J.value=j.toString(),J.textContent=j.toString(),z.appendChild(J)}),w()}function w(){let q=document.getElementById("yearFilter"),z=document.getElementById("monthFilter");if(!q||!z)return;let j=q.value,J=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(z.innerHTML='<option value="">Bulan</option>',j)[...new Set(Q.filter((K)=>K.date.getFullYear().toString()===j).map((K)=>K.date.getMonth()))].sort((K,X)=>K-X).forEach((K)=>{let X=document.createElement("option");X.value=K.toString(),X.textContent=J[K],z.appendChild(X)}),z.disabled=!1;else z.disabled=!0}function x(){let q=document.getElementById("yearFilter").value,z=document.getElementById("monthFilter").value,j=document.getElementById("hero");if(q!==""){if(j)j.style.display="none";W()}else{if(j)j.style.display="block";U()}$=Q.filter((J)=>{let O=q?J.date.getFullYear().toString()===q:!0,K=z!==""?J.date.getMonth().toString()===z:!0;return O&&K}),G(!0),_()}window.sendToWA=function(){let q=document.getElementById("contact-name").value,z=document.getElementById("contact-message").value;if(!q||!z){alert("Isi nama dan pesannya dulu dong, Bro... \uD83D\uDE00");return}let j="6281578163858",J=`Halo Layar Kosong!%0A%0A*Nama:* ${q}%0A*Pesan:* ${z}`;window.open(`https://wa.me/${j}?text=${J}`,"_blank"),document.getElementById("contact-name").value="",document.getElementById("contact-message").value=""};E();
