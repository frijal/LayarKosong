(()=>{let z={selectors:"article img, main img, .image-grid img, .albumlb img, .gallery img, .artikel-gambar img",minWidth:50,mobileBreakpoint:768,allowedExt:/\.(jpe?g|png|webp|avif)$/i,id:"auto-lightbox"},H=[],P=0,w=null,B=null,K=null,S=()=>window.innerWidth<z.mobileBreakpoint,X=(q)=>{if(q.alt?.trim())return q.alt;if(q.title?.trim())return q.title;let E=q.closest("figure")?.querySelector("figcaption");if(E)return E.innerText;let T=q.src.split("/").pop()?.split("?")[0].split(".")[0]||"View Image";return decodeURIComponent(T).replace(/[-_]/g," ")},Y=()=>{return Array.from(document.querySelectorAll(z.selectors))},Z=()=>{if(document.getElementById(z.id))return;w=document.createElement("div"),w.id=z.id,w.innerHTML=`
    <style>
    #${z.id} { position: fixed; inset: 0; background: rgba(0,0,0,0.95); display: none; align-items: center; justify-content: center; z-index: 100000; transition: opacity 0.3s; opacity: 0; backdrop-filter: blur(10px); font-family: sans-serif; }
    #${z.id}.open { display: flex; opacity: 1; }
    .lb-content { position: relative; display: flex; flex-direction: column; align-items: center; }
    .lb-img { max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 4px; box-shadow: 0 0 30px rgba(0,0,0,0.8); cursor: zoom-out; transition: opacity 0.3s; }
    .lb-caption { color: #ccc; margin-top: 15px; font-size: 14px; text-align: center; max-width: 80%; line-height: 1.4; letter-spacing: 0.5px; text-transform: capitalize; transition: opacity 0.3s; }
    .lb-close { position: absolute; top: 20px; right: 25px; font-size: 40px; color: #fff; cursor: pointer; background: none; border: none; z-index: 10; line-height: 1; transition: 0.2s; }
    .lb-close:hover { transform: scale(1.2); color: #ff4d4d; }
    .lb-nav { position: absolute; width: 100%; display: flex; justify-content: space-between; padding: 0 30px; pointer-events: none; top: 50%; transform: translateY(-50%); }
    .lb-btn { pointer-events: auto; background: rgba(255,255,255,0.05); color: #fff; border: none; width: 60px; height: 60px; border-radius: 50%; cursor: pointer; font-size: 24px; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
    .lb-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
    @media (max-width: ${z.mobileBreakpoint-1}px) { #${z.id} { display: none !important; } }
    </style>
    <button class="lb-close" title="Close">&times;</button>
    <div class="lb-content">
    <img class="lb-img" src="" alt="View">
    <div class="lb-caption"></div>
    </div>
    <div class="lb-nav">
    <button class="lb-btn lb-prev">❮</button>
    <button class="lb-btn lb-next">❯</button>
    </div>`,document.body.appendChild(w),B=w.querySelector(".lb-img"),K=w.querySelector(".lb-caption"),w.querySelector(".lb-close").onclick=R,B.onclick=R,w.querySelector(".lb-prev").onclick=(q)=>{q.stopPropagation(),Q(-1)},w.querySelector(".lb-next").onclick=(q)=>{q.stopPropagation(),Q(1)},w.onclick=(q)=>{if(q.target===w)R()}},U=()=>{let q=H[P];if(!q||!B||!K)return;B.style.opacity="0",K.style.opacity="0",B.src=q.dataset.full||q.src,K.innerText=X(q),B.onload=()=>{if(B)B.style.opacity="1";if(K)K.style.opacity="1"}},Q=(q)=>{if(H.length<=1)return;P=(P+q+H.length)%H.length,U()},R=()=>{if(!w)return;w.classList.remove("open"),setTimeout(()=>{if(B)B.src=""},300)},W=()=>{if(S())return;Z(),document.addEventListener("click",(q)=>{if(S())return;let E=q.target.closest(z.selectors);if(!E)return;if(H=Y().filter((T)=>{let _=T.src.split("?")[0];return z.allowedExt.test(_)}),E.naturalWidth<z.minWidth&&E.width<z.minWidth)return;if(P=H.indexOf(E),P===-1)return;U(),w?.classList.add("open")}),document.addEventListener("keydown",(q)=>{if(!w||!w.classList.contains("open")||S())return;if(q.key==="ArrowRight")Q(1);if(q.key==="ArrowLeft")Q(-1);if(q.key==="Escape")R()})};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",W);else W()})();
