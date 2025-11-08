/*!
 * markdown.js v8.0 — Full Fallback: Markdown Table to HTML
 * Inline + Full Table + Code Block + Zero Touch
 * Otomatis inject CSS + highlight.js
 */

(function () {
  'use strict';

  // === INJECT CSS ===
  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .md-link { color: #3498db; text-decoration: underline; }
      .md-inline { background: #f4f4f9; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
      .md-table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      .md-table th, .md-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .md-table pre { margin: 0; font-size: 0.85em; }
      .md-table code { white-space: pre-wrap; word-break: break-word; }
      @media (prefers-color-scheme: dark) {
        .md-inline { background: #34495e; color: #ecf0f1; }
        .md-table { border-color: #3b506b; }
        .md-table th, .md-table td { border-color: #3b506b; }
      }
    `;
    document.head.appendChild(style);
  }

  // === HIGHLIGHT.JS ===
  let hljsPromise = null;
  async function ensureHighlightJS() {
    if (hljsPromise) return hljsPromise;
    if (window.hljs) return window.hljs;

    hljsPromise = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js';
      script.onload = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-Abyss.min.css';
        document.head.appendChild(link);
        resolve(window.hljs);
      };
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
    return hljsPromise;
  }

  // === ESCAPE HTML ===
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // === PROCESS INLINE MARKDOWN ===
  function processInline(text) {
    return text
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>');
  }

  // === PARSE MARKDOWN TABLE (fallback) ===
  function parseMarkdownTable(lines) {
    const rows = lines.map(l => l.trim()).filter(Boolean);
    if (rows.length < 2) return null;

    // Abaikan baris pemisah
    const cleanRows = rows.filter(r => !/^[\s|:-]+$/.test(r.replace(/\|/g, '')));
    if (cleanRows.length < 1) return null;

    const header = cleanRows[0].split('|').filter(Boolean).map(h => `<th>${processInline(escapeHTML(h.trim()))}</th>`).join('');
    const body = cleanRows.slice(1).map(r =>
      '<tr>' + r.split('|').filter(Boolean).map(c => `<td>${processInline(escapeHTML(c.trim()))}</td>`).join('') + '</tr>'
    ).join('');

    return `<table class="md-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
  }

  // === DETEKSI MARKDOWN (termasuk tabel) ===
  function isLikelyMarkdown(text) {
    if (!text || text.length < 5) return false;
    return (
      /\*\*.*\*\*/.test(text) ||
      /\*.*\*/.test(text) ||
      /`[^`]+`/.test(text) ||
      /\[.*?\]\(.+?\)/.test(text) ||
      /```/.test(text) ||
      (text.includes('|') && text.includes('\n') && /^\s*\|/.test(text.trim()))
    );
  }

  // === PROSES SATU TEXT NODE ===
  function processTextNode(node) {
    const text = node.textContent;
    if (!isLikelyMarkdown(text)) return false;

    const parent = node.parentNode;
    if (parent.closest('pre, code, script, style, .no-md')) return false;
    if (parent.tagName === 'CODE' || parent.tagName === 'PRE') return false;

    const lines = text.split('\n').map(l => l);
    const blocks = [];
    let i = 0;
    let hasCodeBlock = false;

    while (i < lines.length) {
      const rawLine = lines[i];
      const line = rawLine.trim();

      // === CODE BLOCK ===
      if (line.startsWith('```')) {
        const lang = line.slice(3).trim() || 'plaintext';
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        blocks.push(`<pre><code class="language-${lang}">${escapeHTML(codeLines.join('\n'))}</code></pre>`);
        hasCodeBlock = true;
        continue;
      }

      // === TABEL MARKDOWN (fallback) ===
      if (line.includes('|') && /^\s*\|/.test(rawLine)) {
        const tableLines = [rawLine];
        i++;
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          tableLines.push(lines[i]);
          i++;
        }
        const tableHTML = parseMarkdownTable(tableLines);
        if (tableHTML) {
          blocks.push(tableHTML);
          continue;
        }
        i--; // rollback jika gagal
      }

      // === HEADING ===
      const heading = rawLine.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        blocks.push(`<h${level}>${processInline(escapeHTML(heading[2]))}</h${level}>`);
        i++;
        continue;
      }

      // === LIST ===
      if (/^\s*[-*+]\s/.test(rawLine)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
          const item = lines[i].replace(/^\s*[-*+]\s+/, '');
          items.push(`<li>${processInline(escapeHTML(item))}</li>`);
          i++;
        }
        blocks.push(`<ul>${items.join('')}</ul>`);
        continue;
      }

      // === BLOCKQUOTE ===
      if (line.startsWith('>')) {
        blocks.push(`<blockquote>${processInline(escapeHTML(line.slice(1).trim()))}</blockquote>`);
        i++;
        continue;
      }

      // === PARAGRAF / INLINE ONLY ===
      if (line) {
        blocks.push(`<p>${processInline(escapeHTML(rawLine))}</p>`);
      }
      i++;
    }

    if (blocks.length === 0) return false;

    const temp = document.createElement('div');
    temp.innerHTML = blocks.join('');
    const parentNode = node.parentNode;
    while (temp.firstChild) {
      parentNode.insertBefore(temp.firstChild, node);
    }
    parentNode.removeChild(node);

    return hasCodeBlock;
  }

  // === ENHANCE ALL ===
  function enhance() {
    injectCSS();

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) nodes.push(node);
    }

    let hasCodeBlock = false;
    nodes.forEach(n => {
      if (processTextNode(n)) hasCodeBlock = true;
    });

    if (hasCodeBlock) {
      ensureHighlightJS().then(hljs => {
        if (hljs) {
          document.querySelectorAll('pre code').forEach(block => {
            try { hljs.highlightElement(block); } catch {}
          });
        }
      });
    }
  }

  // === INIT ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance);
  } else {
    enhance();
  }

  new MutationObserver(enhance).observe(document.body, {
    childList: true,
    subtree: true
  });

})();
