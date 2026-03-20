/**
 * MARKDOWN ENHANCER v7.4 (Layar Kosong Optimized)
 * Update: Anti-Dash List Fix & Em-Dash Support
 */

declare global {
  interface Window {
    hljs: any;
  }
}

function parseMarkdown(text: string): string {
  // 1. Unescape & Em-dash (Dahulukan agar tidak bentrok dengan List)
  let res = text.replace(/&gt;/g, ">").replace(/&lt;/g, "<");
  res = res.replace(/--/g, "&mdash;");

  // 2. PROTEKSI URL: Image, Link, & Inline Code
  res = res
  .replace(/!\[([^\]]*)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="md-img">')
  .replace(/\[([^\]]+)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
  .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // 3. HEADING
  res = res
  .replace(/(?:^|>|\s)###### (.*?)(?=\n|<|$)/g, "<h6>$1</h6>")
  .replace(/(?:^|>|\s)##### (.*?)(?=\n|<|$)/g, "<h5>$1</h5>")
  .replace(/(?:^|>|\s)#### (.*?)(?=\n|<|$)/g, "<h4>$1</h4>")
  .replace(/(?:^|>|\s)### (.*?)(?=\n|<|$)/g, "<h3>$1</h3>")
  .replace(/(?:^|>|\s)## (.*?)(?=\n|<|$)/g, "<h2>$1</h2>")
  .replace(/(?:^|>|\s)# (.*?)(?=\n|<|$)/g, "<h1>$1</h1>");

  // 4. BOLD, ITALIC, & STRIKETHROUGH
  res = res.replace(/(^|>|\s)\*\*([^\s*][^*]*[^\s*])\*\*([\s.,!?;:<]|$)/g, "$1<strong>$2</strong>$3");
  res = res.replace(/(^|>|\s)__([^\s_][^_]*[^\s_])__([\s.,!?;:<]|$)/g, "$1<strong>$2</strong>$3");
  res = res.replace(/(^|>|\s)\*([^\s*][^*]*[^\s*])\*([\s.,!?;:<]|$)/g, "$1<em>$2</em>$3");
  res = res.replace(/(^|>|\s)_([^\s_][^_]*[^\s_])_([\s.,!?;:<]|$)/g, "$1<em>$2</em>$3");
  res = res.replace(/(^|>|\s)~~([^\s~][^~]*[^\s~])~~([\s.,!?;:<]|$)/g, "$1<del>$2</del>$3");

  // 5. LIST & QUOTE (Anti-Dash Fix)
  // Menghapus '\s' di boundary awal agar tidak menangkap dash di tengah kalimat
  res = res.replace(/^[ \t]*>[ \t]?(.*?)[ \t]*$/gm, "<blockquote>$1</blockquote>");
  res = res.replace(/^[ \t]*[-*+][ \t]+(.*?)[ \t]*$/gm, "<li>$1</li>");

  // Auto wrap <li> ke dalam <ul>
return res.replace(/(<li>.*?<\/li>)/g, "<ul>$1</ul>").replace(/<\/ul><ul>/g, "");
}

function enhanceMarkdown(): void {
  const selector = "p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, footer, .alert, .alert-box, .article-container, .author-box, .box, .card, .callout, .code-block, .closing, .contact, .danger-box, .disclaimer, .fa-solid, .faq-item, .gallery, .highlight, .highlight-box, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .markdown-body, .meta, .meta-info, .narasi, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .zdummy, .zdummy1, .zdummy2, .zdummy3";

  const targets = document.querySelectorAll(selector);

  targets.forEach((el) => {
    const target = el as HTMLElement;
    if (target.classList.contains("no-md") || target.classList.contains("rendered")) return;

    const originalHTML = target.innerHTML;
    const rawContent = originalHTML.trim();

    // Tambahkan '-' ke regex deteksi pemicu agar Em-dash dan List terpantau
    if (/[\*\#_\[\]`~\-]/.test(rawContent)) {
      const newHTML = parseMarkdown(rawContent);
      if (newHTML !== originalHTML) {
        target.classList.add("rendered");
        target.innerHTML = newHTML;
      }
    }
  });
}

function checkAndLoadHighlight(): void {
  const hasCode = document.querySelector("pre code");
  if (!hasCode || !window.hljs) return;

  document.querySelectorAll("pre code").forEach((block) => {
    window.hljs.highlightElement(block as HTMLElement);
  });
}

function start(): void {
  enhanceMarkdown();
  checkAndLoadHighlight();

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => {
      enhanceMarkdown();
      checkAndLoadHighlight();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}