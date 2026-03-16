/**
 * =============================================================
 * MARKDOWN ENHANCER v4.4 (Lean Edition)
 * Fokus: Hanya konversi Markdown, highlight.js diurus terpisah.
 * =============================================================
 */
// === 1️⃣ Markdown converter (Regex Engine) ===
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
    // Table
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
    // Inline Code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Lists (Tetap aman untuk <ol>)
    .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, (match) => {
      if (match.includes('<ul>') || match.includes('<ol>')) return match;
      return `<ul>${match}</ul>`;
    });
}

// === 2️⃣ Proses Markdown di halaman ==
function enhanceMarkdown(): void {
  // Masukkan 'li' kembali ke dalam selektor agar teks di dalam list di-render
  const selector = "p, blockquote, td, th, h1, h2, h3, h4, h5, h6, li, .alert, .alert-box, .article-container, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .danger-box, .disclaimer, .fa-solid, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .markdown-body, .meta, .meta-info, .narasi, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  
  document.querySelectorAll(selector).forEach((el) => {
    const element = el as HTMLElement;

    // Filter: 
    // 1. Lewati jika punya class "no-md"
    // 2. Lewati jika sudah ada di dalam <pre> (karena itu area highlight.js)
    // 3. Lewati jika itu adalah elemen list yang sebenarnya sudah terproses (hindari rekursi)
    if (element.classList.contains("no-md") || 
        element.closest('pre') || 
        (element.tagName === 'LI' && element.querySelector('ul, ol'))) return;
    
    const original = element.innerHTML;
    if (!original.trim()) return;
    
    const rendered = convertInlineMarkdown(original);
    if (rendered !== original) { 
      element.innerHTML = rendered; 
    }
  });
}

// === 🚀 Main Launch ===
function run(): void {
  enhanceMarkdown();
  fixInlineCodeDisplay();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
