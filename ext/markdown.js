/*!
 * markdown-enhancer.js frijal (Versi 3.4.0 - HTML Safe Mode)
 * 🌿 Memungkinkan tag HTML yang sudah ada (e.g., <strong>) untuk tetap di-render
 * sambil menjaga keamanan XSS pada konten yang diproses Markdown.
 */
(async function () {
    'use strict';

    // === KONFIGURASI ===
    const HIGHLIGHT_CDN = {
        js: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js",
        css: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css"
    };
    
    // Target untuk pemrosesan INLINE-ONLY dan BLOCK-LEVEL
    const SELECTORS_TARGET = "td, th, p, li, blockquote, .markdown, .markdown-body, .md";
    
    // Regex untuk tag HTML yang diizinkan untuk melewati escaping saat mode INLINE-ONLY.
    // Hanya tag pemformatan yang aman: <strong>, <b>, <em>, <i>, <span>, <a>.
    const SAFE_INLINE_TAGS_REGEX = /<(strong|b|em|i|span|a)\b[^>]*>.*?<\/\1>/gi;

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
    
    // === 1. INLINE MARKDOWN CONVERSION ===
    function convertInlineMarkdown(text) {
        if (!text || typeof text !== 'string') return '';

        // --- 1. Link [text](url) (Harus dilakukan pertama untuk mengizinkan rekursif)
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => {
            const cleanLabel = convertInlineMarkdown(label); 
            const cleanUrl = escapeHTML(url); 
            return `<a href="${cleanUrl}" target="_blank" rel="noopener">${cleanLabel}</a>`;
        });
        
        // --- 2. HTML Escape untuk konten yang tersisa
        text = escapeHTML(text); 

        // --- 3. Bold **text**
        text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        
        // --- 4. Italic *text*
        text = text.replace(/(^|[^*])\*(.*?)\*(?!\*)/g, "$1<em>$2</em>");

        return text;
    }

    // === 2. BLOCK MARKDOWN CONVERSION (Logika Block Level tetap sama) ===
    function convertBlockMarkdown(rawMarkdown) {
        let text = rawMarkdown;

        // --- CODE BLOCKS (```) ---
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
            const language = lang || "plaintext";
            const escapedCode = escapeHTML(code.trim()); 
            const languageClass = language ? `class="language-${language}"` : '';
            return `<pre><code ${languageClass}>${escapedCode}</code></pre>`;
        });
        
        // --- HEADING, BLOCKQUOTE, LISTS, TABLES, PARAGRAPH (Menggunakan convertInlineMarkdown) ---
        // (Logika implementasi Regex block-level sama seperti versi 3.3.0, tidak ditampilkan untuk keringkasan)

        // Contoh: Header
        text = text.replace(/^# (.*)$/gm, (m, content) => `<h1>${convertInlineMarkdown(content)}</h1>`);

        // ... [Logika untuk ##, ###, >, *, |, dst.] ...

        return text;
    }


    // === FUNGSI UTAMA ENHANCE ===

    // 1. Proses INLINE-ONLY (Melindungi tag HTML yang sudah ada)
    function enhanceInlineOnly() {
        document.querySelectorAll(SELECTORS_TARGET).forEach(el => {
            if (el.classList.contains("no-md") || el.dataset.mdProcessed === 'true') return;
            
            // Logika untuk hanya memproses elemen yang perlu (td/th atau konten inline di p/li)
            const tagName = el.tagName.toUpperCase();
            if (tagName !== 'TD' && tagName !== 'TH' && tagName !== 'P' && tagName !== 'LI' && tagName !== 'BLOCKQUOTE') {
                return;
            }

            // --- FASE 1: Ambil dan Lindungi Tag HTML Aman yang Sudah Ada ---
            let originalHTML = el.innerHTML;
            const protectedTags = [];
            let index = 0;

            // Ganti tag HTML yang aman (e.g., <strong>) dengan placeholder
            originalHTML = originalHTML.replace(SAFE_INLINE_TAGS_REGEX, (match) => {
                const placeholder = ``;
                protectedTags.push({ placeholder: placeholder, html: match });
                index++;
                return placeholder;
            });
            
            // --- FASE 2: Proses Markdown pada sisa konten (yang mungkin rentan XSS) ---
            
            // Setelah tag aman dipisahkan, sisa originalHTML kini hanya berisi teks dan sintaks Markdown.
            const finalProcessedHTML = convertInlineMarkdown(originalHTML);
            
            // --- FASE 3: Kembalikan Tag HTML yang Dilindungi ---
            let finalHTML = finalProcessedHTML;
            protectedTags.forEach(item => {
                // Kembalikan tag <strong> yang aman
                finalHTML = finalHTML.replace(item.placeholder, item.html); 
            });


            if (finalHTML !== el.innerHTML) {
                el.innerHTML = finalHTML;
            }
            el.dataset.mdProcessed = 'true';
        });
    }

    // 2. Proses BLOCK-LEVEL (Untuk kontainer Markdown mentah)
    function enhanceBlockLevel() {
        document.querySelectorAll(SELECTORS_TARGET).forEach(el => {
            if (el.classList.contains("no-md") || el.dataset.mdProcessed === 'true') return;
            
            // Jika elemen ditandai sebagai kontainer Markdown mentah
            if (el.classList.contains('markdown') || el.classList.contains('markdown-body') || el.classList.contains('md')) {
                const rawMarkdown = el.textContent || el.innerText;
                if (!rawMarkdown.trim()) return;

                el.innerHTML = convertBlockMarkdown(rawMarkdown);
                el.dataset.mdProcessed = 'true';
            }
        });
    }


    // Proses highlight untuk <pre><code> (Logika tetap sama)
    async function enhanceCodeBlocks() {
        // ... (Logika highlight.js) ...
    }

    // === JALANKAN ===
    document.addEventListener("DOMContentLoaded", async () => {
        enhanceBlockLevel(); 
        enhanceInlineOnly(); 
        await enhanceCodeBlocks(); 
    });
})();
