/*!
 * markdown-enhancer-frijal.js — 🌿 Edisi Lengkap oleh Frijal
 * Meningkatkan konten HTML dengan sintaks Markdown + highlight.js adaptif
 * - Tidak mengubah atau menimpa tampilan <a>
 * - Tema highlight otomatis mengikuti preferensi pengguna (dark/light)
 * - Tanpa baris baru buatan (<br>)
 * - Aman digunakan di <header>, <table>, maupun konten artikel
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

  // === 2️⃣ Tambahkan gaya highlight.js (tanpa <a> style) ===
  function injectHighlightTheme() {
    if (document.getElementById("hljs-combined-style")) return;

    const style = document.createElement("style");
    style.id = "hljs-combined-style";
    style.textContent = `
/* ==========================================================
   Highlight.js Combined Theme (GitHub Light + Dark)
   Versi tanpa styling <a>
   ========================================================== */

/* Blok kode highlight */
pre code.hljs {
  display: block;
  overflow-x: auto;
  padding: 1em;
  border-radius: 8px;
  font-size: 0.9em;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  line-height: 1.5;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Warna dasar mode terang (GitHub Light) */
:root {
  --hljs-bg: #f6f8fa;
  --hljs-text: #24292e;
  --hljs-border: #d0d7de;
}

/* Warna dasar mode gelap (GitHub Dark) */
@media (prefers-color-scheme: dark) {
  :root {
    --hljs-bg: #0d1117;
    --hljs-text: #c9d1d9;
    --hljs-border: #30363d;
  }
}

/* Terapkan warna tema */
pre code.hljs {
  background-color: var(--hljs-bg) !important;
  color: var(--hljs-text) !important;
  border: 1px solid var(--hljs-border);
}

/* Inline code */
code:not(.hljs) {
  background-color: rgba(127, 127, 127, 0.1);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
}
@media (prefers-color-scheme: dark) {
  code:not(.hljs) {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

/* Reset untuk header agar tidak rusak */
header, header *, header strong, header span {
  all: revert !important;
}
`;
    document.head.appendChild(style);
  }

  // === 3️⃣ Konversi Markdown → HTML ringan ===
  function convertInlineMarkdown(text) {
    return text
      .replace(/&gt;/g, ">") // normalisasi simbol
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
      // List
      .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
      // Code block ```
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

  // === 4️⃣ Proses semua elemen yang berisi Markdown ===
function enhanceMarkdown() {
  const selector = "p, li, blockquote, td, th, header, .markdown, .markdown-body";
  document.querySelectorAll(selector).forEach(el => {
    if (el.classList.contains("no-md")) return;
    if (el.querySelector("pre, code, table")) return;

    const original = el.innerHTML.trim();
    if (!original) return;

    // 💡 Perbaikan utama: hapus line break di antara tag HTML juga
    const flattened = original
      .replace(/>\s*\n\s*</g, '><')  // hapus newline antar tag
      .replace(/\s*\n\s*/g, " ")     // hapus newline sisa
      .replace(/\s{2,}/g, " ");      // rapikan spasi ganda

    el.innerHTML = convertInlineMarkdown(flattened);
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
    injectHighlightTheme();
    enhanceMarkdown();
    await enhanceCodeBlocks();
    console.info("[markdown-enhancer-frijal.js] Markdown & Highlight siap digunakan.");
  });
})();
