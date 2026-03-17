/**
 * MARKDOWN ENHANCER v7.1 (Bun Build Optimized)
 * Fokus: Ringan, Tanpa Library, Aman untuk Minified HTML.
 */

// Menambahkan definisi tipe untuk highlight.js agar TS tidak error
declare global {
  interface Window {
    hljs: any;
  }
}

function parseMarkdown(text: string): string {
  return text
  .replace(/&gt;/g, ">")
  .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")
  .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
  .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
  .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
  .replace(/^### (.*)$/gm, "<h3>$1</h3>")
  .replace(/^## (.*)$/gm, "<h2>$1</h2>")
  .replace(/^# (.*)$/gm, "<h1>$1</h1>")
  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  .replace(/__(.*?)__/g, "<strong>$1</strong>")
  .replace(/\*(.*?)\*/g, "<em>$1</em>")
  .replace(/_(.*?)_/g, "<em>$1</em>")
  .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" class="md-img">')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
  .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
  .replace(/^([\-\*_]){3,}\s*$/gm, "<hr>")
  .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>");
}

function enhanceMarkdown(): void {
  const selector = "p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, footer, .alert, .alert-box, .article-container, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .danger-box, .disclaimer, .fa-solid, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .markdown-body, .meta, .meta-info, .narasi, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  const targets = document.querySelectorAll(selector);

  targets.forEach((el) => {
    const target = el as HTMLElement;
    if (target.classList.contains("no-md") || target.classList.contains("rendered")) return;

    const originalHTML = target.innerHTML;
    const rawContent = originalHTML.trim();
    const hasMarkdown = /[\*\#_\[\]]/.test(rawContent);

    if (rawContent && hasMarkdown) {
      target.classList.add("rendered");
      const newHTML = parseMarkdown(rawContent);
      if (newHTML !== originalHTML) {
        target.innerHTML = newHTML;
      }
    }
  });
}

function initHighlight(): void {
  if (window.hljs) {
    document.querySelectorAll("pre code").forEach((block) => {
      window.hljs.highlightElement(block as HTMLElement);
    });
  }
}

function ensureHighlightJS(theme: string): void {
  // Script highlight.js
  let existingScript = Array.from(document.scripts).find(
    s => s.src && s.src.includes("/ext/highlight.js")
  );

  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "/ext/highlight.js";
    script.defer = true;
    script.onload = initHighlight;
    document.head.appendChild(script);
  } else {
    initHighlight();
  }

  // CSS tema
  const themeHref = `/ext/${theme}`;
  let existingLink = document.querySelector(`link[href*="${theme}"]`);

  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = themeHref;
    document.head.appendChild(link);
  }
}

function start(): void {
  enhanceMarkdown();

  // Observer untuk konten dinamis
  const observer = new MutationObserver((mutations) => {
    if (mutations.some(m => m.addedNodes.length > 0)) {
      window.requestAnimationFrame(enhanceMarkdown);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Tema berdasarkan skema warna
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = prefersDark ? "atom-one-dark.min.css" : "atom-one-light.min.css";
  ensureHighlightJS(theme);
}

// Inisialisasi
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
