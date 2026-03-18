/**
 * MARKDOWN ENHANCER v7.1 (Bun Build Optimized)
 * Fokus: Ringan, Tanpa Library, Aman untuk Minified HTML.
 */

// Menambahkan definisi tipe untuk highlight.js agar TS tidak error
declare global {
  interface Window {
    hljs: any;
  }
}

function parseMarkdown(text: string): string {
  let res = text.replace(/&gt;/g, ">");

  // 1. HEADERS (Minified-Safe)
  // Mencari '#' yang didahului oleh awal string ATAU penutup tag HTML '>' ATAU spasi
  res = res.replace(/(?:^|>|\s)(#+)\s+(.*?)(?=\n|<|$)/g, (match, hashes, title) => {
    const lvl = hashes.length;
    return `<h${lvl}>${title}</h${lvl}>`;
  });

  // 2. BLOCKQUOTE (Nested & Minified-Safe)
  // Mencari '>' yang didahului oleh penutup tag atau spasi, tapi bukan bagian dari tag HTML
  res = res.replace(/(?:^|>|\s)>\s?(.*?)(?=\n|<|$)/g, "<blockquote>$1</blockquote>");

  // 3. LIST ITEMS
  res = res.replace(/(?:^|>|\s)[-*+]\s+(.*?)(?=\n|<|$)/g, "<li>$1</li>");

  // 4. INLINE FORMATTING (Bold, Italic, Code)
  res = res
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // 5. LINKS & IMAGES
  res = res
    .replace(/!\[([^\]]*)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="md-img">')
    .replace(/\[([^\]]+)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

  // 6. AUTO-WRAPPER & CLEANUP
  // Gabungkan <li> yang berurutan ke dalam <ul>
  res = res.replace(/(<li>.*?<\/li>)/g, "<ul>$1</ul>").replace(/<\/ul><ul>/g, "");
  // Gabungkan <blockquote> yang berurutan
  res = res.replace(/<\/blockquote><blockquote>/g, "<br>");

  return res;
}

function enhanceMarkdown(): void {
  const selector = "p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, footer, .alert, .alert-box, .article-container, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .danger-box, .disclaimer, .fa-solid, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .markdown-body, .meta, .meta-info, .narasi, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  const targets = document.querySelectorAll(selector);

  targets.forEach((el) => {
    const target = el as HTMLElement;
    if (target.classList.contains("no-md") || target.classList.contains("rendered")) return;

    const originalHTML = target.innerHTML;
    const rawContent = originalHTML.trim();
    const hasMarkdown = /[\*\#_\[\]`]/.test(rawContent);

    if (rawContent && hasMarkdown) {
      target.classList.add("rendered");
      const newHTML = parseMarkdown(rawContent);
      if (newHTML !== originalHTML) {
        target.innerHTML = newHTML;
      }
    }
  });
}

function checkAndLoadHighlight(): void {
  // TINGKAT 1: Cek apakah ada kebutuhan (elemen <pre><code>)
  const hasCode = document.querySelector("pre code");
  if (!hasCode) return;

  // TINGKAT 2: Tentukan tema berdasarkan preferensi user
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = prefersDark ? "github-dark.min.css" : "github.min.css";
  const themeHref = `/ext/${theme}`;

  // TINGKAT 3: Cek ketersediaan aset (Native Check)
  const hasJS = Array.from(document.scripts).some(s => s.src && s.src.includes("/ext/highlight.js"));
  const hasCSS = !!document.querySelector(`link[href*="${theme}"]`);

  // TINGKAT 4: Inject hanya jika ada yang kurang (Lazy Inject)
  if (!hasJS || !hasCSS) {
    // Inject Script jika belum ada
    if (!hasJS) {
      const script = document.createElement("script");
      script.src = "/ext/highlight.js";
      script.defer = true;
      script.onload = () => {
        if (window.hljs) {
          document.querySelectorAll("pre code").forEach((block) => {
            window.hljs.highlightElement(block as HTMLElement);
          });
        }
      };
      document.head.appendChild(script);
    } else {
      // Jika JS sudah ada tapi CSS yang hilang, langsung trigger highlight
      if (window.hljs) {
        document.querySelectorAll("pre code").forEach((block) => {
          window.hljs.highlightElement(block as HTMLElement);
        });
      }
    }

    // Inject CSS jika belum ada
    if (!hasCSS) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = themeHref;
      document.head.appendChild(link);
    }
  }
}



function start(): void {
  enhanceMarkdown();

  // Pantau perubahan DOM (misal artikel baru muncul via AJAX)
  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => {
      enhanceMarkdown();
      checkAndLoadHighlight();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Jalankan pengecekan awal
  checkAndLoadHighlight();

  // Pantau perubahan tema OS
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    // Jika tema berubah, kita jalankan lagi pengecekan untuk swap CSS tema
    checkAndLoadHighlight();
  });
}

// Inisialisasi
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
