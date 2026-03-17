import { marked } from './marked.js';

/**
 * MARKDOWN ENHANCER v6.1 (Hybrid Logic)
 * Mengambil inspirasi dari kode lama yang stabil,
 * tapi tetap menggunakan power dari marked.js yang sudah di-bundle.
 */

function setupMarked() {
  marked.setOptions({
    gfm: true,
    breaks: true
  });
}

function enhanceMarkdown() {
  // Daftar selektor yang kamu sukai dari kode lama
  const selector = "p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, .alert, .alert-box, .article-container, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .danger-box, .disclaimer, .fa-solid, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .markdown-body, .meta, .meta-info, .narasi, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  const targets = document.querySelectorAll(selector);

  targets.forEach((el) => {
    const target = el as HTMLElement;

    // Skip jika sudah diproses atau dilarang
    if (target.classList.contains("no-md") || target.classList.contains("rendered")) return;

    let rawContent = target.innerHTML
    .replace(/&gt;/g, '>') // Trik dari kode lama untuk blockquote
    .trim();

    // Deteksi apakah ada simbol Markdown sebelum memproses
    const hasMarkdown = /[\*\#\_\[\]]/.test(rawContent);

    if (rawContent && hasMarkdown) {
      // PROSES RENDER
      const rendered = marked.parse(rawContent);

      // TRICK: Agar tidak terjadi infinite loop pada tag <p>,
      // kita bersihkan tag <p> pembungkus yang dihasilkan oleh marked
      // karena elemen aslinya (target) biasanya sudah berupa <p> atau <li>
      const finalOutput = rendered.replace(/^<p>/, '').replace(/<\/p>$/, '');

      if (target.innerHTML !== finalOutput) {
        // Tandai dulu baru ubah HTML
        target.classList.add('rendered');
        target.innerHTML = finalOutput;
      }
    }
  });
}

function run() {
  setupMarked();
  enhanceMarkdown();

  // Observer yang pasif: hanya jalan jika ada elemen baru ditambahkan
  const observer = new MutationObserver((mutations) => {
    const shouldRun = mutations.some(m => m.addedNodes.length > 0);
    if (shouldRun) {
      // Gunakan requestAnimationFrame agar tidak freeze
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
