/*!
 * markdown-enhancer.js — Frijal Ultimate Edition (Clean & Responsive)
 */

(async function () {

  // === 1️⃣ Muat highlight.js ===
  async function loadHighlightJSIfNeeded() {
    const hasCodeBlocks = document.querySelector("pre code");
    if (!hasCodeBlocks) return null;

    if (window.hljs) return window.hljs;

    if (document.querySelector('script[src="/ext/highlight.js"]')) {
      return new Promise(resolve => {
        const check = setInterval(() => {
          if (window.hljs) {
            clearInterval(check);
            resolve(window.hljs);
          }
        }, 100);
      });
    }

    const script = document.createElement("script");
    script.src = "/ext/highlight.js";
    script.defer = true;
    document.head.appendChild(script);

    await new Promise(res => (script.onload = res));
    return window.hljs;
  }

  // === 2️⃣ Terapkan tema highlight.js ===
  function applyHighlightTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const existing = document.querySelector("link[data-hljs-theme]");
    const newHref = prefersDark ? "/ext/github-dark.min.css" : "/ext/github.min.css";

    if (existing) {
      if (existing.href !== newHref && !existing.href.endsWith(newHref)) {
        existing.href = newHref;
      }
    } else {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = newHref;
      link.dataset.hljsTheme = "true";
      document.head.appendChild(link);
    }
  }

  function setupThemeListener() {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyHighlightTheme);
  }

  // === 3️⃣ Markdown converter ===
  function convertInlineMarkdown(text) {
    return text
    .replace(/&gt;/g, ">")

    // Block Code (Triple Backtick)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
      const language = lang || "plaintext";
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    })

    // Table (Auto Data-Label for Mobile)
    .replace(/((?:\|.*\|\n)+)/g, match => {
      const rows = match.trim().split("\n").filter(r => r.trim());
      if (rows.length < 2) return match;
      const headerTexts = rows[0].split("|").filter(Boolean).map(c => c.trim());
      const headerHTML = headerTexts.map(c => `<th>${c}</th>`).join("");
      const bodyHTML = rows.slice(2).map(r => {
        const cells = r.split("|").filter(Boolean).map(c => c.trim());
        const cellsHTML = cells.map((content, index) => {
          const label = headerTexts[index] || "";
          return `<td data-label="${label}">${content}</td>`;
        }).join("");
        return `<tr>${cellsHTML}</tr>`;
      }).join("");
      return `<div class="dns-table-container"><table class="dns-card-mode"><thead><tr>${headerHTML}</tr></thead><tbody>${bodyHTML}</tbody></table></div>`;
    })

    // Headers
    .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
    .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
    .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")

    // Blockquote
    .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")

    // Image & Link
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%; height:auto; display:block; margin:10px 0; border-radius:8px;">')
.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')

// Text Styles
.replace(/~~(.*?)~~/g, '<del>$1</del>')
.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, "$1<em>$2</em>$3")

// Inline Code (Single Backtick)
.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

// Lists
.replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
.replace(/(<li>.*<\/li>)/gs, match => {
  return match.includes('<ul>') ? match : `<ul>${match}</ul>`;
});
  }

  // === 4️⃣ Proses Markdown di halaman ==
  function enhanceMarkdown() {
    const selector = "p, ol, ul, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, .note, .method-card, .author-box, .intro-box, .code-block, .note-box, .callout, .warning-box, .item, .warning, .quote, .disclaimer, .quote-box, .danger-box, .alert-box, .kuhp-point, .contact, .highlight, .closing, .fa-solid, .narasi, .markdown, .markdown-body, .meta, .success-box, .timeline-item, .card, .highlight-box, .tip-admin, .info-box, .tool-item, .tips, .tip, .alert, .intro-alert";

    document.querySelectorAll(selector).forEach(el => {
      if (el.classList.contains("no-md")) return;
      let original = el.innerHTML;
      if (!original.trim()) return;
      const rendered = convertInlineMarkdown(original);
      if (rendered !== original) { el.innerHTML = rendered; }
    });
  }

  // === 5️⃣ Fix Display Inline Code (Hanya Layout, Bukan Warna) ===
  function fixInlineCodeDisplay() {
    document.querySelectorAll("code.inline-code").forEach(el => {
      el.style.display = "inline";
      el.style.fontFamily = "'Courier New', Courier, monospace";
      // Background dan Warna sudah diatur di CSS HTML kamu
    });
  }

  // === 6️⃣ Highlight JS Init ===
  async function highlightIfPresent() {
    const codeBlocks = document.querySelectorAll("pre code");
    if (!codeBlocks.length) return;
    const hljs = await loadHighlightJSIfNeeded();
    if (!hljs) return;
    applyHighlightTheme();
    setupThemeListener();
    codeBlocks.forEach(el => { try { hljs.highlightElement(el); } catch {} });
  }

  // === 🚀 Main Launch ===
  async function run() {
    enhanceMarkdown();
    fixInlineCodeDisplay();
    await highlightIfPresent();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

})();