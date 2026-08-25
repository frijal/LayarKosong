(()=>{var m=[];async function h(){try{let n=await window.siteDataProvider.getFor("homepage.ts"),e={};m=[];for(let s in n){let r=s.toLowerCase().replace(/\s+/g,"-"),t=p(s);e[t]=[],n[s].forEach((a)=>{let i=a.id.replace(/\.html$/,""),l=(a.image||"/thumbnail.webp").replace(/\.(jpg|jpeg|png|webp)$/i,"-rg.webp"),o=a.title.replace(/\s*-\s*Layar Kosong$/i,""),u=a.description||"",g={category:t,categorySlug:r,title:o,url:`/${r}/${i}`,img:l,date:a.date?new Date(a.date):new Date,summary:u};e[t].push(g),m.push(g)}),e[t].sort((a,i)=>i.date.getTime()-a.date.getTime())}f(e),b()}catch(n){console.error("Gagal menyajikan menu utama, Chef:",n);let e=document.getElementById("railContainer");if(e)e.innerHTML="<p class='intro'>Data sedang mogok kerja. Coba muat ulang halaman.</p>"}}function p(n){if(!n)return"Lainnya";return n.split("-").map((e)=>e.charAt(0).toUpperCase()+e.slice(1)).join(" ")}function y(n){let e=document.getElementById("imageLightbox"),s=document.getElementById("lightboxImg");if(e&&s)s.src=n,e.showModal(),e.addEventListener("click",(r)=>{let t=e.getBoundingClientRect();if(!(t.top<=r.clientY&&r.clientY<=t.top+t.height&&t.left<=r.clientX&&r.clientX<=t.left+t.width))e.close()})}window.openLightbox=y;function f(n){let e=document.getElementById("railContainer");if(!e)return;let s="",r=Object.keys(n).sort((t,a)=>{let i=n[t][0]?.date.getTime()||0;return(n[a][0]?.date.getTime()||0)-i});for(let t=0;t<r.length;t++){let a=r[t],i=n[a].slice(0,4);if(i.length===0)continue;let d=i[0].categorySlug;if(s+=`
    <section class="rail" id="${d}">
    <div class="rail-head">
    <h2>${a}</h2>
    <a class="rail-more" href="/${d}">Lihat semua &rarr;</a>
    </div>
    <div class="card-grid">
    ${i.map((l)=>`
      <article class="card">
      <div class="card-thumb">
      <img src="${l.img}" alt="${l.title}" loading="lazy"
      onclick="openLightbox(this.src.replace('-rg', ''))"
      onerror="if(this.src.includes('-rg.webp')) { this.src=this.src.replace('-rg.webp', '.webp'); } else { this.style.display='none'; }"
      style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px; cursor: zoom-in;">
      </div>
      <div class="card-body">
      <h3><a href="${l.url}">${l.title}</a></h3>
      <p>${l.summary.length>110?l.summary.substring(0,110)+"...":l.summary}</p>
      </div>
      </article>
      `).join("")}
      </div>
      </section>
      `,t===1)s+=`
        <div class="ad-slot-editorial" style="
        margin: 46px auto 0 auto;
        padding-bottom: 46px;
        border-bottom: 1px solid var(--color-rule);
        text-align: center;
        width: 100%;
        min-height: 140px; /* Anti-CLS: Akan disapu GTM jika kosong */
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        ">
        <span style="display:none;" aria-hidden="true" class="ad-label">Pesan Sponsor</span>
        <ins class="adsbygoogle" style="display: block; width: 100%; max-width: 970px; height: 90px;"
        data-ad-client="ca-pub-8157928740123992"
        data-ad-slot="4812703899"
        data-ad-format="auto"
        data-full-width-responsive="true"></ins>
        </div>
        `}if(e.innerHTML=s,s.includes("adsbygoogle"))(window.adsbygoogle=window.adsbygoogle||[]).push({})}function b(){let n=document.getElementById("searchForm"),e=document.getElementById("searchInput"),s=document.getElementById("clearSearch"),r=document.getElementById("searchResults"),t=document.getElementById("searchGrid"),a=document.getElementById("railContainer"),i=document.getElementById("searchHeading");if(!n||!e||!r||!t||!a||!i||!s)return;e.addEventListener("input",(l)=>{let o=l.target.value.toLowerCase().trim();if(o.length>0){s.style.display="block",a.style.display="none",r.style.display="block";let u=m.filter((c)=>c.title.toLowerCase().includes(o)||c.summary.toLowerCase().includes(o)),g=u.slice(0,28);if(g.length>0){if(u.length>28)i.textContent=`Menampilkan 28 hasil teratas untuk "${o}". Tekan Enter untuk sisanya.`,i.style.fontSize="clamp(1rem, 2.5vw, 1.3rem)";else i.textContent=`Hasil: "${o}"`,i.style.fontSize="clamp(1.25rem, 3vw, 1.6rem)";t.innerHTML=g.map((c)=>`
        <article class="card" style="animation: fadeUp 0.4s ease-out both;">
        <div class="card-thumb">
        <!-- \uD83D\uDD25 UPDATE: Sama, ganti jadi this.src.replace('-rg', '') -->
        <img src="${c.img}" alt="${c.title}" loading="lazy"
        onclick="openLightbox(this.src.replace('-rg', ''))"
        onerror="if(this.src.includes('-rg.webp')) { this.src=this.src.replace('-rg.webp', '.webp'); } else { this.style.display='none'; }"
        style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px; cursor: zoom-in;">
        </div>
        <div class="card-body">
        <span class="card-eyebrow">${c.category}</span>
        <h3><a href="${c.url}">${c.title}</a></h3>
        <p>${c.summary.length>110?c.summary.substring(0,110)+"...":c.summary}</p>
        </div>
        </article>
        `).join("")}else i.textContent=`Tidak ditemukan: "${o}"`,i.style.fontSize="clamp(1.25rem, 3vw, 1.6rem)",t.innerHTML='<p style="grid-column: 1 / -1; color: var(--color-muted); padding-top: 12px;">Maaf, belum ada tulisan yang cocok. Coba kata kunci lain atau tekan Enter untuk pencarian lebih lanjut...</p>'}else d()}),s.addEventListener("click",()=>{e.value="",d(),e.focus()});function d(){s.style.display="none",a.style.display="block",r.style.display="none",t.innerHTML=""}n.addEventListener("submit",(l)=>{l.preventDefault();let o=e.value.trim();if(o.length>0)window.location.href=`https://dalam.web.id/search/?q=${encodeURIComponent(o)}`})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",h);else h();})();
