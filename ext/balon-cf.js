(()=>{(()=>{let A=document.createElement("style");A.textContent=`
  chat-bubble-snippet {
    /* \uD83D\uDD25 FIX LAYOUT SHIFT: Keluarkan cangkang dari document flow agar tidak menggeser CSS web existing */
    position: fixed !important;
    bottom: 0;
    right: 0;
    width: 0 !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    pointer-events: none !important; /* Cangkang tidak menghalangi klik, tapi isinya (shadow dom) tetap bisa diklik */

    /* --- AREA WARNA & BRANDING --- */
    --search-snippet-primary-color: #F6821F;
    --search-snippet-primary-hover: #E06B0F;
    --search-snippet-border-radius: 14px;

    /* Warna Gelembung Chat User & AI */
    --search-snippet-user-message-bg: #F6821F !important;
    --search-snippet-user-message-text: #ffffff !important;
    --search-snippet-assistant-message-bg: #f1f3f5 !important;
    --search-snippet-assistant-message-text: #212529 !important;

    /* --- MOTION & TRANSITION (MATIKAN SEMUA SUPAYA INSTANT) --- */
    --search-snippet-transition-fast: 0s none !important;
    --search-snippet-transition: 0s none !important;
    --search-snippet-transition-slow: 0s none !important;
    --search-snippet-animation-duration: 0s !important;

    /* --- POSITIONING DEFAULT (DESKTOP) --- */
    --chat-bubble-button-bottom: calc(2rem + 36px) !important;
    --chat-bubble-button-right: 2rem !important;
    --chat-bubble-button-z-index: 9999 !important;
    --chat-bubble-button-size: 60px !important;
  }

  /* Gaya CSS Kustom untuk Elemen Salam Pembuka buatan kita */
  .layar-kosong-welcome {
    padding: 16px;
    margin: 12px;
    background-color: #f8f9fa;
    border-radius: 12px;
    border-left: 4px solid #F6821F;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #212529;
  }

  /* --- GAYA BACK TO TOP (Polosan di paling bawah) --- */
  .layar-kosong-btt {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 9999;
    font-size: 24px;
    line-height: 1; /* Diperbaiki agar tidak ada sisa ruang */
    width: 60px;
    height: 60px; /* Ditambahkan height agar sentris */
    display: flex; /* Flexbox agar emoji benar-benar di tengah */
    align-items: center;
    justify-content: center;
    text-decoration: none;
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    pointer-events: auto;
  }

  /* --- RESPONSIVE DESIGN (MOBILE MODE) --- */
  @media (max-width: 768px) {
    chat-bubble-snippet {
      --chat-bubble-button-bottom: calc(1rem + 32px) !important;
      --chat-bubble-button-right: 1rem !important;
      --chat-bubble-button-size: 48px !important;
      --chat-bubble-button-icon-size: 22px !important;
    }

    .layar-kosong-btt {
      bottom: 1rem;
      right: 1rem;
      font-size: 20px;
      width: 48px;
      height: 48px;
    }
  }
  `,document.head.appendChild(A);let G={chatPlaceholder:"Tanya sesuatu ke AI Layar Kosong...",chatTitle:" اَلسَّلَامُ عَلَيْكُمْ ",errorPrefix:"Waduh, Error:",sendButtonLabel:"Kirim"};if(!document.querySelector("chat-bubble-snippet")){let j=document.createElement("chat-bubble-snippet");j.setAttribute("api-url","https://2cfe5ad6-066d-47d5-961a-fb8f20e24705.search.ai.cloudflare.com/"),j.setAttribute("placeholder","tanya AI Layar Kosong..."),j.setAttribute("translations",JSON.stringify(G)),j.addEventListener("ready",()=>{let k=j.shadowRoot;if(!k)return;let F=k.querySelector("button")||k.querySelector(".chat-bubble-button");if(F)F.addEventListener("click",()=>{setTimeout(()=>{let x=k.querySelector(".search-snippet-messages")||k.querySelector(".chat-messages")||k.querySelector("div");if(x&&!k.querySelector(".layar-kosong-welcome")){let z=document.createElement("div");z.className="layar-kosong-welcome",z.innerHTML=`<strong style='display:block; font-family:"Noto Naskh Arabic","Amiri",serif; text-align:right; direction:rtl; font-size:1.4em; line-height:1.8;'>الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ</strong>Untuk versi penuh, silakan kunjungi <a href="https://ai.dalam.web.id" target="_blank" style="color: #F6821F; font-weight: bold; text-decoration: underline;">ai.dalam.web.id</a>.`,x.insertBefore(z,x.firstChild)}},50)})}),document.body.appendChild(j)}if(!document.querySelector(".layar-kosong-btt")){let j=document.createElement("a");j.href="#",j.className="layar-kosong-btt",j.textContent="\uD83D\uDD1D",j.addEventListener("click",(k)=>{k.preventDefault(),window.scrollTo({top:0,behavior:"smooth"})}),document.body.appendChild(j)}let q=document.createElement("script");q.type="module",q.src="https://2cfe5ad6-066d-47d5-961a-fb8f20e24705.search.ai.cloudflare.com/assets/v0.0.40/search-snippet.es.js",document.head.appendChild(q)})();})();
