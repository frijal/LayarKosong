/*!
 * markdown-enhancer.js frijal (XSS Safe)
 * 🌿 Meningkatkan konten HTML yang berisi sintaks Markdown & blok kode.
 * Perbaikan: Menambahkan escapeHTML untuk keamanan XSS pada semua konten input.
 * Otomatis memuat highlight.js bila perlu.
 */
(async function () {
    'use strict';

    // === UTILITAS KEAMANAN ===
    /** Melarikan diri (escape) dari string HTML mentah untuk keamanan XSS. */
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // === KONFIGURASI ===
    const HIGHLIGHT_CDN = {
        js: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js",
        css: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css"
    };
    
    // Target untuk pemrosesan INLINE-ONLY (td/th dan elemen lain yang sudah ada)
    const SELECTORS_INLINE_ONLY = "td, th, p, li, blockquote";
    // Target untuk pemrosesan BLOCK-LEVEL (kontainer Markdown mentah)
    const SELECTORS_BLOCK_LEVEL = ".markdown, .markdown-body, .md";


    // === MUAT HIGHLIGHT.JS SEKALI SAJA ===
    let hljsPromise = null;
    async function ensureHighlightJS() {
        if (hljsPromise) return hljsPromise;
        if (window.hljs) return Promise.resolve(window.hljs);

        hljsPromise = new Promise(async (resolve) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = HIGHLIGHT_CDN.css;
            document.head.appendChild(link);

            const script = document.createElement("script");
            script.src = HIGHLIGHT_CDN.js;
            script.defer = true;
            document.head.appendChild(script);

            await new Promise(res => (script.onload = res));
            resolve(window.hljs);
        });
        return hljsPromise;
    }
    
    // === 1. INLINE MARKDOWN CONVERSION (Hanya untuk bold, italic, code, link) ===
    function convertInlineMarkdown(text) {
        if (!text || typeof text !== 'string') return '';

        // JANGAN LAKUKAN ESCAPE DI SINI! Escape dilakukan di level blok.
        // Konversi sintaks inline.

        // --- 1. Link [text](url)
        // Pastikan URL dan Label di-escape. Label diproses inline secara rekursif.
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => {
            const cleanLabel = convertInlineMarkdown(label); // Rekursif
            const cleanUrl = escapeHTML(url); // Escape URL
            return `<a href="${cleanUrl}" target="_blank" rel="noopener">${cleanLabel}</a>`;
        });
        
        // --- 2. HTML Escape untuk konten yang tersisa
        // Melindungi dari XSS pada teks yang akan dikonversi menjadi Bold/Italic.
        text = escapeHTML(text); 

        // --- 3. Bold **text**
        text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        
        // --- 4. Italic *text*
        text = text.replace(/(^|[^*])\*(.*?)\*(?!\*)/g, "$1<em>$2</em>");

        // --- 5. Code inline `code` (Ditinggalkan untuk menghindari masalah Anda, seperti permintaan terakhir)
        /* text = text.replace(/`([^`]+)`/g, '<code>$1</code>'); */

        return text;
    }

    // === 2. BLOCK MARKDOWN CONVERSION (Untuk header, blockquote, list, table, code block) ===
    function convertBlockMarkdown(rawMarkdown) {
        let text = rawMarkdown;

        // --- CODE BLOCKS (```) ---
        // PENTING: Konten Code Block harus di-escape sebelum dimasukkan ke <code>
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
            const language = lang || "plaintext";
            // Escape konten kode
            const escapedCode = escapeHTML(code.trim()); 
            const languageClass = language ? `class="language-${language}"` : '';
            return `<pre><code ${languageClass}>${escapedCode}</code></pre>`;
        });
        
        // --- HEADING ---
        text = text
            .replace(/^###### (.*)$/gm, (m, content) => `<h6>${convertInlineMarkdown(content)}</h6>`)
            .replace(/^##### (.*)$/gm, (m, content) => `<h5>${convertInlineMarkdown(content)}</h5>`)
            .replace(/^#### (.*)$/gm, (m, content) => `<h4>${convertInlineMarkdown(content)}</h4>`)
            .replace(/^### (.*)$/gm, (m, content) => `<h3>${convertInlineMarkdown(content)}</h3>`)
            .replace(/^## (.*)$/gm, (m, content) => `<h2>${convertInlineMarkdown(content)}</h2>`)
            .replace(/^# (.*)$/gm, (m, content) => `<h1>${convertInlineMarkdown(content)}</h1>`);

        // --- BLOCKQUOTE ---
        // Konten blockquote harus diproses secara inline, dan perlu di-escape pada level inline.
        text = text.replace(/^> (.*)$/gm, (m, content) => `<blockquote>${convertInlineMarkdown(content)}</blockquote>`);

        // --- LISTS (Sederhana tanpa nested) ---
        // Konten list diproses inline.
        text = text.replace(/^\s*[-*+] (.*)$/gm, (m, content) => `<li>${convertInlineMarkdown(content)}</li>`);
        text = text.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");

        // --- TABLES (Sederhana) ---
        text = text.replace(/((?:\|.*\|\n)+)/g, tableMatch => {
            const rows = tableMatch.trim().split("\n").filter(r => r.trim());
            if (rows.length < 2) return tableMatch;
            
            // Header (diproses inline dan di-escape di dalamnya)
            const header = rows[0].split("|").filter(Boolean)
                .map(c => `<th>${convertInlineMarkdown(c.trim())}</th>`).join("");
            
            // Body (diproses inline dan di-escape di dalamnya)
            const body = rows.slice(2).map(r =>
                "<tr>" + r.split("|").filter(Boolean)
                .map(c => `<td>${convertInlineMarkdown(c.trim())}</td>`).join("") + "</tr>"
            ).join("");
            
            return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
        });
        
        // --- PARAGRAF ---
        // Baris yang tersisa (jika bukan baris kosong) dibungkus <p> dan diproses inline.
        // Ini adalah fallback yang penting.
        text = text.split('\n').map(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('<h') && !trimmed.startsWith('<blockquote') && 
                !trimmed.startsWith('<ul') && !trimmed.startsWith('<table') && !trimmed.startsWith('<pre')) {
                return `<p>${convertInlineMarkdown(line)}</p>`;
            }
            return line;
        }).join('');


        return text;
    }


    // === FUNGSI UTAMA ENHANCE ===

    // 1. Proses INLINE-ONLY (untuk elemen HTML yang sudah ada, seperti sel tabel)
    function enhanceInlineOnly() {
        document.querySelectorAll(SELECTORS_INLINE_ONLY).forEach(el => {
            if (el.classList.contains("no-md") || el.dataset.mdProcessed === 'true') return;

            // Ambil innerHTML, proses inline, dan kembalikan
            const originalHTML = el.innerHTML;
            const finalHTML = convertInlineMarkdown(originalHTML);
            
            if (finalHTML !== originalHTML) {
                el.innerHTML = finalHTML;
            }
            el.dataset.mdProcessed = 'true';
        });
    }

    // 2. Proses BLOCK-LEVEL (untuk kontainer Markdown mentah)
    function enhanceBlockLevel() {
        document.querySelectorAll(SELECTORS_BLOCK_LEVEL).forEach(el => {
            if (el.classList.contains("no-md") || el.dataset.mdProcessed === 'true') return;

            // Ambil textContent mentah (Markdown)
            const rawMarkdown = el.textContent || el.innerText;
            if (!rawMarkdown.trim()) return;

            // Proses blok dan inline
            el.innerHTML = convertBlockMarkdown(rawMarkdown);
            el.dataset.mdProcessed = 'true';
        });
    }

    // Proses highlight untuk <pre><code>
    async function enhanceCodeBlocks() {
        const hljs = await ensureHighlightJS();
        if (!hljs) return;
        
        document.querySelectorAll("pre code").forEach(el => {
            try { 
                if (!el.classList.contains('hljs')) {
                    hljs.highlightElement(el); 
                }
            } catch (e) { 
                // Abaikan error highlight.js
            }
        });
    }

    // === JALANKAN ===
    document.addEventListener("DOMContentLoaded", async () => {
        enhanceBlockLevel(); // Proses kontainer Markdown mentah
        enhanceInlineOnly(); // Proses elemen yang sudah ada (termasuk td/th)
        await enhanceCodeBlocks(); // Highlight block code
    });
})();
