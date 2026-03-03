var U=[],L=[],_=[],Z=0,$=null,k=6;async function v(){try{let j=await fetch("artikel.json");if(!j.ok)throw Error("Gagal load JSON");let z=await j.json();U=[];for(let J in z){let K=J.toLowerCase().replace(/\s+/g,"-");z[J].forEach((Q)=>{let R=Q[1],X=R.endsWith(".html")?R.replace(/\.html$/,""):R;U.push({category:J,title:Q[0],url:`/${K}/${X}`,img:Q[2],date:new Date(Q[3]),summary:Q[4]||""})})}U.sort((J,K)=>K.date.getTime()-J.date.getTime()),L=[...U],_=[...new Set(U.map((J)=>J.category))].map((J)=>U.find((K)=>K.category===J)),B(),W()}catch(j){console.error("Gagal ambil data",j);let z=document.getElementById("newsFeed");if(z)z.innerHTML="<p>Gagal memuat konten.</p>"}}function B(){M(),T(),F(),G(),V();let j=document.getElementById("searchInput"),z=document.getElementById("clearSearch"),q=document.getElementById("hero");if(j)j.addEventListener("input",(Q)=>{let R=Q.target.value.toLowerCase();if(R.length>0){if(q)q.style.display="none";A()}else{if(q)q.style.display="block";W()}L=U.filter((X)=>X.title.toLowerCase().includes(R)||X.summary&&X.summary.toLowerCase().includes(R)),V(!0),G()});if(z&&j)z.addEventListener("click",()=>{if(j.value="",q)q.style.display="block";L=[...U],V(!0),G(),W(),j.focus()});let J=document.getElementById("yearFilter"),K=document.getElementById("monthFilter");if(J)J.addEventListener("change",()=>{C(),N()});if(K)K.addEventListener("change",N)}function M(){if(_.length===0)return;let j=document.getElementById("hero"),z=document.getElementById("heroSliderWrapper");if(!j||!z)return;j.classList.remove("skeleton"),z.innerHTML=_.map((K)=>`
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
  </a>
  `).join("");let q=`
  <div class="hero-nav">
  <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
  </div>
  `,J=j.querySelector(".hero-nav");if(J)J.remove();j.insertAdjacentHTML("beforeend",q),document.getElementById("heroPrev")?.addEventListener("click",(K)=>{K.preventDefault(),w(-1)}),document.getElementById("heroNext")?.addEventListener("click",(K)=>{K.preventDefault(),w(1)}),j.addEventListener("mouseenter",A),j.addEventListener("mouseleave",W),P()}function P(){let j=document.getElementById("heroSliderWrapper");if(!j)return;let z=Z*100;j.style.transform=`translateX(-${z}%)`,document.querySelectorAll(".hero-slide").forEach((J,K)=>{J.classList.toggle("active",K===Z)})}function W(){if($)clearInterval($);$=setInterval(()=>{Z=(Z+1)%_.length,P()},6000)}function A(){if($)clearInterval($),$=null}function w(j){if(Z+=j,Z>=_.length)Z=0;else if(Z<0)Z=_.length-1;P(),A(),W()}function V(j=!1){if(j)k=6;let z=document.getElementById("newsFeed");if(!z)return;z.innerHTML="";let q=document.getElementById("hero"),J=q&&q.style.display!=="none",K=_.map((O)=>O.title),Q=L.filter((O)=>{if(J&&K.includes(O.title))return!1;return!0});Q.slice(0,k).forEach((O)=>{z.innerHTML+=`
    <div class="card" style="animation: fadeIn 0.5s ease">
    <img src="${O.img}" class="card-img" alt="${O.title}" onerror="this.src='/thumbnail.webp'">
    <div class="card-body">
    <a href="${O.url}" class="card-link">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${O.category}</small>
    <time style="font-size: 0.8rem; opacity: 0.7;" datetime="${O.date.toISOString()}">
    ${O.date.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
    </time>
    </div>
    <h3 class="card-title">${O.title}</h3>
    <p class="card-excerpt">${O.summary.substring(0,200)}...</p>
    </a>
    </div>
    </div>
    `});let X=document.getElementById("loadMore");if(X)if(k>=Q.length)X.innerHTML="Kembali ke Atas ↑",X.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else X.innerHTML="Klik Selanjutnya...",X.onclick=()=>{k+=6,V(),G()}}function G(j="All"){let z=document.getElementById("sidebarRandom");if(!z)return;z.innerHTML="";let q=j==="All"?U:U.filter((O)=>O.category===j),J=[],K=new Set,R=Math.min(7,q.length);while(J.length<R){let O=Math.floor(Math.random()*q.length);if(!K.has(O))J.push(q[O]),K.add(O)}let X=J.map((O)=>{let Y=O.title.replace(/"/g,"&quot;");return`
    <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <img src="${O.img}" class="mini-thumb" alt="${Y}"
    onerror="this.src='/thumbnail.webp'"
    style="width: 60px; height: 60px; object-fit: cover; border-radius: 10px; flex-shrink: 0;">
    <div class="mini-text">
    <h4 style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3;">
    <a href="${O.url}" title="${Y}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${O.title}
    </a>
    </h4>
    <small style="color: var(--primary); font-weight: bold; font-size: 0.7rem; text-transform: uppercase;">
    ${O.category}
    </small>
    </div>
    </div>
    `}).join("");z.innerHTML=X}function T(){let j=[...new Set(U.map((q)=>q.category))],z=document.getElementById("categoryPills");if(!z)return;z.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',j.forEach((q)=>{let J=`pill-${q.replace(/\s+/g,"-")}`;z.innerHTML+=`<div class="pill" id="${J}">${q}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){E("All",this)}),j.forEach((q)=>{let J=`pill-${q.replace(/\s+/g,"-")}`;document.getElementById(J)?.addEventListener("click",function(){E(q,this)})})}function F(){let j=[...new Set(U.map((q)=>q.date.getFullYear()))].sort((q,J)=>J-q),z=document.getElementById("yearFilter");if(!z)return;z.innerHTML='<option value="">Pilih Tahun</option>',j.forEach((q)=>{let J=document.createElement("option");J.value=q.toString(),J.textContent=q.toString(),z.appendChild(J)}),C()}function C(){let j=document.getElementById("yearFilter"),z=document.getElementById("monthFilter");if(!j||!z)return;let q=j.value,J=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(z.innerHTML='<option value="">Bulan</option>',q)[...new Set(U.filter((Q)=>Q.date.getFullYear().toString()===q).map((Q)=>Q.date.getMonth()))].sort((Q,R)=>Q-R).forEach((Q)=>{let R=document.createElement("option");R.value=Q.toString(),R.textContent=J[Q],z.appendChild(R)}),z.disabled=!1;else z.disabled=!0}function N(){let j=document.getElementById("yearFilter").value,z=document.getElementById("monthFilter").value,q=document.getElementById("hero");if(j!==""){if(q)q.style.display="none";A()}else{if(q)q.style.display="block";W()}L=U.filter((J)=>{let K=j?J.date.getFullYear().toString()===j:!0,Q=z!==""?J.date.getMonth().toString()===z:!0;return K&&Q}),V(!0),G()}function E(j,z){document.querySelectorAll(".pill").forEach((q)=>q.classList.remove("active")),z.classList.add("active"),L=j==="All"?[...U]:U.filter((q)=>q.category===j),V(!0),G(j)}window.sendToWA=function(){let j=document.getElementById("contact-name").value,z=document.getElementById("contact-message").value;if(!j||!z){alert("Isi nama dan pesannya dulu dong, Bro... \uD83D\uDE00");return}let q="6281578163858",J=`Halo Layar Kosong!%0A%0A*Nama:* ${j}%0A*Pesan:* ${z}`;window.open(`https://wa.me/${q}?text=${J}`,"_blank"),document.getElementById("contact-name").value="",document.getElementById("contact-message").value=""};v();
