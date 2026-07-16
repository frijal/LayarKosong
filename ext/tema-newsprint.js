(()=>{var W=[];async function Y(){try{let J=await window.siteDataProvider.getFor("editorial-index.ts"),z={};W=[];for(let Q in J){let U=Q.toLowerCase().replace(/\s+/g,"-"),K=_(Q);z[K]=[],J[Q].forEach((q)=>{let L=q.id.replace(/\.html$/,""),V=(q.image||"/thumbnail.webp").replace(/\.(jpg|jpeg|png|webp)$/i,"-sm.webp"),M=q.title.replace(/\s*-\s*Layar Kosong$/i,""),Z=q.description||"",X={category:K,categorySlug:U,title:M,url:`/${U}/${L}`,img:V,date:q.date?new Date(q.date):new Date,summary:Z};z[K].push(X),W.push(X)}),z[K].sort((q,L)=>L.date.getTime()-q.date.getTime())}$(z),k()}catch(J){console.error("Gagal menyajikan menu utama, Chef:",J);let z=document.getElementById("railContainer");if(z)z.innerHTML="<p class='intro'>Data sedang mogok kerja. Coba muat ulang halaman.</p>"}}function _(J){if(!J)return"Lainnya";return J.split("-").map((z)=>z.charAt(0).toUpperCase()+z.slice(1)).join(" ")}function $(J){let z=document.getElementById("railContainer");if(!z)return;let Q="";Object.keys(J).sort((K,q)=>{let L=J[K][0]?.date.getTime()||0;return(J[q][0]?.date.getTime()||0)-L}).forEach((K)=>{let q=J[K].slice(0,2);if(q.length===0)return;let L=q[0].categorySlug;Q+=`
    <section class="rail" id="${L}">
    <div class="rail-head">
    <h2>${K}</h2>
    <a class="rail-more" href="/${L}">Lihat semua &rarr;</a>
    </div>
    <div class="card-grid">
    ${q.map((B)=>`
      <article class="card">
      <div class="card-thumb">
      <img src="${B.img}" alt="Thumb" loading="lazy"
      onerror="if(this.src.includes('-sm.webp')) { this.src=this.src.replace('-sm.webp', '.webp'); } else { this.style.display='none'; }"
      style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px;">
      </div>
      <div class="card-body">
      <h3><a href="${B.url}">${B.title}</a></h3>
      <p>${B.summary.length>110?B.summary.substring(0,110)+"...":B.summary}</p>
      </div>
      </article>
      `).join("")}
      </div>
      </section>
      `}),z.innerHTML=Q}function k(){let J=document.getElementById("searchForm"),z=document.getElementById("searchInput"),Q=document.getElementById("searchResults"),U=document.getElementById("searchGrid"),K=document.getElementById("railContainer"),q=document.getElementById("searchHeading");if(!J||!z||!Q||!U||!K||!q)return;z.addEventListener("input",(L)=>{let B=L.target.value.toLowerCase().trim();if(B.length>0){K.style.display="none",Q.style.display="block";let V=W.filter((M)=>M.title.toLowerCase().includes(B)||M.summary.toLowerCase().includes(B));if(V.length>0)q.textContent=`Hasil: "${B}"`,U.innerHTML=V.map((M)=>`
    <article class="card" style="animation: fadeUp 0.4s ease-out both;">
    <div class="card-thumb">
    <img src="${M.img}" alt="Thumb" loading="lazy"
    onerror="if(this.src.includes('-sm.webp')) { this.src=this.src.replace('-sm.webp', '.webp'); } else { this.style.display='none'; }"
    style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px;">
    </div>
    <div class="card-body">
    <span class="card-eyebrow">${M.category}</span>
    <h3><a href="${M.url}">${M.title}</a></h3>
    <p>${M.summary.length>110?M.summary.substring(0,110)+"...":M.summary}</p>
    </div>
    </article>
    `).join("");else q.textContent=`Tidak ditemukan: "${B}"`,U.innerHTML='<p style="grid-column: 1 / -1; color: var(--color-muted); padding-top: 12px;">Maaf, belum ada tulisan yang cocok. Coba kata kunci lain atau tekan Enter untuk pencarian mendalam.</p>'}else K.style.display="block",Q.style.display="none",U.innerHTML=""}),J.addEventListener("submit",(L)=>{L.preventDefault();let B=z.value.trim();if(B.length>0)window.location.href=`https://dalam.web.id/search/?q=${encodeURIComponent(B)}`})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",Y);else Y();})();
