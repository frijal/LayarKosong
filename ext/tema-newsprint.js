(()=>{async function J(){try{let v=await window.siteDataProvider.getFor("editorial-index.ts"),q={};for(let G in v){let H=G.toLowerCase().replace(/\s+/g,"-"),z=Q(G);q[z]=[],v[G].forEach((j)=>{let B=j.id.replace(/\.html$/,""),K=(j.image||"/thumbnail.webp").replace(/\.(jpg|jpeg|png|webp)$/i,"-sm.webp"),L=j.title.replace(/\s*-\s*Layar Kosong$/i,""),P=j.description||"";q[z].push({category:z,categorySlug:H,title:L,url:`/${H}/${B}`,img:K,date:j.date?new Date(j.date):new Date,summary:P})}),q[z].sort((j,B)=>B.date.getTime()-j.date.getTime())}U(q)}catch(v){console.error("Gagal menyajikan menu utama, Chef:",v);let q=document.querySelector("main");if(q)q.innerHTML="<p class='intro'>Data sedang mogok kerja. Coba muat ulang halaman.</p>"}}function Q(v){if(!v)return"Lainnya";return v.split("-").map((q)=>q.charAt(0).toUpperCase()+q.slice(1)).join(" ")}function U(v){let q=document.querySelector("main");if(!q)return;let G="";Object.keys(v).sort((z,j)=>{let B=v[z][0]?.date.getTime()||0;return(v[j][0]?.date.getTime()||0)-B}).forEach((z)=>{let j=v[z].slice(0,2);if(j.length===0)return;let B=j[0].categorySlug;G+=`
    <section class="rail" id="${B}">
    <div class="rail-head">
    <h2>${z}</h2>
    <a class="rail-more" href="/${B}">Lihat semua &rarr;</a>
    </div>
    <div class="card-grid">
    ${j.map((F)=>`
      <article class="card">
      <div class="card-thumb">
      <!-- Fallback ke gambar default kalau image error -->
      <img src="${F.img}" alt="Thumb" loading="lazy"
      onerror="if(this.src.includes('-sm.webp')) { this.src=this.src.replace('-sm.webp', '.webp'); } else { this.style.display='none'; }"
      style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px;">
      </div>
      <div class="card-body">
      <h3><a href="${F.url}">${F.title}</a></h3>
      <p>${F.summary.length>110?F.summary.substring(0,110)+"...":F.summary}</p>
      </div>
      </article>
      `).join("")}
      </div>
      </section>
      `}),q.innerHTML=G}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",J);else J();})();
