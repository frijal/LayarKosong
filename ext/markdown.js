/*!
 * markdown-enhancer.js — Frijal Fixed Edition
 */

(async function () {

  // === 1️⃣ Muat highlight.js (Browser Cache akan menangani efisiensi) ===
  async function loadHighlightJSIfNeeded() {
    const hasCodeBlocks = document.querySelector("pre code");
    if (!hasCodeBlocks) return null;

    // Jika sudah ada di window, kembalikan langsung
    if (window.hljs) return window.hljs;

    // Cek apakah script tag sudah pernah kita suntikkan sebelumnya di sesi ini
    // untuk menghindari duplikasi tag script
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

    // Muat dari file (Gunakan Absolute Path "/")
    const script = document.createElement("script");
    script.src = "/ext/highlight.js"; // <-- PERBAIKAN PATH
    script.defer = true;
    document.head.appendChild(script);

    await new Promise(res => (script.onload = res));
    return window.hljs;
  }

  // === 2️⃣ Terapkan tema highlight.js otomatis ===
  function applyHighlightTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const existing = document.querySelector("link[data-hljs-theme]");
    
    // Gunakan Absolute Path "/"
    const newHref = prefersDark
      ? "/ext/github-dark.min.css" // <-- PERBAIKAN PATH
      : "/ext/github.min.css";     // <-- PERBAIKAN PATH

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
      .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
      .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
      .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/(\W|^)\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
        const language = lang || "plaintext";
        return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
      })
      .replace(/((?:\|.*\|\n)+)/g, match => {
        const rows = match.trim().split("\n").filter(r => r.trim());
        if (rows.length < 2) return match;
        const header = rows[0].split("|").filter(Boolean).map(c => `<th>${c.trim()}</th>`).join("");
        const body = rows.slice(2).map(r =>
          "<tr>" + r.split("|").filter(Boolean).map(c => `<td>${c.trim()}</td>`).join("") + "</tr>"
        ).join("");
        return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
      });
  }

  // === 4️⃣ Proses Markdown di halaman ===
  function enhanceMarkdown() {
    const selector = "p, li, blockquote, td, th, header, quote, h1, h2, h3, h4, h5, h6, .note-box, .warning, .quote, .disclaimer, .quote-box, .danger-box, .alert-box, .markdown, .markdown-body, .alert, .intro-alert";
    document.querySelectorAll(selector).forEach(el => {
      if (el.classList.contains("no-md")) return;
      if (el.querySelector("pre, code, table")) return; 

      const original = el.innerHTML.trim();
      if (!original) return;

      const singleLine = original.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
      el.innerHTML = convertInlineMarkdown(singleLine);
    });
  }

  // === 5️⃣ Pastikan inline code tidak menjadi blok ===
  function fixInlineCodeDisplay() {
    document.querySelectorAll("code.inline-code").forEach(el => {
      el.style.display = "inline";
      el.style.whiteSpace = "nowrap";
      el.style.margin = "0";
      // Tambahkan padding sedikit agar rapi
      el.style.padding = "2px 4px"; 
      el.style.borderRadius = "4px";
    });
  }

  // === 6️⃣ Highlight bila ada blok kode ===
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

  // === 🚀 Jalankan ===
  document.addEventListener("DOMContentLoaded", async () => {
    enhanceMarkdown();
    fixInlineCodeDisplay();
    await highlightIfPresent();
  });

})();
