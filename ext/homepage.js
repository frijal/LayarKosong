var X=[],k=[],G=[],_=0,U=null,L=6;async function B(){try{let j=await fetch("artikel.json");if(!j.ok)throw Error("Gagal load JSON");let z=await j.json();X=[];for(let J in z){let K=J.toLowerCase().replace(/\s+/g,"-");z[J].forEach((Q)=>{let R=Q[1],O=R.endsWith(".html")?R.replace(/\.html$/,""):R;X.push({category:J,title:Q[0],url:`/${K}/${O}`,img:Q[2],date:new Date(Q[3]),summary:Q[4]||""})})}X.sort((J,K)=>K.date.getTime()-J.date.getTime()),k=[...X],G=[...new Set(X.map((J)=>J.category))].map((J)=>X.find((K)=>K.category===J)),v(),W()}catch(j){console.error("Gagal ambil data",j);let z=document.getElementById("newsFeed");if(z)z.innerHTML="<p>Gagal memuat konten.</p>"}}function v(){g(),x(),F(),$(),V();let j=document.getElementById("searchInput"),z=document.getElementById("clearSearch"),q=document.getElementById("hero");if(j)j.addEventListener("input",(Q)=>{let R=Q.target.value.toLowerCase();if(R.length>0){if(q)q.style.display="none";Y()}else{if(q)q.style.display="block";W()}k=X.filter((O)=>O.title.toLowerCase().includes(R)||O.summary&&O.summary.toLowerCase().includes(R)),V(!0),$()});if(z&&j)z.addEventListener("click",()=>{if(j.value="",q)q.style.display="block";k=[...X],V(!0),$(),W(),j.focus()});let J=document.getElementById("yearFilter"),K=document.getElementById("monthFilter");if(J)J.addEventListener("change",()=>{M(),C()});if(K)K.addEventListener("change",C)}function $(){let j=document.getElementById("sidebarRandom");if(!j)return;j.innerHTML="";let z=document.querySelector(".pill.active"),q=z?z.textContent.trim():"All",J=q==="All"||q==="Kategori"?[...X]:X.filter((O)=>O.category===q),K=k.slice(0,L).map((O)=>O.title),R=[...J.filter((O)=>!K.includes(O.title))].sort(()=>0.5-Math.random()).slice(0,7);j.innerHTML=R.map((O)=>{let Z=(O.summary||"").replace(/"/g,"&quot;"),N=O.title.replace(/"/g,"&quot;"),A=O.date,T=`${String(A.getDate()).padStart(2,"0")}.${String(A.getMonth()+1).padStart(2,"0")}.${String(A.getFullYear())}`;return`
    <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <img src="${O.img}" class="mini-thumb" alt="${N}" onerror="this.src='/thumbnail.webp'" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; flex-shrink:0;">
    <div class="mini-text">
    <h4 title="${Z}" style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3; font-weight: 600;">
    <a href="${O.url}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${O.title}
    </a>
    </h4>
    <div style="display: flex; align-items: center; gap: 5px;">
    <small style="color: var(--primary); font-weight: bold; font-size: 0.65rem; text-transform: uppercase;">${O.category}</small>
    <span style="color: #888; font-size: 0.65rem;">• ${T}</span>
    </div>
    </div>
    </div>`}).join("")}window.renderSidebar=$;function w(j,z){if(z)document.querySelectorAll(".pill").forEach((q)=>q.classList.remove("active")),z.classList.add("active");k=j==="All"?[...X]:X.filter((q)=>q.category===j),V(!0),$(j)}window.filterByCat=w;function g(){if(G.length===0)return;let j=document.getElementById("hero"),z=document.getElementById("heroSliderWrapper");if(!j||!z)return;j.classList.remove("skeleton"),z.innerHTML=G.map((K)=>`
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
  </div>`,J=j.querySelector(".hero-nav");if(J)J.remove();j.insertAdjacentHTML("beforeend",q),document.getElementById("heroPrev")?.addEventListener("click",(K)=>{K.preventDefault(),P(-1)}),document.getElementById("heroNext")?.addEventListener("click",(K)=>{K.preventDefault(),P(1)}),j.addEventListener("mouseenter",Y),j.addEventListener("mouseleave",W),E()}function E(){let j=document.getElementById("heroSliderWrapper");if(!j)return;let z=_*100;j.style.transform=`translateX(-${z}%)`,document.querySelectorAll(".hero-slide").forEach((J,K)=>{J.classList.toggle("active",K===_)})}function W(){if(U)clearInterval(U);U=setInterval(()=>{_=(_+1)%G.length,E()},4600)}function Y(){if(U)clearInterval(U),U=null}function P(j){if(_+=j,_>=G.length)_=0;else if(_<0)_=G.length-1;E(),Y(),W()}function V(j=!1){if(j)L=6;let z=document.getElementById("newsFeed");if(!z)return;z.innerHTML="";let q=document.getElementById("hero"),J=q&&q.style.display!=="none",K=G.map((Z)=>Z.title),Q=k.filter((Z)=>{if(J&&K.includes(Z.title))return!1;return!0});Q.slice(0,L).forEach((Z)=>{z.innerHTML+=`
    <div class="card" style="animation: fadeIn 0.5s ease">
    <img src="${Z.img}" class="card-img" alt="${Z.title}" onerror="this.src='/thumbnail.webp'">
    <div class="card-body">
    <a href="${Z.url}" class="card-link">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${Z.category}</small>
    <time style="font-size: 0.8rem; opacity: 0.7;" datetime="${Z.date.toISOString()}">
    ${Z.date.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
    </time>
    </div>
    <h3 class="card-title">${Z.title}</h3>
    <p class="card-excerpt">${Z.summary.substring(0,200)}...</p>
    </a>
    </div>
    </div>`});let O=document.getElementById("loadMore");if(O)if(L>=Q.length)O.innerHTML="Kembali ke Atas ↑",O.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else O.innerHTML="Klik Selanjutnya...",O.onclick=()=>{L+=6,V(),$()}}function x(){let j=[...new Set(X.map((q)=>q.category))],z=document.getElementById("categoryPills");if(!z)return;z.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',j.forEach((q)=>{let J=`pill-${q.replace(/\s+/g,"-")}`;z.innerHTML+=`<div class="pill" id="${J}">${q}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){w("All",this)}),j.forEach((q)=>{let J=`pill-${q.replace(/\s+/g,"-")}`;document.getElementById(J)?.addEventListener("click",function(){w(q,this)})})}function F(){let j=[...new Set(X.map((q)=>q.date.getFullYear()))].sort((q,J)=>J-q),z=document.getElementById("yearFilter");if(!z)return;z.innerHTML='<option value="">Pilih Tahun</option>',j.forEach((q)=>{let J=document.createElement("option");J.value=q.toString(),J.textContent=q.toString(),z.appendChild(J)}),M()}function M(){let j=document.getElementById("yearFilter"),z=document.getElementById("monthFilter");if(!j||!z)return;let q=j.value,J=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(z.innerHTML='<option value="">Bulan</option>',q)[...new Set(X.filter((Q)=>Q.date.getFullYear().toString()===q).map((Q)=>Q.date.getMonth()))].sort((Q,R)=>Q-R).forEach((Q)=>{let R=document.createElement("option");R.value=Q.toString(),R.textContent=J[Q],z.appendChild(R)}),z.disabled=!1;else z.disabled=!0}function C(){let j=document.getElementById("yearFilter").value,z=document.getElementById("monthFilter").value,q=document.getElementById("hero");if(j!==""){if(q)q.style.display="none";Y()}else{if(q)q.style.display="block";W()}k=X.filter((J)=>{let K=j?J.date.getFullYear().toString()===j:!0,Q=z!==""?J.date.getMonth().toString()===z:!0;return K&&Q}),V(!0),$()}window.sendToWA=function(){let j=document.getElementById("contact-name").value,z=document.getElementById("contact-message").value;if(!j||!z){alert("Isi nama dan pesannya dulu dong, Bro... \uD83D\uDE00");return}let q="6281578163858",J=`Halo Layar Kosong!%0A%0A*Nama:* ${j}%0A*Pesan:* ${z}`;window.open(`https://wa.me/${q}?text=${J}`,"_blank"),document.getElementById("contact-name").value="",document.getElementById("contact-message").value=""};B();
