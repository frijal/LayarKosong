(()=>{(()=>{let k=document.createElement("style");k.textContent=`
  chat-bubble-snippet {
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
    --chat-bubble-button-bottom: 2rem !important;
    --chat-bubble-button-right: 2rem !important;
    --chat-bubble-button-z-index: 9999 !important;
    --chat-bubble-button-size: 60px !important;
  }

  /* --- RESPONSIVE DESIGN (MOBILE MODE) --- */
  @media (max-width: 768px) {
    chat-bubble-snippet {
      --chat-bubble-button-bottom: 1rem !important;
      --chat-bubble-button-right: 1rem !important;
      --chat-bubble-button-size: 48px !important;
      --chat-bubble-button-icon-size: 22px !important;
    }
  }
  `,document.head.appendChild(k);let m={chatPlaceholder:"Tanya sesuatu ke AI Layar Kosong...",chatTitle:"Asisten AI",chatEmptyTitle:"اَلسَّلَامُ عَلَيْكُمْ",chatEmptyDescription:'Untuk versi penuh, silakan kunjungi <a href="https://ai.dalam.web.id" target="_blank" style="color: #F6821F; font-weight: bold; text-decoration: underline;">ai.dalam.web.id</a>.',errorPrefix:"Waduh, Error:",sendButtonLabel:"Kirim"};if(!document.querySelector("chat-bubble-snippet")){let g=document.createElement("chat-bubble-snippet");g.setAttribute("api-url","https://2cfe5ad6-066d-47d5-961a-fb8f20e24705.search.ai.cloudflare.com/"),g.setAttribute("placeholder","Tanya AI Layar Kosong..."),g.setAttribute("translations",JSON.stringify(m)),document.body.appendChild(g)}let j=document.createElement("script");j.type="module",j.src="https://2cfe5ad6-066d-47d5-961a-fb8f20e24705.search.ai.cloudflare.com/assets/v0.0.40/search-snippet.es.js",document.head.appendChild(j)})();})();
