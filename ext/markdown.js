/**
 * MARKDOWN ENHANCER v7.0 (Pure Regex - No Library)
 * Fokus: Ringan, Tanpa Loop, Aman untuk Minified HTML.
 */

function parseMarkdown(text: string): string {
  return text
  // 1. Bersihkan entitas HTML dasar
  .replace(/&gt;/g, ">")

  // 2. Blockquote (Harus di awal agar tidak bentrok)
  .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")

  // 3. Header (h1 - h6)
  .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
  .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
  .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
  .replace(/^### (.*)$/gm, "<h3>$1</h3>")
  .replace(/^## (.*)$/gm, "<h2>$1</h2>")
  .replace(/^# (.*)$/gm, "<h1>$1</h1>")

  // 4. Bold & Italic
  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  .replace(/__(.*?)__/g, "<strong>$1</strong>")
  .replace(/\*(.*?)\*/g, "<em>$1</em>")
  .replace(/_(.*?)_/g, "<em>$1</em>")

  // 5. Link & Image
  .replace(/!

  \[([^\]

  ]*)\]

  \((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" class="md-img">')
  .replace(/

  \[([^\]

  ]+)\]

  \((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank">$1</a>')

  // 6. Inline Code
  .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

  // 7. Horizontal Rule
  .replace(/^([\-\*_]){3,}\s*$/gm, "<hr>")

  // 8. List Item (Sederhana)
  .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>");
}

function enhanceMarkdown() {
  const selector = "p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, footer, .alert, .alert-box, .article-container, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .danger-box, .disclaimer, .fa-solid, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .markdown-body, .meta, .meta-info, .narasi, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  const targets = document.querySelectorAll(selector);

  targets.forEach((el) => {
    const target = el as HTMLElement;
    if (target.classList.contains("no-md") || target.classList.contains("rendered")) return;

    const originalHTML = target.innerHTML;
    const rawContent = originalHTML.trim();
    const hasMarkdown = /[\*\#\_

    \[\]

    ]/.test(rawContent);

    if (rawContent && hasMarkdown) {
      target.classList.add("rendered");
      const newHTML = parseMarkdown(rawContent);
      if (newHTML !== originalHTML) {
        target.innerHTML = newHTML;
      }
    }
  });
}

function run() {
  enhanceMarkdown();

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

/**
 * Pastikan highlight.js dan tema CSS dipanggil dengan aman
 */
function ensureHighlightJS(theme: string) {
  // Script highlight.js
  let existingScript = document.querySelector('script[src="/ext/highlight.js"]');
  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "/ext/highlight.js";
    script.defer = true;
    document.head.appendChild(script);
    script.onload = () => {
      if (window.hljs) {
        document.querySelectorAll("pre code").forEach((block) => {
          window.hljs.highlightElement(block as HTMLElement);
        });
      }
    };
  } else {
    if (window.hljs) {
      document.querySelectorAll("pre code").forEach((block) => {
        window.hljs.highlightElement(block as HTMLElement);
      });
    }
  }

  // CSS tema
  const themeHref = `/ext/${theme}`;
  let existingLink = document.querySelector(`link[href="${themeHref}"]`);
  if (!existingLink) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = themeHref;
    document.head.appendChild(link);
  }
}

// Inisialisasi
if (document.readyState === "complete" || document.readyState === "interactive") {
  run();
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = prefersDark ? "atom-one-dark.min.css" : "atom-one-light.min.css";
  ensureHighlightJS(theme);
} else {
  document.addEventListener("DOMContentLoaded", () => {
    run();
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = prefersDark ? "atom-one-dark.min.css" : "atom-one-light.min.css";
    ensureHighlightJS(theme);
  });
}
