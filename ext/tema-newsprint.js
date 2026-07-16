(()=>{var _=[];async function $(){try{let K=await window.siteDataProvider.getFor("editorial-index.ts"),q={};_=[];for(let M in K){let W=M.toLowerCase().replace(/\s+/g,"-"),L=k(M);q[L]=[],K[M].forEach((z)=>{let J=z.id.replace(/\.html$/,""),X=(z.image||"/thumbnail.webp").replace(/\.(jpg|jpeg|png|webp)$/i,"-rg.webp"),U=z.title.replace(/\s*-\s*Layar Kosong$/i,""),Z=z.description||"",Y={category:L,categorySlug:W,title:U,url:`/${W}/${J}`,img:X,date:z.date?new Date(z.date):new Date,summary:Z};q[L].push(Y),_.push(Y)}),q[L].sort((z,J)=>J.date.getTime()-z.date.getTime())}x(q),N()}catch(K){console.error("Gagal menyajikan menu utama, Chef:",K);let q=document.getElementById("railContainer");if(q)q.innerHTML="<p class='intro'>Data sedang mogok kerja. Coba muat ulang halaman.</p>"}}function k(K){if(!K)return"Lainnya";return K.split("-").map((q)=>q.charAt(0).toUpperCase()+q.slice(1)).join(" ")}function x(K){let q=document.getElementById("railContainer");if(!q)return;let M="";Object.keys(K).sort((L,z)=>{let J=K[L][0]?.date.getTime()||0;return(K[z][0]?.date.getTime()||0)-J}).forEach((L)=>{let z=K[L].slice(0,4);if(z.length===0)return;let J=z[0].categorySlug;M+=`
    <section class="rail" id="${J}">
    <div class="rail-head">
    <h2>${L}</h2>
    <a class="rail-more" href="/${J}">Lihat semua &rarr;</a>
    </div>
    <div class="card-grid">
    ${z.map((Q)=>`
      <article class="card">
      <div class="card-thumb">
      <!-- \uD83D\uDD25 UPDATE: Fallback fallback ke -rg.webp -->
      <img src="${Q.img}" alt="Thumb" loading="lazy"
      onerror="if(this.src.includes('-rg.webp')) { this.src=this.src.replace('-rg.webp', '.webp'); } else { this.style.display='none'; }"
      style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px;">
      </div>
      <div class="card-body">
      <h3><a href="${Q.url}">${Q.title}</a></h3>
      <p>${Q.summary.length>110?Q.summary.substring(0,110)+"...":Q.summary}</p>
      </div>
      </article>
      `).join("")}
      </div>
      </section>
      `}),q.innerHTML=M}function N(){let K=document.getElementById("searchForm"),q=document.getElementById("searchInput"),M=document.getElementById("clearSearch"),W=document.getElementById("searchResults"),L=document.getElementById("searchGrid"),z=document.getElementById("railContainer"),J=document.getElementById("searchHeading");if(!K||!q||!W||!L||!z||!J||!M)return;q.addEventListener("input",(X)=>{let U=X.target.value.toLowerCase().trim();if(U.length>0){M.style.display="block",z.style.display="none",W.style.display="block";let Z=_.filter((V)=>V.title.toLowerCase().includes(U)||V.summary.toLowerCase().includes(U)),Y=Z.slice(0,28);if(Y.length>0){if(Z.length>28)J.textContent=`Menampilkan 28 hasil teratas untuk "${U}". Tekan Enter untuk sisanya.`,J.style.fontSize="clamp(1rem, 2.5vw, 1.3rem)";else J.textContent=`Hasil: "${U}"`,J.style.fontSize="clamp(1.25rem, 3vw, 1.6rem)";L.innerHTML=Y.map((V)=>`
    <article class="card" style="animation: fadeUp 0.4s ease-out both;">
    <div class="card-thumb">
    <img src="${V.img}" alt="Thumb" loading="lazy"
    onerror="if(this.src.includes('-rg.webp')) { this.src=this.src.replace('-rg.webp', '.webp'); } else { this.style.display='none'; }"
    style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px;">
    </div>
    <div class="card-body">
    <span class="card-eyebrow">${V.category}</span>
    <h3><a href="${V.url}">${V.title}</a></h3>
    <p>${V.summary.length>110?V.summary.substring(0,110)+"...":V.summary}</p>
    </div>
    </article>
    `).join("")}else J.textContent=`Tidak ditemukan: "${U}"`,J.style.fontSize="clamp(1.25rem, 3vw, 1.6rem)",L.innerHTML='<p style="grid-column: 1 / -1; color: var(--color-muted); padding-top: 12px;">Maaf, belum ada tulisan yang cocok. Coba kata kunci lain atau tekan Enter untuk pencarian mendalam.</p>'}else Q()}),M.addEventListener("click",()=>{q.value="",Q(),q.focus()});function Q(){M.style.display="none",z.style.display="block",W.style.display="none",L.innerHTML=""}K.addEventListener("submit",(X)=>{X.preventDefault();let U=q.value.trim();if(U.length>0)window.location.href=`https://dalam.web.id/search/?q=${encodeURIComponent(U)}`})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",$);else $();})();
