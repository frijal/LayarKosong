/*!
 * markdown-enhancer.js — Frijal adaptive edition
 * 🌿 Menambah dukungan Markdown di HTML dengan deteksi otomatis inline vs block code.
 * - Tidak membuat baris baru untuk backtick (`inline code`)
 * - Kompatibel dengan highlight.js
 * - Tidak menginjeksi CSS
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

  // === 2️⃣ Terapkan tema highlight.js sesuai mode pengguna ===
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

  applyHighlightTheme();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyHighlightTheme);

  // === 3️⃣ Konversi Markdown ke HTML ringan ===
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
      .replace(/(^|[^*])\*(.*?)\*(?!\*)/g, "$1<em>$2</em>")
      // Inline code pakai <code> biasa
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Daftar
      .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
      // Blok kode dengan ```
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
        const language = lang || "plaintext";
        return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
      })
      // Tabel sederhana
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

  // === 4️⃣ Deteksi inline code dan tandai otomatis ===
  function markInlineCode() {
    document.querySelectorAll("code").forEach(el => {
      const parent = el.parentElement;
      // Kalau code ada di dalam <pre>, artinya block code
      if (parent && parent.tagName.toLowerCase() === "pre") return;
      // Kalau panjang konten kecil (inline) → tandai
      if (el.textContent.length < 80) {
        el.classList.add("inline-code");
      }
    });
  }

  // === 5️⃣ Proses elemen dengan Markdown ===
  function enhanceMarkdown() {
    const selector = "p, li, blockquote, td, th, header, .markdown, .markdown-body";
    document.querySelectorAll(selector).forEach(el => {
      if (el.classList.contains("no-md")) return;
      if (el.querySelector("pre, code, table")) return;

      const original = el.innerHTML.trim();
      if (!original) return;

      const flattened = original
        .replace(/>\s*\n\s*</g, '><') // hapus newline antar tag
        .replace(/\s*\n\s*/g, " ")     // hapus newline sisa
        .replace(/\s{2,}/g, " ");      // rapikan spasi

      el.innerHTML = convertInlineMarkdown(flattened);
    });
  }

  // === 6️⃣ Jalankan highlight.js + inline detektor ===
  async function enhanceCodeBlocks() {
    const hljs = await ensureHighlightJS();
    document.querySelectorAll("pre code").forEach(el => {
      try { hljs.highlightElement(el); } catch {}
    });
    markInlineCode(); // tambahkan kelas inline setelah highlight
  }

  // === 7️⃣ Jalankan setelah DOM siap ===
  document.addEventListener("DOMContentLoaded", async () => {
    enhanceMarkdown();
    await enhanceCodeBlocks();
  });

})();
