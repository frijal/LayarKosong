(()=>{var s=[],m=[],g=[],d=0,f=null,v=6;function B(t){if(!t)return"Lainnya";return t.split("-").map((n)=>n.charAt(0).toUpperCase()+n.slice(1)).join(" ")}async function L(){try{let t=await window.siteDataProvider.getFor("homepage.ts");s=[];for(let e in t){let l=e.toLowerCase().replace(/\s+/g,"-"),a=B(e);t[e].forEach((i)=>{let c=i.id.replace(/\.html$/,""),o=i.image||"/thumbnail.webp",r=o.replace(/\.(jpg|jpeg|png|webp)$/i,"-sm.webp"),h=i.title.replace(/\s*-\s*Layar Kosong$/i,"");s.push({category:a,title:h,id:i.id,url:`/${l}/${c}`,img:r,fullImg:o,date:i.date?new Date(i.date):new Date,summary:i.description||""})})}s.sort((e,l)=>l.date.getTime()-e.date.getTime()),m=[...s],g=[...new Set(s.map((e)=>e.category))].map((e)=>s.find((l)=>l.category===e)),k(),p()}catch(t){console.error("Gagal ambil data via provider",t);let n=document.getElementById("newsFeed");if(n)n.innerHTML="<p>Gagal memuat konten.</p>"}}function k(){F(),A(),D(),u(),y();let t=document.getElementById("searchInput"),n=document.getElementById("clearSearch"),e=document.getElementById("hero"),l=document.getElementById("searchForm");if(t)t.addEventListener("input",(c)=>{let o=c.target.value.toLowerCase();if(o.length>0){if(e)e.style.display="none";b()}else{if(e)e.style.display="block";p()}m=s.filter((r)=>r.title.toLowerCase().includes(o)||r.summary&&r.summary.toLowerCase().includes(o)),y(!0),u()});if(l&&t)l.addEventListener("submit",(c)=>{c.preventDefault();let o=t.value.trim();if(o.length>0)window.location.href=`https://dalam.web.id/search/?q=${encodeURIComponent(o)}`});if(n&&t)n.addEventListener("click",()=>{if(t.value="",e)e.style.display="block";m=[...s],y(!0),u(),p(),t.focus()});let a=document.getElementById("yearFilter"),i=document.getElementById("monthFilter");if(a)a.addEventListener("change",()=>{T(),M()});if(i)i.addEventListener("change",M)}function u(t){let n=document.getElementById("sidebarRandom");if(!n)return;n.innerHTML="";let e=document.querySelector(".pill.active"),l=t||(e?e.textContent?.trim():"All"),a=l==="All"||l==="Kategori"?[...s]:s.filter((r)=>r.category===l),i=m.slice(0,v).map((r)=>r.title),o=[...a.filter((r)=>!i.includes(r.title))].sort(()=>0.5-Math.random()).slice(0,10);n.innerHTML=o.map((r)=>{let h=(r.summary||"").replace(/"/g,"&quot;"),x=r.title.replace(/"/g,"&quot;"),E=r.date,H=`${String(E.getDate()).padStart(2,"0")}.${String(E.getMonth()+1).padStart(2,"0")}.${String(E.getFullYear())}`;return`
    <div class="mini-item" style="animation: fadeIn 0.4s ease; display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <img src="${r.img}" class="mini-thumb" alt="${x}" onerror="if(this.src.includes('-sm.webp')) { this.src='${r.fullImg}'; } else { this.onerror=null; this.src='/thumbnail-sm.webp'; }" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; flex-shrink:0;">
    <div class="mini-text">
    <h4 title="${h}" style="margin: 0 0 4px 0; font-size: 0.85rem; line-height: 1.3; font-weight: 600;">
    <a href="${r.url}" style="text-decoration: none; color: inherit; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${r.title}
    </a>
    </h4>
    <div style="display: flex; align-items: center; gap: 5px;">
    <small style="color: var(--text-muted); font-size: 0.65rem;">${H} •</small>
    <span style="color: var(--primary); font-weight: bold; font-size: 0.65rem; text-transform: uppercase;">${r.category}</span>
    </div>
    </div>
    </div>`}).join("")}window.renderSidebar=u;function I(t,n){if(n)document.querySelectorAll(".pill").forEach((l)=>l.classList.remove("active")),n.classList.add("active");let e=document.getElementById("hero");if(t==="All"){if(e)e.style.display="block";p(),m=[...s]}else{if(e)e.style.display="none";b(),m=s.filter((l)=>l.category===t)}y(!0),u(t)}window.filterByCat=I;function F(){if(g.length===0)return;let t=document.getElementById("hero"),n=document.getElementById("heroSliderWrapper");if(!t||!n)return;t.classList.remove("skeleton"),n.innerHTML=g.map((a)=>`
  <a href="${a.url}" class="hero-slide" style="background-image: url('${a.fullImg}')">
  <div class="hero-overlay"></div>
  <div class="hero-content">
  <span class="hero-cat">${a.category}</span>
  <h1 class="hero-title">${a.title}</h1>
  <p class="hero-summary">
  ${a.summary.substring(0,270)}...
  <strong style="color:var(--secondary);">Ungkap Faktanya →</strong>
  </p>
  </div>
  </a>`).join("");let e=`
  <div class="hero-nav">
  <button class="nav-btn prev" id="heroPrev" aria-label="Previous">
  <img src="/ext/icons/icon-arrow-left.svg" alt="Prev" width="20" height="20" class="nav-icon">
  </button>
  <button class="nav-btn next" id="heroNext" aria-label="Next">
  <img src="/ext/icons/icon-arrow-right.svg" alt="Next" width="20" height="20" class="nav-icon">
  </button>
  </div>`,l=t.querySelector(".hero-nav");if(l)l.remove();t.insertAdjacentHTML("beforeend",e),document.getElementById("heroPrev")?.addEventListener("click",(a)=>{a.preventDefault(),w(-1)}),document.getElementById("heroNext")?.addEventListener("click",(a)=>{a.preventDefault(),w(1)}),t.addEventListener("mouseenter",b),t.addEventListener("mouseleave",p),S()}function S(){let t=document.getElementById("heroSliderWrapper");if(!t)return;let n=d*100;t.style.transform=`translateX(-${n}%)`,document.querySelectorAll(".hero-slide").forEach((l,a)=>{l.classList.toggle("active",a===d)})}function p(){if(f)clearInterval(f);f=setInterval(()=>{d=(d+1)%g.length,S()},4600)}function b(){if(f)clearInterval(f),f=null}function w(t){if(d+=t,d>=g.length)d=0;else if(d<0)d=g.length-1;S(),b(),p()}function y(t=!1){if(t)v=6;let n=document.getElementById("newsFeed");if(!n)return;n.innerHTML="";let e=document.getElementById("hero"),l=e&&e.style.display!=="none",a=g.map((r)=>r.title),i=m.filter((r)=>{if(l&&a.includes(r.title))return!1;return!0});i.slice(0,v).forEach((r)=>{let h=r.title.replace(/"/g,"&quot;");n.innerHTML+=`
    <div class="card" style="animation: fadeIn 0.5s ease">
    <img src="${r.img}" class="card-img" alt="${h}" onerror="if(this.src.includes('-sm.webp')) { this.src='${r.fullImg}'; } else { this.onerror=null; this.src='/thumbnail-sm.webp'; }">
    <div class="card-body">
    <a href="${r.url}" class="card-link">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <time style="color: var(--text-muted); font-size: 0.8rem;" datetime="${r.date.toISOString()}">
    ${r.date.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
    </time>
    <small style="color:var(--primary); font-weight:bold; text-transform: uppercase;">${r.category}</small>
    </div>
    <h3 class="card-title">${r.title}</h3>
    <p class="card-excerpt">${r.summary.substring(0,200)}...</p>
    </a>
    </div>
    </div>`});let o=document.getElementById("loadMore");if(o)if(v>=i.length)o.innerHTML="Kembali ke Atas ↑",o.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});else o.innerHTML="Klik Artikel Selanjutnya...",o.onclick=()=>{v+=6,y(),u()}}function A(){let t=[...new Set(s.map((e)=>e.category))],n=document.getElementById("categoryPills");if(!n)return;n.innerHTML='<div class="pill active" id="pill-all">Kategori</div>',t.forEach((e)=>{let l=`pill-${e.replace(/\s+/g,"-")}`;n.innerHTML+=`<div class="pill" id="${l}">${e}</div>`}),document.getElementById("pill-all")?.addEventListener("click",function(){I("All",this)}),t.forEach((e)=>{let l=`pill-${e.replace(/\s+/g,"-")}`;document.getElementById(l)?.addEventListener("click",function(){I(e,this)})})}function D(){let t=[...new Set(s.map((e)=>e.date.getFullYear()))].sort((e,l)=>l-e),n=document.getElementById("yearFilter");if(!n)return;n.innerHTML='<option value="">Tahun Pilihan</option>',t.forEach((e)=>{let l=document.createElement("option");l.value=e.toString(),l.textContent=e.toString(),n.appendChild(l)}),T()}function T(){let t=document.getElementById("yearFilter"),n=document.getElementById("monthFilter");if(!t||!n)return;let e=t.value,l=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];if(n.innerHTML='<option value="">Bulan</option>',e)[...new Set(s.filter((i)=>i.date.getFullYear().toString()===e).map((i)=>i.date.getMonth()))].sort((i,c)=>i-c).forEach((i)=>{let c=document.createElement("option");c.value=i.toString(),c.textContent=l[i],n.appendChild(c)}),n.disabled=!1;else n.disabled=!0}function M(){let t=document.getElementById("yearFilter").value,n=document.getElementById("monthFilter").value,e=document.getElementById("hero");if(t!==""){if(e)e.style.display="none";b()}else{if(e)e.style.display="block";p()}m=s.filter((l)=>{let a=t?l.date.getFullYear().toString()===t:!0,i=n!==""?l.date.getMonth().toString()===n:!0;return a&&i}),y(!0),u()}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",L);else L();})();
