/*!
 * nano-md.js — Markdown Lite Enhancer (Perfected Version)
 * 🌿 Konversi Markdown sederhana → HTML dengan aman dan akurat
 * Otomatis muat highlight.js hanya jika ada <code>
 * Aman dari XSS, mendukung nested list, tabel, dan lebih akurat
 * Versi: 3.0.0 | Author: Frijal (Enhanced by Gemini AI)
 */

(function () {
    'use strict';

    // === KONFIGURASI ===
    const HIGHLIGHT_CDN = {
        js: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js",
        css: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css"
    };

    // Elemen yang akan dipindai dan diproses.
    const SELECTORS = "p, li, blockquote, .markdown, .markdown-body, .md"; 

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
            script.onerror = () => resolve(null); // Gagal muat
            document.head.appendChild(script);
        });

        return hljsPromise;
    }

    // === PARSING MARKDOWN PER BARIS (AKURAT & AMAN) ===
    function parseMarkdownLines(lines) {
        const output = [];
        let listStack = []; // Stack untuk nested list
        let inCodeBlock = false;
        let codeLang = '';
        let codeLines = [];

        // Helper untuk menutup semua list yang terbuka
        const closeLists = () => {
            while (listStack.length) {
                output.push(listStack.pop().close());
            }
        };

        // Helper untuk menambahkan baris/blok ke output atau list saat ini
        const pushLine = (html) => {
            if (listStack.length) {
                // Tambahkan sebagai bagian dari list item (meskipun ini kurang akurat untuk blok)
                const current = listStack[listStack.length - 1];
                current.items[current.items.length - 1] += html; // Append ke item list terakhir
            } else {
                output.push(html);
            }
        };

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const trimmed = line.trim();

            // --- CODE BLOCK (```) ---
            if (trimmed.startsWith('```')) {
                if (inCodeBlock) {
                    // Tutup Code Block
                    closeLists();
                    const code = codeLines.join('\n');
                    const langClass = codeLang ? `class="language-${codeLang}"` : '';
                    output.push(`<pre><code ${langClass}>${escapeHTML(code)}</code></pre>`);
                    inCodeBlock = false;
                    codeLang = '';
                    codeLines = [];
                } else {
                    // Buka Code Block
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
                // Kumpulkan baris tabel hingga baris kosong
                let tableLines = [line];
                for (let j = i + 1; j < lines.length; j++) {
                    const next = lines[j];
                    if (/^\s*\|.*\|\s*$/.test(next) || next.trim().match(/^[\s|:-]+$/)) { // Sertakan baris pemisah
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
                // Rekursif memproses konten blockquote
                const nested = parseMarkdownLines([content]).join('');
                output.push(`<blockquote>${nested}</blockquote>`);
                continue;
            }

            // --- HEADING (#) ---
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                closeLists();
                const level = headingMatch[1].length;
                const text = processInline(headingMatch[2]); // Inline di heading
                output.push(`<h${level}>${text}</h${level}>`);
                continue;
            }

            // --- LIST (nested support) ---
            const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/); // Mendukung Unordered & Ordered
            if (listMatch) {
                const indent = listMatch[1].length;
                const isOrdered = listMatch[2].endsWith('.');
                const itemText = processInline(listMatch[3]); 

                // Level list (setiap 2 spasi)
                const level = Math.floor(indent / 2);

                // Tutup list yang lebih dalam
                while (listStack.length > level + 1) { 
                    const closed = listStack.pop().close();
                    if (listStack.length) {
                        listStack[listStack.length - 1].items.push(closed);
                    } else {
                        output.push(closed);
                    }
                }

                // Periksa apakah list saat ini sudah ada di level yang tepat
                if (listStack.length === level + 1) {
                    // Tambahkan item ke list yang sudah ada
                    listStack[level].items.push(`<li>${itemText}</li>`);
                } else {
                    // Buka list baru
                    const tag = isOrdered ? '<ol>' : '<ul>';
                    const closer = isOrdered ? '</ol>' : '</ul>';
                    const newList = {
                        tag,
                        closer,
                        items: [`<li>${itemText}</li>`],
                        close() { return this.tag + this.items.join('') + this.closer; }
                    };

                    // Tutup list yang lebih dangkal (jika ada) dan dorong ke output
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
            // PERBAIKAN: Selalu proses baris sebagai paragraf jika tidak cocok dengan yang lain
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

        // Cari baris pemisah (misalnya |---|)
        const separatorIndex = rows.findIndex(r => r.match(/^[\s|:-]+$/));
        if (separatorIndex === -1) return null; // Tabel tidak valid tanpa pemisah

        const headerRow = rows[0];
        const bodyRows = rows.slice(separatorIndex + 1);

        const parseCells = (row) => row.split('|').map(c => c.trim()).filter(Boolean);

        const header = parseCells(headerRow).map(h => `<th>${processInline(h)}</th>`).join('');
        
        const body = bodyRows.map(r => {
            const cells = parseCells(r);
            const tds = cells.map(c => `<td>${processInline(c)}</td>`).join('');
            return `<tr>${tds}</tr>`;
        }).join('');

        return `<table class="md-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
    }

    // === INLINE MARKDOWN (bold, italic, code, link) ===
    function processInline(text) {
        if (!text || typeof text !== 'string') return '';

        // Pastikan konten di-escape sebelum inline processing, kecuali untuk sintaks Markdown yang diizinkan
        // Kita hanya akan meng-escape konten TERTENTU (seperti URL/Label) di dalam fungsi replace
        
        // --- 1. Code `text` (Harus dilakukan pertama untuk melindungi kontennya)
        text = text.replace(/`([^`]+)`/g, (m, code) => 
            `<code class="md-inline">${escapeHTML(code)}</code>` // Escape isi code
        );

        // --- 2. Link [text](url)
        text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
            const cleanLabel = processInline(label); // Proses inline di dalam label link
            const cleanUrl = escapeHTML(url);
            return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="md-link">${cleanLabel}</a>`;
        });
        
        // --- 3. HTML Escape untuk konten yang tersisa
        text = escapeHTML(text);

        // --- 4. Bold **text**
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // --- 5. Italic *text*
        text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        
        return text;
    }


    // === ENHANCE ELEMENT ===
    function enhanceElement(el) {
        if (el.dataset.nanoMd === 'done') return;
        if (el.classList.contains('no-md')) return;

        // Ambil teks mentah (Markdown)
        const text = el.textContent || el.innerText; // el.textContent lebih aman dan disukai
        if (!text || !text.trim()) return;

        // Parse per baris
        const lines = text.split('\n');
        const htmlLines = parseMarkdownLines(lines);
        let finalHTML = htmlLines.join('');

        // Jika elemen target adalah <p> atau <li>, hapus pembungkus <p> yang tidak perlu
        const tagName = el.tagName.toUpperCase();
        if ((tagName === 'P' || tagName === 'LI' || tagName === 'BLOCKQUOTE') && finalHTML.startsWith('<p>')) {
             finalHTML = finalHTML.replace(/^<p>(.*)<\/p>$/s, '$1');
        }

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
                // Gunakan setTimeout untuk menunggu proses DOM selesai sebelum enhance
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

})();
