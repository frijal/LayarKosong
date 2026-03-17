import { marked } from 'marked';

/**
 * MARKDOWN ENHANCER v5.2 (Universal Support)
 * Mempertahankan semua selector lama + Dukungan Semantic HTML (main, article, section)
 */

function setupMarked() {
  const renderer = new marked.Renderer();

  // Custom Renderer untuk Tabel agar mendukung Card-Mode (data-label)
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

    return `
    <div class="dns-table-container">
    <table class="dns-card-mode">
    <thead>${header}</thead>
    <tbody>${bodyHtml}</tbody>
    </table>
    </div>`;
  };

  marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: true
  });
}

function enhanceMarkdown() {
  // Seluruh selector lama dipertahankan + Penambahan elemen semantik di awal
  const selector = "main, article, section, .meta, .markdown-body, .article-container, .narasi, .language-markdown, .alert, .alert-box, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .container, .danger-box, .disclaimer, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .meta-info, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  const targets = document.querySelectorAll(selector);

  targets.forEach((container) => {
    const el = container as HTMLElement;

    // 1. Skip jika sudah dirender atau dilarang
    if (el.classList.contains("no-md") || el.classList.contains("rendered")) return;

    // 2. Proteksi Double-Rendering:
    // Jika elemen ini adalah pembungkus (seperti article) yang di dalamnya ada section yang akan dirender,
    // maka kita biarkan section-nya saja yang memproses agar konten tidak muncul dua kali.
    if ((el.tagName === 'ARTICLE' || el.tagName === 'MAIN') && el.querySelector('section')) {
      return;
    }

    // 3. Proteksi PRE/Code
    if (el.tagName === 'PRE' && el.querySelector('code[class*="language-"]')) return;

    // 4. Ambil konten dan bersihkan
    let rawContent = el.innerHTML
    .replace(/&gt;/g, '>')
    .replace(/<p>/g, '')  // Hapus tag p bawaan agar tidak konflik
    .replace(/<\/p>/g, '\n')
    .trim();

    // 5. Smart Check: Hanya render jika mengandung karakter Markdown
    const hasMarkdown = /[\*\#\_\[\]]/.test(rawContent);

    if (rawContent && hasMarkdown) {
      el.innerHTML = marked.parse(rawContent);
      el.classList.add('rendered');
    }
  });
}

let renderTimeout: any;
const observer = new MutationObserver((mutations) => {
  if (mutations.some(m => m.addedNodes.length > 0)) {
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(enhanceMarkdown, 250);
  }
});

function run() {
  setupMarked();
  enhanceMarkdown();
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
