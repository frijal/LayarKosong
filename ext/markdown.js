/*!
 * markdown-enhancer.js — fix: force inline styles for inline <code>
 * - Tidak menyentuh <a>
 * - Tidak menginjeksi CSS global
 * - Memaksa code inline jadi inline via style attribute (mengalahkan code{display:block})
 */

(async function () {

  // === Muat highlight.js jika perlu ===
  async function ensureHighlightJS() {
    if (window.hljs) return window.hljs;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js";
    script.defer = true;
    document.head.appendChild(script);
    await new Promise(res => (script.onload = res));
    return window.hljs;
  }

  // === Terapkan theme highlight.js otomatis ===
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

  // === Konversi Markdown ringan (tetap tanpa menambah baris) ===
  function convertInlineMarkdown(text) {
    // bersihkan newline agar tidak memecah baris
    text = text.replace(/\r?\n+/g, " ").replace(/\s{2,}/g, " ");

    return text
      .replace(/&gt;/g, ">")
      // headings
      .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
      .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
      .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      // bold / italic
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(.*?)\*(?!\*)/g, "$1<em>$2</em>")
      // code blocks ```
      .replace(/```(\w+)?\s*([\s\S]*?)```/g, (m, lang, code) => {
        const language = lang ? lang.trim() : "plaintext";
        const clean = code.replace(/\r?\n/g, "\n").trim();
        return `<pre><code class="language-${language}">${clean}</code></pre>`;
      })
      // inline backtick `...`
      .replace(/(^|[^`])`([^`\n]+?)`(?!`)/g, (m, before, code) => {
        // create a plain <code> tag (styles applied later by markInlineCode)
        return `${before}<code>${escapeHtml(code)}</code>`;
      })
      // lists
      .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
      // simple pipe-tables
      .replace(/((?:\|.*\|\n)+)/g, tableMatch => {
        const rows = tableMatch.trim().split("\n").filter(r => r.trim());
        if (rows.length < 2) return tableMatch;
        const header = rows[0].split("|").filter(Boolean).map(c => `<th>${c.trim()}</th>`).join("");
        const body = rows.slice(2).map(r => "<tr>" + r.split("|").filter(Boolean).map(c => `<td>${c.trim()}</td>`).join("") + "</tr>").join("");
        return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
      });
  }

  // simple HTML escape for inline code content
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // === Tandai & paksa gaya inline untuk <code> yang bukan di dalam <pre> ===
  function enforceInlineCodeStyles() {
    document.querySelectorAll("code").forEach(codeEl => {
      const parent = codeEl.parentElement;
      if (parent && parent.tagName && parent.tagName.toLowerCase() === "pre") {
        // block code: jangan ubah
        // Ensure highlight.js class remains if applied later
        return;
      }

      // Jika codeEl sudah punya attribute data-inline-forced, lewati
      if (codeEl.dataset.inlineForced === "true") return;

      // Terapkan style inline yang mengalahkan CSS global:
      // - display:inline untuk mencegah line-break
      // - white-space:nowrap agar `about:config` tidak terpecah
      // - margin/padding minimal supaya tidak memecah layout
      codeEl.style.display = "inline";
      codeEl.style.whiteSpace = "nowrap";
      codeEl.style.margin = "0";
      // jangan override existing padding terlalu agresif; tambahkan sedikit kalau belum ada
      if (!codeEl.style.padding) codeEl.style.padding = "0 0.15em";
      // tandai supaya tidak diulang
      codeEl.dataset.inlineForced = "true";
    });
  }

  // === Proses elemen yang berisi Markdown ===
  function enhanceMarkdown() {
    const selector = "p, li, blockquote, td, th, header, .markdown, .markdown-body";
    document.querySelectorAll(selector).forEach(el => {
      if (el.classList.contains("no-md")) return;

      // jika elemen sudah punya pre/code asli (blok), kita masih ingin memproses
      // tapi hindari memproses kontainer yang memang mengandung kode blok mentah
      if (el.querySelector("pre")) return;

      const original = el.innerHTML;
      if (!original || !original.trim()) return;

      // flatten newlines between tags and whitespace (to avoid accidental breaks)
      const flattened = original.replace(/>\s*\n\s*</g, "><").replace(/\r?\n+/g, " ").replace(/\s{2,}/g, " ");

      // convert markdown → html
      const converted = convertInlineMarkdown(flattened);

      // set back
      el.innerHTML = converted;
    });

    // after converting, enforce inline styles on any code elements now present
    enforceInlineCodeStyles();
  }

  // === Highlight block code with highlight.js (if present) ===
  async function enhanceCodeBlocks() {
    const hljs = await ensureHighlightJS();
    // highlight block codes
    document.querySelectorAll("pre code").forEach(el => {
      try { hljs.highlightElement(el); } catch(e) { /* ignore */ }
    });
    // ensure inline styles are applied after highlight (in case hljs touched the DOM)
    enforceInlineCodeStyles();
  }

  // run on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", async () => {
    enhanceMarkdown();
    await enhanceCodeBlocks();
    // also observe DOM mutations to handle content injected later (optional)
    const observer = new MutationObserver(mutations => {
      let changed = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) { changed = true; break; }
      }
      if (changed) {
        // small debounce
        clearTimeout(window.__mdEnhanceTid);
        window.__mdEnhanceTid = setTimeout(async () => {
          enhanceMarkdown();
          await enhanceCodeBlocks();
        }, 150);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

})();
