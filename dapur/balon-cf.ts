(() => {
  // 1. Injeksi Kustomisasi Gaya Dinamis, Warna, dan Mematikan Animasi (Instant UI)
  const style: HTMLStyleElement = document.createElement('style');
  style.textContent = `
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
  `;
  document.head.appendChild(style);

  // 2. Setup Lokalisasi Bahasa Indonesia (Translations)
  interface ChatTranslations {
    chatPlaceholder: string;
    chatTitle: string;
    chatEmptyTitle: string;
    chatEmptyDescription: string;
    errorPrefix: string;
    sendButtonLabel: string;
  }

  const idTranslations: ChatTranslations = {
    chatPlaceholder: "Tanya sesuatu ke AI Layar Kosong...",
    chatTitle: "Asisten AI",
    chatEmptyTitle: "Mulai Percakapan",
    chatEmptyDescription: "Kirim pesan untuk mulai mengobrol dengan AI!",
    errorPrefix: "Waduh, Error:",
    sendButtonLabel: "Kirim"
  };

  // 3. Suntikkan Komponen Chat Bubble ke Body
  if (!document.querySelector('chat-bubble-snippet')) {
    const chatBubble: HTMLElement = document.createElement('chat-bubble-snippet');
    chatBubble.setAttribute('api-url', 'https://2cfe5ad6-066d-47d5-961a-fb8f20e24705.search.ai.cloudflare.com/');
    chatBubble.setAttribute('placeholder', 'Tanya AI Layar Kosong...');
    //chatBubble.setAttribute('hide-branding', 'true');
    chatBubble.setAttribute('translations', JSON.stringify(idTranslations));
    document.body.appendChild(chatBubble);
  }

  // 4. Load Library Core ES Module Cloudflare (Versi v0.0.40 yang Valid)
  const coreScript: HTMLScriptElement = document.createElement('script');
  coreScript.type = 'module';
  coreScript.src = 'https://2cfe5ad6-066d-47d5-961a-fb8f20e24705.search.ai.cloudflare.com/assets/v0.0.40/search-snippet.es.js';
  document.head.appendChild(coreScript);
})();
