/*!
 * markdown-enhancer.js — versi revisi (fix newline after backtick)
 * Tanpa inject CSS, tanpa modifikasi <a>, tanpa baris baru.
 */

(async function () {

  // === Muat highlight.js jika belum ada ===
  async function ensureHighlightJS() {
    if (window.hljs) return window.hljs;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js";
    script.defer = true;
    document.head.appendChild(script);
    await new Promise(res => (script.onload = res));
    return window.hljs;
  }

  // === Terapkan tema highlight.js otomatis ===
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

  // === Markdown ringan ===
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
      // Bold & Italic
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(.*?)\*(?!\*)/g, "$1<em>$2</em>")
      // === Fix Backtick ===
      // Triple backtick blok
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
        const language = lang || "plaintext";
        return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
      })
      // Empat backtick
      .replace(/````([\s\S]*?)````/g, (m, code) =>
        `<pre><code class="language-plaintext">${code.trim()}</code></pre>`
      )
      // Inline backtick — tanpа baris baru
      .replace(/`([^`]+?)`/g, (m, code) => {
        return `<code class="inline" style="white-space:nowrap;">${code.trim()}</code>`;
      })
      // Daftar
      .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
  }

  // === Terapkan ke elemen ===
  function enhanceMarkdown() {
    const selector = "p, li, blockquote, td, th, header, .markdown, .markdown-body";
    document.querySelectorAll(selector).forEach(el => {
      if (el.classList.contains("no-md")) return;
      if (el.querySelector("pre, code, table")) return;

      const original = el.innerHTML.trim();
      if (!original) return;

      // 🔧 flatten newline tapi tidak hapus spasi antar kata
      const flattened = original
        .replace(/\r?\n+/g, " ")
        .replace(/\s{2,}/g, " ");

      el.innerHTML = convertInlineMarkdown(flattened);
    });
  }

  // === Jalankan highlight.js ===
  async function enhanceCodeBlocks() {
    const hljs = await ensureHighlightJS();
    document.querySelectorAll("pre code").forEach(el => {
      try { hljs.highlightElement(el); } catch {}
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    enhanceMarkdown();
    await enhanceCodeBlocks();
  });

})();
