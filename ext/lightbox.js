document.addEventListener("DOMContentLoaded",()=>{let w={selectors:"article img, main img, .albumlb img, .gallery img, .artikel-gambar img",minWidth:50,allowedExt:/\.(jpe?g|png|webp|avif)$/i,id:"auto-lightbox"},B=[],H=0,q,Q,T=()=>{let j=document.querySelectorAll(w.selectors);B=Array.from(j).filter((z)=>{let V=z.naturalWidth>=w.minWidth||z.width>=w.minWidth,X=z.src.split("?")[0];return V&&w.allowedExt.test(X)}),B.forEach((z)=>z.style.cursor="zoom-in")},U=()=>{if(document.getElementById(w.id))return;q=document.createElement("div"),q.id=w.id,q.innerHTML=`
    <style>
    #${w.id} { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: none; align-items: center; justify-content: center; z-index: 100000; transition: opacity 0.3s; opacity: 0; }
    #${w.id}.open { display: flex; opacity: 1; }
    .lb-img { max-width: 95vw; max-height: 90vh; object-fit: contain; border-radius: 4px; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
    .lb-close { position: absolute; top: 20px; right: 25px; font-size: 35px; color: #fff; cursor: pointer; background: none; border: none; }
    .lb-nav { position: absolute; width: 100%; display: flex; justify-content: space-between; padding: 0 20px; pointer-events: none; }
    .lb-btn { pointer-events: auto; background: rgba(255,255,255,0.1); color: #fff; border: none; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; font-size: 20px; transition: 0.2s; }
    .lb-btn:hover { background: rgba(255,255,255,0.2); }
    </style>
    <button class="lb-close" aria-label="Close">&times;</button>
    <img class="lb-img" src="" alt="Lightbox">
    <div class="lb-nav">
    <button class="lb-btn lb-prev" aria-label="Previous">&#9664;</button>
    <button class="lb-btn lb-next" aria-label="Next">&#9654;</button>
    </div>
    `,document.body.appendChild(q),Q=q.querySelector(".lb-img"),q.querySelector(".lb-close").onclick=M,q.querySelector(".lb-prev").onclick=(j)=>{j.stopPropagation(),J(-1)},q.querySelector(".lb-next").onclick=(j)=>{j.stopPropagation(),J(1)},q.onclick=(j)=>{if(j.target===q)M()}},R=()=>{let j=B[H];if(!j)return;Q.src=j.dataset.full||j.src},J=(j)=>{H=(H+j+B.length)%B.length,R()},M=()=>q.classList.remove("open");if(T(),B.length<1)return;U(),document.body.addEventListener("click",(j)=>{let z=j.target.closest(w.selectors);if(z&&B.includes(z))H=B.indexOf(z),R(),q.classList.add("open")}),document.addEventListener("keydown",(j)=>{if(!q.classList.contains("open"))return;if(j.key==="ArrowRight")J(1);if(j.key==="ArrowLeft")J(-1);if(j.key==="Escape")M()})});
