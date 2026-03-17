/**
 * MARKDOWN ENHANCER v4.6 (Universal & Smart Agresif)
 * Optimal untuk: Blog dinamis, Tabel Card-Mode, dan Script Kalkulator.
 */

function convertInlineMarkdown(text: string): string {
  return text
  .replace(/&gt;/g, ">")
  // Block Code (Triple Backtick)
  .replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre><code class="language-${lang || "plaintext"}">${code.trim()}</code></pre>`;
  })
  // Horizontal Rule
  .replace(/^([\-\*_]){3,}\s*$/gm, "<hr>")
  // Table (Card-Mode Friendly)
  .replace(/((?:\|.*\|\n)+)/g, (match) => {
    const rows = match.trim().split("\n").filter((r) => r.trim());
    if (rows.length < 2) return match;
    const headerTexts = rows[0].split("|").filter(Boolean).map((c) => c.trim());
    const headerHTML = headerTexts.map((c) => `<th>${c}</th>`).join("");
    const bodyHTML = rows.slice(2).map((r) => {
      const cells = r.split("|").filter(Boolean).map((c) => c.trim());
      return `<tr>${cells.map((content, i) => `<td data-label="${headerTexts[i] || ""}">${content}</td>`).join("")}</tr>`;
    }).join("");
    return `<div class="dns-table-container"><table class="dns-card-mode"><thead><tr>${headerHTML}</tr></thead><tbody>${bodyHTML}</tbody></table></div>`;
  })
  // Headers (Support Optional Leading Spaces)
  .replace(/^\s*#{6} (.*)$/gm, "<h6>$1</h6>")
  .replace(/^\s*#{5} (.*)$/gm, "<h5>$1</h5>")
  .replace(/^\s*#{4} (.*)$/gm, "<h4>$1</h4>")
  .replace(/^\s*#{3} (.*)$/gm, "<h3>$1</h3>")
  .replace(/^\s*#{2} (.*)$/gm, "<h2>$1</h2>")
  .replace(/^\s*#{1} (.*)$/gm, "<h1>$1</h1>")
  // Blockquote & Styles
  .replace(/^\s*> (.*)$/gm, "<blockquote>$1</blockquote>")
  .replace(/~~(.*?)~~/g, '<del>$1</del>')
  .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
  .replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, "$1<em>$2</em>$3")
  // Links & Images
  .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%; border-radius:8px;">')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
  // Inline Code
  .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
  // Lists
  .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
  .replace(/(<li>.*<\/li>)/gs, (m) => (m.includes('<ul>') || m.includes('<ol>') ? m : `<ul>${m}</ul>`));
}

function enhanceMarkdown(): void {
  // Selektor General
  const selector = "p, blockquote, td, th, h1, h2, h3, h4, h5, h6, li, pre, div, .alert, .alert-box, .article-container, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .danger-box, .disclaimer, .fa-solid, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .language-markdown, .markdown, .markdown-body, .meta, .meta-info, .narasi, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";

  document.querySelectorAll(selector).forEach((el) => {
    const element = el as HTMLElement;

    // 1. Skip jika Manual Override
    if (element.classList.contains("no-md")) return;

    // 2. Proteksi Highlight.js (Hanya skip jika ini PRE yang berisi kode pemrograman)
    const isTechnicalCode = element.tagName === 'PRE' && element.querySelector('code[class*="language-"]');
    if (isTechnicalCode) return;

    // 3. Leaf Node Logic: Cegah duplikasi render di container besar
    if (element.tagName === 'DIV' && element.children.length > 0) {
      // Kecuali div tersebut memang ditandai sebagai area markdown murni
      if (!element.classList.contains('language-markdown') && !element.classList.contains('markdown-body')) {
        return;
      }
    }

    // 4. Cegah rekursi list
    if (element.tagName === 'LI' && element.querySelector('ul, ol')) return;

    const original = element.innerHTML;
    // Jangan bedah ulang table yang sudah jadi atau HTML yang sudah sangat kompleks
    if (!original.trim() || original.includes('<table') || original.includes('<div class="dns')) return;

    const rendered = convertInlineMarkdown(original);
    if (rendered !== original) {
      element.innerHTML = rendered;
    }
  });
}

function watchForChanges(): void {
  const observer = new MutationObserver((mutations) => {
    let shouldRun = false;
    mutations.forEach(m => { if (m.addedNodes.length > 0) shouldRun = true; });
    if (shouldRun) enhanceMarkdown();
  });
    observer.observe(document.body, { childList: true, subtree: true });
}

function run(): void {
  enhanceMarkdown();
  // Support untuk fungsi fix display jika ada
  if (typeof (window as any).fixInlineCodeDisplay === 'function') (window as any).fixInlineCodeDisplay();
  watchForChanges();
}

// Global Execution
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
