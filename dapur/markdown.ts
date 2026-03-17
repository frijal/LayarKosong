import { marked } from 'marked';

/**
 * MARKDOWN ENHANCER v5.3 (Universal Logic)
 * Perbaikan: Mendukung elemen semantik dan pembersihan tag p hasil minify.
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
  // Ditambahkan 'main', 'article', 'section' agar struktur HTML baru tercover
  const selector = "li, p, main, article, section, .markdown-body, .article-container, .narasi, .language-markdown, .alert, .alert-box, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .container, .danger-box, .disclaimer, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .meta, .meta-info, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  const targets = document.querySelectorAll(selector);

  targets.forEach((container) => {
    const el = container as HTMLElement;

    if (el.classList.contains("no-md") || el.classList.contains("rendered")) return;

    // Proteksi: Jika kontainer besar (main/article) punya section di dalamnya,
    // biarkan section saja yang dirender agar tidak double.
    if ((el.tagName === 'MAIN' || el.tagName === 'ARTICLE') && el.querySelector('section')) return;

    // Bersihkan konten: Ubah &gt; jadi > dan buang tag <p> liar akibat minify
    let rawContent = el.innerHTML
    .replace(/&gt;/g, '>')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    .trim();

    // Cek apakah ada tanda Markdown
    const hasMarkdown = /[\*\#\_\[\]]/.test(rawContent);

    if (rawContent && hasMarkdown) {
      el.innerHTML = marked.parse(rawContent);
      el.classList.add('rendered');
    }
  });
}

// Inisialisasi aman
function run() {
  setupMarked();
  enhanceMarkdown();

  // Observer untuk jaga-jaga jika ada konten yang dimuat via AJAX/Data Provider
  const observer = new MutationObserver(() => {
    enhanceMarkdown();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Pastikan skrip berjalan baik saat defer maupun normal
if (document.readyState === "complete" || document.readyState === "interactive") {
  run();
} else {
  document.addEventListener("DOMContentLoaded", run);
}
