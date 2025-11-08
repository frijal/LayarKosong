/*!
 * markdown-enhancer.js — Frijal edition (final)
 * 🌿 Meningkatkan konten HTML yang berisi sintaks Markdown & blok kode.
 * - Mendukung elemen di dalam <table>, <header>, dan <a>
 * - Tidak membuat baris baru (<br>)
 * - Otomatis memuat highlight.js dengan tema adaptif (dark/light)
 * - Aman terhadap link dan struktur tabel
 */

(async function () {
  // === 1️⃣ Muat highlight.js otomatis ===
  async function ensureHighlightJS() {
    if (window.hljs) return window.hljs;

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js";
    script.defer = true;
    document.head.appendChild(script);

    await new Promise((res) => (script.onload = res));
    return window.hljs;
  }

  // === 2️⃣ Terapkan tema highlight.js adaptif ===
  function applyHighlightTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const existing = document.querySelector("link[data-hljs-theme]");
    const hrefDark =
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css";
    const hrefLight =
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css";

    const newHref = prefersDark ? hrefDark : hrefLight;

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

  applyHighlightTheme();
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", applyHighlightTheme);

  // === 3️⃣ CSS tambahan agar tampilan tetap rapi ===
  const style = document.createElement("style");
  style.textContent = `
    a {
      display: inline;
      white-space: normal;
      text-decoration: none;
      color: var(--secondary-color, #0969da);
      font-weight: inherit;
      background: none;
      border: none;
    }
    a:hover {
      text-decoration: underline;
    }

    pre, code {
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-x: auto;
      border-radius: 8px;
      font-size: 0.95em;
      line-height: 1.5;
    }

    p code {
      display: inline;
      padding: 2px 4px;
      border-radius: 4px;
      background-color: rgba(127,127,127,0.1);
    }

    header pre, header code {
      background: none;
      color: inherit;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid rgba(128,128,128,0.3);
      padding: 6px 10px;
      text-align: left;
    }
    th {
      font-weight: bold;
      background: rgba(128,128,128,0.1);
    }
  `;
  document.head.appendChild(style);

  // === 4️⃣ Konversi Markdown → HTML ringan ===
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
      // Bold, Italic, Code inline
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(.*?)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, '<code class="inline">$1</code>')
      // Link
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 hover:underline">$1</a>')
      // Lists
      .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
      // Code block ```
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
        const language = lang || "plaintext";
        return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
      })
      // Tabel sederhana
      .replace(/((?:\|.*\|\n)+)/g, (tableMatch) => {
        const rows = tableMatch.trim().split("\n").filter((r) => r.trim());
        if (rows.length < 2) return tableMatch;
        const header = rows[0]
          .split("|")
          .filter(Boolean)
          .map((c) => `<th>${c.trim()}</th>`)
          .join("");
        const body = rows
          .slice(2)
          .map(
            (r) =>
              "<tr>" +
              r
                .split("|")
                .filter(Boolean)
                .map((c) => `<td>${c.trim()}</td>`)
                .join("") +
              "</tr>"
          )
          .join("");
        return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
      });
  }

  // === 5️⃣ Proses elemen dengan Markdown (termasuk <header>, <a>, <td>) ===
  function enhanceMarkdown() {
    const selector = "p, li, blockquote, td, th, header, a, .markdown, .markdown-body";
    document.querySelectorAll(selector).forEach((el) => {
      if (el.classList.contains("no-md")) return;
      if (el.querySelector("pre, code, table")) return;

      const original = el.innerHTML.trim();
      if (!original) return;

      // Hapus line break agar tidak pecah baris
      const singleLine = original.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
      el.innerHTML = convertInlineMarkdown(singleLine);
    });
  }

  // === 6️⃣ Aktifkan highlight ===
  async function enhanceCodeBlocks() {
    const hljs = await ensureHighlightJS();
    document.querySelectorAll("pre code").forEach((el) => {
      try {
        hljs.highlightElement(el);
      } catch {}
    });
  }

  // === 7️⃣ Jalankan setelah DOM siap ===
  document.addEventListener("DOMContentLoaded", async () => {
    enhanceMarkdown();
    await enhanceCodeBlocks();
  });
})();
