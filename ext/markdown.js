/*!
 * nano-md.js — Markdown Lite Enhancer (Versi Classless & Inline-Safe)
 * 🌿 Konversi Markdown ke HTML dengan aman dan akurat.
 * Perubahan: Menghapus semua penambahan class HTML (md-inline, md-table, md-link).
 * Versi: 3.2.0 | Author: Frijal (Enhanced by Gemini AI)
 */

(function () {
    'use strict';

    // === KONFIGURASI ===
    const HIGHLIGHT_CDN = {
        js: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js",
        css: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css"
    };

    // Elemen yang akan diproses secara INLINE-ONLY (td, th, p, li, dst.)
    // Dan juga target BLOCK-LEVEL (.markdown)
    const SELECTORS_TARGET = "td, th, p, li, blockquote, .markdown, .markdown-body, .md"; 

    // === UTILITAS KEAMANAN ===
    /** Melarikan diri (escape) dari string HTML mentah untuk keamanan XSS. */
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // === MUAT HIGHLIGHT.JS SEKALI SAJA ===
    let hljsPromise = null;
    async function ensureHighlightJS() {
        if (hljsPromise) return hljsPromise;
        if (window.hljs) return Promise.resolve(window.hljs);

        hljsPromise = new Promise((resolve) => {
            // Muat CSS
            const link = document.createElement('link');
            link.rel = "stylesheet";
            link.href = HIGHLIGHT_CDN.css;
            document.head.appendChild(link);

            // Muat JS
            const script = document.createElement('script');
            script.src = HIGHLIGHT_CDN.js;
            script.defer = true;
            script.onload = () => resolve(window.hljs);
            script.onerror = () => resolve(null);
            document.head.appendChild(script);
        });

        return hljsPromise;
    }

    // === INLINE MARKDOWN (bold, italic, code, link) ===
    function processInline(text) {
        if (!text || typeof text !== 'string') return '';

        // --- 1. Code `text` (TANPA CLASS)
        text = text.replace(/`([^`]+)`/g, (m, code) => 
            `<code>${escapeHTML(code)}</code>` // Dulu: <code class="md-inline">...</code>
        );

        // --- 2. Link [text](url) (TANPA CLASS)
        text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
            const cleanLabel = processInline(label);
            const cleanUrl = escapeHTML(url);
            return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanLabel}</a>`; // Dulu: class="md-link"
        });
        
        // --- 3. HTML Escape untuk konten yang tersisa
        text = escapeHTML(text);

        // --- 4. Bold **text**
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // --- 5. Italic *text*
        text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        
        return text;
    }

    // === PARSING MARKDOWN PER BARIS (AKURAT & AMAN) ===
    function parseMarkdownLines(lines) {
        const output = [];
        let listStack = [];
        let inCodeBlock = false;
        let codeLang = '';
        let codeLines = [];

        const closeLists = () => {
            while (listStack.length) {
                output.push(listStack.pop().close());
            }
        };

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const trimmed = line.trim();

            // --- CODE BLOCK (```) ---
            if (trimmed.startsWith('```')) {
                if (inCodeBlock) {
                    closeLists();
                    const code = codeLines.join('\n');
                    const langClass = codeLang ? `class="language-${codeLang}"` : '';
                    output.push(`<pre><code ${langClass}>${escapeHTML(code)}</code></pre>`);
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
            
            // --- PARAGRAF KOSONG ---
            if (trimmed === '') {
                closeLists();
                continue;
            }

            // --- TABEL ---
            if (trimmed.includes('|') && /^\s*\|.*\|\s*$/.test(line)) {
                let tableLines = [line];
                for (let j = i + 1; j < lines.length; j++) {
                    const next = lines[j];
                    if (/^\s*\|.*\|\s*$/.test(next) || next.trim().match(/^[\s|:-]+$/)) { 
                        tableLines.push(next);
                        i = j;
                    } else {
                        break;
                    }
                }
                const tableHTML = parseTable(tableLines);
                if (tableHTML) {
                    closeLists();
                    output.push(tableHTML);
                    continue;
                }
            }

            // --- BLOCKQUOTE ---
            if (trimmed.startsWith('>')) {
                closeLists();
                const content = line.replace(/^>\s*/, '');
                const nested = parseMarkdownLines([content]).join('');
                output.push(`<blockquote>${nested}</blockquote>`);
                continue;
            }

            // --- HEADING (#) ---
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                closeLists();
                const level = headingMatch[1].length;
                const text = processInline(headingMatch[2]);
                output.push(`<h${level}>${text}</h${level}>`);
                continue;
            }

            // --- LIST (nested support) ---
            const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
            if (listMatch) {
                const indent = listMatch[1].length;
                const isOrdered = listMatch[2].endsWith('.');
                const itemText = processInline(listMatch[3]); 
                const level = Math.floor(indent / 2);

                while (listStack.length > level + 1) {
                    const closed = listStack.pop().close();
                    if (listStack.length) {
                        listStack[listStack.length - 1].items.push(closed);
                    } else {
                        output.push(closed);
                    }
                }

                if (listStack.length === level + 1) {
                    listStack[level].items.push(`<li>${itemText}</li>`);
                } else {
                    const tag = isOrdered ? '<ol>' : '<ul>';
                    const closer = isOrdered ? '</ol>' : '</ul>';
                    const newList = {
                        tag,
                        closer,
                        items: [`<li>${itemText}</li>`],
                        close() { return this.tag + this.items.join('') + this.closer; }
                    };

                    while (listStack.length > level) {
                        const closed = listStack.pop().close();
                        if (listStack.length) {
                            listStack[listStack.length - 1].items.push(closed);
                        } else {
                            output.push(closed);
                        }
                    }

                    listStack.push(newList); 
                }
                continue;
            }

            // --- PARAGRAF BIASA ---
            closeLists();
            output.push(`<p>${processInline(line)}</p>`);
        }

        // Tutup sisa list & code block di akhir
        if (inCodeBlock) {
            output.push(`<pre><code>${escapeHTML(codeLines.join('\n'))}</code></pre>`);
        }
        closeLists();

        return output;
    }

    // === PARSE TABEL ===
    function parseTable(lines) {
        const rows = lines.map(l => l.trim()).filter(Boolean);
        if (rows.length < 2) return null;

        const separatorIndex = rows.findIndex(r => r.match(/^[\s|:-]+$/));
        if (separatorIndex === -1) return null;

        const headerRow = rows[0];
        const bodyRows = rows.slice(separatorIndex + 1);

        const parseCells = (row) => row.split('|').map(c => c.trim()).filter(Boolean);

        // TANPA CLASS md-table
        const header = parseCells(headerRow).map(h => `<th>${processInline(h)}</th>`).join('');
        
        const body = bodyRows.map(r => {
            const cells = parseCells(r);
            const tds = cells.map(c => `<td>${processInline(c)}</td>`).join('');
            return `<tr>${tds}</tr>`;
        }).join('');

        return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`; // Dulu: <table class="md-table">
    }

    // === ENHANCE BLOCK-LEVEL (Mengganti seluruh konten elemen target) ===
    function enhanceBlockElement(el) {
        if (el.dataset.nanoMdBlock === 'done') return;
        if (el.classList.contains('no-md')) return;

        const text = el.textContent || el.innerText;
        if (!text || !text.trim()) return;

        const lines = text.split('\n');
        const htmlLines = parseMarkdownLines(lines);
        let finalHTML = htmlLines.join('');

        const tagName = el.tagName.toUpperCase();
        if ((tagName === 'P' || tagName === 'LI' || tagName === 'BLOCKQUOTE') && finalHTML.startsWith('<p>')) {
             finalHTML = finalHTML.replace(/^<p>(.*)<\/p>$/s, '$1');
        }

        el.innerHTML = finalHTML;
        el.dataset.nanoMdBlock = 'done';
    }
    
    // === ENHANCE INLINE-ONLY (Memproses inline MD di dalam HTML yang sudah ada) ===
    function enhanceInlineOnly() {
        // Hanya memproses elemen yang membutuhkan pemrosesan inline dan yang kontennya sudah ada.
        document.querySelectorAll(SELECTORS_TARGET).forEach(el => {
            if (el.dataset.nanoMdInline === 'done' || el.classList.contains('no-md')) return;
            
            // Logika sederhana untuk membedakan mode:
            // Jika elemen adalah BLOCK, biarkan mode Block yang menanganinya, kecuali jika sudah selesai.
            if (el.tagName.toUpperCase() !== 'TD' && el.tagName.toUpperCase() !== 'TH' && el.dataset.nanoMdBlock === 'done') {
                return;
            }

            const originalHTML = el.innerHTML;
            
            // Jalankan HANYA fungsi processInline pada innerHTML
            const finalHTML = processInline(originalHTML);

            if (finalHTML !== originalHTML) {
                el.innerHTML = finalHTML;
            }

            el.dataset.nanoMdInline = 'done';
        });
    }

    // === ENHANCE ALL (Menggabungkan kedua mode) ===
    function enhanceMarkdown() {
        // Pisahkan target BLOCK dari target INLINE-ONLY (td/th)
        const blockTargets = document.querySelectorAll(SELECTORS_TARGET);
        
        blockTargets.forEach(el => {
            const tagName = el.tagName.toUpperCase();
            
            if (tagName === 'TD' || tagName === 'TH') {
                // Selalu proses TD/TH dalam mode INLINE-ONLY (di bawah)
                return;
            } else if (el.classList.contains('markdown') || el.classList.contains('markdown-body') || el.classList.contains('md')) {
                // Elemen ditandai sebagai kontainer Markdown mentah, proses sebagai BLOCK-LEVEL
                enhanceBlockElement(el);
            }
        });

        // Selalu jalankan mode INLINE-ONLY pada semua target yang mungkin (termasuk TD/TH dan elemen p/li/blockquote)
        enhanceInlineOnly();
    }

    // === HIGHLIGHT CODE === (Tidak berubah)
    async function highlightCodeBlocks() {
        if (!document.querySelector('pre code')) return;
        const hljs = await ensureHighlightJS();
        if (!hljs) return;

        document.querySelectorAll('pre code').forEach(block => {
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
                setTimeout(() => {
                    enhanceMarkdown();
                    highlightCodeBlocks();
                }, 50); 
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // === INIT & RUN ===
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run);
        } else {
            run();
        }
    }

    async function run() {
        enhanceMarkdown(); // Memanggil kedua mode enhance
        await highlightCodeBlocks();
        observeMutations();
    }

    // Jalankan
    init();

})();
