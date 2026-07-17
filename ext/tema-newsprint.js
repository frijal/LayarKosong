(()=>{var M=[];async function N(){try{let K=await window.siteDataProvider.getFor("homepage.ts"),z={};M=[];for(let Q in K){let V=Q.toLowerCase().replace(/\s+/g,"-"),q=j(Q);z[q]=[],K[Q].forEach((J)=>{let P=J.id.replace(/\.html$/,""),W=(J.image||"/thumbnail.webp").replace(/\.(jpg|jpeg|png|webp)$/i,"-rg.webp"),X=J.title.replace(/\s*-\s*Layar Kosong$/i,""),$=J.description||"",_={category:q,categorySlug:V,title:X,url:`/${V}/${P}`,img:W,date:J.date?new Date(J.date):new Date,summary:$};z[q].push(_),M.push(_)}),z[q].sort((J,P)=>P.date.getTime()-J.date.getTime())}x(z),y()}catch(K){console.error("Gagal menyajikan menu utama, Chef:",K);let z=document.getElementById("railContainer");if(z)z.innerHTML="<p class='intro'>Data sedang mogok kerja. Coba muat ulang halaman.</p>"}}function j(K){if(!K)return"Lainnya";return K.split("-").map((z)=>z.charAt(0).toUpperCase()+z.slice(1)).join(" ")}function k(K){let z=document.getElementById("imageLightbox"),Q=document.getElementById("lightboxImg");if(z&&Q)Q.src=K,z.showModal(),z.addEventListener("click",(V)=>{let q=z.getBoundingClientRect();if(!(q.top<=V.clientY&&V.clientY<=q.top+q.height&&q.left<=V.clientX&&V.clientX<=q.left+q.width))z.close()})}window.openLightbox=k;function x(K){let z=document.getElementById("railContainer");if(!z)return;let Q="",V=Object.keys(K).sort((q,J)=>{let P=K[q][0]?.date.getTime()||0;return(K[J][0]?.date.getTime()||0)-P});for(let q=0;q<V.length;q++){let J=V[q],P=K[J].slice(0,4);if(P.length===0)continue;let Z=P[0].categorySlug;if(Q+=`
    <section class="rail" id="${Z}">
    <div class="rail-head">
    <h2>${J}</h2>
    <a class="rail-more" href="/${Z}">Lihat semua &rarr;</a>
    </div>
    <div class="card-grid">
    ${P.map((W)=>`
      <article class="card">
      <div class="card-thumb">
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
      `,q===1)Q+=`
        <div class="ad-slot-editorial" style="
        margin: 46px auto 0 auto;
        padding-bottom: 46px;
        border-bottom: 1px solid var(--color-rule);
        text-align: center;
        width: 100%;
        min-height: 140px; /* Anti-CLS, akan dihapus oleh Tukang Sapu Global jika iklan kosong */
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
        `}z.innerHTML=Q;try{let q=document.querySelectorAll(".adsbygoogle");if(q.length>0&&window.adsbygoogle)q.forEach(()=>{window.adsbygoogle.push({})})}catch(q){console.warn("Iklan gagal dimuat:",q)}}function y(){let K=document.getElementById("searchForm"),z=document.getElementById("searchInput"),Q=document.getElementById("clearSearch"),V=document.getElementById("searchResults"),q=document.getElementById("searchGrid"),J=document.getElementById("railContainer"),P=document.getElementById("searchHeading");if(!K||!z||!V||!q||!J||!P||!Q)return;z.addEventListener("input",(W)=>{let X=W.target.value.toLowerCase().trim();if(X.length>0){Q.style.display="block",J.style.display="none",V.style.display="block";let $=M.filter((Y)=>Y.title.toLowerCase().includes(X)||Y.summary.toLowerCase().includes(X)),_=$.slice(0,28);if(_.length>0){if($.length>28)P.textContent=`Menampilkan 28 hasil teratas untuk "${X}". Tekan Enter untuk sisanya.`,P.style.fontSize="clamp(1rem, 2.5vw, 1.3rem)";else P.textContent=`Hasil: "${X}"`,P.style.fontSize="clamp(1.25rem, 3vw, 1.6rem)";q.innerHTML=_.map((Y)=>`
        <article class="card" style="animation: fadeUp 0.4s ease-out both;">
        <div class="card-thumb">
        <!-- \uD83D\uDD25 UPDATE: Sama, ganti jadi this.src.replace('-rg', '') -->
        <img src="${Y.img}" alt="${Y.title}" loading="lazy"
        onclick="openLightbox(this.src.replace('-rg', ''))"
        onerror="if(this.src.includes('-rg.webp')) { this.src=this.src.replace('-rg.webp', '.webp'); } else { this.style.display='none'; }"
        style="width: 100%; height: 100%; object-fit: cover; border-radius: 1px; cursor: zoom-in;">
        </div>
        <div class="card-body">
        <span class="card-eyebrow">${Y.category}</span>
        <h3><a href="${Y.url}">${Y.title}</a></h3>
        <p>${Y.summary.length>110?Y.summary.substring(0,110)+"...":Y.summary}</p>
        </div>
        </article>
        `).join("")}else P.textContent=`Tidak ditemukan: "${X}"`,P.style.fontSize="clamp(1.25rem, 3vw, 1.6rem)",q.innerHTML='<p style="grid-column: 1 / -1; color: var(--color-muted); padding-top: 12px;">Maaf, belum ada tulisan yang cocok. Coba kata kunci lain atau tekan Enter untuk pencarian lebih lanjut...</p>'}else Z()}),Q.addEventListener("click",()=>{z.value="",Z(),z.focus()});function Z(){Q.style.display="none",J.style.display="block",V.style.display="none",q.innerHTML=""}K.addEventListener("submit",(W)=>{W.preventDefault();let X=z.value.trim();if(X.length>0)window.location.href=`https://dalam.web.id/search/?q=${encodeURIComponent(X)}`})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",N);else N();})();
