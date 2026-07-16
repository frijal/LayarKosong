(()=>{var V=[];async function X(){try{let K=await window.siteDataProvider.getFor("editorial-index.ts"),q={};V=[];for(let P in K){let Q=P.toLowerCase().replace(/\s+/g,"-"),z=j(P);q[z]=[],K[P].forEach((J)=>{let M=J.id.replace(/\.html$/,""),_=(J.image||"/thumbnail.webp").replace(/\.(jpg|jpeg|png|webp)$/i,"-rg.webp"),Y=J.title.replace(/\s*-\s*Layar Kosong$/i,""),k=J.description||"",$={category:z,categorySlug:Q,title:Y,url:`/${Q}/${M}`,img:_,date:J.date?new Date(J.date):new Date,summary:k};q[z].push($),V.push($)}),q[z].sort((J,M)=>M.date.getTime()-J.date.getTime())}L(q),N()}catch(K){console.error("Gagal menyajikan menu utama, Chef:",K);let q=document.getElementById("railContainer");if(q)q.innerHTML="<p class='intro'>Data sedang mogok kerja. Coba muat ulang halaman.</p>"}}function j(K){if(!K)return"Lainnya";return K.split("-").map((q)=>q.charAt(0).toUpperCase()+q.slice(1)).join(" ")}function x(K){let q=document.getElementById("imageLightbox"),P=document.getElementById("lightboxImg");if(q&&P)P.src=K,q.showModal(),q.addEventListener("click",(Q)=>{let z=q.getBoundingClientRect();if(!(z.top<=Q.clientY&&Q.clientY<=z.top+z.height&&z.left<=Q.clientX&&Q.clientX<=z.left+z.width))q.close()})}window.openLightbox=x;function L(K){let q=document.getElementById("railContainer");if(!q)return;let P="";Object.keys(K).sort((z,J)=>{let M=K[z][0]?.date.getTime()||0;return(K[J][0]?.date.getTime()||0)-M}).forEach((z)=>{let J=K[z].slice(0,4);if(J.length===0)return;let M=J[0].categorySlug;P+=`
    <section class="rail" id="${M}">
    <div class="rail-head">
    <h2>${z}</h2>
    <a class="rail-more" href="/${M}">Lihat semua &rarr;</a>
    </div>
    <div class="card-grid">
    ${J.map((W)=>`
      <article class="card">
      <div class="card-thumb">
      <!-- \uD83D\uDD25 UPDATE: Ganti jadi this.src.replace('-rg', '') -->
      <img src="${W.img}" alt="${W.title}" loading="lazy"
      onclick="openLightbox(this.src.replace('-rg', ''))"
      onerror="if(this.src.includes('-rg.webp')) { this.src=this.src.replace('-rg.webp', '.webp'); } else { this.style.display='none'; }"
      style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px; cursor: zoom-in;">
      </div>
      <div class="card-body">
      <h3><a href="${W.url}">${W.title}</a></h3>
      <p>${W.summary.length>110?W.summary.substring(0,110)+"...":W.summary}</p>
      </div>
      </article>
      `).join("")}
      </div>
      </section>
      `}),q.innerHTML=P}function N(){let K=document.getElementById("searchForm"),q=document.getElementById("searchInput"),P=document.getElementById("clearSearch"),Q=document.getElementById("searchResults"),z=document.getElementById("searchGrid"),J=document.getElementById("railContainer"),M=document.getElementById("searchHeading");if(!K||!q||!Q||!z||!J||!M||!P)return;q.addEventListener("input",(_)=>{let Y=_.target.value.toLowerCase().trim();if(Y.length>0){P.style.display="block",J.style.display="none",Q.style.display="block";let k=V.filter((Z)=>Z.title.toLowerCase().includes(Y)||Z.summary.toLowerCase().includes(Y)),$=k.slice(0,28);if($.length>0){if(k.length>28)M.textContent=`Menampilkan 28 hasil teratas untuk "${Y}". Tekan Enter untuk sisanya.`,M.style.fontSize="clamp(1rem, 2.5vw, 1.3rem)";else M.textContent=`Hasil: "${Y}"`,M.style.fontSize="clamp(1.25rem, 3vw, 1.6rem)";z.innerHTML=$.map((Z)=>`
        <article class="card" style="animation: fadeUp 0.4s ease-out both;">
        <div class="card-thumb">
        <!-- \uD83D\uDD25 UPDATE: Sama, ganti jadi this.src.replace('-rg', '') -->
        <img src="${Z.img}" alt="${Z.title}" loading="lazy"
        onclick="openLightbox(this.src.replace('-rg', ''))"
        onerror="if(this.src.includes('-rg.webp')) { this.src=this.src.replace('-rg.webp', '.webp'); } else { this.style.display='none'; }"
        style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px; cursor: zoom-in;">
        </div>
        <div class="card-body">
        <span class="card-eyebrow">${Z.category}</span>
        <h3><a href="${Z.url}">${Z.title}</a></h3>
        <p>${Z.summary.length>110?Z.summary.substring(0,110)+"...":Z.summary}</p>
        </div>
        </article>
        `).join("")}else M.textContent=`Tidak ditemukan: "${Y}"`,M.style.fontSize="clamp(1.25rem, 3vw, 1.6rem)",z.innerHTML='<p style="grid-column: 1 / -1; color: var(--color-muted); padding-top: 12px;">Maaf, belum ada tulisan yang cocok. Coba kata kunci lain atau tekan Enter untuk pencarian lebih lanjut...</p>'}else W()}),P.addEventListener("click",()=>{q.value="",W(),q.focus()});function W(){P.style.display="none",J.style.display="block",Q.style.display="none",z.innerHTML=""}K.addEventListener("submit",(_)=>{_.preventDefault();let Y=q.value.trim();if(Y.length>0)window.location.href=`https://dalam.web.id/search/?q=${encodeURIComponent(Y)}`})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",X);else X();})();
