/*!
 * markdown-enhancer.js (🧠 versi super lengkap by frijal)
 * 🌿 Markdown → HTML otomatis di berbagai elemen.
 * ✅ Bekerja di: <p>, <li>, <blockquote>, <td>, <th>, <header>, <a>
 * ✅ Auto highlight.js (dark/light theme switch)
 */
(async function () {
  // === 1️⃣ Muat highlight.js otomatis ===
  async function ensureHighlightJS() {
    if (window.hljs) return window.hljs;

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js";
    script.defer = true;
    document.head.appendChild(script);

    await new Promise(res => (script.onload = res));
    return window.hljs;
  }

  // === 2️⃣ Muat stylesheet highlight.js sesuai tema ===
  function applyHighlightTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const existing = document.querySelector("link[data-hljs-theme]");
    const newHref = prefersDark
      ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css"
      : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css";

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

  // Jalankan saat awal dan bila user ubah tema sistem
  applyHighlightTheme();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyHighlightTheme);

  // === 3️⃣ Fungsi konversi Markdown → HTML ===
  function convertInlineMarkdown(text) {
    return text
      // Heading
      .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
      .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
      .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")

      // Blockquote
      .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")

      // Bold, Italic, Code inline
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(.*?)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, '<code class="inline">$1</code>')

      // Markdown links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 hover:underline">$1</a>')

      // Lists
      .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")

      // Code blocks ```
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
        const language = lang || "plaintext";
        return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
      })

      // Tables Markdown sederhana
      .replace(/((?:\|.*\|\n)+)/g, tableMatch => {
        const rows = tableMatch.trim().split("\n").filter(r => r.trim());
        if (rows.length < 2) return tableMatch;
        const header = rows[0].split("|").filter(Boolean)
          .map(c => `<th>${c.trim()}</th>`).join("");
        const body = rows.slice(2).map(r =>
          "<tr>" + r.split("|").filter(Boolean)
          .map(c => `<td>${c.trim()}</td>`).join("") + "</tr>"
        ).join("");
        return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
      });
  }

  // === 4️⃣ Proses semua elemen yang mungkin berisi Markdown ===
  function enhanceMarkdown() {
    const selector = "p, li, blockquote, td, th, header, a, .markdown, .markdown-body";
    document.querySelectorAll(selector).forEach(el => {
      if (el.classList.contains("no-md")) return;

      // Untuk <a>, pastikan hanya teks murni yang dikonversi
      if (el.tagName === "A") {
        if (el.querySelector("*")) return; // jangan ubah jika ada elemen anak lain
        el.innerHTML = convertInlineMarkdown(el.textContent.trim());
        return;
      }

      // Elemen biasa
      if (el.children.length > 0 && !el.classList.contains("markdown")) return;
      const original = el.innerHTML.trim();
      if (!original) return;

      el.innerHTML = convertInlineMarkdown(original);
    });
  }

  // === 5️⃣ Proses highlight untuk <pre><code> ===
  async function enhanceCodeBlocks() {
    const hljs = await ensureHighlightJS();
    document.querySelectorAll("pre code").forEach(el => {
      try { hljs.highlightElement(el); } catch {}
    });
  }

  // === 6️⃣ Jalankan setelah DOM siap ===
  document.addEventListener("DOMContentLoaded", async () => {
    enhanceMarkdown();
    await enhanceCodeBlocks();
  });
})();
