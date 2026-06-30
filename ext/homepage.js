(()=>{var U=[],$=[],j=[],Z=0,k=null,V=6;async function E(){try{let z=await window.siteDataProvider.getFor("homepage.ts");U=[];for(let q in z){let K=q.toLowerCase().replace(/\s+/g,"-");z[q].forEach((O)=>{let R=O.id.replace(/\.html$/,""),W=O.image||"/thumbnail.webp",X=W.replace(/\.(jpg|jpeg|png|webp)$/i,"-sm.webp");U.push({category:q,title:O.title,id:O.id,url:`/${K}/${R}`,img:X,fullImg:W,date:O.date?new Date(O.date):new Date,summary:O.description||""})})}U.sort((q,K)=>K.date.getTime()-q.date.getTime()),$=[...U],j=[...new Set(U.map((q)=>q.category))].map((q)=>U.find((K)=>K.category===q)),x(),L()}catch(z){console.error("Gagal ambil data via provider",z);let J=document.getElementById("newsFeed");if(J)J.innerHTML="<p>Gagal memuat konten.</p>"}}function x(){F(),f(),b(),_(),G();let z=document.getElementById("searchInput"),J=document.getElementById("clearSearch"),q=document.getElementById("hero");if(z)z.addEventListener("input",(R)=>{let W=R.target.value.toLowerCase();if(W.length>0){if(q)q.style.display="none";A()}else{if(q)q.style.display="block";L()}$=U.filter((X)=>X.title.toLowerCase().includes(W)||X.summary&&X.summary.toLowerCase().includes(W)),G(!0),_()});if(J&&z)J.addEventListener("click",()=>{if(z.value="",q)q.style.display="block";$=[...U],G(!0),_(),L(),z.focus()});let K=document.getElementById("yearFilter"),O=document.getElementById("monthFilter");if(K)K.addEventListener("change",()=>{M(),B()});if(O)O.addEventListener("change",B)}function _(z){let J=document.getElementById("sidebarRandom");if(!J)return;J.innerHTML="";let q=document.querySelector(".pill.active"),K=z||(q?q.textContent.trim():"All"),O=K==="All"||K==="Kategori"?[...U]:U.filter((Q)=>Q.category===K),R=$.slice(0,V).map((Q)=>Q.title),X=[...O.filter((Q)=>!R.includes(Q.title))].sort(()=>0.5-Math.random()).slice(0,10);J.innerHTML=X.map((Q)=>{let N=(Q.summary||"").replace(/"/g,"&quot;"),T=Q.title.replace(/"/g,"&quot;"),Y=Q.date,v=`${String(Y.getDate()).padStart(2,"0")}.${String(Y.getMonth()+1).padStart(2,"0")}.${String(Y.getFullYear())}`;return`
      <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <img src="${Q.img}" class="mini-thumb" alt="${T}" onerror="if(this.src.includes('-sm.webp')) { this.src='${Q.fullImg}'; } else { this.onerror=null; this.src='/thumbnail-sm.webp'; }" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; flex-shrink:0;">
        <div class="mini-text">
          <h4 title="${N}" style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3; font-weight: 600;">
            <a href="${Q.url}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${Q.title}
            </a>
          </h4>
          <div style="display: flex; align-items: center; gap: 5px;">
            <small style="color: #888; font-size: 0.65rem;">${v} •</small>
            <span style="color: var(--primary); font-weight: bold; font-size: 0.65rem; text-transform: uppercase;">${Q.category}</span>
          </div>
        </div>
      </div>`}).join("")}window.renderSidebar=_;function P(z,J){if(J)document.querySelectorAll(".pill").forEach((q)=>q.classList.remove("active")),J.classList.add("active");$=z==="All"?[...U]:U.filter((q)=>q.category===z),G(!0),_(z)}window.filterByCat=P;function F(){if(j.length===0)return;let z=document.getElementById("hero"),J=document.getElementById("heroSliderWrapper");if(!z||!J)return;z.classList.remove("skeleton"),J.innerHTML=j.map((O)=>`
    <a href="${O.url}" class="hero-slide" style="background-image: url('${O.fullImg}')">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <span class="hero-cat">${O.category}</span>
        <h1 class="hero-title">${O.title}</h1>
        <p class="hero-summary">
          ${O.summary.substring(0,270)}...
          <strong style="color:var(--secondary);">Ungkap Faktanya →</strong>
        </p>
      </div>
    </a>`).join("");let q=`
    <div class="hero-nav">
      <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
      <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
    </div>`,K=z.querySelector(".hero-nav");if(K)K.remove();z.insertAdjacentHTML("beforeend",q),document.getElementById("heroPrev")?.addEventListener("click",(O)=>{O.preventDefault(),C(-1)}),document.getElementById("heroNext")?.addEventListener("click",(O)=>{O.preventDefault(),C(1)}),z.addEventListener("mouseenter",A),z.addEventListener("mouseleave",L),w()}function w(){let z=document.getElementById("heroSliderWrapper");if(!z)return;let J=Z*100;z.style.transform=`translateX(-${J}%)`,document.querySelectorAll(".hero-slide").forEach((K,O)=>{K.classList.toggle("active",O===Z)})}function L(){if(k)clearInterval(k);k=setInterval(()=>{Z=(Z+1)%j.length,w()},4600)}function A(){if(k)clearInterval(k),k=null}function C(z){if(Z+=z,Z>=j.length)Z=0;else if(Z<0)Z=j.length-1;w(),A(),L()}function G(z=!1){if(z)V=6;let J=document.getElementById("newsFeed");if(!J)return;J.innerHTML="";let q=document.getElementById("hero"),K=q&&q.style.display!=="none",O=j.map((Q)=>Q.title),R=$.filter((Q)=>{if(K&&O.includes(Q.title))return!1;return!0});R.slice(0,V).forEach((Q)=>{let N=Q.title.replace(/"/g,"&quot;");J.innerHTML+=`
  <div class="card" style="animation: fadeIn 0.5s ease">
  <img src="${Q.img}" class="card-img" alt="${N}" onerror="if(this.src.includes('-sm.webp')) { this.src='${Q.fullImg}'; } else { this.onerror=null; this.src='/thumbnail-sm.webp'; }">
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
      </div>`});let X=document.getElementById("loadMore");if(X)if(V>=R.length)X.innerHTML="Kembali ke Atas ↑",X.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else X.innerHTML="Klik Selanjutnya...",X.onclick=()=>{V+=6,G(),_()}}function f(){let z=[...new Set(U.map((q)=>q.category))],J=document.getElementById("categoryPills");if(!J)return;J.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',z.forEach((q)=>{let K=`pill-${q.replace(/\s+/g,"-")}`;J.innerHTML+=`<div class="pill" id="${K}">${q}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){P("All",this)}),z.forEach((q)=>{let K=`pill-${q.replace(/\s+/g,"-")}`;document.getElementById(K)?.addEventListener("click",function(){P(q,this)})})}function b(){let z=[...new Set(U.map((q)=>q.date.getFullYear()))].sort((q,K)=>K-q),J=document.getElementById("yearFilter");if(!J)return;J.innerHTML='<option value="">Pilih Tahun</option>',z.forEach((q)=>{let K=document.createElement("option");K.value=q.toString(),K.textContent=q.toString(),J.appendChild(K)}),M()}function M(){let z=document.getElementById("yearFilter"),J=document.getElementById("monthFilter");if(!z||!J)return;let q=z.value,K=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(J.innerHTML='<option value="">Bulan</option>',q)[...new Set(U.filter((R)=>R.date.getFullYear().toString()===q).map((R)=>R.date.getMonth()))].sort((R,W)=>R-W).forEach((R)=>{let W=document.createElement("option");W.value=R.toString(),W.textContent=K[R],J.appendChild(W)}),J.disabled=!1;else J.disabled=!0}function B(){let z=document.getElementById("yearFilter").value,J=document.getElementById("monthFilter").value,q=document.getElementById("hero");if(z!==""){if(q)q.style.display="none";A()}else{if(q)q.style.display="block";L()}$=U.filter((K)=>{let O=z?K.date.getFullYear().toString()===z:!0,R=J!==""?K.date.getMonth().toString()===J:!0;return O&&R}),G(!0),_()}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",E);else E();})();
