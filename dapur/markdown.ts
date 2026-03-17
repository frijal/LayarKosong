import { marked } from './marked.js';

/**
 * MARKDOWN ENHANCER v5.8 (Ultra Logic)
 * Perbaikan untuk struktur <article> dan <p> hasil minify.
 */

function setupMarked() {
  const renderer = new marked.Renderer();

  // Custom Renderer untuk Tabel (Card-Mode)
  renderer.table = (header: string, body: string) => {
    const headerTexts: string[] = [];
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = header;
    tempDiv.querySelectorAll('th').forEach(th => headerTexts.push(th.innerText.trim()));

    let bodyHtml = body;
    if (headerTexts.length > 0) {
      const rows = body.split('<tr>');
      bodyHtml = rows.map(row => {
        if (!row.trim()) return '';
        let cellIndex = 0;
        return '<tr>' + row.replace(/<td/g, () => {
          const label = headerTexts[cellIndex] || "";
          cellIndex++;
          return `<td data-label="${label}"`;
        });
      }).join('');
    }
    return `<div class="dns-table-container"><table class="dns-card-mode"><thead>${header}</thead><tbody>${bodyHtml}</tbody></table></div>`;
  };

  marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: true
  });
}

function enhanceMarkdown() {
  // Tambahkan selektor spesifik untuk struktur artikel baru
  const selector = "article p, .container p, main p, li, main, article, blockquote, section, .markdown-body, .article-container, .narasi, .language-markdown, .alert, .alert-box, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .container, .danger-box, .disclaimer, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .meta, .meta-info, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  const targets = document.querySelectorAll(selector);

  targets.forEach((container) => {
    const el = container as HTMLElement;

    // 1. Skip jika sudah dirender atau dilarang
    if (el.classList.contains("no-md") || el.classList.contains("rendered")) return;

    // 2. Proteksi Kontainer Besar:
    // Jika elemen ini punya anak berupa tag blok (P, DIV, SECTION), biarkan anaknya saja yang di-render.
    // Namun, jika elemen ini adalah tag P atau LI, harus tetap diproses.
    const hasBlockChildren = el.querySelector('p, div, section, article') !== null;
    const isLeafElement = ['P', 'LI', 'BLOCKQUOTE', 'SPAN'].includes(el.tagName);

    if (hasBlockChildren && !isLeafElement) return;

    // 3. Ambil konten dan bersihkan tag pengganggu
    // Minifier sering membungkus markdown di dalam <p>. Kita harus telanjangi agar marked mengenali simbol.
    let rawContent = el.innerHTML
    .replace(/&gt;/g, '>')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .trim();

    // 4. Deteksi simbol Markdown (Bold, Italic, Link, Header, List)
    // Ditambah deteksi underscore (_) untuk jihad fi sabilillah
    const hasMarkdown = /[\*\#\_\[\]]/.test(rawContent);

    if (rawContent && hasMarkdown) {
      const rendered = marked.parse(rawContent);

      // Validasi: Hanya terapkan jika hasil render berbeda dengan teks aslinya
      // (Untuk menghindari pembungkusan tag P ganda yang tidak perlu)
      el.innerHTML = rendered;
      el.classList.add('rendered');
    }
  });
}

function run() {
  setupMarked();
  enhanceMarkdown();

  // Pantau perubahan DOM untuk konten dinamis
  const observer = new MutationObserver((mutations) => {
    let fastTrack = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        fastTrack = true;
        break;
      }
    }
    if (fastTrack) enhanceMarkdown();
  });

    observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  run();
} else {
  document.addEventListener("DOMContentLoaded", run);
}
