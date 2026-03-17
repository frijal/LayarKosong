import { marked } from 'marked';

/**
 * MARKDOWN ENHANCER v5.4 (Ultra Compatibility)
 * Mendukung: Semantic HTML, Blockquote dengan tag P, dan Selector lama.
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
  // Tambahkan 'blockquote' ke dalam daftar selector
  const selector = "li, main, article, blockquote, section, .markdown-body, .article-container, .narasi, .language-markdown, .alert, .alert-box, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .container, .danger-box, .disclaimer, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .meta, .meta-info, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  const targets = document.querySelectorAll(selector);

  targets.forEach((container) => {
    const el = container as HTMLElement;

    if (el.classList.contains("no-md") || el.classList.contains("rendered")) return;

    // Proteksi: Jangan render container besar jika dalamnya sudah ada yang di-render
    if ((el.tagName === 'MAIN' || el.tagName === 'ARTICLE') && el.querySelector('.rendered')) return;

    // AMBIL TEKS: Buang semua tag HTML di dalam (seperti <p>) agar Marked bisa bekerja pada teks murni
    let rawContent = el.innerHTML
    .replace(/&gt;/g, '>')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n') // Ubah <br> jadi newline
    .trim();

    // Cek apakah ada tanda Markdown (Bold, List, Header, dsb)
    const hasMarkdown = /[\*\#\_\[\]]/.test(rawContent);

    if (rawContent && hasMarkdown) {
      // Jika ini blockquote, kita pastikan hasilnya tetap terbungkus gaya blockquote
      const rendered = marked.parse(rawContent);

      el.innerHTML = rendered;
      el.classList.add('rendered');
    }
  });
}

function run() {
  setupMarked();
  enhanceMarkdown();

  const observer = new MutationObserver(() => {
    enhanceMarkdown();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  run();
} else {
  document.addEventListener("DOMContentLoaded", run);
}
