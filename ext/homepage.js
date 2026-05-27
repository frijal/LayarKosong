(()=>{var Q=[],Z=[],_=[],W=0,$=null,V=6;async function E(){try{let q=await window.siteDataProvider.getFor("homepage.ts");Q=[];for(let j in q){let G=j.toLowerCase().replace(/\s+/g,"-");q[j].forEach((J)=>{let O=J.id.replace(/\.html$/,""),R=J.image||"/thumbnail.webp",U=R.replace(/\.(jpg|jpeg|png|webp)$/i,"-sm.webp");Q.push({category:j,title:J.title,id:J.id,url:`/${G}/${O}`,img:U,fullImg:R,date:J.date?new Date(J.date):new Date,summary:J.description||""})})}Q.sort((j,G)=>G.date.getTime()-j.date.getTime()),Z=[...Q],_=[...new Set(Q.map((j)=>j.category))].map((j)=>Q.find((G)=>G.category===j)),x(),L()}catch(q){console.error("Gagal ambil data via provider",q);let z=document.getElementById("newsFeed");if(z)z.innerHTML="<p>Gagal memuat konten.</p>"}}function x(){F(),b(),f(),X(),A();let q=document.getElementById("searchInput"),z=document.getElementById("clearSearch"),j=document.getElementById("hero");if(q)q.addEventListener("input",(O)=>{let R=O.target.value.toLowerCase();if(R.length>0){if(j)j.style.display="none";k()}else{if(j)j.style.display="block";L()}Z=Q.filter((U)=>U.title.toLowerCase().includes(R)||U.summary&&U.summary.toLowerCase().includes(R)),A(!0),X()});if(z&&q)z.addEventListener("click",()=>{if(q.value="",j)j.style.display="block";Z=[...Q],A(!0),X(),L(),q.focus()});let G=document.getElementById("yearFilter"),J=document.getElementById("monthFilter");if(G)G.addEventListener("change",()=>{T(),C()});if(J)J.addEventListener("change",C)}function X(q){let z=document.getElementById("sidebarRandom");if(!z)return;z.innerHTML="";let j=document.querySelector(".pill.active"),G=q||(j?j.textContent.trim():"All"),J=G==="All"||G==="Kategori"?[...Q]:Q.filter((K)=>K.category===G),O=Z.slice(0,V).map((K)=>K.title),U=[...J.filter((K)=>!O.includes(K.title))].sort(()=>0.5-Math.random()).slice(0,10);z.innerHTML=U.map((K)=>{let B=(K.summary||"").replace(/"/g,"&quot;"),M=K.title.replace(/"/g,"&quot;"),N=K.date,v=`${String(N.getDate()).padStart(2,"0")}.${String(N.getMonth()+1).padStart(2,"0")}.${String(N.getFullYear())}`;return`
      <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <img src="${K.img}" class="mini-thumb" alt="${M}" onerror="this.onerror=null; this.src=this.src.includes('-sm.webp') ? '${K.fullImg}' : '/thumbnail.webp'" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; flex-shrink:0;">
        <div class="mini-text">
          <h4 title="${B}" style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3; font-weight: 600;">
            <a href="${K.url}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${K.title}
            </a>
          </h4>
          <div style="display: flex; align-items: center; gap: 5px;">
            <small style="color: #888; font-size: 0.65rem;">${v} •</small>
            <span style="color: var(--primary); font-weight: bold; font-size: 0.65rem; text-transform: uppercase;">${K.category}</span>
          </div>
        </div>
      </div>`}).join("")}window.renderSidebar=X;function Y(q,z){if(z)document.querySelectorAll(".pill").forEach((j)=>j.classList.remove("active")),z.classList.add("active");Z=q==="All"?[...Q]:Q.filter((j)=>j.category===q),A(!0),X(q)}window.filterByCat=Y;function F(){if(_.length===0)return;let q=document.getElementById("hero"),z=document.getElementById("heroSliderWrapper");if(!q||!z)return;q.classList.remove("skeleton"),z.innerHTML=_.map((J)=>`
    <a href="${J.url}" class="hero-slide" style="background-image: url('${J.fullImg}')">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <span class="hero-cat">${J.category}</span>
        <h1 class="hero-title">${J.title}</h1>
        <p class="hero-summary">
          ${J.summary.substring(0,270)}...
          <strong style="color:var(--secondary);">Ungkap Faktanya →</strong>
        </p>
      </div>
    </a>`).join("");let j=`
    <div class="hero-nav">
      <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
      <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
    </div>`,G=q.querySelector(".hero-nav");if(G)G.remove();q.insertAdjacentHTML("beforeend",j),document.getElementById("heroPrev")?.addEventListener("click",(J)=>{J.preventDefault(),w(-1)}),document.getElementById("heroNext")?.addEventListener("click",(J)=>{J.preventDefault(),w(1)}),q.addEventListener("mouseenter",k),q.addEventListener("mouseleave",L),P()}function P(){let q=document.getElementById("heroSliderWrapper");if(!q)return;let z=W*100;q.style.transform=`translateX(-${z}%)`,document.querySelectorAll(".hero-slide").forEach((G,J)=>{G.classList.toggle("active",J===W)})}function L(){if($)clearInterval($);$=setInterval(()=>{W=(W+1)%_.length,P()},4600)}function k(){if($)clearInterval($),$=null}function w(q){if(W+=q,W>=_.length)W=0;else if(W<0)W=_.length-1;P(),k(),L()}function A(q=!1){if(q)V=6;let z=document.getElementById("newsFeed");if(!z)return;z.innerHTML="";let j=document.getElementById("hero"),G=j&&j.style.display!=="none",J=_.map((K)=>K.title),O=Z.filter((K)=>{if(G&&J.includes(K.title))return!1;return!0});O.slice(0,V).forEach((K)=>{z.innerHTML+=`
      <div class="card" style="animation: fadeIn 0.5s ease">
        <img src="${K.img}" class="card-img" alt="${K.title}" onerror="this.onerror=null; this.src=this.src.includes('-sm.webp') ? '${K.fullImg}' : '/thumbnail.webp'">
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
      </div>`});let U=document.getElementById("loadMore");if(U)if(V>=O.length)U.innerHTML="Kembali ke Atas ↑",U.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else U.innerHTML="Klik Selanjutnya...",U.onclick=()=>{V+=6,A(),X()}}function b(){let q=[...new Set(Q.map((j)=>j.category))],z=document.getElementById("categoryPills");if(!z)return;z.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',q.forEach((j)=>{let G=`pill-${j.replace(/\s+/g,"-")}`;z.innerHTML+=`<div class="pill" id="${G}">${j}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){Y("All",this)}),q.forEach((j)=>{let G=`pill-${j.replace(/\s+/g,"-")}`;document.getElementById(G)?.addEventListener("click",function(){Y(j,this)})})}function f(){let q=[...new Set(Q.map((j)=>j.date.getFullYear()))].sort((j,G)=>G-j),z=document.getElementById("yearFilter");if(!z)return;z.innerHTML='<option value="">Pilih Tahun</option>',q.forEach((j)=>{let G=document.createElement("option");G.value=j.toString(),G.textContent=j.toString(),z.appendChild(G)}),T()}function T(){let q=document.getElementById("yearFilter"),z=document.getElementById("monthFilter");if(!q||!z)return;let j=q.value,G=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(z.innerHTML='<option value="">Bulan</option>',j)[...new Set(Q.filter((O)=>O.date.getFullYear().toString()===j).map((O)=>O.date.getMonth()))].sort((O,R)=>O-R).forEach((O)=>{let R=document.createElement("option");R.value=O.toString(),R.textContent=G[O],z.appendChild(R)}),z.disabled=!1;else z.disabled=!0}function C(){let q=document.getElementById("yearFilter").value,z=document.getElementById("monthFilter").value,j=document.getElementById("hero");if(q!==""){if(j)j.style.display="none";k()}else{if(j)j.style.display="block";L()}Z=Q.filter((G)=>{let J=q?G.date.getFullYear().toString()===q:!0,O=z!==""?G.date.getMonth().toString()===z:!0;return J&&O}),A(!0),X()}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",E);else E();})();
