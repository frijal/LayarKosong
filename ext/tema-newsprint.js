(()=>{var $=[];async function L(){try{let K=await window.siteDataProvider.getFor("homepage.ts"),q={};$=[];for(let P in K){let Q=P.toLowerCase().replace(/\s+/g,"-"),z=N(P);q[z]=[],K[P].forEach((J)=>{let M=J.id.replace(/\.html$/,""),V=(J.image||"/thumbnail.webp").replace(/\.(jpg|jpeg|png|webp)$/i,"-rg.avif"),W=J.title.replace(/\s*-\s*Layar Kosong$/i,""),_=J.description||"",Z={category:z,categorySlug:Q,title:W,url:`/${Q}/${M}`,img:V,date:J.date?new Date(J.date):new Date,summary:_};q[z].push(Z),$.push(Z)}),q[z].sort((J,M)=>M.date.getTime()-J.date.getTime())}F(q),O()}catch(K){console.error("Gagal menyajikan menu utama, Chef:",K);let q=document.getElementById("railContainer");if(q)q.innerHTML="<p class='intro'>Data sedang mogok kerja. Coba muat ulang halaman.</p>"}}function N(K){if(!K)return"Lainnya";return K.split("-").map((q)=>q.charAt(0).toUpperCase()+q.slice(1)).join(" ")}function x(K){let q=document.getElementById("imageLightbox"),P=document.getElementById("lightboxImg");if(q&&P)P.src=K,q.showModal(),q.addEventListener("click",(Q)=>{let z=q.getBoundingClientRect();if(!(z.top<=Q.clientY&&Q.clientY<=z.top+z.height&&z.left<=Q.clientX&&Q.clientX<=z.left+z.width))q.close()})}window.openLightbox=x;function F(K){let q=document.getElementById("railContainer");if(!q)return;let P="",Q=Object.keys(K).sort((z,J)=>{let M=K[z][0]?.date.getTime()||0;return(K[J][0]?.date.getTime()||0)-M});for(let z=0;z<Q.length;z++){let J=Q[z],M=K[J].slice(0,4);if(M.length===0)continue;let Y=M[0].categorySlug;if(P+=`
    <section class="rail" id="${Y}">
    <div class="rail-head">
    <h2>${J}</h2>
    <a class="rail-more" href="/${Y}">Lihat semua &rarr;</a>
    </div>
    <div class="card-grid">
    ${M.map((V)=>`
      <article class="card">
      <div class="card-thumb">
      <img src="${V.img}" alt="${V.title}" loading="lazy"
      onclick="openLightbox(this.src.replace('-rg', ''))"
      onerror="if(this.src.includes('-rg.avif')) { this.src=this.src.replace('-rg.avif', '.webp'); } else { this.style.display='none'; }"
      style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px; cursor: zoom-in;">
      </div>
      <div class="card-body">
      <h3><a href="${V.url}">${V.title}</a></h3>
      <p>${V.summary.length>110?V.summary.substring(0,110)+"...":V.summary}</p>
      </div>
      </article>
      `).join("")}
      </div>
      </section>
      `,z===1)P+=`
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
        `}if(q.innerHTML=P,P.includes("adsbygoogle"))(window.adsbygoogle=window.adsbygoogle||[]).push({})}function O(){let K=document.getElementById("searchForm"),q=document.getElementById("searchInput"),P=document.getElementById("clearSearch"),Q=document.getElementById("searchResults"),z=document.getElementById("searchGrid"),J=document.getElementById("railContainer"),M=document.getElementById("searchHeading");if(!K||!q||!Q||!z||!J||!M||!P)return;q.addEventListener("input",(V)=>{let W=V.target.value.toLowerCase().trim();if(W.length>0){P.style.display="block",J.style.display="none",Q.style.display="block";let _=$.filter((X)=>X.title.toLowerCase().includes(W)||X.summary.toLowerCase().includes(W)),Z=_.slice(0,28);if(Z.length>0){if(_.length>28)M.textContent=`Menampilkan 28 hasil teratas untuk "${W}". Tekan Enter untuk sisanya.`,M.style.fontSize="clamp(1rem, 2.5vw, 1.3rem)";else M.textContent=`Hasil: "${W}"`,M.style.fontSize="clamp(1.25rem, 3vw, 1.6rem)";z.innerHTML=Z.map((X)=>`
        <article class="card" style="animation: fadeUp 0.4s ease-out both;">
        <div class="card-thumb">
        <!-- \uD83D\uDD25 UPDATE: Sama, ganti jadi this.src.replace('-rg', '') -->
        <img src="${X.img}" alt="${X.title}" loading="lazy"
        onclick="openLightbox(this.src.replace('-rg', ''))"
        onerror="if(this.src.includes('-rg.avif')) { this.src=this.src.replace('-rg.avif', '.webp'); } else { this.style.display='none'; }"
        style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px; cursor: zoom-in;">
        </div>
        <div class="card-body">
        <span class="card-eyebrow">${X.category}</span>
        <h3><a href="${X.url}">${X.title}</a></h3>
        <p>${X.summary.length>110?X.summary.substring(0,110)+"...":X.summary}</p>
        </div>
        </article>
        `).join("")}else M.textContent=`Tidak ditemukan: "${W}"`,M.style.fontSize="clamp(1.25rem, 3vw, 1.6rem)",z.innerHTML='<p style="grid-column: 1 / -1; color: var(--color-muted); padding-top: 12px;">Maaf, belum ada tulisan yang cocok. Coba kata kunci lain atau tekan Enter untuk pencarian lebih lanjut...</p>'}else Y()}),P.addEventListener("click",()=>{q.value="",Y(),q.focus()});function Y(){P.style.display="none",J.style.display="block",Q.style.display="none",z.innerHTML=""}K.addEventListener("submit",(V)=>{V.preventDefault();let W=q.value.trim();if(W.length>0)window.location.href=`https://dalam.web.id/search/?q=${encodeURIComponent(W)}`})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",L);else L();})();
