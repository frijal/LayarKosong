var U=[],Z=[],_=[],L=0,C,$=6;async function B(){try{let j=await(await fetch("artikel.json")).json();U=[];for(let z in j){let K=z.toLowerCase().replace(/\s+/g,"-");j[z].forEach((J)=>{let X=J[1],O=X.endsWith(".html")?X.replace(/\.html$/,""):X;U.push({category:z,title:J[0],url:"/"+K+"/"+O,img:J[2],date:new Date(J[3]),summary:J[4]||""})})}U.sort((z,K)=>K.date-z.date),Z=[...U],_=[...new Set(U.map((z)=>z.category))].map((z)=>U.find((K)=>K.category===z)),N(),W()}catch(q){console.error("Gagal ambil data",q);let j=document.getElementById("newsFeed");if(j)j.innerHTML="<p>Gagal memuat konten.</p>"}}function N(){T(),b(),f(),V(),R();let q=document.getElementById("searchInput"),j=document.getElementById("clearSearch"),G=document.getElementById("hero");q.addEventListener("input",(z)=>{let K=z.target.value.toLowerCase();if(K.length>0){if(G)G.style.display="none";k()}else{if(G)G.style.display="block";W()}Z=U.filter((J)=>J.title.toLowerCase().includes(K)||J.summary&&J.summary.toLowerCase().includes(K)),R(!0),V()}),j.addEventListener("click",()=>{if(q.value="",G)G.style.display="block";Z=[...U],R(!0),V(),W(),q.focus()}),document.getElementById("yearFilter").onchange=Y,document.getElementById("monthFilter").onchange=Y}function T(){if(_.length===0)return;let q=document.getElementById("hero"),j=document.getElementById("heroSliderWrapper");q.classList.remove("skeleton"),j.innerHTML=_.map((K,J)=>`
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
  `).join("");let G=`
  <div class="hero-nav">
  <button class="nav-btn prev" onclick="moveHero(-1); event.preventDefault();"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="nav-btn next" onclick="moveHero(1); event.preventDefault();"><i class="fa-solid fa-chevron-right"></i></button>
  </div>
  `,z=q.querySelector(".hero-nav");if(z)z.remove();q.insertAdjacentHTML("beforeend",G),q.addEventListener("mouseenter",k),q.addEventListener("mouseleave",W),w()}function w(){let q=document.getElementById("heroSliderWrapper");if(!q)return;let j=L*100;q.style.transform=`translateX(-${j}%)`,document.querySelectorAll(".hero-slide").forEach((z,K)=>{z.classList.toggle("active",K===L)})}function W(){if(C)clearInterval(C);C=setInterval(()=>{L=(L+1)%_.length,w()},6000)}function k(){clearInterval(C),C=null}function R(q=!1){if(q)$=6;let j=document.getElementById("newsFeed");j.innerHTML="";let G=document.getElementById("hero"),z=G&&G.style.display!=="none",K=_.map((Q)=>Q.title),J=Z.filter((Q)=>{if(z&&K.includes(Q.title))return!1;return!0});J.slice(0,$).forEach((Q)=>{j.innerHTML+=`
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
    `});let O=document.getElementById("loadMore");if(O)if($>=J.length)O.innerHTML="Kembali ke Atas ↑",O.classList.add("is-top"),O.onclick=()=>{window.scrollTo({top:0,behavior:"smooth"})};else O.innerHTML="Muat Lebih Banyak",O.classList.remove("is-top"),O.onclick=()=>{$+=6,R(),V()}}function V(){let q=document.getElementById("sidebarRandom");if(!q)return;q.innerHTML="";let j=document.getElementById("hero"),G=j&&j.style.display!=="none",z=_.map((O)=>O.title),K=Z.slice(0,$).map((O)=>O.title);[...U.filter((O)=>{let Q=!K.includes(O.title),A=!z.includes(O.title);return Q&&A})].sort(()=>0.5-Math.random()).slice(0,5).forEach((O)=>{let Q=(O.summary||"").replace(/"/g,"&quot;"),A=O.title.replace(/"/g,"&quot;");q.innerHTML+=`
    <div class="mini-item" style="animation: fadeIn 0.5s ease">
    <img src="${O.img}" class="mini-thumb" alt="${A}" onerror="this.src='/thumbnail.webp'">
    <div class="mini-text">
    <h4 data-tooltip="${Q}">
    <a href="${O.url}" title="${A}" style="text-decoration:none; color:inherit;">
    ${O.title.substring(0,50)}...
    </a>
    </h4>
    <small style="color:var(--text-muted)">${O.date.toLocaleDateString("id-ID")}</small>
    </div>
    </div>
    `})}function b(){let q=[...new Set(U.map((z)=>z.category))],j=document.getElementById("categoryPills");if(!j)return;let G=q.map((z)=>`<div class="pill" onclick="filterByCat('${z}', this)">${z}</div>`).join("");j.innerHTML=`<div class="pill active" onclick="filterByCat('All', this)">Kategori</div>`+G}function f(){let q=[...new Set(U.map((G)=>G.date.getFullYear()))].sort((G,z)=>z-G),j=document.getElementById("yearFilter");if(!j)return;j.innerHTML='<option value="">Pilih Tahun</option>',q.forEach((G)=>j.innerHTML+=`<option value="${G}">${G}</option>`),v()}function v(){let q=document.getElementById("yearFilter"),j=document.getElementById("monthFilter");if(!q||!j)return;let G=q.value,z=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(j.innerHTML='<option value="">Bulan</option>',G)[...new Set(U.filter((J)=>J.date.getFullYear()==G).map((J)=>J.date.getMonth()))].sort((J,X)=>J-X).forEach((J)=>{j.innerHTML+=`<option value="${J}">${z[J]}</option>`}),j.disabled=!1;else j.disabled=!0}function Y(){let q=document.getElementById("yearFilter").value,j=document.getElementById("monthFilter").value,G=document.getElementById("hero");if(q!==""){if(G)G.style.display="none";k()}else{if(G)G.style.display="flex";W()}Z=U.filter((z)=>{let K=q?z.date.getFullYear()==q:!0,J=j!==""?z.date.getMonth()==j:!0;return K&&J}),R(!0),V()}var P=document.getElementById("yearFilter"),E=document.getElementById("monthFilter");if(P)P.addEventListener("change",()=>{v(),Y()});if(E)E.addEventListener("change",Y);B();
