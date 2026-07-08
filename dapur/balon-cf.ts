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
    /* Bubble sekarang kita dorong ke atas sejauh tinggi emoji BTT (24px) + gap (12px) */
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
    bottom: 2rem; /* Mengambil alih posisi lama bubble di dasar layar */
    right: 2rem;
    z-index: 9999;
    font-size: 24px;
    line-height: 24px;
    width: 60px; /* Disamakan dengan ukuran bubble agar rata tengah sempurna */
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
  }

  /* --- RESPONSIVE DESIGN (MOBILE MODE) --- */
  @media (max-width: 768px) {
    chat-bubble-snippet {
      /* Bubble mobile didorong ke atas: tinggi emoji BTT (20px) + gap (12px) */
      --chat-bubble-button-bottom: calc(1rem + 32px) !important;
      --chat-bubble-button-right: 1rem !important;
      --chat-bubble-button-size: 48px !important;
      --chat-bubble-button-icon-size: 22px !important;
    }

    .layar-kosong-btt {
      bottom: 1rem; /* BTT mobile menempel di dasar layar */
      right: 1rem;
      font-size: 20px;
      line-height: 20px;
      width: 48px; /* Disamakan dengan ukuran bubble mobile */
    }
  }
  `;
  document.head.appendChild(style);

  // 2. Setup Lokalisasi Bahasa Indonesia (Gunakan kunci yang valid untuk Bubble)
  interface ChatTranslations {
    chatPlaceholder: string;
    chatTitle: string;
    errorPrefix: string;
    sendButtonLabel: string;
  }

  const idTranslations: ChatTranslations = {
    chatPlaceholder: "Tanya sesuatu ke AI Layar Kosong...",
    chatTitle: " اَلسَّلَامُ عَلَيْكُمْ ",
    errorPrefix: "Waduh, Error:",
    sendButtonLabel: "Kirim"
  };

  // 3. Suntikkan Komponen Chat Bubble ke Body
  if (!document.querySelector('chat-bubble-snippet')) {
    const chatBubble: HTMLElement = document.createElement('chat-bubble-snippet');
    chatBubble.setAttribute('api-url', 'https://2cfe5ad6-066d-47d5-961a-fb8f20e24705.search.ai.cloudflare.com/');
    chatBubble.setAttribute('placeholder', 'tanya AI Layar Kosong...');
    chatBubble.setAttribute('translations', JSON.stringify(idTranslations));

    // Trik Pemantau Jendela Terbuka untuk Menyisipkan Salam Pembuka
    chatBubble.addEventListener('ready', () => {
      const shadow = chatBubble.shadowRoot;
      if (!shadow) return;

      const bubbleButton = shadow.querySelector('button') || shadow.querySelector('.chat-bubble-button');

      if (bubbleButton) {
        bubbleButton.addEventListener('click', () => {
          setTimeout(() => {
            const messageContainer = shadow.querySelector('.search-snippet-messages') || shadow.querySelector('.chat-messages') || shadow.querySelector('div');

            if (messageContainer && !shadow.querySelector('.layar-kosong-welcome')) {
              const welcomeDiv = document.createElement('div');
              welcomeDiv.className = 'layar-kosong-welcome';
              welcomeDiv.innerHTML = '<strong style=\'display:block; font-family:"Noto Naskh Arabic","Amiri",serif; text-align:right; direction:rtl; font-size:1.4em; line-height:1.8;\'>الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ</strong>Untuk versi penuh, silakan kunjungi <a href="https://ai.dalam.web.id" target="_blank" style="color: #F6821F; font-weight: bold; text-decoration: underline;">ai.dalam.web.id</a>.';

              messageContainer.insertBefore(welcomeDiv, messageContainer.firstChild);
            }
          }, 50);
        });
      }
    });

    document.body.appendChild(chatBubble);
  }

  // 4. Suntikkan Tombol Back to Top (Sekarang ditaruh di bawah bubble)
  if (!document.querySelector('.layar-kosong-btt')) {
    const bttButton = document.createElement('a');
    bttButton.href = '#';
    bttButton.className = 'layar-kosong-btt';
bttButton.textContent = '🔝';

// Smooth scroll ketika diklik
bttButton.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.body.appendChild(bttButton);
  }

  // 5. Load Library Core ES Module Cloudflare
  const coreScript: HTMLScriptElement = document.createElement('script');
  coreScript.type = 'module';
  coreScript.src = 'https://2cfe5ad6-066d-47d5-961a-fb8f20e24705.search.ai.cloudflare.com/assets/v0.0.40/search-snippet.es.js';
  document.head.appendChild(coreScript);
})();
