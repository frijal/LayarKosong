/**
 * MARKDOWN ENHANCER v7.3 (Layar Kosong Optimized)
 * Fokus: Ringan, Aman untuk Minified HTML, Proteksi URL Google Content.
 */

// Definisi tipe agar TypeScript tidak komplain
declare global {
  interface Window {
    hljs: any;
  }
}

function parseMarkdown(text: string): string {
  // 1. Unescape awal agar karakter > dan < bisa diproses sebagai pembatas (boundary)
  let res = text.replace(/&gt;/g, ">").replace(/&lt;/g, "<");

  // 2. PROTEKSI URL: Proses Image & Link duluan agar URL tidak tersentuh regex Bold/Italic
  res = res
  .replace(/!\[([^\]]*)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="md-img">')
  .replace(/\[([^\]]+)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
  .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // 3. HEADING: Deteksi # dengan pembatas (^) atau (>) atau spasi (\s)
  res = res
  .replace(/(?:^|>|\s)###### (.*?)(?=\n|<|$)/g, "<h6>$1</h6>")
  .replace(/(?:^|>|\s)##### (.*?)(?=\n|<|$)/g, "<h5>$1</h5>")
  .replace(/(?:^|>|\s)#### (.*?)(?=\n|<|$)/g, "<h4>$1</h4>")
  .replace(/(?:^|>|\s)### (.*?)(?=\n|<|$)/g, "<h3>$1</h3>")
  .replace(/(?:^|>|\s)## (.*?)(?=\n|<|$)/g, "<h2>$1</h2>")
  .replace(/(?:^|>|\s)# (.*?)(?=\n|<|$)/g, "<h1>$1</h1>");

  // 4. BOLD, ITALIC, & STRIKETHROUGH (v7.3 Boundary Logic)
  // Boundary Awal: (^|>|\s) -> awal baris, setelah tag, atau spasi
  // Boundary Akhir: ([\s.,!?;:<]|$) -> spasi, tanda baca, tag pembuka, atau akhir baris

  // Bold (**) & (__)
  res = res.replace(/(^|>|\s)\*\*([^\s*][^*]*[^\s*])\*\*([\s.,!?;:<]|$)/g, "$1<strong>$2</strong>$3");
  res = res.replace(/(^|>|\s)__([^\s_][^_]*[^\s_])__([\s.,!?;:<]|$)/g, "$1<strong>$2</strong>$3");

  // Italic (*) & (_) -> Kunci keamanan URL Blogger ada di sini
  res = res.replace(/(^|>|\s)\*([^\s*][^*]*[^\s*])\*([\s.,!?;:<]|$)/g, "$1<em>$2</em>$3");
  res = res.replace(/(^|>|\s)_([^\s_][^_]*[^\s_])_([\s.,!?;:<]|$)/g, "$1<em>$2</em>$3");

  // Strikethrough (~~)
  res = res.replace(/(^|>|\s)~~([^\s~][^~]*[^\s~])~~([\s.,!?;:<]|$)/g, "$1<del>$2</del>$3");

  // 5. LIST & QUOTE
  res = res
  .replace(/(?:^|>)\s*>\s?(.*?)(?=\n|<|$)/g, "<blockquote>$1</blockquote>")
  .replace(/(?:^|>)\s*[-*+]\s+(.*?)(?=\n|<|$)/g, "<li>$1</li>");

  // Auto wrap <li> ke dalam <ul>
  return res.replace(/(<li>.*?<\/li>)/g, "<ul>$1</ul>").replace(/<\/ul><ul>/g, "");

  // --- FITUR BARU: TIPOGRAFI EM-DASH ---
  // Mengubah " -- " atau "--" menjadi em-dash (—)
  // Kita gunakan &mdash; agar aman saat minifikasi HTML
  res = res.replace(/--/g, "&mdash;");
}

function enhanceMarkdown(): void {
  // Daftar selector elemen yang boleh di-render Markdown-nya
  const selector = "p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, footer, .alert, .alert-box, .article-container, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .danger-box, .disclaimer, .fa-solid, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .markdown-body, .meta, .meta-info, .narasi, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";

  const targets = document.querySelectorAll(selector);

  targets.forEach((el) => {
    const target = el as HTMLElement;
    // Skip jika sudah di-render atau ditandai no-md
    if (target.classList.contains("no-md") || target.classList.contains("rendered")) return;

    const originalHTML = target.innerHTML;
    const rawContent = originalHTML.trim();

    // Hanya proses jika mengandung karakter pemicu Markdown
    if (/[\*\#_\[\]`~]/.test(rawContent)) {
      const newHTML = parseMarkdown(rawContent);
      if (newHTML !== originalHTML) {
        target.classList.add("rendered");
        target.innerHTML = newHTML;
      }
    }
  });
}

// Fungsi Highlight.js (Opsional jika kamu pakai highlight.js)
function checkAndLoadHighlight(): void {
  const hasCode = document.querySelector("pre code");
  if (!hasCode || !window.hljs) return;

  document.querySelectorAll("pre code").forEach((block) => {
    window.hljs.highlightElement(block as HTMLElement);
  });
}

function start(): void {
  enhanceMarkdown();
  checkAndLoadHighlight();

  // Pantau perubahan DOM (AJAX/Infinite Scroll)
  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => {
      enhanceMarkdown();
      checkAndLoadHighlight();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Eksekusi saat DOM siap
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
