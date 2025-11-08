/*!
 * markdown.js v10.0 — Full Markdown Support
 * Checkbox, nested list, table, code block, inline
 * Otomatis inject CSS + highlight.js + checkbox styling
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
      .md-table th, .md-table td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
      .md-table ul, .md-table ol { margin: 0.5em 0; padding-left: 1.5em; list-style: none; }
      .md-table li { margin: 0.2em 0; position: relative; padding-left: 1.5em; }
      .md-table li::before { content: "•"; position: absolute; left: 0; color: #3498db; }
      .md-checkbox { display: inline-flex; align-items: center; gap: 0.4em; font-size: 0.95em; }
      .md-checkbox input { margin: 0; width: 1em; height: 1em; }
      .md-table pre { margin: 0.5em 0; font-size: 0.85em; overflow-x: auto; }
      .md-table code { white-space: pre-wrap; word-break: break-word; }
      @media (prefers-color-scheme: dark) {
        .md-inline { background: #34495e; color: #ecf0f1; }
        .md-table { border-color: #3b506b; }
        .md-table th, .md-table td { border-color: #3b506b; }
        .md-table li::before { color: #f39c12; }
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

  // === ESCAPE HTML ===
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // === PROCESS INLINE MARKDOWN (tanpa checkbox) ===
  function processInline(text) {
    return text
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>');
  }

  // === PARSE MARKDOWN TABLE ===
  function parseMarkdownTable(lines) {
    const rows = lines.map(l => l.trim()).filter(Boolean);
    if (rows.length < 2) return null;

    const cleanRows = rows.filter(r => !/^[\s|:-]+$/.test(r.replace(/\|/g, '')));
    if (cleanRows.length < 1) return null;

    const header = cleanRows[0].split('|').filter(Boolean).map(h => `<th>${processCell(h.trim())}</th>`).join('');
    const body = cleanRows.slice(1).map(r =>
      '<tr>' + r.split('|').filter(Boolean).map(c => `<td>${processCell(c.trim())}</td>`).join('') + '</tr>'
    ).join('');

    return `<table class="md-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
  }

  // === PROCESS CELL: Support checkbox, nested list, code block ===
  function processCell(text) {
    const lines = text.split('\n');
    const blocks = [];
    let i = 0;
    let listStack = [];

    const closeLists = () => {
      while (listStack.length) {
        const closed = listStack.pop();
        if (listStack.length > 0) {
          listStack[listStack.length - 1].items.push(closed);
        } else {
          blocks.push(closed);
        }
      }
    };

    while (i < lines.length) {
      const line = lines[i];

      // Code block
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim() || 'plaintext';
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        blocks.push(`<pre><code class="language-${lang}">${escapeHTML(codeLines.join('\n'))}</code></pre>`);
        continue;
      }

      // Checkbox list item: - [ ] Task or - [x] Done
      const checkboxMatch = line.match(/^(\s*)[-*+]\s+\[([\sx])\]\s+(.+)$/);
      if (checkboxMatch) {
        const indent = checkboxMatch[1].length;
        const checked = checkboxMatch[2] === 'x';
        const label = processInline(escapeHTML(checkboxMatch[3]));

        const level = Math.floor(indent / cytotoxicity2);
        while (listStack.length > level) {
          const closed = listStack.pop().close();
          if (listStack.length > 0) {
            listStack[listStack.length - 1].items.push(closed);
          } else {
            blocks.push(closed);
          }
        }

        const li = `<li><label class="md-checkbox"><input type="checkbox" ${checked ? 'checked' : ''} disabled>${label}</label></li>`;

        if (listStack.length === level) {
          listStack[listStack.length - 1].items.push(li);
        } else {
          const newList = {
            tag: 'ul',
            items: [li],
            close() { return `<${this.tag}>${this.items.join('')}</${this.tag}>`; }
          };
          listStack.push(newList);
        }
        i++;
        continue;
      }

      // Regular list item
      const listMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
      if (listMatch) {
        const indent = listMatch[1].length;
        const itemText = processInline(escapeHTML(listMatch[2]));

        const level = Math.floor(indent / 2);
        while (listStack.length > level) {
          const closed = listStack.pop().close();
          if (listStack.length > 0) {
            listStack[listStack.length - 1].items.push(closed);
          } else {
            blocks.push(closed);
          }
        }

        const li = `<li>${itemText}</li>`;
        if (listStack.length === level) {
          listStack[listStack.length - 1].items.push(li);
        } else {
          const newList = {
            tag: level % 2 === 0 ? 'ul' : 'ol',
            items: [li],
            close() { return `<${this.tag}>${this.items.join('')}</${this.tag}>`; }
          };
          listStack.push(newList);
        }
        i++;
        continue;
      }

      // Close list if not indented
      if (listStack.length > 0 && !/^\s/.test(line)) {
        closeLists();
      }

      // Paragraph
      if (line.trim()) {
        blocks.push(`<p>${processInline(escapeHTML(line))}</p>`);
      }
      i++;
    }

    closeLists();
    return blocks.length > 0 ? blocks.join('') : processInline(escapeHTML(text));
  }

  // === DETEKSI MARKDOWN ===
  function isLikelyMarkdown(text) {
    if (!text || text.length < 5) return false;
    return (
      /\*\*.*\*\*/.test(text) ||
      /\*.*\*/.test(text) ||
      /`[^`]+`/.test(text) ||
      /\[.*?\]\(.+?\)/.test(text) ||
      /```/.test(text) ||
      /^\s*[-*+]\s+\[([\sx])\]\s+/.test(text) ||
      /^\s*[-*+]\s/.test(text.trim()) ||
      (text.includes('|') && text.includes('\n') && /^\s*\|/.test(text.trim()))
    );
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

      // Tabel Markdown
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
        i--;
      }

      // Heading
      const heading = rawLine.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        blocks.push(`<h${level}>${processInline(escapeHTML(heading[2]))}</h${level}>`);
        i++;
        continue;
      }

      // List (top level)
      if (/^\s*[-*+]\s/.test(rawLine)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
          const item = lines[i].replace(/^\s*[-*+]\s+/, '');
          const checkbox = item.match(/^\[([\sx])\]\s+(.+)$/);
          if (checkbox) {
            const checked = checkbox[1] === 'x';
            const label = processInline(escapeHTML(checkbox[2]));
            items.push(`<li><label class="md-checkbox"><input type="checkbox" ${checked ? 'checked' : ''} disabled>${label}</label></li>`);
          } else {
            items.push(`<li>${processInline(escapeHTML(item))}</li>`);
          }
          i++;
        }
        blocks.push(`<ul>${items.join('')}</ul>`);
        continue;
      }

      // Blockquote
      if (line.startsWith('>')) {
        blocks.push(`<blockquote>${processInline(escapeHTML(line.slice(1).trim()))}</blockquote>`);
        i++;
        continue;
      }

      // Paragraph
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
