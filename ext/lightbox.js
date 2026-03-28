(()=>{(()=>{let z={selectors:"article img, main img, picture img, .image-grid img, .albumlb img, .gallery img, .artikel-gambar img",minWidth:50,mobileBreakpoint:768,allowedExt:/\.(jpe?g|png|webp|avif|svg)$/i,id:"auto-lightbox"},B=[],K=0,w=null,A=null,E=null,U=()=>window.innerWidth<z.mobileBreakpoint,Y=(q)=>{if(q.alt?.trim())return q.alt;if(q.title?.trim())return q.title;let H=q.closest("figure")?.querySelector("figcaption");if(H)return H.innerText;let S=(q.currentSrc||q.src).split("/").pop()?.split("?")[0].split(".")[0]||"View Image";return decodeURIComponent(S).replace(/[-_]/g," ")},Z=()=>{return Array.from(document.querySelectorAll(z.selectors))},_=()=>{if(document.getElementById(z.id))return;w=document.createElement("div"),w.id=z.id,w.innerHTML=`
    <style>
    #${z.id} { position: fixed; inset: 0; background: rgba(0,0,0,0.95); display: none; align-items: center; justify-content: center; z-index: 100000; transition: opacity 0.3s; opacity: 0; backdrop-filter: blur(10px); font-family: sans-serif; }
    #${z.id}.open { display: flex; opacity: 1; }
    .lb-content { position: relative; display: flex; flex-direction: column; align-items: center; }
    .lb-img { max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 4px; box-shadow: 0 0 30px rgba(0,0,0,0.8); cursor: zoom-out; transition: opacity 0.3s; }
    .lb-caption { color: #ccc; margin-top: 15px; font-size: 14px; text-align: center; max-width: 80%; line-height: 1.4; letter-spacing: 0.5px; text-transform: capitalize; transition: opacity 0.3s; font-weight: 300; }
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
    </div>`,document.body.appendChild(w),A=w.querySelector(".lb-img"),E=w.querySelector(".lb-caption"),w.querySelector(".lb-close").onclick=Q,A.onclick=Q,w.querySelector(".lb-prev").onclick=(q)=>{q.stopPropagation(),P(-1)},w.querySelector(".lb-next").onclick=(q)=>{q.stopPropagation(),P(1)},w.onclick=(q)=>{if(q.target===w)Q()}},W=()=>{let q=B[K];if(!q||!A||!E)return;A.style.opacity="0",E.style.opacity="0",A.src=q.dataset.full||q.currentSrc||q.src,E.innerText=Y(q),A.onload=()=>{if(A)A.style.opacity="1";if(E)E.style.opacity="1"}},P=(q)=>{if(B.length<=1)return;K=(K+q+B.length)%B.length,W()},Q=()=>{if(!w)return;w.classList.remove("open"),setTimeout(()=>{if(A)A.src=""},300)},X=()=>{if(U())return;_(),document.addEventListener("click",(q)=>{if(U())return;let H=q.target;if(H.tagName!=="IMG"||!H.matches(z.selectors))return;let R=H;if(B=Z().filter((S)=>{let $=S.currentSrc||S.src;return z.allowedExt.test($.split("?")[0])}),R.naturalWidth<z.minWidth&&R.width<z.minWidth)return;if(K=B.indexOf(R),K===-1)return;W(),w?.classList.add("open")}),document.addEventListener("keydown",(q)=>{if(!w||!w.classList.contains("open")||U())return;if(q.key==="ArrowRight")P(1);if(q.key==="ArrowLeft")P(-1);if(q.key==="Escape")Q()})};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",X);else X()})();})();
