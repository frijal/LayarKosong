/**
 * MARKDOWN ENHANCER v4.5 (Agresif & Dinamis)
 */

function convertInlineMarkdown(text: string): string {
  return text
  .replace(/&gt;/g, ">")
  .replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre><code class="language-${lang || "plaintext"}">${code.trim()}</code></pre>`;
  })
  .replace(/^([\-\*_]){3,}\s*$/gm, "<hr>")
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
  .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
  .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
  .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
  .replace(/^### (.*)$/gm, "<h3>$1</h3>")
  .replace(/^## (.*)$/gm, "<h2>$1</h2>")
  .replace(/^# (.*)$/gm, "<h1>$1</h1>")
  .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")
  .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%; border-radius:8px;">')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/~~(.*?)~~/g, '<del>$1</del>')
  .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
  .replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, "$1<em>$2</em>$3")
  .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
  .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
  .replace(/(<li>.*<\/li>)/gs, (m) => (m.includes('<ul>') || m.includes('<ol>') ? m : `<ul>${m}</ul>`));
}

function enhanceMarkdown(): void {
  // Ditambahkan 'div' agar bisa membedah div id=doc-begin atau hasil kalkulator
  const selector = "p, blockquote, td, th, h1, h2, h3, h4, h5, h6, li, div, .alert, .alert-box, .article-container, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .danger-box, .disclaimer, .fa-solid, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .language-markdown, .markdown, .markdown-body, .meta, .meta-info, .narasi, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";

  document.querySelectorAll(selector).forEach((el) => {
    const element = el as HTMLElement;

    if (element.classList.contains("no-md")) return;

    // Cegah rekursi pada list bersarang
    if (element.tagName === 'LI' && element.querySelector('ul, ol')) return;

    // Cegah memproses div yang merupakan container besar (hanya proses yang punya teks langsung)
    if (element.tagName === 'DIV' && element.children.length > 0 && !element.classList.contains('language-markdown')) {
      // Jika div punya anak tapi bukan khusus markdown, biarkan anak-anaknya yang diproses sendiri (Leaf Node)
      return;
    }

    const original = element.innerHTML;
    if (!original.trim() || original.includes('<table')) return; // Jangan bedah ulang table yang sudah jadi

    const rendered = convertInlineMarkdown(original);
    if (rendered !== original) {
      element.innerHTML = rendered;
    }
  });
}

function watchForChanges(): void {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) enhanceMarkdown();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function run(): void {
  enhanceMarkdown();
  if (typeof (window as any).fixInlineCodeDisplay === 'function') (window as any).fixInlineCodeDisplay();
  watchForChanges();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
