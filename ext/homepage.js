var R=[],$=[],_=[],Z=0,G=null,W=6;async function E(){try{let j=await fetch("artikel.json");if(!j.ok)throw Error("Gagal load JSON");let z=await j.json();R=[];for(let J in z){let O=J.toLowerCase().replace(/\s+/g,"-");z[J].forEach((K)=>{let Q=K[1],U=Q.endsWith(".html")?Q.replace(/\.html$/,""):Q;R.push({category:J,title:K[0],url:`/${O}/${U}`,img:K[2],date:new Date(K[3]),summary:K[4]||""})})}R.sort((J,O)=>O.date.getTime()-J.date.getTime()),$=[...R],_=[...new Set(R.map((J)=>J.category))].map((J)=>R.find((O)=>O.category===J)),g(),L()}catch(j){console.error("Gagal ambil data",j);let z=document.getElementById("newsFeed");if(z)z.innerHTML="<p>Gagal memuat konten.</p>"}}function g(){v(),B(),M(),k(),V();let j=document.getElementById("searchInput"),z=document.getElementById("clearSearch"),q=document.getElementById("hero");if(j)j.addEventListener("input",(K)=>{let Q=K.target.value.toLowerCase();if(Q.length>0){if(q)q.style.display="none";A()}else{if(q)q.style.display="block";L()}$=R.filter((U)=>U.title.toLowerCase().includes(Q)||U.summary&&U.summary.toLowerCase().includes(Q)),V(!0),k()});if(z&&j)z.addEventListener("click",()=>{if(j.value="",q)q.style.display="block";$=[...R],V(!0),k(),L(),j.focus()});let J=document.getElementById("yearFilter"),O=document.getElementById("monthFilter");if(J)J.addEventListener("change",()=>{N(),Y()});if(O)O.addEventListener("change",Y)}function v(){if(_.length===0)return;let j=document.getElementById("hero"),z=document.getElementById("heroSliderWrapper");if(!j||!z)return;j.classList.remove("skeleton"),z.innerHTML=_.map((O)=>`
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
  </a>
  `).join("");let q=`
  <div class="hero-nav">
  <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
  </div>
  `,J=j.querySelector(".hero-nav");if(J)J.remove();j.insertAdjacentHTML("beforeend",q),document.getElementById("heroPrev")?.addEventListener("click",(O)=>{O.preventDefault(),P(-1)}),document.getElementById("heroNext")?.addEventListener("click",(O)=>{O.preventDefault(),P(1)}),j.addEventListener("mouseenter",A),j.addEventListener("mouseleave",L),C()}function C(){let j=document.getElementById("heroSliderWrapper");if(!j)return;let z=Z*100;j.style.transform=`translateX(-${z}%)`,document.querySelectorAll(".hero-slide").forEach((J,O)=>{J.classList.toggle("active",O===Z)})}function L(){if(G)clearInterval(G);G=setInterval(()=>{Z=(Z+1)%_.length,C()},6000)}function A(){if(G)clearInterval(G),G=null}function P(j){if(Z+=j,Z>=_.length)Z=0;else if(Z<0)Z=_.length-1;C(),A(),L()}function V(j=!1){if(j)W=6;let z=document.getElementById("newsFeed");if(!z)return;z.innerHTML="";let q=document.getElementById("hero"),J=q&&q.style.display!=="none",O=_.map((X)=>X.title),K=$.filter((X)=>{if(J&&O.includes(X.title))return!1;return!0});K.slice(0,W).forEach((X)=>{z.innerHTML+=`
    <div class="card" style="animation: fadeIn 0.5s ease">
    <img src="${X.img}" class="card-img" alt="${X.title}" onerror="this.src='/thumbnail.webp'">
    <div class="card-body">
    <a href="${X.url}" class="card-link">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${X.category}</small>
    <time style="font-size: 0.8rem; opacity: 0.7;" datetime="${X.date.toISOString()}">
    ${X.date.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
    </time>
    </div>
    <h3 class="card-title">${X.title}</h3>
    <p class="card-excerpt">${X.summary.substring(0,200)}...</p>
    </a>
    </div>
    </div>
    `});let U=document.getElementById("loadMore");if(U)if(W>=K.length)U.innerHTML="Kembali ke Atas ↑",U.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else U.innerHTML="Klik Selanjutnya...",U.onclick=()=>{W+=6,V(),k()}}function k(){let j=document.getElementById("sidebarRandom");if(!j)return;j.innerHTML="";let z=_.map((K)=>K.title),q=$.slice(0,W).map((K)=>K.title);[...R.filter((K)=>!q.includes(K.title)&&!z.includes(K.title))].sort(()=>0.5-Math.random()).slice(0,5).forEach((K)=>{let Q=(K.summary||"").replace(/"/g,"&quot;"),U=K.title.replace(/"/g,"&quot;");j.innerHTML+=`
    <div class="mini-item" style="animation: fadeIn 0.5s ease">
    <img src="${K.img}" class="mini-thumb" alt="${U}" onerror="this.src='/thumbnail.webp'">
    <div class="mini-text">
    <h4 data-tooltip="${Q}">
    <a href="${K.url}" title="${U}" style="text-decoration:none; color:inherit;">
    ${K.title.substring(0,50)}...
    </a>
    </h4>
    <small style="color:var(--text-muted)">${K.date.toLocaleDateString("id-ID")}</small>
    </div>
    </div>
    `})}function B(){let j=[...new Set(R.map((q)=>q.category))],z=document.getElementById("categoryPills");if(!z)return;z.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',j.forEach((q)=>{let J=`pill-${q.replace(/\s+/g,"-")}`;z.innerHTML+=`<div class="pill" id="${J}">${q}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){w("All",this)}),j.forEach((q)=>{let J=`pill-${q.replace(/\s+/g,"-")}`;document.getElementById(J)?.addEventListener("click",function(){w(q,this)})})}function M(){let j=[...new Set(R.map((q)=>q.date.getFullYear()))].sort((q,J)=>J-q),z=document.getElementById("yearFilter");if(!z)return;z.innerHTML='<option value="">Pilih Tahun</option>',j.forEach((q)=>{let J=document.createElement("option");J.value=q.toString(),J.textContent=q.toString(),z.appendChild(J)}),N()}function N(){let j=document.getElementById("yearFilter"),z=document.getElementById("monthFilter");if(!j||!z)return;let q=j.value,J=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(z.innerHTML='<option value="">Bulan</option>',q)[...new Set(R.filter((K)=>K.date.getFullYear().toString()===q).map((K)=>K.date.getMonth()))].sort((K,Q)=>K-Q).forEach((K)=>{let Q=document.createElement("option");Q.value=K.toString(),Q.textContent=J[K],z.appendChild(Q)}),z.disabled=!1;else z.disabled=!0}function Y(){let j=document.getElementById("yearFilter").value,z=document.getElementById("monthFilter").value,q=document.getElementById("hero");if(j!==""){if(q)q.style.display="none";A()}else{if(q)q.style.display="block";L()}$=R.filter((J)=>{let O=j?J.date.getFullYear().toString()===j:!0,K=z!==""?J.date.getMonth().toString()===z:!0;return O&&K}),V(!0),k()}function w(j,z){document.querySelectorAll(".pill").forEach((q)=>q.classList.remove("active")),z.classList.add("active"),$=j==="All"?[...R]:R.filter((q)=>q.category===j),V(!0)}window.sendToWA=function(){let j=document.getElementById("contact-name").value,z=document.getElementById("contact-message").value;if(!j||!z){alert("Isi nama dan pesannya dulu dong, Bro... \uD83D\uDE00");return}let q="6281578163858",J=`Halo Layar Kosong!%0A%0A*Nama:* ${j}%0A*Pesan:* ${z}`;window.open(`https://wa.me/${q}?text=${J}`,"_blank"),document.getElementById("contact-name").value="",document.getElementById("contact-message").value=""};E();
