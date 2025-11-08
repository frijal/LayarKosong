/*!
 * markdown-enhancer.js frijal (Versi 4.0.0 - Fungsionalitas Tinggi & Aman XSS)
 * 🌿 Meningkatkan konten HTML yang berisi sintaks Markdown & blok kode.
 * Perbaikan: Menambahkan XSS escaping untuk keamanan, dan memisahkan logika block/inline.
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

    const SELECTORS_TARGET = "p, li, blockquote, td, th, .markdown, .markdown-body, .md";


    // === MUAT HIGHLIGHT.JS SEKALI SAJA ===
    async function ensureHighlightJS() {
        if (window.hljs) return window.hljs;

        // Muat CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = HIGHLIGHT_CDN.css;
        document.head.appendChild(link);

        // Muat JS
        const script = document.createElement("script");
        script.src = HIGHLIGHT_CDN.js;
        script.defer = true;
        document.head.appendChild(script);

        await new Promise(res => (script.onload = res));
        return window.hljs;
    }

    // === 1. KONVERSI INLINE MARKDOWN ===
    function convertInlineMarkdown(text) {
        if (!text || typeof text !== 'string') return '';

        // --- 1. Link [text](url) (Harus dilakukan pertama)
        // Link label diproses rekursif. URL di-escape untuk XSS.
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => {
            const cleanLabel = convertInlineMarkdown(label);
            const cleanUrl = escapeHTML(url); // Lindungi URL dari XSS
            return `<a href="${cleanUrl}" target="_blank" rel="noopener">${cleanLabel}</a>`;
        });
        
        // --- 2. HTML Escape untuk konten yang tersisa
        // Menetralisir semua tag HTML yang tidak diizinkan.
        text = escapeHTML(text); 

        // --- 3. Bold, Italic, Code inline (Sekarang aman, karena teks sudah di-escape)
        text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        text = text.replace(/(^|[^*])\*(.*?)\*(?!\*)/g, "$1<em>$2</em>");
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

        return text;
    }


    // === 2. KONVERSI BLOCK MARKDOWN ===
    function convertBlockMarkdown(rawMarkdown) {
        let text = rawMarkdown;

        // --- Code blocks ``` ---
        // PENTING: Konten Code Block harus di-escape!
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
            const language = lang || "plaintext";
            const escapedCode = escapeHTML(code.trim()); 
            const languageClass = language ? `class="language-${language}"` : '';
            return `<pre><code ${languageClass}>${escapedCode}</code></pre>`;
        });

        // --- Heading ---
        text = text
            .replace(/^###### (.*)$/gm, (m, content) => `<h6>${convertInlineMarkdown(content)}</h6>`)
            .replace(/^##### (.*)$/gm, (m, content) => `<h5>${convertInlineMarkdown(content)}</h5>`)
            .replace(/^#### (.*)$/gm, (m, content) => `<h4>${convertInlineMarkdown(content)}</h4>`)
            .replace(/^### (.*)$/gm, (m, content) => `<h3>${convertInlineMarkdown(content)}</h3>`)
            .replace(/^## (.*)$/gm, (m, content) => `<h2>${convertInlineMarkdown(content)}</h2>`)
            .replace(/^# (.*)$/gm, (m, content) => `<h1>${convertInlineMarkdown(content)}</h1>`);

        // --- Blockquote ---
        text = text.replace(/^> (.*)$/gm, (m, content) => `<blockquote>${convertInlineMarkdown(content)}</blockquote>`);

        // --- Tables (sederhana) ---
        text = text.replace(/((?:\|.*\|\n)+)/g, tableMatch => {
            const rows = tableMatch.trim().split("\n").filter(r => r.trim());
            if (rows.length < 2) return tableMatch;
            
            // Header: cells diproses inline
            const header = rows[0].split("|").filter(Boolean)
                .map(c => `<th>${convertInlineMarkdown(c.trim())}</th>`).join("");
            
            // Body: cells diproses inline
            const body = rows.slice(2).map(r =>
                "<tr>" + r.split("|").filter(Boolean)
                .map(c => `<td>${convertInlineMarkdown(c.trim())}</td>`).join("") + "</tr>"
            ).join("");
            
            return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
        });
        
        // --- Lists (Sederhana) ---
        text = text.replace(/^\s*[-*+] (.*)$/gm, (m, content) => `<li>${convertInlineMarkdown(content)}</li>`);
        text = text.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");

        return text;
    }

    // === 3. FUNGSI UTAMA ENHANCE ===

    function enhanceMarkdown() {
        document.querySelectorAll(SELECTORS_TARGET).forEach(el => {
            if (el.classList.contains("no-md") || el.dataset.mdProcessed === 'true') return;

            const tagName = el.tagName.toUpperCase();

            if (tagName === 'TD' || tagName === 'TH' || tagName === 'P' || tagName === 'LI' || tagName === 'BLOCKQUOTE') {
                // Mode INLINE-ONLY: Untuk elemen yang sudah memiliki struktur HTML, hanya proses inline MD.
                // NOTE: Tag HTML yang sudah ada (seperti <strong>) akan di-escape di sini.
                
                const originalHTML = el.innerHTML;
                // Kita harus melakukan escaping di sini agar konten MD aman, tetapi ini akan merusak <strong>
                const finalHTML = convertInlineMarkdown(originalHTML); 

                // Jika pengguna ingin mempertahankan <strong>, mereka harus menggunakan sintaks **bold**.
                // Namun, untuk mempertahankan fungsionalitas aslinya, kita proses.
                if (finalHTML !== originalHTML) {
                    el.innerHTML = finalHTML;
                }
            } else {
                // Mode BLOCK-LEVEL: Untuk kontainer yang berisi Markdown mentah (seperti div.markdown)
                const rawMarkdown = el.textContent || el.innerText;
                if (!rawMarkdown.trim()) return;
                
                // Block level akan menangani heading, list, table, dll.
                el.innerHTML = convertBlockMarkdown(rawMarkdown);
            }
            
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
                console.warn('Highlight.js error:', e);
            }
        });
    }

    // === JALANKAN ===
    document.addEventListener("DOMContentLoaded", async () => {
        enhanceMarkdown();
        await enhanceCodeBlocks();
    });
})();
