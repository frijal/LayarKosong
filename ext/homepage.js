var U=[],$=[],_=[],Z=0,j=null,W=6;async function E(){try{let q=await fetch("artikel.json");if(!q.ok)throw Error("Gagal load JSON");let z=await q.json();U=[];for(let G in z){let O=G.toLowerCase().replace(/\s+/g,"-");z[G].forEach((J)=>{let X=J[1],R=X.endsWith(".html")?X.replace(/\.html$/,""):X;U.push({category:G,title:J[0],url:`/${O}/${R}`,img:J[2],date:new Date(J[3]),summary:J[4]||""})})}U.sort((G,O)=>O.date.getTime()-G.date.getTime()),$=[...U],_=[...new Set(U.map((G)=>G.category))].map((G)=>U.find((O)=>O.category===G)),N(),V()}catch(q){console.error("Gagal ambil data",q);let z=document.getElementById("newsFeed");if(z)z.innerHTML="<p>Gagal memuat konten.</p>"}}function N(){v(),B(),M(),A(),k();let q=document.getElementById("searchInput"),z=document.getElementById("hero");if(q)q.addEventListener("input",(J)=>{let R=J.target.value.toLowerCase();if(R.length>0){if(z)z.style.display="none";L()}else{if(z)z.style.display="block";V()}$=U.filter((Q)=>Q.title.toLowerCase().includes(R)||Q.summary&&Q.summary.toLowerCase().includes(R)),k(!0),A()});let K=document.getElementById("clearSearch");if(K&&q)K.addEventListener("click",()=>{if(q.value="",z)z.style.display="block";$=[...U],k(!0),A(),V(),q.focus()});let G=document.getElementById("yearFilter"),O=document.getElementById("monthFilter");if(G)G.onchange=Y;if(O)O.onchange=Y}function v(){if(_.length===0)return;let q=document.getElementById("hero"),z=document.getElementById("heroSliderWrapper");if(!q||!z)return;q.classList.remove("skeleton"),z.innerHTML=_.map((O)=>`
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
  `).join("");let K=`
    <div class="hero-nav">
      <button class="nav-btn prev" id="heroPrev"><i class="fa-solid fa-chevron-left"></i></button>
      <button class="nav-btn next" id="heroNext"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
  `,G=q.querySelector(".hero-nav");if(G)G.remove();q.insertAdjacentHTML("beforeend",K),document.getElementById("heroPrev")?.addEventListener("click",(O)=>{O.preventDefault(),P(-1)}),document.getElementById("heroNext")?.addEventListener("click",(O)=>{O.preventDefault(),P(1)}),q.addEventListener("mouseenter",L),q.addEventListener("mouseleave",V),C()}function C(){let q=document.getElementById("heroSliderWrapper");if(!q)return;let z=Z*100;q.style.transform=`translateX(-${z}%)`,document.querySelectorAll(".hero-slide").forEach((G,O)=>{G.classList.toggle("active",O===Z)})}function V(){if(j)clearInterval(j);j=setInterval(()=>{Z=(Z+1)%_.length,C()},6000)}function L(){if(j)clearInterval(j),j=null}function P(q){if(Z+=q,Z>=_.length)Z=0;else if(Z<0)Z=_.length-1;C(),L(),V()}function k(q=!1){if(q)W=6;let z=document.getElementById("newsFeed");if(!z)return;z.innerHTML="";let K=document.getElementById("hero"),G=K&&K.style.display!=="none",O=_.map((Q)=>Q.title),J=$.filter((Q)=>{if(G&&O.includes(Q.title))return!1;return!0});J.slice(0,W).forEach((Q)=>{z.innerHTML+=`
      <div class="card" style="animation: fadeIn 0.5s ease">
        <img src="${Q.img}" class="card-img" alt="${Q.title}" onerror="this.src='/thumbnail.webp'">
        <div class="card-body">
          <a href="${Q.url}" class="card-link">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${Q.category}</small>
              <time style="font-size: 0.8rem; opacity: 0.7;" datetime="${Q.date.toISOString()}">
                ${Q.date.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
              </time>
            </div>
            <h3 class="card-title">${Q.title}</h3>
            <p class="card-excerpt">${Q.summary.substring(0,200)}...</p>
          </a>
        </div>
      </div>
    `});let R=document.getElementById("loadMore");if(R){let Q=J.length-W;if(Q<=0)R.innerHTML="Semua konten sudah dimuat • Kembali ke Atas ↑",R.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else R.innerHTML=`Muat Lebih Banyak, <br> <small style="opacity:0.8; font-size: 0.8rem;">Masih ada ${Q} judul di bawah ini...</small>`,R.onclick=()=>{R.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Membuka artikel...',setTimeout(()=>{W+=6,k(),A()},300)}}}function A(){let q=document.getElementById("sidebarRandom");if(!q)return;q.innerHTML="";let z=_.map((J)=>J.title),K=$.slice(0,W).map((J)=>J.title);[...U.filter((J)=>!K.includes(J.title)&&!z.includes(J.title))].sort(()=>0.5-Math.random()).slice(0,5).forEach((J)=>{let X=(J.summary||"").replace(/"/g,"&quot;"),R=J.title.replace(/"/g,"&quot;");q.innerHTML+=`
      <div class="mini-item" style="animation: fadeIn 0.5s ease">
        <img src="${J.img}" class="mini-thumb" alt="${R}" onerror="this.src='/thumbnail.webp'">
        <div class="mini-text">
          <h4 data-tooltip="${X}">
            <a href="${J.url}" title="${R}" style="text-decoration:none; color:inherit;">
              ${J.title.substring(0,50)}...
            </a>
          </h4>
          <small style="color:var(--text-muted)">${J.date.toLocaleDateString("id-ID")}</small>
        </div>
      </div>
    `})}function B(){let q=[...new Set(U.map((G)=>G.category))],z=document.getElementById("categoryPills");if(!z)return;let K=q.map((G)=>`<div class="pill" id="pill-${G.replace(/\s+/g,"")}">${G}</div>`).join("");z.innerHTML='<div class="pill active" id="pill-all">Kategori</div>'+K,document.getElementById("pill-all")?.addEventListener("click",function(){w("All",this)}),q.forEach((G)=>{document.getElementById(`pill-${G.replace(/\s+/g,"")}`)?.addEventListener("click",function(){w(G,this)})})}function M(){let q=[...new Set(U.map((K)=>K.date.getFullYear()))].sort((K,G)=>G-K),z=document.getElementById("yearFilter");if(!z)return;z.innerHTML='<option value="">Pilih Tahun</option>',q.forEach((K)=>z.innerHTML+=`<option value="${K}">${K}</option>`),b()}function b(){let q=document.getElementById("yearFilter"),z=document.getElementById("monthFilter");if(!q||!z)return;let K=q.value,G=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(z.innerHTML='<option value="">Bulan</option>',K)[...new Set(U.filter((J)=>J.date.getFullYear().toString()==K).map((J)=>J.date.getMonth()))].sort((J,X)=>J-X).forEach((J)=>{z.innerHTML+=`<option value="${J}">${G[J]}</option>`}),z.disabled=!1;else z.disabled=!0}function Y(){let q=document.getElementById("yearFilter").value,z=document.getElementById("monthFilter").value,K=document.getElementById("hero");if(q!==""){if(K)K.style.display="none";L()}else{if(K)K.style.display="flex";V()}$=U.filter((G)=>{let O=q?G.date.getFullYear().toString()===q:!0,J=z!==""?G.date.getMonth().toString()===z:!0;return O&&J}),k(!0),A()}function w(q,z){document.querySelectorAll(".pill").forEach((K)=>K.classList.remove("active")),z.classList.add("active"),$=q==="All"?[...U]:U.filter((K)=>K.category===q),k(!0)}window.sendToWA=function(){let q=document.getElementById("contact-name"),z=document.getElementById("contact-message"),K=q.value,G=z.value;if(!K||!G){alert("Isi nama dan pesannya dulu dong, Bro... \uD83D\uDE00");return}let O="6281578163858",J=`Halo Layar Kosong!%0A%0A*Nama:* ${K}%0A*Pesan:* ${G}`;window.open(`https://wa.me/${O}?text=${J}`,"_blank"),q.value="",z.value=""};E();
