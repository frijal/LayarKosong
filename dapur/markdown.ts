/**
 * =============================================================
 * MARKDOWN ENHANCER v4.3 (TypeScript Edition)
 * =============================================================
 */

// Deklarasi global agar TypeScript mengenali window.hljs dari script eksternal
declare global {
  interface Window {
    hljs: any;
  }
}

(async function () {
  // === 1️⃣ Muat highlight.js jika diperlukan ===
  async function loadHighlightJSIfNeeded(): Promise<any> {
    const hasCodeBlocks = document.querySelector("pre code");
    if (!hasCodeBlocks) return null;

    if (window.hljs) return window.hljs;

    // Cek apakah script sedang dimuat oleh elemen lain
    if (document.querySelector('script[src="/ext/highlight.js"]')) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (window.hljs) {
            clearInterval(check);
            resolve(window.hljs);
          }
        }, 100);
      });
    }

    const script = document.createElement("script");
    script.src = "/ext/highlight.js";
    script.defer = true;
    document.head.appendChild(script);

    await new Promise((res) => (script.onload = res));
    return window.hljs;
  }

  // === 2️⃣ Terapkan tema highlight.js sesuai sistem ===
  function applyHighlightTheme(): void {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const existing = document.querySelector("link[data-hljs-theme]") as HTMLLinkElement | null;
    const newHref = prefersDark ? "/ext/github-dark.min.css" : "/ext/github.min.css";

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

  function setupThemeListener(): void {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyHighlightTheme);
  }

  // === 3️⃣ Markdown converter (Regex Engine) ===
  function convertInlineMarkdown(text: string): string {
    return text
      .replace(/&gt;/g, ">")
      // Block Code (Triple Backtick)
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
        const language = lang || "plaintext";
        return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
      })
      // Horizontal Rule
      .replace(/^([\-\*_]){3,}\s*$/gm, "<hr>")
      // Table (Auto Data-Label for Mobile)
      .replace(/((?:\|.*\|\n)+)/g, (match) => {
        const rows = match.trim().split("\n").filter((r) => r.trim());
        if (rows.length < 2) return match;
        const headerTexts = rows[0].split("|").filter(Boolean).map((c) => c.trim());
        const headerHTML = headerTexts.map((c) => `<th>${c}</th>`).join("");
        const bodyHTML = rows.slice(2).map((r) => {
          const cells = r.split("|").filter(Boolean).map((c) => c.trim());
          const cellsHTML = cells.map((content, index) => {
            const label = headerTexts[index] || "";
            return `<td data-label="${label}">${content}</td>`;
          }).join("");
          return `<tr>${cellsHTML}</tr>`;
        }).join("");
        return `<div class="dns-table-container"><table class="dns-card-mode"><thead><tr>${headerHTML}</tr></thead><tbody>${bodyHTML}</tbody></table></div>`;
      })
      // Headers
      .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
      .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
      .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      // Blockquote
      .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")
      // Image & Link
      .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%; height:auto; display:block; margin:10px 0; border-radius:8px;">')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
      // Text Styles
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, "$1<em>$2</em>$3")
      // Inline Code (Single Backtick)
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // Lists
      .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, (match) => {
        return match.includes('<ul>') ? match : `<ul>${match}</ul>`;
      });
  }

  // === 4️⃣ Proses Markdown di halaman ==
  function enhanceMarkdown(): void {
    const selector = "p, ol, ul, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, .alert, .alert-box, .article-container, .author-box, .card, .callout, .code-block, .closing, .contact, .danger-box, .disclaimer, .fa-solid, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .markdown-body, .meta, .meta-info, .narasi, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy";

    document.querySelectorAll(selector).forEach((el) => {
      const element = el as HTMLElement;
      if (element.classList.contains("no-md")) return;
      let original = element.innerHTML;
      if (!original.trim()) return;
      const rendered = convertInlineMarkdown(original);
      if (rendered !== original) { element.innerHTML = rendered; }
    });
  }

  // === 5️⃣ Fix Display Inline Code ===
  function fixInlineCodeDisplay(): void {
    document.querySelectorAll<HTMLElement>("code.inline-code").forEach((el) => {
      el.style.display = "inline";
      el.style.fontFamily = "'Courier New', Courier, monospace";
    });
  }

  // === 6️⃣ Highlight JS Init ===
  async function highlightIfPresent(): Promise<void> {
    const codeBlocks = document.querySelectorAll("pre code");
    if (!codeBlocks.length) return;
    const hljs = await loadHighlightJSIfNeeded();
    if (!hljs) return;
    applyHighlightTheme();
    setupThemeListener();
    codeBlocks.forEach((el) => {
      try { window.hljs.highlightElement(el); } catch (e) {}
    });
  }

  // === 🚀 Main Launch ===
  async function run(): Promise<void> {
    enhanceMarkdown();
    fixInlineCodeDisplay();
    await highlightIfPresent();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
