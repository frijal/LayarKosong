/*!
 * markdown.js v14.0 — NO XSS ESCAPING
 * Raw HTML diizinkan di Markdown
 * Auto detect, checkbox, nested list, table
 * Tanpa escapeHTML → bisa pakai <span>, <br>, dll
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'md-checkbox-states';

  // === INJECT CSS ===
  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .md-auto .md-link { color: #3498db; text-decoration: underline; }
      .md-auto .md-inline { background: #f4f4f9; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
      .md-auto .md-table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      .md-auto .md-table th, .md-auto .md-table td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
      .md-auto ul, .md-auto ol { margin: 0.5em 0; padding-left: 1.5em; list-style: none; }
      .md-auto li { margin: 0.2em 0; position: relative; padding-left: 1.8em; }
      .md-auto .md-checkbox { display: inline-flex; align-items: center; gap: 0.4em; font-size: 0.95em; cursor: pointer; user-select: none; }
      .md-auto .md-checkbox input { margin: 0; width: 1em; height: 1em; cursor: pointer; }
      .md-auto .md-checkbox input:checked + span { text-decoration: line-through; opacity: 0.7; }
      .md-auto pre { margin: 0.5em 0; font-size: 0.85em; overflow-x: auto; }
      .md-auto code { white-space: pre-wrap; word-break: break-word; }
      @media (prefers-color-scheme: dark) {
        .md-auto .md-inline { background: #34495e; color: #ecf0f1; }
        .md-auto .md-table { border-color: #3b506b; }
        .md-auto .md-table th, .md-auto .md-table td { border-color: #3b506b; }
      }
    `;
    if (!document.querySelector('style[data-md-css]')) {
      style.dataset.mdCss = 'true';
      document.head.appendChild(style);
    }
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

  // === STORAGE ===
  const checkboxStates = new Map();
  let saveTimeout = null;
  function saveStates() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const data = {};
      checkboxStates.forEach((v, k) => data[k] = v);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }, 300);
  }
  function loadStates() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) Object.entries(JSON.parse(data)).forEach(([k, v]) => checkboxStates.set(k, v));
    } catch (e) {}
  }

  let cbCounter = 0;
  function genId() { return `md-cb-${++cbCounter}-${Date.now()}`; }

  // === PROCESS INLINE (NO ESCAPE) ===
  function processInline(text) {
    return text
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>');
  }

  // === DETEKSI MARKDOWN ===
  function isLikelyMarkdown(text) {
    if (!text || text.length < 10) return false;
    const t = text.trim();
    return (
      /^#{1,6}\s/.test(t) ||
      /^\s*[-*+]\s/.test(t) ||
      /^\s*>\s/.test(t) ||
      /```[\s\S]*```/.test(text) ||
      /\[.*?\]\(.+?\)/.test(text) ||
      /\*\*.*\*\*/.test(text) ||
      /`[^`]+`/.test(text) ||
      /^\s*\|.*\|/.test(t) && text.includes('\n') ||
      /- \[[ x]\]/.test(text)
    );
  }

  // === PARSE TABLE ===
  function parseTable(lines) {
    const rows = lines.map(l => l.trim()).filter(Boolean);
    if (rows.length < 2) return null;
    const clean = rows.filter(r => !/^[\s|:-]+$/.test(r.replace(/\|/g, '')));
    if (clean.length < 1) return null;

    const header = clean[0].split('|').filter(Boolean).map(h => `<th>${processCell(h.trim())}</th>`).join('');
    const body = clean.slice(1).map(r =>
      '<tr>' + r.split('|').filter(Boolean).map(c => `<td>${processCell(c.trim())}</td>`).join('') + '</tr>'
    ).join('');
    return `<table class="md-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
  }

  // === PROCESS CELL (NO ESCAPE) ===
  function processCell(text) {
    const lines = text.split('\n');
    const blocks = [];
    let i = 0;
    let stack = [];

    const close = () => {
      while (stack.length) {
        const closed = stack.pop();
        if (stack.length) stack[stack.length - 1].items.push(closed);
        else blocks.push(closed);
      }
    };

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim() || 'plaintext';
        const code = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++; }
        i++;
        // Code block tetap escape (aman dari XSS)
        blocks.push(`<pre><code class="language-${lang}">${code.join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
        continue;
      }

      const cbMatch = line.match(/^(\s*)[-*+]\s+\[([\sx])\]\s+(.+)$/);
      if (cbMatch) {
        const indent = cbMatch[1].length;
        const checked = cbMatch[2] === 'x';
        const label = processInline(cbMatch[3]); // RAW HTML allowed
        const id = genId();
        const attr = checkboxStates.has(id) ? (checkboxStates.get(id) ? 'checked' : '') : (checked ? 'checked' : '');
        const li = `<li><label class="md-checkbox"><input type="checkbox" id="${id}" ${attr}><span>${label}</span></label></li>`;

        const level = Math.floor(indent / 2);
        while (stack.length > level) { const c = stack.pop().close(); if (stack.length) stack[stack.length-1].items.push(c); else blocks.push(c); }
        if (stack.length === level) stack[stack.length-1].items.push(li);
        else stack.push({ tag: 'ul', items: [li], close() { return `<${this.tag}>${this.items.join('')}</${this.tag}>`; } });
        i++;
        continue;
      }

      const listMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
      if (listMatch) {
        const indent = listMatch[1].length;
        const item = processInline(listMatch[2]); // RAW HTML allowed
        const level = Math.floor(indent / 2);
        while (stack.length > level) { const c = stack.pop().close(); if (stack.length) stack[stack.length-1].items.push(c); else blocks.push(c); }
        const li = `<li>${item}</li>`;
        if (stack.length === level) stack[stack.length-1].items.push(li);
        else stack.push({ tag: level % 2 === 0 ? 'ul' : 'ol', items: [li], close() { return `<${this.tag}>${this.items.join('')}</${this.tag}>`; } });
        i++;
        continue;
      }

      if (stack.length && !/^\s/.test(line)) close();
      if (line.trim()) blocks.push(`<p>${processInline(line)}</p>`); // RAW HTML allowed
      i++;
    }
    close();
    return blocks.length ? blocks.join('') : processInline(text);
  }

  // === ENHANCE NODE ===
  function enhanceNode(node) {
    if (node.dataset.mdProcessed) return;
    if (node.closest('pre, code, script, style, .no-md')) return;

    const text = node.textContent;
    if (!isLikelyMarkdown(text)) return;

    const parent = node.parentNode;
    if (parent.closest('h1,h2,h3,h4,h5,h6,ul,ol,table,blockquote')) return;

    const lines = text.split('\n');
    const blocks = [];
    let i = 0;
    let hasCode = false;

    while (i < lines.length) {
      const raw = lines[i];
      const trimmed = raw.trim();

      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim() || 'plaintext';
        const code = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++; }
        i++;
        blocks.push(`<pre><code class="language-${lang}">${code.join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
        hasCode = true;
        continue;
      }

      if (trimmed.includes('|') && /^\s*\|/.test(raw)) {
        const tableLines = [raw];
        i++;
        while (i < lines.length && /^\s*\|/.test(lines[i])) { tableLines.push(lines[i]); i++; }
        const table = parseTable(tableLines);
        if (table) { blocks.push(table); continue; }
        i--;
      }

      const heading = raw.match(/^(#{1,6})\s+(.+)$/);
      if (heading) { blocks.push(`<h${heading[1].length}>${processInline(heading[2])}</h${heading[1].length}>`); i++; continue; }

      if (/^\s*[-*+]\s/.test(raw)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
          const item = lines[i].replace(/^\s*[-*+]\s+/, '');
          const cb = item.match(/^\[([\sx])\]\s+(.+)$/);
          if (cb) {
            const checked = cb[1] === 'x';
            const label = processInline(cb[2]); // RAW
            const id = genId();
            const attr = checkboxStates.has(id) ? (checkboxStates.get(id) ? 'checked' : '') : (checked ? 'checked' : '');
            items.push(`<li><label class="md-checkbox"><input type="checkbox" id="${id}" ${attr}><span>${label}</span></label></li>`);
          } else {
            items.push(`<li>${processInline(item)}</li>`); // RAW
          }
          i++;
        }
        blocks.push(`<ul>${items.join('')}</ul>`);
        continue;
      }

      if (trimmed.startsWith('>')) {
        blocks.push(`<blockquote>${processInline(trimmed.slice(1))}</blockquote>`);
        i++;
        continue;
      }

      if (trimmed) blocks.push(`<p>${processInline(raw)}</p>`); // RAW HTML allowed
      i++;
    }

    if (!blocks.length) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'md-auto';
    wrapper.innerHTML = blocks.join('');
    while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, node);
    parent.removeChild(node);

    if (hasCode) {
      ensureHighlightJS().then(hljs => {
        if (hljs) wrapper.querySelectorAll('pre code').forEach(hljs.highlightElement);
      });
    }

    node.dataset.mdProcessed = 'true';
  }

  // === ENHANCE ALL ===
  function enhance() {
    injectCSS();
    loadStates();

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim() && !node.parentNode.closest('.md-auto')) {
        nodes.push(node);
      }
    }

    let hasCode = false;
    nodes.forEach(n => {
      if (enhanceNode(n)) hasCode = true;
    });

    if (hasCode) {
      ensureHighlightJS().then(hljs => {
        if (hljs) document.querySelectorAll('.md-auto pre code').forEach(hljs.highlightElement);
      });
    }

    document.addEventListener('change', e => {
      if (e.target.matches('input[type="checkbox"][id^="md-cb-"]')) {
        checkboxStates.set(e.target.id, e.target.checked);
        saveStates();
      }
    }, true);
  }

  // === INIT ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance);
  } else {
    enhance();
  }

  new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          let n;
          while (n = walker.nextNode()) {
            if (n.textContent.trim()) enhanceNode(n);
          }
        }
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

})();
