/*!
 * markdown.js v6.0 — Zero-Touch Auto Markdown + CSS Inject
 * Otomatis deteksi Markdown, konversi, dan inject CSS
 * Aman untuk semua elemen HTML
 */

(function () {
  'use strict';

  // === INJECT CSS OTOMATIS ===
  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .md-link { color: #3498db; text-decoration: underline; }
      .md-inline { background: #f4f4f9; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
      .md-table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      .md-table th, .md-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      @media (prefers-color-scheme: dark) {
        .md-inline { background: #34495e; color: #ecf0f1; }
        .md-table { border-color: #3b506b; }
        .md-table th, .md-table td { border-color: #3b506b; }
      }
    `;
    document.head.appendChild(style);
  }

  // === MUAT HIGHLIGHT.JS ===
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
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css';
        document.head.appendChild(link);
        resolve(window.hljs);
      };
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
    return hljsPromise;
  }

  // === DETEKSI MARKDOWN ===
  function isLikelyMarkdown(text) {
    if (!text || text.length < 10) return false;
    const trimmed = text.trim();
    return (
      /^#{1,6}\s/.test(trimmed) ||
      /^\s*[-*+]\s/.test(trimmed) ||
      /^\s*>\s/.test(trimmed) ||
      /```[\s\S]*```/.test(text) ||
      /\[.*?\]\(.+?\)/.test(text) ||
      /\*\*.*\*\*/.test(text) ||
      /^\s*\|.*\|/.test(trimmed) && text.includes('\n')
    );
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

  // === INLINE MARKDOWN ===
  function processInline(text) {
    return text
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>');
  }

  // === PARSE TABEL ===
  function parseTable(lines) {
    const rows = lines.map(l => l.trim()).filter(Boolean);
    if (rows.length < 2) return null;

    const cleanRows = rows.filter(r => !/^[\s|:-]+$/.test(r.replace(/\|/g, '')));
    if (cleanRows.length < 1) return null;

    const header = cleanRows[0].split('|').filter(Boolean).map(h => `<th>${escapeHTML(h.trim())}</th>`).join('');
    const body = cleanRows.slice(1).map(r =>
      '<tr>' + r.split('|').filter(Boolean).map(c => `<td>${escapeHTML(c.trim())}</td>`).join('') + '</tr>'
    ).join('');

    return `<table class="md-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
  }

  // === PROSES TEXT NODE ===
  function processTextNode(node) {
    const text = node.textContent;
    if (!isLikelyMarkdown(text)) return false;

    const parent = node.parentNode;
    if (parent.closest('pre, code, script, style, .no-md')) return false;
    if (parent.tagName === 'CODE' || parent.tagName === 'PRE') return false;

    const lines = text.split('\n');
    const blocks = [];
    let i = 0;
    let hasCodeBlock = false;

    while (i < lines.length) {
      const rawLine = lines[i];
      const line = rawLine.trim();

      // Code block
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

      // Tabel
      if (line.includes('|') && /^\s*\|/.test(rawLine)) {
        const tableLines = [rawLine];
        i++;
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          tableLines.push(lines[i]);
          i++;
        }
        const tableHTML = parseTable(tableLines);
        if (tableHTML) {
          blocks.push(tableHTML);
          continue;
        }
        i--;
      }

      // Heading
      const heading = rawLine.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        blocks.push(`<h${level}>${escapeHTML(heading[2])}</h${level}>`);
        i++;
        continue;
      }

      // List
      if (/^\s*[-*+]\s/.test(rawLine)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
          const item = lines[i].replace(/^\s*[-*+]\s+/, '');
          items.push(`<li>${processInline(item)}</li>`);
          i++;
        }
        blocks.push(`<ul>${items.join('')}</ul>`);
        continue;
      }

      // Blockquote
      if (line.startsWith('>')) {
        blocks.push(`<blockquote>${processInline(line.slice(1).trim())}</blockquote>`);
        i++;
        continue;
      }

      // Paragraf
      if (line) {
        blocks.push(`<p>${processInline(line)}</p>`);
      }
      i++;
    }

    if (blocks.length === 0) return false;

    const temp = document.createElement('div');
    temp.innerHTML = blocks.join('');
    while (temp.firstChild) {
      parent.insertBefore(temp.firstChild, node);
    }
    parent.removeChild(node);

    return hasCodeBlock;
  }

  // === ENHANCE ALL ===
  function enhance() {
    injectCSS(); // Inject sekali saja

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

  // Observe dynamic content
  new MutationObserver(enhance).observe(document.body, {
    childList: true,
    subtree: true
  });

})();
