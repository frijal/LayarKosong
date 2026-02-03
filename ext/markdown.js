/*!
 * markdown-enhancer.js — Frijal Ultimate Edition (Link, Image, Strikethrough Support)
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

  // === 3️⃣ Markdown converter (Update: Image & Strikethrough) ===
  function convertInlineMarkdown(text) {
    return text
    // 1. Unescape dasar
    .replace(/&gt;/g, ">")

    // 2. Block Code (Triple Backtick)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
      const language = lang || "plaintext";
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    })

    // 3. Table
    .replace(/((?:\|.*\|\n)+)/g, match => {
      const rows = match.trim().split("\n").filter(r => r.trim());
      if (rows.length < 2) return match;
      const header = rows[0].split("|").filter(Boolean).map(c => `<th>${c.trim()}</th>`).join("");
      const body = rows.slice(2).map(r =>
      "<tr>" + r.split("|").filter(Boolean).map(c => `<td>${c.trim()}</td>`).join("") + "</tr>"
      ).join("");
      return `<div style="overflow-x:auto;"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
    })

    // 4. Headers
    .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
    .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
    .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")

    // 5. Blockquote
    .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")

    // 6. Image Markdown ![alt](url) <-- FITUR BARU
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%; height:auto; display:block; margin:10px 0; border-radius:8px;">')

// 7. Link Markdown [teks](url)
.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')

// 8. Strikethrough ~~teks~~ <-- FITUR BARU
.replace(/~~(.*?)~~/g, '<del>$1</del>')

// 9. Bold (Tebal)
.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

// 10. Italic (Miring)
.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, "$1<em>$2</em>$3")

// 11. Inline Code (Single Backtick)
.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

// 12. Unordered List
.replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
.replace(/(<li>.*<\/li>)/gs, match => {
  return match.includes('<ul>') ? match : `<ul>${match}</ul>`;
});
  }

  // === 4️⃣ Proses Markdown di halaman ==
  function enhanceMarkdown() {
    const selector = "p, ol, ul, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, .note, .method-card, .code-block, .note-box, .callout, .warning-box, .item, .warning, .quote, .disclaimer, .quote-box, .danger-box, .alert-box, .kuhp-point, .contact, .highlight, .closing, .fa-solid, .narasi, .markdown, .markdown-body, .meta, .success-box, .timeline-item, .card, .highlight-box, .tip-admin, .info-box, .tool-item, .tips, .tip, .alert, .intro-alert";

    document.querySelectorAll(selector).forEach(el => {
      if (el.classList.contains("no-md")) return;

      let original = el.innerHTML;
      if (!original.trim()) return;

      const rendered = convertInlineMarkdown(original);

      if (rendered !== original) {
        el.innerHTML = rendered;
      }
    });
  }

  // === 5️⃣ Fix Display Inline Code ===
  function fixInlineCodeDisplay() {
    document.querySelectorAll("code.inline-code").forEach(el => {
      el.style.display = "inline";
      el.style.backgroundColor = "rgba(175, 184, 193, 0.2)";
      el.style.padding = "2px 5px";
      el.style.borderRadius = "6px";
      el.style.fontFamily = "monospace";
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

    codeBlocks.forEach(el => {
      try { hljs.highlightElement(el); } catch {}
    });
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