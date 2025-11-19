/*!
 * markdown-enhancer.js — Frijal Smart Cached Edition
 * 🌿 Markdown ringan dengan pemuatan highlight.js hemat & cerdas.
 * - Tidak membuat baris baru pada inline code
 * - highlight.js dimuat hanya bila perlu, dan cache di localStorage
 * - Otomatis mengikuti tema sistem (dark/light)
 * - Tidak menginjeksi CSS tambahan
 */

(async function () {

  // === 1️⃣ Muat highlight.js hanya bila dibutuhkan dan belum di-cache ===
  async function loadHighlightJSIfNeeded() {
    const hasCodeBlocks = document.querySelector("pre code");
    if (!hasCodeBlocks) return null;

    // Cek cache di localStorage
    if (window.hljs) return window.hljs;
    const alreadyLoaded = localStorage.getItem("hljsLoaded");
    if (alreadyLoaded === "true") {
      // Skip network load, tunggu hljs global jika sudah dimuat di halaman sebelumnya
      return new Promise(resolve => {
        const check = setInterval(() => {
          if (window.hljs) {
            clearInterval(check);
            resolve(window.hljs);
          }
        }, 100);
      });
    }

    // Jika belum di-cache, muat dari CDN
    const script = document.createElement("script");
    script.src = "ext/highlight.js";
    script.defer = true;
    document.head.appendChild(script);

    await new Promise(res => (script.onload = res));
    localStorage.setItem("hljsLoaded", "true");
    return window.hljs;
  }

  // === 2️⃣ Terapkan tema highlight.js otomatis ===
  function applyHighlightTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const existing = document.querySelector("link[data-hljs-theme]");
    const newHref = prefersDark
      ? "ext/github-dark.min.css"
      : "ext/github.min.css";

    if (existing) {
      if (existing.href !== newHref) existing.href = newHref;
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
      // Heading
      .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
      .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
      .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      // Blockquote
      .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")
      // Bold, Italic
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(.*?)\*(?!\*)/g, "$1<em>$2</em>")
      // Inline code (tidak bikin baris baru)
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // List
      .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
      // Code block ```
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
        const language = lang || "plaintext";
        return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
      })
      // Table
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
    // 🔥 PERBAIKAN: Menambahkan .alert ke selector agar blok notifikasi dapat diproses
    const selector = "p, li, blockquote, td, th, header, .markdown, .markdown-body, .alert";
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
