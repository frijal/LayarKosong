/**
 * MARKDOWN ENHANCER v8.5 (Layar Kosong Optimized)
 * Update: Tokenization Engine + TreeWalker Radar (Zero Config)
 */

declare global {
  interface Window {
    hljs: any;
  }
}

function parseMarkdown(text: string): string {
  const tokens: string[] = [];
  let res = text;

  // 🛡️ TAHAP 1: EKSTRAKSI & PROTEKSI (Masukkan ke "Brankas" Token)
  const protect = (str: string) => {
    tokens.push(str);
    return `__MD_TOKEN_${tokens.length - 1}__`;
  };

  // 1.1 Amankan Inline Code biar karakter -- atau _ di dalamnya tidak rusak
  res = res.replace(/`([^`]+)`/g, (match, p1) => {
    // Escape HTML entities di dalam kode biar aman dari XSS
    const safeCode = p1.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return protect(`<code class="inline-code">${safeCode}</code>`);
  });

  // 1.2 Amankan Link & Image Markdown
  res = res.replace(/!\[([^\]]*)\]\((.*?)\)/g, (match, alt, url) => protect(`<img src="${url}" alt="${alt}" class="md-img">`));
  res = res.replace(/\[([^\]]+)\]\((.*?)\)/g, (match, txt, url) => protect(`<a href="${url}" target="_blank">${txt}</a>`));

  // 1.3 Amankan SEMUA Tag HTML asli biar atributnya (href, class, id) nggak dirusak Regex!
  res = res.replace(/<[^>]+>/g, protect);

  // 🪄 TAHAP 2: PARSING MARKDOWN (Sekarang sudah aman dari konflik)

  // Unescape dasar & Em-dash
  res = res.replace(/&gt;/g, ">").replace(/&lt;/g, "<");
  res = res.replace(/--/g, "&mdash;");

  // HEADING
  res = res
  .replace(/(?:^|>|\s)###### (.*?)(?=\n|<|$)/g, "<h6>$1</h6>")
  .replace(/(?:^|>|\s)##### (.*?)(?=\n|<|$)/g, "<h5>$1</h5>")
  .replace(/(?:^|>|\s)#### (.*?)(?=\n|<|$)/g, "<h4>$1</h4>")
  .replace(/(?:^|>|\s)### (.*?)(?=\n|<|$)/g, "<h3>$1</h3>")
  .replace(/(?:^|>|\s)## (.*?)(?=\n|<|$)/g, "<h2>$1</h2>")
  .replace(/(?:^|>|\s)# (.*?)(?=\n|<|$)/g, "<h1>$1</h1>");

  // BOLD, ITALIC, & STRIKETHROUGH
  res = res.replace(/(^|>|[\s(])\*\*([^\s*][^*]*[^\s*])\*\*([\s.,!?;:<()'"\/]|$)/g, "$1<strong>$2</strong>$3");
  res = res.replace(/(^|>|[\s(])__([^\s_][^_]*[^\s_])__([\s.,!?;:<()'"\/]|$)/g, "$1<strong>$2</strong>$3");
  res = res.replace(/(^|>|[\s(])\*([^\s*][^*]*[^\s*])\*([\s.,!?;:<()'"\/]|$)/g, "$1<em>$2</em>$3");
  res = res.replace(/(^|>|[\s(])_([^\s_][^_]*[^\s_])_([\s.,!?;:<()'"\/]|$)/g, "$1<em>$2</em>$3");
  res = res.replace(/(^|>|[\s(])~~([^\s~][^~]*[^\s~])~~([\s.,!?;:<()'"\/]|$)/g, "$1<del>$2</del>$3");

  // BLOCKQUOTE
  res = res.replace(/^[ \t]*>[ \t]?(.*?)[ \t]*$/gm, "<blockquote>$1</blockquote>");

  // LIST (Dengan perbaikan deteksi newline agar <ul> membungkus rapi)
  const hasRealListMarker = /^[ \t]*[-*+][ \t]+/m.test(text); // Tetap ngecek dari teks asli agar tag HTML tak terdeteksi sebagai list
  if (hasRealListMarker) {
    res = res.replace(/^[ \t]*[-*+][ \t]+(.*?)[ \t]*$/gm, "<li>$1</li>");

    // Perbaikan Wrapper List: Menoleransi whitespace (spasi/enter) di antara tag <li>
    res = res.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => `<ul>${match}</ul>`);

    // Gabungkan <ul> yang berdampingan agar menjadi satu list utuh
    res = res.replace(/<\/ul>\s*<ul>/g, "\n");
  }

  // 🔄 TAHAP 3: RESTORASI (Keluarkan dari "Brankas")
  // Dilakukan dari urutan terbalik untuk menghindari bentrok index ganda
  for (let i = tokens.length - 1; i >= 0; i--) {
    res = res.replace(`__MD_TOKEN_${i}__`, tokens[i]);
  }

  return res;
}

function enhanceMarkdown(): void {
  // 1. Brankas target elemen yang butuh di-parse
  const targets = new Set<HTMLElement>();

  // 📡 2. RADAR: Menyapu SEMUA teks di layar tanpa peduli apa nama class/tag-nya
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue || "";

    // Cek jika teks ini mengandung indikator Markdown (Asterisk, Hash, List, Quote, dll)
    if (/[\*\#_\[\]`~\-]/.test(text) || /^[ \t]*>/m.test(text)) {
      const parent = node.parentElement;

      // Filter Ketat: Pastikan parent bukan tag haram, bukan body langsung, dan belum pernah di-render
      if (
        parent &&
        parent.tagName !== 'BODY' &&
        !['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'NOSCRIPT'].includes(parent.tagName) &&
        !parent.closest('.no-md') &&
        !parent.classList.contains('rendered')
      ) {
        targets.add(parent);
      }
    }
  }

  // 🛠️ 3. EKSEKUSI PARSING
  targets.forEach((target) => {
    // Pengamanan ekstra: Kalau elemen ini sudah hilang dari DOM (karena re-render parent), lewati
    if (!document.body.contains(target) || target.classList.contains("rendered")) return;

    const originalHTML = target.innerHTML;
    const rawContent = originalHTML.trim();

    const newHTML = parseMarkdown(rawContent);

    // Jika ada perubahan, aplikasikan dan tandai biar efisien
    if (newHTML !== originalHTML) {
      target.innerHTML = newHTML;
      target.classList.add("rendered");
    }
  });
}

function checkAndLoadHighlight(): void {
  const hasCode = document.querySelector("pre code");
  if (!hasCode || !window.hljs) return;

  document.querySelectorAll("pre code").forEach((block) => {
    const el = block as HTMLElement;
    // Cegah error re-highlighting dari highlight.js
    if (!el.classList.contains('hljs') && !el.dataset.highlighted) {
      window.hljs.highlightElement(el);
    }
  });
}

// ⏱️ Debounce untuk membatasi spam eksekusi MutationObserver
let observerTimeout: ReturnType<typeof setTimeout>;

function start(): void {
  enhanceMarkdown();
  checkAndLoadHighlight();

  const observer = new MutationObserver(() => {
    clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
      window.requestAnimationFrame(() => {
        enhanceMarkdown();
        checkAndLoadHighlight();
      });
    }, 50); // Jeda 50ms (sangat ringan di CPU)
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// 🚀 Boot sequence
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
