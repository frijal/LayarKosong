import { marked } from './marked.js';

/**
 * MARKDOWN ENHANCER v5.5 (Final Compatibility)
 * Mendukung .container dan perbaikan render di dalam tag P
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
  // Selektor diperluas dengan menambahkan .container dan elemen semantik
  const selector = ", main p, li, main, article, blockquote, section, .markdown-body, .article-container, .narasi, .language-markdown, .alert, .alert-box, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .container, .danger-box, .disclaimer, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .meta, .meta-info, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  const targets = document.querySelectorAll(selector);

  targets.forEach((container) => {
    const el = container as HTMLElement;

    if (el.classList.contains("no-md") || el.classList.contains("rendered")) return;

    // Proteksi: Jika kontainer besar punya anak yang juga akan di-render, lewati kontainer besarnya
    if ((el.tagName === 'MAIN' || el.classList.contains('container')) && el.querySelector('section, article, .markdown-body')) {
      // Kita hanya render jika elemen ini adalah "daun" terakhir atau kontainer teks langsung
    }

    // Ambil konten, bersihkan entitas HTML dan tag P liar
    let rawContent = el.innerHTML
    .replace(/&gt;/g, '>')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    .trim();

    // Deteksi keberadaan Markdown (Bold, Italic, Header, List, Link)
    const hasMarkdown = /[\*\#\_\[\]]/.test(rawContent);

    if (rawContent && hasMarkdown) {
      // Parse teks menjadi HTML
      el.innerHTML = marked.parse(rawContent);
      el.classList.add('rendered');
    }
  });
}

function run() {
  setupMarked();
  enhanceMarkdown();

  // Tetap pantau perubahan DOM (untuk data-provider atau comment)
  const observer = new MutationObserver(() => {
    enhanceMarkdown();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Eksekusi paling stabil
if (document.readyState === "complete" || document.readyState === "interactive") {
  run();
} else {
  document.addEventListener("DOMContentLoaded", run);
}
