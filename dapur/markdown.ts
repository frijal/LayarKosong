/**
 * MARKDOWN ENHANCER v9.0 (Layar Kosong Optimized - Marked.js Edition)
 * Melindungi URL, mendukung Nested Formatting, & Radar TreeWalker Zero Config
 */

declare global {
  interface Window {
    hljs: any;
    marked: any;
  }
}

// ⚙️ Konfigurasi awal Marked.js agar terintegrasi dengan standar blogmu
if (window.marked) {
  window.marked.setOptions({
    gfm: true,         // Aktifkan GitHub Flavored Markdown (standar industri)
  breaks: true,      // Mengubah single newline menjadi <br>
  pedantic: false,
  smartLists: true,  // Mengoptimalkan susunan list/bullet
  smartypants: true  // Mengubah kutip biasa jadi curly quotes yang lebih estetik
  });
}

function parseMarkdown(text: string, isBlockElement: boolean): string {
  if (!window.marked) {
    console.warn("⚠️ Library marked.min.js belum termuat.");
    return text; // Fallback: kembalikan teks asli kalau library gagal diload
  }

  // Support Em-dash bawaan Layar Kosong
  let processedText = text.replace(/--/g, "&mdash;");

  // 🛣️ Jalur Pintas:
  // Kalau elemennya udah berupa blok spesifik kayak <p> atau <li>, pakai parseInline
  // biar marked.js nggak iseng mbungkus ulang pakai tag <p> baru.
  if (isBlockElement) {
    return window.marked.parse(processedText);
  } else {
    return window.marked.parseInline(processedText);
  }
}

function enhanceMarkdown(): void {
  // 1. Tempat penampungan elemen yang terdeteksi
  const targets = new Set<HTMLElement>();

  // 📡 2. RADAR: Menyapu teks murni di layar tanpa peduli class/tag HTML-nya
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue || "";

    // Cek apakah teks ini mengandung indikator Markdown (termasuk bintang, hashtag, quote)
    if (/[\*\#_\[\]`~\-]/.test(text) || /^[ \t]*>/m.test(text)) {
      const parent = node.parentElement;

      // Filter Ketat: Pastikan bukan area haram dan belum pernah di-render
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
    // Pengamanan ganda kalau elemen sudah hilang/terubah dari DOM
    if (!document.body.contains(target) || target.classList.contains("rendered")) return;

    const originalHTML = target.innerHTML;
    const rawContent = originalHTML.trim();

    // Deteksi apakah elemen ini adalah Block Element asli atau teks biasa
    const blockTags = ['DIV', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'MAIN', 'TD', 'TH'];
    const hasBlockStructure = /^[ \t]*([#>-]|\d+\.)/m.test(rawContent);
    const isBlock = blockTags.includes(target.tagName) || hasBlockStructure;

    // Serahkan mandat ke Marked.js!
    const newHTML = parseMarkdown(rawContent, isBlock);

    if (newHTML !== originalHTML) {
      target.innerHTML = newHTML;
      target.classList.add("rendered"); // Tandai biar radar nggak bolak-balik ngecek
    }
  });
}

function checkAndLoadHighlight(): void {
  const hasCode = document.querySelector("pre code");
  if (!hasCode || !window.hljs) return;

  document.querySelectorAll("pre code").forEach((block) => {
    const el = block as HTMLElement;
    // Cegah highlight.js merender ulang blok yang sama
    if (!el.classList.contains('hljs') && !el.dataset.highlighted) {
      window.hljs.highlightElement(el);
    }
  });
}

// ⏱️ Debounce MutationObserver agar browser tetap mulus
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
    }, 50);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
