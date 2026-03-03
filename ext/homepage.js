var Z=[],G=[],$=[],_=0,U=null,L=6;async function B(){try{let j=await fetch("artikel.json");if(!j.ok)throw Error("Gagal load JSON");let q=await j.json();Z=[];for(let J in q){let K=J.toLowerCase().replace(/\s+/g,"-");q[J].forEach((Q)=>{let R=Q[1],O=R.endsWith(".html")?R.replace(/\.html$/,""):R;Z.push({category:J,title:Q[0],url:`/${K}/${O}`,img:Q[2],date:new Date(Q[3]),summary:Q[4]||""})})}Z.sort((J,K)=>K.date.getTime()-J.date.getTime()),G=[...Z],$=[...new Set(Z.map((J)=>J.category))].map((J)=>Z.find((K)=>K.category===J)),g(),W()}catch(j){console.error("Gagal ambil data",j);let q=document.getElementById("newsFeed");if(q)q.innerHTML="<p>Gagal memuat konten.</p>"}}function g(){N(),x(),F(),k(),V();let j=document.getElementById("searchInput"),q=document.getElementById("clearSearch"),z=document.getElementById("hero");if(j)j.addEventListener("input",(Q)=>{let R=Q.target.value.toLowerCase();if(R.length>0){if(z)z.style.display="none";C()}else{if(z)z.style.display="block";W()}G=Z.filter((O)=>O.title.toLowerCase().includes(R)||O.summary&&O.summary.toLowerCase().includes(R)),V(!0),k()});if(q&&j)q.addEventListener("click",()=>{if(j.value="",z)z.style.display="block";G=[...Z],V(!0),k(),W(),j.focus()});let J=document.getElementById("yearFilter"),K=document.getElementById("monthFilter");if(J)J.addEventListener("change",()=>{M(),v()});if(K)K.addEventListener("change",v)}function k(){let j=document.getElementById("sidebarRandom");if(!j)return;j.innerHTML="";let q=document.getElementById("hero"),z=q&&q.style.display!=="none",J=$.map((O)=>O.title),K=G.slice(0,L).map((O)=>O.title),R=[...Z.filter((O)=>{let X=!K.includes(O.title),P=!J.includes(O.title);return X&&P})].sort(()=>0.5-Math.random()).slice(0,5);j.innerHTML=R.map((O)=>{let X=(O.summary||"").replace(/"/g,"&quot;"),P=O.title.replace(/"/g,"&quot;"),Y=O.date,T=`${String(Y.getDate()).padStart(2,"0")}.${String(Y.getMonth()+1).padStart(2,"0")}.${String(Y.getFullYear())}`;return`
    <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <img src="${O.img}" class="mini-thumb" alt="${P}" onerror="this.src='/thumbnail.webp'" style="width: 60px; height: 60px; object-fit: cover; border-radius: 10px; flex-shrink:0;">
    <div class="mini-text">
    <h4 title="${X}" style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3;">
    <a href="${O.url}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${O.title}
    </a>
    </h4>
    <div style="display: flex; align-items: center; gap: 5px;">
    <small style="color: var(--primary); font-weight: bold; font-size: 0.7rem; text-transform: uppercase;">${O.category}</small>
    <span style="color: #777; font-size: 0.7rem; opacity: 0.8;">• ${T}</span>
    </div>
    </div>
    </div>`}).join("")}window.renderSidebar=k;function A(j,q){if(q)document.querySelectorAll(".pill").forEach((z)=>z.classList.remove("active")),q.classList.add("active");G=j==="All"?[...Z]:Z.filter((z)=>z.category===j),V(!0),k(j)}window.filterByCat=A;function N(){if($.length===0)return;let j=document.getElementById("hero"),q=document.getElementById("heroSliderWrapper");if(!j||!q)return;j.classList.remove("skeleton"),q.innerHTML=$.map((K)=>`
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
  </a>`).join("");let z=`<div class="hero-nav">
  <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
  </div>`,J=j.querySelector(".hero-nav");if(J)J.remove();j.insertAdjacentHTML("beforeend",z),document.getElementById("heroPrev")?.addEventListener("click",(K)=>{K.preventDefault(),E(-1)}),document.getElementById("heroNext")?.addEventListener("click",(K)=>{K.preventDefault(),E(1)}),j.addEventListener("mouseenter",C),j.addEventListener("mouseleave",W),w()}function w(){let j=document.getElementById("heroSliderWrapper");if(!j)return;let q=_*100;j.style.transform=`translateX(-${q}%)`,document.querySelectorAll(".hero-slide").forEach((J,K)=>{J.classList.toggle("active",K===_)})}function W(){if(U)clearInterval(U);U=setInterval(()=>{_=(_+1)%$.length,w()},4600)}function C(){if(U)clearInterval(U),U=null}function E(j){if(_+=j,_>=$.length)_=0;else if(_<0)_=$.length-1;w(),C(),W()}function V(j=!1){if(j)L=6;let q=document.getElementById("newsFeed");if(!q)return;q.innerHTML="";let z=document.getElementById("hero"),J=z&&z.style.display!=="none",K=$.map((X)=>X.title),Q=G.filter((X)=>{if(J&&K.includes(X.title))return!1;return!0});Q.slice(0,L).forEach((X)=>{q.innerHTML+=`
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
    </div>`});let O=document.getElementById("loadMore");if(O)if(L>=Q.length)O.innerHTML="Kembali ke Atas ↑",O.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else O.innerHTML="Klik Selanjutnya...",O.onclick=()=>{L+=6,V(),k()}}function x(){let j=[...new Set(Z.map((z)=>z.category))],q=document.getElementById("categoryPills");if(!q)return;q.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',j.forEach((z)=>{let J=`pill-${z.replace(/\s+/g,"-")}`;q.innerHTML+=`<div class="pill" id="${J}">${z}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){A("All",this)}),j.forEach((z)=>{let J=`pill-${z.replace(/\s+/g,"-")}`;document.getElementById(J)?.addEventListener("click",function(){A(z,this)})})}function F(){let j=[...new Set(Z.map((z)=>z.date.getFullYear()))].sort((z,J)=>J-z),q=document.getElementById("yearFilter");if(!q)return;q.innerHTML='<option value="">Pilih Tahun</option>',j.forEach((z)=>{let J=document.createElement("option");J.value=z.toString(),J.textContent=z.toString(),q.appendChild(J)}),M()}function M(){let j=document.getElementById("yearFilter"),q=document.getElementById("monthFilter");if(!j||!q)return;let z=j.value,J=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(q.innerHTML='<option value="">Bulan</option>',z)[...new Set(Z.filter((Q)=>Q.date.getFullYear().toString()===z).map((Q)=>Q.date.getMonth()))].sort((Q,R)=>Q-R).forEach((Q)=>{let R=document.createElement("option");R.value=Q.toString(),R.textContent=J[Q],q.appendChild(R)}),q.disabled=!1;else q.disabled=!0}function v(){let j=document.getElementById("yearFilter").value,q=document.getElementById("monthFilter").value,z=document.getElementById("hero");if(j!==""){if(z)z.style.display="none";C()}else{if(z)z.style.display="block";W()}G=Z.filter((J)=>{let K=j?J.date.getFullYear().toString()===j:!0,Q=q!==""?J.date.getMonth().toString()===q:!0;return K&&Q}),V(!0),k()}window.sendToWA=function(){let j=document.getElementById("contact-name").value,q=document.getElementById("contact-message").value;if(!j||!q){alert("Isi nama dan pesannya dulu dong, Bro... \uD83D\uDE00");return}let z="6281578163858",J=`Halo Layar Kosong!%0A%0A*Nama:* ${j}%0A*Pesan:* ${q}`;window.open(`https://wa.me/${z}?text=${J}`,"_blank"),document.getElementById("contact-name").value="",document.getElementById("contact-message").value=""};B();
