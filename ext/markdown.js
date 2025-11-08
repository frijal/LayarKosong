/*!
 * markdown-enhancer.js v2.0 — frijal + upgrade
 * Inline + block Markdown → HTML
 * Checkbox interaktif + localStorage
 * Nested list, table, code block
 * Auto highlight.js
 */

(async function () {
  'use strict';

  const STORAGE_KEY = 'md-checkbox-states';
  let checkboxCounter = 0;

  // === INJECT CSS ===
  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .md-inline { background: #f4f4f9; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
      .md-checkbox { display: inline-flex; align-items: center; gap: 0.4em; font-size: 0.95em; cursor: pointer; user-select: none; }
      .md-checkbox input { margin: 0; width: 1em; height: 1em; cursor: pointer; }
      .md-checkbox input:checked + span { text-decoration: line-through; opacity: 0.7; }
      .md-table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      .md-table th, .md-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .md-table ul, .md-table ol { margin: 0.5em 0; padding-left: 1.5em; }
      .md-table li { margin: 0.2em 0; padding-left: 1.8em; position: relative; }
      pre { margin: 1em 0; overflow-x: auto; }
      @media (prefers-color-scheme: dark) {
        .md-inline { background: #2c3e50; color: #ecf0f1; }
        .md-table { border-color: #3b506b; }
        .md-table th, .md-table td { border-color: #3b506b; }
      }
    `;
    if (!document.querySelector('style[data-md-css]')) {
      style.dataset.mdCss = 'true';
      document.head.appendChild(style);
    }
  }

  // === HIGHLIGHT.JS ===
  async function ensureHighlightJS() {
    if (window.hljs) return window.hljs;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js';
    document.head.appendChild(script);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css';
    document.head.appendChild(link);
    await new Promise(res => script.onload = res);
    return window.hljs;
  }

  // === STORAGE ===
  const checkboxStates = new Map();
  function loadStates() {
    try {
      const data = localStorage.getItem(STORAGE near);
      if (data) Object.entries(JSON.parse(data)).forEach(([k, v]) => checkboxStates.set(k, v));
    } catch (e) {}
  }
  function saveStates() {
    const data = {};
    checkboxStates.forEach((v, k) => data[k] = v);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  // === KONVERSI MARKDOWN ===
  function convertInlineMarkdown(text) {
    let inCodeBlock = false;
    const lines = text.split('\n');
    const output = [];
    let listStack = [];
    let indentLevel = 0;

    const closeLists = () => {
      while (listStack.length > indentLevel) {
        const closed = listStack.pop();
        if (listStack.length) {
          listStack[listStack.length - 1].push(closed);
        } else {
          output.push(closed);
        }
      }
    };

    for (let line of lines) {
      const trimmed = line.trim();
      const leadingSpaces = line.length - line.ltrim().length;

      // Code block
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        output.push(line);
        continue;
      }
      if (inCodeBlock) {
        output.push(line);
        continue;
      }

      // Checkbox
      const cbMatch = line.match(/^(\s*)[-*+]\s+\[([\sx])\]\s+(.+)$/);
      if (cbMatch) {
        const indent = Math.floor(cbMatch[1].length / 2);
        const checked = cbMatch[2] === 'x';
        const label = cbMatch[3].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                .replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>');
        const id = `md-cb-${++checkboxCounter}`;
        const attr = checkboxStates.has(id) ? (checkboxStates.get(id) ? 'checked' : '') : (checked ? 'checked' : '');

        closeLists();
        indentLevel = indent;

        const li = `<li><label class="md-checkbox"><input type="checkbox" id="${id}" ${attr}><span>${label}</span></label></li>`;

        if (listStack.length === indentLevel) {
          listStack[listStack.length - 1].push(li);
        } else {
          while (listStack.length > indentLevel) listStack.pop();
          const ul = [];
          ul.push(li);
          listStack.push(ul);
        }
        continue;
      }

      // Regular list
      const listMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
      if (listMatch) {
        const indent = Math.floor(listMatch[1].length / 2);
        const item = listMatch[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                 .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                 .replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>');

        closeLists();
        indentLevel = indent;

        const li = `<li>${item}</li>`;

        if (listStack.length === indentLevel) {
          listStack[listStack.length - 1].push(li);
        } else {
          while (listStack.length > indentLevel) listStack.pop();
          const ul = [];
          ul.push(li);
          listStack.push(ul);
        }
        continue;
      }

      closeLists();
      indentLevel = 0;

      // Heading, blockquote, dll
      line = line
        .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
        .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
        .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
        .replace(/^### (.*)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*)$/gm, '<h1>$1</h1>')
        .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*(.*?)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 hover:underline">$1</a>');

      output.push(line);
    }

    closeLists();
    while (listStack.length) {
      const ul = `<ul>${listStack.pop().join('')}</ul>`;
      if (listStack.length) {
        listStack[listStack.length - 1].push(ul);
      } else {
        output.push(ul);
      }
    }

    let result = output.join('\n');

    // Code blocks
    result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
      const language = lang || 'plaintext';
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    });

    // Tables
    result = result.replace(/((?:\|.*\|\n)+)/g, tableMatch => {
      const rows = tableMatch.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2) return tableMatch;
      const header = rows[0].split('|').filter(Boolean).map(c => `<th>${c.trim()}</th>`).join('');
      const body = rows.slice(2).map(r =>
        '<tr>' + r.split('|').filter(Boolean).map(c => `<td>${c.trim()}</td>`).join('') + '</tr>'
      ).join('');
      return `<table class="md-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
    });

    return result;
  }

  // === ENHANCE ===
  function enhanceMarkdown() {
    document.querySelectorAll("p, li, blockquote, .markdown, .markdown-body").forEach(el => {
      if (el.classList.contains("no-md")) return;
      const original = el.innerHTML;
      const converted = convertInlineMarkdown(original);
      if (converted !== original) {
        el.innerHTML = converted;
      }
    });
  }

  async function enhanceCodeBlocks() {
    const hljs = await ensureHighlightJS();
    document.querySelectorAll("pre code").forEach(el => {
      try { hljs.highlightElement(el); } catch (e) {}
    });
  }

  // === INIT ===
  document.addEventListener("DOMContentLoaded", async () => {
    injectCSS();
    loadStates();
    enhanceMarkdown();
    await enhanceCodeBlocks();

    // Checkbox events
    document.addEventListener('change', e => {
      if (e.target.matches('input[type="checkbox"][id^="md-cb-"]')) {
        checkboxStates.set(e.target.id, e.target.checked);
        saveStates();
      }
    });
  });

  // String.prototype.ltrim
  if (!String.prototype.ltrim) {
    String.prototype.ltrim = function() { return this.replace(/^\s+/, ''); };
  }
})();
