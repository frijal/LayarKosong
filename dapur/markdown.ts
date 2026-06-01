/**
 * MARKDOWN ENHANCER v8.0 (Layar Kosong Optimized)
 * Update: Dual-path rendering — data-md priority + legacy selector fallback
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
  res = res.replace(/(^|>|[\s(])\*\*([^\s*][^*]*[^\s*])\*\*([\s.,!?;:<()'"\/]|$)/g, "$1<strong>$2</strong>$3");
  res = res.replace(/(^|>|[\s(])__([^\s_][^_]*[^\s_])__([\s.,!?;:<()'"\/]|$)/g, "$1<strong>$2</strong>$3");
  res = res.replace(/(^|>|[\s(])\*([^\s*][^*]*[^\s*])\*([\s.,!?;:<()'"\/]|$)/g, "$1<em>$2</em>$3");
  res = res.replace(/(^|>|[\s(])_([^\s_][^_]*[^\s_])_([\s.,!?;:<()'"\/]|$)/g, "$1<em>$2</em>$3");
  res = res.replace(/(^|>|[\s(])~~([^\s~][^~]*[^\s~])~~([\s.,!?;:<()'"\/]|$)/g, "$1<del>$2</del>$3");

  // 5. BLOCKQUOTE — anchor ke awal baris dengan flag 'm'
  res = res.replace(/^[ \t]*>[ \t]?(.*?)[ \t]*$/gm, "<blockquote>$1</blockquote>");

  // 6. LIST — hanya proses kalau teks ASLI punya list marker di awal baris
  // Cek dari 'text' (parameter asli), bukan 'res' yang sudah ditransform
  // Ini mencegah '>' dari closing tag HTML (mis. </strong>) memicu regex list
  const hasRealListMarker = /^[ \t]*[-*+][ \t]+/m.test(text);
  if (hasRealListMarker) {
    res = res.replace(/^[ \t]*[-*+][ \t]+(.*?)[ \t]*$/gm, "<li>$1</li>");
  }

  // Auto wrap <li> ke dalam <ul>
  return res.replace(/(<li>.*?<\/li>)/g, "<ul>$1</ul>").replace(/<\/ul><ul>/g, "");
}

function processElement(el: HTMLElement): void {
  if (el.classList.contains("no-md") || el.classList.contains("rendered")) return;
  const originalHTML = el.innerHTML.trim();
  if (/[\*\#_\[\]`~\-]/.test(originalHTML)) {
    const newHTML = parseMarkdown(originalHTML);
    if (newHTML !== originalHTML) {
      el.classList.add("rendered");
      el.innerHTML = newHTML;
    }
  }
}

function enhanceMarkdown(): void {
  // ============================================================
  // JALUR BARU — data-md (artikel diproses cleanHTML.ts)
  // ============================================================
  const dataMdTargets = document.querySelectorAll<HTMLElement>("[data-md]");

  if (dataMdTargets.length > 0) {
    dataMdTargets.forEach(processElement);
    return; // tidak masuk logika lama sama sekali
  }

  // ============================================================
  // FALLBACK — logika lama (artikel dengan signature manual)
  // Scope ini tidak akan ditambah content baru
  // ============================================================
  const selector = "p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, footer, summary, .alert, .alert-box, .article-container, .article-meta, .author-box, .box, .callout, .card, .card-highlight, .card-tip, .closing, .code-block, .contact, .danger-box, .disclaimer, .fa-solid, .faq-item, .five-wh, .gallery, .highlight, .highlight-box, .important, .info-box, .intro-alert, .intro-box, .item, .lead, .lede, .markdown, .markdown-body, .meta, .meta-author, .meta-header, .meta-info, .narasi, .note, .note-box, .post-meta, .quote, .quote-box, .success-box, .timeline-item, .tip, .tip-box, .tips, .warn, .warning, .warning-box, .wh-item, .zdummy, .zdummy1, .zdummy2, .zdummy3";
  document.querySelectorAll<HTMLElement>(selector).forEach(processElement);
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