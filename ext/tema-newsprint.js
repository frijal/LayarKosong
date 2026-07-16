(()=>{var P=["Warta Tekno","Jejak Sejarah","Opini Sosial","Gaya Hidup","Sistem Terbuka","Olah Media","Lainnya"];async function Q(){try{let v=await window.siteDataProvider.getFor("editorial-index.ts"),j={};for(let H in v){let J=H.toLowerCase().replace(/\s+/g,"-"),F=X(H);j[F]=[],v[H].forEach((q)=>{let G=q.id.replace(/\.html$/,""),V=(q.image||"/thumbnail.webp").replace(/\.(jpg|jpeg|png|webp)$/i,"-sm.webp"),W=q.title.replace(/\s*-\s*Layar Kosong$/i,""),L=q.description||"";j[F].push({category:F,categorySlug:J,title:W,url:`/${J}/${G}`,img:V,date:q.date?new Date(q.date):new Date,summary:L,readTime:Math.max(2,Math.ceil(L.split(/\s+/).length/30)+1)})}),j[F].sort((q,G)=>G.date.getTime()-q.date.getTime())}Z(j)}catch(v){console.error("Gagal menyajikan menu utama, Chef:",v);let j=document.querySelector("main");if(j)j.innerHTML="<p class='intro'>Data sedang mogok kerja. Coba muat ulang halaman.</p>"}}function X(v){if(!v)return"Lainnya";return v.split("-").map((j)=>j.charAt(0).toUpperCase()+j.slice(1)).join(" ")}function Y(v){let j=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];return`${v.getDate()} ${j[v.getMonth()]} ${v.getFullYear()}`}function Z(v){let j=document.querySelector("main");if(!j)return;let H="";Object.keys(v).sort((F,q)=>{let G=P.indexOf(F),z=P.indexOf(q);if(G===-1&&z===-1)return F.localeCompare(q);if(G===-1)return 1;if(z===-1)return-1;return G-z}).forEach((F)=>{let q=v[F].slice(0,2);if(q.length===0)return;let G=q[0].categorySlug;H+=`
      <section class="rail" id="${G}">
        <div class="rail-head">
          <h2>${F}</h2>
          <a class="rail-more" href="/${G}">Lihat semua &rarr;</a>
        </div>
        <div class="card-grid">
          ${q.map((z)=>`
            <article class="card">
              <div class="card-thumb">
                <!-- Fallback ke gambar default kalau image error -->
                <img src="${z.img}" alt="Thumb" loading="lazy" 
                     onerror="if(this.src.includes('-sm.webp')) { this.src=this.src.replace('-sm.webp', '.webp'); } else { this.style.display='none'; }"
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px;">
              </div>
              <div class="card-body">
                <span class="card-eyebrow">${Y(z.date)} &middot; ${z.readTime} menit baca</span>
                <h3><a href="${z.url}">${z.title}</a></h3>
                <p>${z.summary.length>110?z.summary.substring(0,110)+"...":z.summary}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `}),j.innerHTML=H}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",Q);else Q();})();
