/*!
 * markdown-enhancer.js frijal
 * 🌿 Meningkatkan konten HTML yang berisi sintaks Markdown & blok kode.
 * Otomatis memuat highlight.js bila perlu.
 */
(async function () {
  // Muat highlight.js otomatis bila belum tersedia
  async function ensureHighlightJS() {
    if (window.hljs) return window.hljs;

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js";
    script.defer = true;
    document.head.appendChild(script);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/github-dark.min.css";
    document.head.appendChild(link);

    await new Promise(res => (script.onload = res));
    return window.hljs;
  }

// Konversi inline & blok Markdown → HTML ringan
function convertInlineMarkdown(text) {
  return text
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

    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 hover:underline">$1</a>')

    // Lists
    .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")

    // Code blocks ```
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
      const language = lang || "plaintext";
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    })

    // Tables (sederhana)
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

// Proses <p>, <li>, <blockquote> yang berisi Markdown
function enhanceMarkdown() {
  document.querySelectorAll("p, li, blockquote, .markdown, .markdown-body").forEach(el => {
    if (!el.classList.contains("no-md")) {
      el.innerHTML = convertInlineMarkdown(el.innerHTML);
    }
  });
}

// Proses highlight untuk <pre><code>
async function enhanceCodeBlocks() {
  const hljs = await ensureHighlightJS();
  document.querySelectorAll("pre code").forEach(el => {
    try { hljs.highlightElement(el); } catch {}
  });
}

  // Jalankan setelah DOM siap
  document.addEventListener("DOMContentLoaded", async () => {
    enhanceMarkdown();
    await enhanceCodeBlocks();
  });
})();

