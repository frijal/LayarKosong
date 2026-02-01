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
    // 1. Unescape dasar (supaya > jadi blockquote)
    .replace(/&gt;/g, ">")

    // 2. Block Code (Triple Backtick) - Harus paling atas!
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
      const language = lang || "plaintext";
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    })

    // 3. Table - Harus diproses sebelum inline formatting
    .replace(/((?:\|.*\|\n)+)/g, match => {
      const rows = match.trim().split("\n").filter(r => r.trim());
      if (rows.length < 2) return match;
      const header = rows[0].split("|").filter(Boolean).map(c => `<th>${c.trim()}</th>`).join("");
      const body = rows.slice(2).map(r =>
      "<tr>" + r.split("|").filter(Boolean).map(c => `<td>${c.trim()}</td>`).join("") + "</tr>"
      ).join("");
      return `<div style="overflow-x:auto;"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
    })

    // 4. Headers (H1-H6)
    .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
    .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
    .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")

    // 5. Blockquote
    .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")

    // 6. Bold (Tebal) - Pakai double asterisk
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

    // 7. Italic (Miring) - Lebih aman agar tidak bentrok dengan Bold
    .replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, "$1<em>$2</em>$3")

    // 8. Inline Code (Single Backtick)
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

    // 9. Unordered List (Hanya jika di awal baris)
    .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
    // Bungkus li yang berurutan dengan ul
    .replace(/(<li>.*<\/li>)/gs, match => {
      return match.includes('<ul>') ? match : `<ul>${match}</ul>`;
    });
  }

  // === 4️⃣ Proses Markdown di halaman (Versi Otomatis & Efisien) ==
  async function enhanceMarkdown() {
    try {
      // 1. Ambil daftar 77 class dari file hasil saringan tadi
      const response = await fetch('/ext/markdown-classes.txt');
      if (!response.ok) throw new Error('Gagal memuat daftar class');

      const text = await response.text();
      const registeredClasses = text.split('\n')
      .map(c => c.trim())
      .filter(c => c.length > 0);

      // 2. Bangun selector (Tag Standar + Class dari txt)
      const standardTags = "p, ol, ul, li, blockquote, td, th, h1, h2, h3, h4, h5, h6";
      const classSelector = registeredClasses.map(cls => `.${cls}`).join(", ");
      const finalSelector = `${standardTags}, ${classSelector}`;

      // 3. Batasi area pencarian hanya di dalam konten utama
      const contentArea = document.querySelector('main, article, .container, .content') || document.body;

      contentArea.querySelectorAll(finalSelector).forEach(el => {
        // Keamanan ekstra: jangan sentuh head atau elemen no-md
        if (el.classList.contains("no-md") || el.closest("head")) return;

        let original = el.innerHTML;
        if (!original.trim()) return;

        // Cek cepat: apakah ada karakter markdown? (Hemat CPU)
        if (!/[#*_`\[]|&gt;/.test(original)) return;

        const rendered = convertInlineMarkdown(original);

        if (rendered !== original) {
          el.innerHTML = rendered;
        }
      });

      console.log(`✅ Markdown sukses diterapkan pada ${registeredClasses.length} tipe konten.`);
    } catch (err) {
      console.error("❌ Markdown Enhancer Error:", err);
    }
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
