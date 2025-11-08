/*!
 * nano-md.js — Markdown Lite Enhancer
 * 🌿 Konversi Markdown sederhana → HTML dengan aman
 * Otomatis muat highlight.js hanya jika ada <code>
 * Aman dari XSS, mendukung nested list, tabel, dan lebih akurat
 * Versi: 2.0.0 | Author: frijal (enhanced by AI)
 */

(function () {
  'use strict';

  // === KONFIGURASI ===
  const HIGHLIGHT_CDN = {
    js: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js",
    css: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css"
  };

  const SELECTORS = "p, li, blockquote, .markdown, .markdown-body, .md";

  // === UTILITAS ===
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function unescapeHTML(str) {
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent;
  }

  // === MUAT HIGHLIGHT.JS SEKALI SAJA ===
  let hljsPromise = null;
  async function ensureHighlightJS() {
    if (hljsPromise) return hljsPromise;
    if (window.hljs) return window.hljs;

    hljsPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = HIGHLIGHT_CDN.js;
      script.defer = true;

      const link = document.createElement('link');
      link.rel = "stylesheet";
      link.href = HIGHLIGHT_CDN.css;

      script.onload = () => {
        document.head.appendChild(link);
        resolve(window.hljs);
      };

      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });

    return hljsPromise;
  }

  // === PARSING MARKDOWN PER BARIS (AKURAT & AMAN) ===
  function parseMarkdownLines(lines) {
    const output = [];
    let listStack = []; // untuk nested list
    let inCodeBlock = false;
    let codeLang = '';
    let codeLines = [];

    const closeLists = () => {
      while (listStack.length) {
        output.push(listStack.pop().close());
      }
    };

    const pushLine = (html) => {
      if (listStack.length) {
        const current = listStack[listStack.length - 1];
        current.items.push(html);
      } else {
        output.push(html);
      }
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmed = line.trim();

        // --- CODE BLOCK ---
        if (trimmed.startsWith('```')) {
          if (inCodeBlock) {
            const code = codeLines.join('\n').trim();
            const langClass = codeLang ? `class="language-${codeLang}"` : '';
            pushLine(`<pre><code ${langClass}>${escapeHTML(code)}</code></pre>`);
            inCodeBlock = false;
            codeLang = '';
            codeLines = [];
          } else {
            closeLists();
            inCodeBlock = true;
            codeLang = trimmed.slice(3).trim() || 'plaintext';
          }
          continue;
        }

        if (inCodeBlock) {
          codeLines.push(line);
          continue;
        }

        // --- TABEL ---
        if (trimmed.includes('|') && /^\s*\|.*\|\s*$/.test(line)) {
          let tableLines = [line];
          // Kumpulkan baris tabel
          for (let j = i + 1; j < lines.length; j++) {
            const next = lines[j];
            if (/^\s*\|.*\|\s*$/.test(next)) {
              tableLines.push(next);
              i = j; // skip
            } else {
              break;
            }
          }

          const tableHTML = parseTable(tableLines);
          if (tableHTML) {
            closeLists();
            pushLine(tableHTML);
            continue;
          }
        }

        // --- BLOCKQUOTE ---
        if (trimmed.startsWith('>')) {
          closeLists();
          const content = line.replace(/^>\s*/, '');
          const nested = parseMarkdownLines([content]);
          pushLine(`<blockquote>${nested.join('')}</blockquote>`);
          continue;
        }

        // --- HEADING ---
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          closeLists();
          const level = headingMatch[1].length;
          const text = escapeHTML(headingMatch[2]);
          pushLine(`<h${level}>${text}</h${level}>`);
          continue;
        }

        // --- LIST (nested support) ---
        const listMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
        if (listMatch) {
          const indent = listMatch[1].length;
          const itemText = listMatch[2];

          // Hitung level indentasi (setiap 2 spasi = 1 level)
          const level = Math.floor(indent / 2);

          // Tutup list yang lebih dalam
          while (listStack.length > level) {
            const closed = listStack.pop().close();
            if (listStack.length > 0) {
              listStack[listStack.length - 1].items.push(closed);
            } else {
              output.push(closed);
            }
          }

          // Buka list baru jika perlu
          if (listStack.length === level) {
            listStack[level - 1].items.push(`<li>${itemText}</li>`);
          } else {
            const tag = level % 2 === 0 ? '<ul>' : '<ol>';
            const closer = level % 2 === 0 ? '</ul>' : '</ol>';
            const newList = {
              tag,
              closer,
              items: [`<li>${itemText}</li>`],
              close() { return this.tag + this.items.join('') + this.closer; }
            };
            listStack[level] = newList;

            if (listStack.length > level + 1) {
              listStack[level + 1] = null;
            }
          }
          continue;
        }

        // --- PARAGRAF KOSONG ---
        if (trimmed === '') {
          closeLists();
          continue;
        }

        // --- PARAGRAF BIASA ---
        closeLists();
        pushLine(`<p>${processInline(itemText || line)}</p>`);
    }

    // Tutup semua list & code block
    if (inCodeBlock) {
      pushLine(`<pre><code>${escapeHTML(codeLines.join('\n'))}</code></pre>`);
    }
    closeLists();

    return output;
  }

  // === PARSE TABEL ===
  function parseTable(lines) {
    const rows = lines.map(l => l.trim()).filter(Boolean);
    if (rows.length < 2) return null;

    // Abaikan baris pemisah ---
    const cleanRows = rows.filter(r => !/^[\s|:-]+$/.test(r.replace(/\|/g, '')));
    if (cleanRows.length < 1) return null;

    const cols = cleanRows[0].split('|').filter(Boolean);
    const header = cols.map(h => `<th>${escapeHTML(h.trim())}</th>`).join('');
    const bodyRows = cleanRows.slice(1).map(r => {
      const cells = r.split('|').filter(Boolean);
      const tds = cells.map(c => `<td>${escapeHTML(c.trim())}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');

    return `<table class="md-table"><thead><tr>${header}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  }

  // === INLINE MARKDOWN (bold, italic, code, link) ===
  function processInline(text) {
    if (!text || typeof text !== 'string') return '';

    return text
      // Link [text](url)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
        const cleanLabel = escapeHTML(label);
        const cleanUrl = escapeHTML(url);
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="md-link">${cleanLabel}</a>`;
      })
      // Bold **text**
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic *text*
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // Code `text`
      .replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>');
  }

  // === ENHANCE ELEMENT ===
  function enhanceElement(el) {
    if (el.dataset.nanoMd === 'done') return;
    if (el.classList.contains('no-md')) return;

    const text = el.textContent || el.innerHTML;
    if (!text.trim()) return;

    // Parse per baris
    const lines = text.split('\n');
    const htmlLines = parseMarkdownLines(lines);
    const finalHTML = htmlLines.join('');

    // Sanitasi ringan (opsional: gunakan DOMPurify di produksi)
    el.innerHTML = finalHTML;
    el.dataset.nanoMd = 'done';
  }

  // === ENHANCE ALL ===
  function enhanceMarkdown() {
    document.querySelectorAll(SELECTORS).forEach(enhanceElement);
  }

  // === HIGHLIGHT CODE ===
  async function highlightCodeBlocks() {
    if (!document.querySelector('pre code')) return;

    const hljs = await ensureHighlightJS();
    if (!hljs) return;

    document.querySelectorAll('pre code[class*="language-"], pre code').forEach(block => {
      try {
        if (!block.classList.contains('hljs')) {
          hljs.highlightElement(block);
        }
      } catch (e) {
        console.warn('Highlight.js error:', e);
      }
    });
  }

  // === OBSERVE PERUBAHAN DOM (untuk konten dinamis) ===
  function observeMutations() {
    const observer = new MutationObserver((mutations) => {
      let shouldEnhance = false;
      mutations.forEach(m => {
        if (m.addedNodes.length) shouldEnhance = true;
      });
      if (shouldEnhance) {
        enhanceMarkdown();
        highlightCodeBlocks();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // === INIT ===
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  async function run() {
    enhanceMarkdown();
    await highlightCodeBlocks();
    observeMutations();
  }

  // Jalankan
  init();

  // Eksport untuk testing (opsional)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseMarkdownLines, processInline };
  }
})();
