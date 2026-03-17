/**
 * MARKDOWN ENHANCER v5.0 (Marked Engine Optimized)
 * Menggunakan Marked untuk parsing, tapi tetap mempertahankan Card-Mode Table.
 */

function setupMarked() {
  if (typeof marked === 'undefined') return;

  const renderer = new marked.Renderer();

  // Custom Renderer untuk Tabel agar mendukung Card-Mode (data-label)
  renderer.table = (header, body) => {
    // Ekstrak teks header untuk data-label
    const headerTexts = [];
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = header;
    tempDiv.querySelectorAll('th').forEach(th => headerTexts.push(th.innerText.trim()));

    // Modifikasi body untuk menyisipkan data-label
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
    breaks: true,
    headerIds: false
  });
}

function enhanceMarkdown() {
  const selector = ".markdown-body, .article-container, .narasi, .language-markdown, .alert, .alert-box,  .author-box, .box, .card, .callout, .code-block, .closing, .contact, .danger-box, .disclaimer, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .markdown-body, .meta, .meta-info, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3;
  const targets = document.querySelectorAll(selector);

  targets.forEach((container) => {
    if (container.classList.contains("no-md") || container.classList.contains("rendered")) return;

    // Proteksi: Jika di dalam PRE sudah ada highlight.js, jangan timpa secara kasar
    if (container.tagName === 'PRE' && container.querySelector('code[class*="language-"]')) return;

    const rawContent = container.innerHTML
      .replace(/&gt;/g, '>')
      .trim();

    if (rawContent) {
      container.innerHTML = marked.parse(rawContent);
      container.classList.add('rendered');
    }
  });
}

// Observer agar konten dinamis tetap ter-render (Debounced)
let renderTimeout;
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

// Inisialisasi
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
