/*!
 * markdown.js v7.0 — Full Table Markdown Support
 * BISA baca **bold**, *italic*, `code`, [link], ```code block```, dll DI DALAM <td>
 * Otomatis inject CSS + highlight.js
 * Zero-touch HTML
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
      .md-table pre { margin: 0; }
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
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css';
        document.head.appendChild(link);
        resolve(window.hljs);
      };
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
    return hljsPromise;
  }

  // === ESCAPE & PROCESS INLINE ===
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function processInline(text) {
    return text
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>');
  }

  // === DETEKSI MARKDOWN ===
  function isLikelyMarkdown(text) {
    if (!text || text.length < 5) return false;
    return (
      /\*\*.*\*\*/.test(text) ||
      /\*.*\*/.test(text) && !/^\s*[-*+]\s/.test(text.trim()) ||
      /`[^`]+`/.test(text) ||
      /\[.*?\]\(.+?\)/.test(text) ||
      /```/.test(text)
    );
  }

  // === PROSES SATU TEXT NODE (termasuk di <td>) ===
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
      const line = lines[i].trim();

      // Code block di dalam tabel
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

      // Inline-only untuk baris pendek (di dalam <td>)
      if (lines.length === 1 || line.length < 100) {
        blocks.push(processInline(text));
        break;
      }

      i++;
    }

    if (blocks.length === 0) return false;

    const html = blocks.join('');
    if (html === text) return false;

    const temp = document.createElement('div');
    temp.innerHTML = html;
    const parentNode = node.parentNode;
    while (temp.firstChild) {
      parentNode.insertBefore(temp.firstChild, node);
    }
    parentNode.removeChild(node);

    return hasCodeBlock;
  }

  // === ENHANCE ALL TEXT NODES (termasuk di <table>) ===
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
