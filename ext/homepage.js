var R=[],k=[],G=[],_=0,U=null,L=6;async function B(){try{let q=await window.siteDataProvider.getFor("homepage.ts");R=[];for(let j in q){let J=j.toLowerCase().replace(/\s+/g,"-");q[j].forEach((K)=>{let Q=K.id.replace(/\.html$/,"");R.push({category:j,title:K.title,id:K.id,url:`/${J}/${Q}`,img:K.image,date:new Date(K.date),summary:K.description||""})})}R.sort((j,J)=>J.date.getTime()-j.date.getTime()),k=[...R],G=[...new Set(R.map((j)=>j.category))].map((j)=>R.find((J)=>J.category===j)),v(),W()}catch(q){console.error("Gagal ambil data via provider",q);let z=document.getElementById("newsFeed");if(z)z.innerHTML="<p>Gagal memuat konten.</p>"}}function v(){f(),g(),x(),$(),V();let q=document.getElementById("searchInput"),z=document.getElementById("clearSearch"),j=document.getElementById("hero");if(q)q.addEventListener("input",(Q)=>{let Z=Q.target.value.toLowerCase();if(Z.length>0){if(j)j.style.display="none";Y()}else{if(j)j.style.display="block";W()}k=R.filter((O)=>O.title.toLowerCase().includes(Z)||O.summary&&O.summary.toLowerCase().includes(Z)),V(!0),$()});if(z&&q)z.addEventListener("click",()=>{if(q.value="",j)j.style.display="block";k=[...R],V(!0),$(),W(),q.focus()});let J=document.getElementById("yearFilter"),K=document.getElementById("monthFilter");if(J)J.addEventListener("change",()=>{C(),P()});if(K)K.addEventListener("change",P)}function $(){let q=document.getElementById("sidebarRandom");if(!q)return;q.innerHTML="";let z=document.querySelector(".pill.active"),j=z?z.textContent.trim():"All",J=j==="All"||j==="Kategori"?[...R]:R.filter((O)=>O.category===j),K=k.slice(0,L).map((O)=>O.title),Z=[...J.filter((O)=>!K.includes(O.title))].sort(()=>0.5-Math.random()).slice(0,7);q.innerHTML=Z.map((O)=>{let X=(O.summary||"").replace(/"/g,"&quot;"),M=O.title.replace(/"/g,"&quot;"),A=O.date,T=`${String(A.getDate()).padStart(2,"0")}.${String(A.getMonth()+1).padStart(2,"0")}.${String(A.getFullYear())}`;return`
    <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <img src="${O.img}" class="mini-thumb" alt="${M}" onerror="this.src='/thumbnail.webp'" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; flex-shrink:0;">
    <div class="mini-text">
    <h4 title="${X}" style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3; font-weight: 600;">
    <a href="${O.url}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${O.title}
    </a>
    </h4>
    <div style="display: flex; align-items: center; gap: 5px;">
    <small style="color: #888; font-size: 0.65rem;">${T} •</small>
    <span style="color: var(--primary); font-weight: bold; font-size: 0.65rem; text-transform: uppercase;">${O.category}</span>
    </div>
    </div>
    </div>`}).join("")}window.renderSidebar=$;function w(q,z){if(z)document.querySelectorAll(".pill").forEach((j)=>j.classList.remove("active")),z.classList.add("active");k=q==="All"?[...R]:R.filter((j)=>j.category===q),V(!0),$(q)}window.filterByCat=w;function f(){if(G.length===0)return;let q=document.getElementById("hero"),z=document.getElementById("heroSliderWrapper");if(!q||!z)return;q.classList.remove("skeleton"),z.innerHTML=G.map((K)=>`
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
  </a>`).join("");let j=`<div class="hero-nav">
  <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
  </div>`,J=q.querySelector(".hero-nav");if(J)J.remove();q.insertAdjacentHTML("beforeend",j),document.getElementById("heroPrev")?.addEventListener("click",(K)=>{K.preventDefault(),N(-1)}),document.getElementById("heroNext")?.addEventListener("click",(K)=>{K.preventDefault(),N(1)}),q.addEventListener("mouseenter",Y),q.addEventListener("mouseleave",W),E()}function E(){let q=document.getElementById("heroSliderWrapper");if(!q)return;let z=_*100;q.style.transform=`translateX(-${z}%)`,document.querySelectorAll(".hero-slide").forEach((J,K)=>{J.classList.toggle("active",K===_)})}function W(){if(U)clearInterval(U);U=setInterval(()=>{_=(_+1)%G.length,E()},4600)}function Y(){if(U)clearInterval(U),U=null}function N(q){if(_+=q,_>=G.length)_=0;else if(_<0)_=G.length-1;E(),Y(),W()}function V(q=!1){if(q)L=6;let z=document.getElementById("newsFeed");if(!z)return;z.innerHTML="";let j=document.getElementById("hero"),J=j&&j.style.display!=="none",K=G.map((X)=>X.title),Q=k.filter((X)=>{if(J&&K.includes(X.title))return!1;return!0});Q.slice(0,L).forEach((X)=>{z.innerHTML+=`
    <div class="card" style="animation: fadeIn 0.5s ease">
    <img src="${X.img}" class="card-img" alt="${X.title}" onerror="this.src='/thumbnail.webp'">
    <div class="card-body">
    <a href="${X.url}" class="card-link">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <time style="font-size: 0.8rem; opacity: 0.7;" datetime="${X.date.toISOString()}">
    ${X.date.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
    </time>
    <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${X.category}</small>
    </div>
    <h3 class="card-title">${X.title}</h3>
    <p class="card-excerpt">${X.summary.substring(0,200)}...</p>
    </a>
    </div>
    </div>`});let O=document.getElementById("loadMore");if(O)if(L>=Q.length)O.innerHTML="Kembali ke Atas ↑",O.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else O.innerHTML="Klik Selanjutnya...",O.onclick=()=>{L+=6,V(),$()}}function g(){let q=[...new Set(R.map((j)=>j.category))],z=document.getElementById("categoryPills");if(!z)return;z.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',q.forEach((j)=>{let J=`pill-${j.replace(/\s+/g,"-")}`;z.innerHTML+=`<div class="pill" id="${J}">${j}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){w("All",this)}),q.forEach((j)=>{let J=`pill-${j.replace(/\s+/g,"-")}`;document.getElementById(J)?.addEventListener("click",function(){w(j,this)})})}function x(){let q=[...new Set(R.map((j)=>j.date.getFullYear()))].sort((j,J)=>J-j),z=document.getElementById("yearFilter");if(!z)return;z.innerHTML='<option value="">Pilih Tahun</option>',q.forEach((j)=>{let J=document.createElement("option");J.value=j.toString(),J.textContent=j.toString(),z.appendChild(J)}),C()}function C(){let q=document.getElementById("yearFilter"),z=document.getElementById("monthFilter");if(!q||!z)return;let j=q.value,J=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(z.innerHTML='<option value="">Bulan</option>',j)[...new Set(R.filter((Q)=>Q.date.getFullYear().toString()===j).map((Q)=>Q.date.getMonth()))].sort((Q,Z)=>Q-Z).forEach((Q)=>{let Z=document.createElement("option");Z.value=Q.toString(),Z.textContent=J[Q],z.appendChild(Z)}),z.disabled=!1;else z.disabled=!0}function P(){let q=document.getElementById("yearFilter").value,z=document.getElementById("monthFilter").value,j=document.getElementById("hero");if(q!==""){if(j)j.style.display="none";Y()}else{if(j)j.style.display="block";W()}k=R.filter((J)=>{let K=q?J.date.getFullYear().toString()===q:!0,Q=z!==""?J.date.getMonth().toString()===z:!0;return K&&Q}),V(!0),$()}window.sendToWA=function(){let q=document.getElementById("contact-name").value,z=document.getElementById("contact-message").value;if(!q||!z){alert("Isi nama dan pesannya dulu dong, Bro... \uD83D\uDE00");return}let j="6281578163858",J=`Halo Layar Kosong!%0A%0A*Nama:* ${q}%0A*Pesan:* ${z}`;window.open(`https://wa.me/${j}?text=${J}`,"_blank"),document.getElementById("contact-name").value="",document.getElementById("contact-message").value=""};B();
