import { marked } from './marked.js';

/**
 * MARKDOWN ENHANCER v6.0 (Safe & Atomic)
 * Strategi: Render di level kontainer, hindari selektor <p> untuk mencegah loop.
 */

function setupMarked() {
  const renderer = new marked.Renderer();

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
  // JANGAN gunakan 'p' di sini. Gunakan elemen induknya saja.
  const selector = "li, main, article, blockquote, section, .markdown-body, .article-container, .narasi, .language-markdown, .alert, .alert-box, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .container, .danger-box, .disclaimer, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .meta, .meta-info, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  const targets = document.querySelectorAll(selector);

  targets.forEach((container) => {
    const el = container as HTMLElement;

    // 1. Kunci Keamanan Utama
    if (el.classList.contains("no-md") || el.classList.contains("rendered")) return;

    // 2. Bersihkan konten (Unwrap tag P hasil minify agar simbol MD terlihat)
    let rawContent = el.innerHTML
    .replace(/&gt;/g, '>')
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .trim();

    // 3. Deteksi simbol Markdown mendasar
    const hasMarkdown = /[\*\#\_\[\]]/.test(rawContent);

    if (rawContent && hasMarkdown) {
      // 4. Tandai 'rendered' SEBELUM mengubah innerHTML
      // Ini krusial untuk mencegah MutationObserver memicu ulang elemen ini
      el.classList.add('rendered');

      const htmlOutput = marked.parse(rawContent);

      // Update DOM secara atomik
      if (el.innerHTML !== htmlOutput) {
        el.innerHTML = htmlOutput;
      }
    }
  });
}

function run() {
  setupMarked();
  enhanceMarkdown();

  // Gunakan requestAnimationFrame agar tidak menghambat main thread
  const observer = new MutationObserver((mutations) => {
    const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasNewNodes) {
      window.requestAnimationFrame(() => {
        enhanceMarkdown();
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  run();
} else {
  document.addEventListener("DOMContentLoaded", run);
}
