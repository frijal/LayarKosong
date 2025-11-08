/*!
 * markdown-enhancer.js — versi stabil (tanpa baris baru dari backtick)
 * 🧩 Tidak menyentuh <a>, tidak injeksi CSS, dan 100% inline-safe.
 */

(async function () {

  // === 1️⃣ Muat highlight.js bila belum ada ===
  async function ensureHighlightJS() {
    if (window.hljs) return window.hljs;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js";
    script.defer = true;
    document.head.appendChild(script);
    await new Promise(res => (script.onload = res));
    return window.hljs;
  }

  // === 2️⃣ Terapkan tema highlight.js otomatis ===
  function applyHighlightTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const href = prefersDark
      ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css"
      : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css";

    let link = document.querySelector("link[data-hljs-theme]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset.hljsTheme = "true";
      document.head.appendChild(link);
    }
    link.href = href;
  }

  applyHighlightTheme();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyHighlightTheme);

  // === 3️⃣ Konversi Markdown ringan ===
  function convertInlineMarkdown(text) {
    // hilangkan newline agar tidak pernah pecah baris
    text = text.replace(/\r?\n+/g, " ").replace(/\s{2,}/g, " ");

    return text
      .replace(/&gt;/g, ">")
      // Heading
      .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
      .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
      .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      // Bold & Italic
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(.*?)\*(?!\*)/g, "$1<em>$2</em>")
      // === Backtick ===
      // Blok kode (```...```)
      .replace(/```(\w+)?\s*([\s\S]*?)```/g, (m, lang, code) => {
        const language = lang ? lang.trim() : "plaintext";
        const clean = code.replace(/\r?\n/g, "\n").trim();
        return `<pre><code class="language-${language}">${clean}</code></pre>`;
      })
      // Inline backtick `...`
      .replace(/(^|[^`])`([^`\n]+?)`(?!`)/g, (m, before, code) => {
        return `${before}<code class="inline" style="white-space:nowrap;">${code}</code>`;
      })
      // Daftar
      .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
  }

  // === 4️⃣ Proses semua elemen yang berisi Markdown ===
  function enhanceMarkdown() {
    const selector = "p, li, blockquote, td, th, header, .markdown, .markdown-body";
    document.querySelectorAll(selector).forEach(el => {
      if (el.classList.contains("no-md")) return;
      if (el.querySelector("pre, code, table")) return;

      const original = el.innerHTML.trim();
      if (!original) return;

      const processed = convertInlineMarkdown(original);
      el.innerHTML = processed;
    });
  }

  // === 5️⃣ Highlight semua blok kode ===
  async function enhanceCodeBlocks() {
    const hljs = await ensureHighlightJS();
    document.querySelectorAll("pre code").forEach(el => {
      try { hljs.highlightElement(el); } catch {}
    });
  }

  // Jalankan setelah DOM siap
  document.addEventListener("DOMContentLoaded", async () => {
    enhanceMarkdown();
    await enhanceCodeBlocks();
  });

})();
