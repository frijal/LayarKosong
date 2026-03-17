import { marked } from 'marked';

/**
 * MARKDOWN ENHANCER v5.0 (Marked Engine Optimized)
 * Menggunakan Marked untuk parsing, tapi tetap mempertahankan Card-Mode Table.
 */

function setupMarked() {
  // Karena kita mem-bundle dengan Bun, 'marked' sudah pasti tersedia dari import di atas
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
  const selector = ".markdown-body, .article-container, .narasi, .language-markdown, .alert, .alert-box, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .container, .danger-box, .disclaimer, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .meta, .meta-info, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  const targets = document.querySelectorAll(selector);

  targets.forEach((container) => {
    const el = container as HTMLElement;
    if (el.classList.contains("no-md") || el.classList.contains("rendered")) return;

    if (el.tagName === 'PRE' && el.querySelector('code[class*="language-"]')) return;

    const rawContent = el.innerHTML
    .replace(/&gt;/g, '>')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    .trim();

    if (rawContent) {
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
