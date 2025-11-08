/*!
 * markdown.js v16.0 — Process All Elements
 * Inline Markdown di <p>, <h3>, <li>, dll
 * NO XSS ESCAPING | Auto detect | Checkbox
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'md-checkbox-states';

  // === INJECT CSS ===
  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .md-processed .md-link { color: #3498db; text-decoration: underline; }
      .md-processed .md-inline { background: #f4f4f9; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
      .md-processed .md-table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      .md-processed .md-table th, .md-processed .md-table td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
      .md-processed ul, .md-processed ol { margin: 0.5em 0; padding-left: 1.5em; list-style: none; }
      .md-processed li { margin: 0.2em 0; position: relative; padding-left: 1.8em; }
      .md-processed .md-checkbox { display: inline-flex; align-items: center; gap: 0.4em; font-size: 0.95em; cursor: pointer; user-select: none; }
      .md-processed .md-checkbox input { margin: 0; width: 1em; height: 1em; cursor: pointer; }
      .md-processed .md-checkbox input:checked + span { text-decoration: line-through; opacity: 0.7; }
      .md-processed pre { margin: 0.5em 0; font-size: 0.85em; overflow-x: auto; }
      .md-processed code { white-space: pre-wrap; word-break: break-word; }
      @media (prefers-color-scheme: dark) {
        .md-processed .md-inline { background: #34495e; color: #ecf0f1; }
        .md-processed .md-table { border-color: #3b506b; }
        .md-processed .md-table th, .md-processed .md-table td { border-color: #3b506b; }
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

  // === DETEKSI MARKDOWN (SANGAT SENSITIF) ===
  function hasMarkdownSyntax(text) {
    return /[\*\[\]`|]/.test(text) && (
      /\*\*.*\*\*/.test(text) ||
      /\*.*\*/.test(text) ||
      /`[^`]+`/.test(text) ||
      /\[.*?\]\(.+?\)/.test(text) ||
      /- \[[ x]\]/.test(text) ||
      /\|.*\|/.test(text)
    );
  }

  // === ENHANCE TEXT NODE ===
  function enhanceTextNode(node) {
    if (node.dataset.mdProcessed) return;
    if (node.parentNode.closest('pre, code, script, style, .no-md')) return;

    const text = node.textContent;
    if (!hasMarkdownSyntax(text)) return;

    const parent = node.parentNode;
    const processed = processInline(text);

    if (processed === text) return; // Tidak ada perubahan

    const span = document.createElement('span');
    span.innerHTML = processed;
    span.className = 'md-inline-content';

    parent.insertBefore(span, node);
    parent.removeChild(node);
  }

  // === ENHANCE BLOCK ELEMENTS (untuk list, table, code block) ===
  function enhanceBlockElements() {
    // Hanya proses elemen yang belum diproses
    document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div, span').forEach(el => {
      if (el.dataset.mdBlockProcessed) return;
      if (el.closest('pre, code')) return;

      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.trim()) nodes.push(node);
      }

      let hasCodeBlock = false;
      nodes.forEach(n => {
        const txt = n.textContent;
        if (!/```|- \[|\]|\*\*|^\s*[-*+]\s/.test(txt)) return;

        const lines = txt.split('\n');
        const blocks = [];
        let i = 0;

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
            hasCodeBlock = true;
            continue;
          }

          if (/^\s*[-*+]\s+\[([\sx])\]\s+/.test(raw)) {
            const items = [];
            while (i < lines.length && /^\s*[-*+]\s+\[([\sx])\]\s+/.test(lines[i])) {
              const match = lines[i].match(/^\s*[-*+]\s+\[([\sx])\]\s+(.+)$/);
              const checked = match[1] === 'x';
              const label = processInline(match[2]);
              const id = genId();
              const attr = checkboxStates.has(id) ? (checkboxStates.get(id) ? 'checked' : '') : (checked ? 'checked' : '');
              items.push(`<li><label class="md-checkbox"><input type="checkbox" id="${id}" ${attr}><span>${label}</span></label></li>`);
              i++;
            }
            blocks.push(`<ul>${items.join('')}</ul>`);
            continue;
          }

          if (/^\s*[-*+]\s+/.test(raw)) {
            const items = [];
            while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
              const item = lines[i].replace(/^\s*[-*+]\s+/, '');
              items.push(`<li>${processInline(item)}</li>`);
              i++;
            }
            blocks.push(`<ul>${items.join('')}</ul>`);
            continue;
          }

          if (trimmed) blocks.push(`<p>${processInline(raw)}</p>`);
          i++;
        }

        if (blocks.length) {
          const div = document.createElement('div');
          div.innerHTML = blocks.join('');
          while (div.firstChild) el.insertBefore(div.firstChild, n);
          el.removeChild(n);
        }
      });

      if (hasCodeBlock) {
        ensureHighlightJS().then(hljs => {
          if (hljs) el.querySelectorAll('pre code').forEach(hljs.highlightElement);
        });
      }

      el.dataset.mdBlockProcessed = 'true';
    });
  }

  // === ENHANCE ALL ===
  function enhance() {
    injectCSS();
    loadStates();

    // 1. Proses inline di semua text node
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

    nodes.forEach(enhanceTextNode);

    // 2. Proses block (list, code block, checkbox)
    enhanceBlockElements();

    // 3. Setup checkbox events
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

  new MutationObserver(enhance).observe(document.body, {
    childList: true,
    subtree: true
  });

})();
