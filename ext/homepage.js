var X=[],W=[],k=[],_=0,U=null,L=6,P="All";async function N(){try{let q=await fetch("artikel.json");if(!q.ok)throw Error("Gagal load JSON");let z=await q.json();X=[];for(let J in z){let K=J.toLowerCase().replace(/\s+/g,"-");z[J].forEach((Q)=>{let R=Q[1],O=R.endsWith(".html")?R.replace(/\.html$/,""):R;X.push({category:J,title:Q[0],url:`/${K}/${O}`,img:Q[2],date:new Date(Q[3]),summary:Q[4]||""})})}X.sort((J,K)=>K.date.getTime()-J.date.getTime()),W=[...X],k=[...new Set(X.map((J)=>J.category))].map((J)=>X.find((K)=>K.category===J)),B(),G()}catch(q){console.error("Gagal ambil data",q);let z=document.getElementById("newsFeed");if(z)z.innerHTML="<p>Gagal memuat konten.</p>"}}function B(){T(),v(),F(),$(),V();let q=document.getElementById("searchInput"),z=document.getElementById("clearSearch"),j=document.getElementById("hero");if(q)q.addEventListener("input",(Q)=>{let R=Q.target.value.toLowerCase();if(R.length>0){if(j)j.style.display="none";Y()}else{if(j)j.style.display="block";G()}W=X.filter((O)=>O.title.toLowerCase().includes(R)||O.summary&&O.summary.toLowerCase().includes(R)),V(!0),$()});if(z&&q)z.addEventListener("click",()=>{if(q.value="",j)j.style.display="block";W=[...X],V(!0),$(),G(),q.focus()});let J=document.getElementById("yearFilter"),K=document.getElementById("monthFilter");if(J)J.addEventListener("change",()=>{M(),A()});if(K)K.addEventListener("change",A)}function $(q=P){P=q;let z=document.getElementById("sidebarRandom");if(!z)return;z.innerHTML="";let j=P==="All"?X:X.filter((O)=>O.category===P),J=[],K=new Set,R=Math.min(7,j.length);while(J.length<R){let O=Math.floor(Math.random()*j.length);if(!K.has(O))J.push(j[O]),K.add(O)}z.innerHTML=J.map((O)=>{let Z=O.title.replace(/"/g,"&quot;");return`
    <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <img src="${O.img}" class="mini-thumb" alt="${Z}" onerror="this.src='/thumbnail.webp'" style="width: 60px; height: 60px; object-fit: cover; border-radius: 10px; flex-shrink:0;">
    <div class="mini-text">
    <h4 style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3;">
    <a href="${O.url}" title="${Z}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${O.title}
    </a>
    </h4>
    <small style="color: var(--primary); font-weight: bold; font-size: 0.7rem; text-transform: uppercase;">${O.category}</small>
    </div>
    </div>`}).join("")}window.renderSidebar=$;function w(q,z){if(z)document.querySelectorAll(".pill").forEach((j)=>j.classList.remove("active")),z.classList.add("active");W=q==="All"?[...X]:X.filter((j)=>j.category===q),V(!0),$(q)}window.filterByCat=w;function T(){if(k.length===0)return;let q=document.getElementById("hero"),z=document.getElementById("heroSliderWrapper");if(!q||!z)return;q.classList.remove("skeleton"),z.innerHTML=k.map((K)=>`
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
  </div>`,J=q.querySelector(".hero-nav");if(J)J.remove();q.insertAdjacentHTML("beforeend",j),document.getElementById("heroPrev")?.addEventListener("click",(K)=>{K.preventDefault(),C(-1)}),document.getElementById("heroNext")?.addEventListener("click",(K)=>{K.preventDefault(),C(1)}),q.addEventListener("mouseenter",Y),q.addEventListener("mouseleave",G),E()}function E(){let q=document.getElementById("heroSliderWrapper");if(!q)return;let z=_*100;q.style.transform=`translateX(-${z}%)`,document.querySelectorAll(".hero-slide").forEach((J,K)=>{J.classList.toggle("active",K===_)})}function G(){if(U)clearInterval(U);U=setInterval(()=>{_=(_+1)%k.length,E()},4600)}function Y(){if(U)clearInterval(U),U=null}function C(q){if(_+=q,_>=k.length)_=0;else if(_<0)_=k.length-1;E(),Y(),G()}function V(q=!1){if(q)L=6;let z=document.getElementById("newsFeed");if(!z)return;z.innerHTML="";let j=document.getElementById("hero"),J=j&&j.style.display!=="none",K=k.map((Z)=>Z.title),Q=W.filter((Z)=>{if(J&&K.includes(Z.title))return!1;return!0});Q.slice(0,L).forEach((Z)=>{z.innerHTML+=`
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
    </div>`});let O=document.getElementById("loadMore");if(O)if(L>=Q.length)O.innerHTML="Kembali ke Atas ↑",O.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else O.innerHTML="Klik Selanjutnya...",O.onclick=()=>{L+=6,V(),$()}}function v(){let q=[...new Set(X.map((j)=>j.category))],z=document.getElementById("categoryPills");if(!z)return;z.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',q.forEach((j)=>{let J=`pill-${j.replace(/\s+/g,"-")}`;z.innerHTML+=`<div class="pill" id="${J}">${j}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){w("All",this)}),q.forEach((j)=>{let J=`pill-${j.replace(/\s+/g,"-")}`;document.getElementById(J)?.addEventListener("click",function(){w(j,this)})})}function F(){let q=[...new Set(X.map((j)=>j.date.getFullYear()))].sort((j,J)=>J-j),z=document.getElementById("yearFilter");if(!z)return;z.innerHTML='<option value="">Pilih Tahun</option>',q.forEach((j)=>{let J=document.createElement("option");J.value=j.toString(),J.textContent=j.toString(),z.appendChild(J)}),M()}function M(){let q=document.getElementById("yearFilter"),z=document.getElementById("monthFilter");if(!q||!z)return;let j=q.value,J=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(z.innerHTML='<option value="">Bulan</option>',j)[...new Set(X.filter((Q)=>Q.date.getFullYear().toString()===j).map((Q)=>Q.date.getMonth()))].sort((Q,R)=>Q-R).forEach((Q)=>{let R=document.createElement("option");R.value=Q.toString(),R.textContent=J[Q],z.appendChild(R)}),z.disabled=!1;else z.disabled=!0}function A(){let q=document.getElementById("yearFilter").value,z=document.getElementById("monthFilter").value,j=document.getElementById("hero");if(q!==""){if(j)j.style.display="none";Y()}else{if(j)j.style.display="block";G()}W=X.filter((J)=>{let K=q?J.date.getFullYear().toString()===q:!0,Q=z!==""?J.date.getMonth().toString()===z:!0;return K&&Q}),V(!0),$()}window.sendToWA=function(){let q=document.getElementById("contact-name").value,z=document.getElementById("contact-message").value;if(!q||!z){alert("Isi nama dan pesannya dulu dong, Bro... \uD83D\uDE00");return}let j="6281578163858",J=`Halo Layar Kosong!%0A%0A*Nama:* ${q}%0A*Pesan:* ${z}`;window.open(`https://wa.me/${j}?text=${J}`,"_blank"),document.getElementById("contact-name").value="",document.getElementById("contact-message").value=""};N();
