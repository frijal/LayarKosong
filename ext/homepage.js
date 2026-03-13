(()=>{var U=[],j=[],k=[],_=0,L=null,W=6;async function E(){try{let z=await window.siteDataProvider.getFor("homepage.ts");U=[];for(let q in z){let J=q.toLowerCase().replace(/\s+/g,"-");z[q].forEach((K)=>{let R=K.id.replace(/\.html$/,"");U.push({category:q,title:K.title,id:K.id,url:`/${J}/${R}`,img:K.image,date:K.date?new Date(K.date):new Date,summary:K.description||""})})}U.sort((q,J)=>J.date.getTime()-q.date.getTime()),j=[...U],k=[...new Set(U.map((q)=>q.category))].map((q)=>U.find((J)=>J.category===q)),F(),V()}catch(z){console.error("Gagal ambil data via provider",z);let G=document.getElementById("newsFeed");if(G)G.innerHTML="<p>Gagal memuat konten.</p>"}}function F(){f(),x(),b(),$(),O();let z=document.getElementById("searchInput"),G=document.getElementById("clearSearch"),q=document.getElementById("hero");if(z)z.addEventListener("input",(R)=>{let X=R.target.value.toLowerCase();if(X.length>0){if(q)q.style.display="none";A()}else{if(q)q.style.display="block";V()}j=U.filter((Z)=>Z.title.toLowerCase().includes(X)||Z.summary&&Z.summary.toLowerCase().includes(X)),O(!0),$()});if(G&&z)G.addEventListener("click",()=>{if(z.value="",q)q.style.display="block";j=[...U],O(!0),$(),V(),z.focus()});let J=document.getElementById("yearFilter"),K=document.getElementById("monthFilter");if(J)J.addEventListener("change",()=>{T(),C()});if(K)K.addEventListener("change",C)}function $(z){let G=document.getElementById("sidebarRandom");if(!G)return;G.innerHTML="";let q=document.querySelector(".pill.active"),J=z||(q?q.textContent.trim():"All"),K=J==="All"||J==="Kategori"?[...U]:U.filter((Q)=>Q.category===J),R=j.slice(0,W).map((Q)=>Q.title),Z=[...K.filter((Q)=>!R.includes(Q.title))].sort(()=>0.5-Math.random()).slice(0,7);G.innerHTML=Z.map((Q)=>{let B=(Q.summary||"").replace(/"/g,"&quot;"),M=Q.title.replace(/"/g,"&quot;"),N=Q.date,v=`${String(N.getDate()).padStart(2,"0")}.${String(N.getMonth()+1).padStart(2,"0")}.${String(N.getFullYear())}`;return`
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
    </div>`}).join("")}window.renderSidebar=$;function Y(z,G){if(G)document.querySelectorAll(".pill").forEach((q)=>q.classList.remove("active")),G.classList.add("active");j=z==="All"?[...U]:U.filter((q)=>q.category===z),O(!0),$(z)}window.filterByCat=Y;function f(){if(k.length===0)return;let z=document.getElementById("hero"),G=document.getElementById("heroSliderWrapper");if(!z||!G)return;z.classList.remove("skeleton"),G.innerHTML=k.map((K)=>`
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
  </div>`,J=z.querySelector(".hero-nav");if(J)J.remove();z.insertAdjacentHTML("beforeend",q),document.getElementById("heroPrev")?.addEventListener("click",(K)=>{K.preventDefault(),P(-1)}),document.getElementById("heroNext")?.addEventListener("click",(K)=>{K.preventDefault(),P(1)}),z.addEventListener("mouseenter",A),z.addEventListener("mouseleave",V),w()}function w(){let z=document.getElementById("heroSliderWrapper");if(!z)return;let G=_*100;z.style.transform=`translateX(-${G}%)`,document.querySelectorAll(".hero-slide").forEach((J,K)=>{J.classList.toggle("active",K===_)})}function V(){if(L)clearInterval(L);L=setInterval(()=>{_=(_+1)%k.length,w()},4600)}function A(){if(L)clearInterval(L),L=null}function P(z){if(_+=z,_>=k.length)_=0;else if(_<0)_=k.length-1;w(),A(),V()}function O(z=!1){if(z)W=6;let G=document.getElementById("newsFeed");if(!G)return;G.innerHTML="";let q=document.getElementById("hero"),J=q&&q.style.display!=="none",K=k.map((Q)=>Q.title),R=j.filter((Q)=>{if(J&&K.includes(Q.title))return!1;return!0});R.slice(0,W).forEach((Q)=>{G.innerHTML+=`
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
    </div>`});let Z=document.getElementById("loadMore");if(Z)if(W>=R.length)Z.innerHTML="Kembali ke Atas ↑",Z.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else Z.innerHTML="Klik Selanjutnya...",Z.onclick=()=>{W+=6,O(),$()}}function x(){let z=[...new Set(U.map((q)=>q.category))],G=document.getElementById("categoryPills");if(!G)return;G.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',z.forEach((q)=>{let J=`pill-${q.replace(/\s+/g,"-")}`;G.innerHTML+=`<div class="pill" id="${J}">${q}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){Y("All",this)}),z.forEach((q)=>{let J=`pill-${q.replace(/\s+/g,"-")}`;document.getElementById(J)?.addEventListener("click",function(){Y(q,this)})})}function b(){let z=[...new Set(U.map((q)=>q.date.getFullYear()))].sort((q,J)=>J-q),G=document.getElementById("yearFilter");if(!G)return;G.innerHTML='<option value="">Pilih Tahun</option>',z.forEach((q)=>{let J=document.createElement("option");J.value=q.toString(),J.textContent=q.toString(),G.appendChild(J)}),T()}function T(){let z=document.getElementById("yearFilter"),G=document.getElementById("monthFilter");if(!z||!G)return;let q=z.value,J=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(G.innerHTML='<option value="">Bulan</option>',q)[...new Set(U.filter((R)=>R.date.getFullYear().toString()===q).map((R)=>R.date.getMonth()))].sort((R,X)=>R-X).forEach((R)=>{let X=document.createElement("option");X.value=R.toString(),X.textContent=J[R],G.appendChild(X)}),G.disabled=!1;else G.disabled=!0}function C(){let z=document.getElementById("yearFilter").value,G=document.getElementById("monthFilter").value,q=document.getElementById("hero");if(z!==""){if(q)q.style.display="none";A()}else{if(q)q.style.display="block";V()}j=U.filter((J)=>{let K=z?J.date.getFullYear().toString()===z:!0,R=G!==""?J.date.getMonth().toString()===G:!0;return K&&R}),O(!0),$()}window.sendToWA=function(){let z=document.getElementById("contact-name").value,G=document.getElementById("contact-message").value;if(!z||!G){alert("Isi nama dan pesannya dulu dong, Bro... \uD83D\uDE00");return}let q="6281578163858",J=`Halo Layar Kosong!%0A%0A*Nama:* ${z}%0A*Pesan:* ${G}`;window.open(`https://wa.me/${q}?text=${J}`,"_blank"),document.getElementById("contact-name").value="",document.getElementById("contact-message").value=""};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",E);else E();})();
