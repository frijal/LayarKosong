import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Menunjuk ke root folder (satu tingkat di atas script ini)
const rootDir = path.join(__dirname, '..');

/**
 * Fungsi utama untuk membersihkan HTML menjadi Markdown ramping
 */
function cleanHTML(html) {
    let updated = html;

    // --- FASE 1: SAPU JAGAT ---
    updated = updated.replace(/<pre>`([\s\S]*?)`<\/pre>/gi, '<pre><code>$1</code></pre>');

    // --- FASE 2: CLEANUP TEXT & LINKS ---
    updated = updated
    .replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')       // Bold
    .replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*')             // Italic
    .replace(/<(del|s|strike)>(.*?)<\/\1>/gi, '~~$2~~')   // Strikethrough

    // Konversi Link - SEKARANG LEBIH SMART!
    .replace(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, url, text) => {
    // 1. Cek apakah ada atribut proteksi (class, id, dll)
    const isProtected = /class=|id=|style=|target=|rel=/i.test(match);
    
    // 2. Cek apakah di dalam link ada tag <img> (ini yang bikin galeri rusak)
    const containsImg = /<img\s[^>]*>/i.test(text);

    // Jika diproteksi ATAU berisi gambar, jangan diubah jadi Markdown. Biarkan tetap HTML.
    return (isProtected || containsImg) ? match : `[${text}](${url})`;
    });

    // --- FASE 3: SMART INLINE CODE ---
    updated = updated.replace(/<pre[\s\S]*?<\/pre>|<code>([\s\S]*?)<\/code>/gi, (match, codeText) => {
        if (match.toLowerCase().startsWith('<pre')) return match;
        if (codeText && !codeContentContainsNewLine(codeText) && !match.includes('class=') && !match.includes('id=')) {
            return `\`${codeText}\``;
        }
        return match;
    });

    return updated;
}

function codeContentContainsNewLine(text) {
    return /\r|\n/.test(text);
}

/**
 * Fungsi rekursif untuk memproses file
 */
function processFolder(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`⚠️  Folder tidak ditemukan: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        let fullPath = path.join(dir, file);

        if (fs.lstatSync(fullPath).isDirectory()) {
            processFolder(fullPath);
        } else {
            const isHtml = file.toLowerCase().endsWith('.html');
            const isIndex = file.toLowerCase() === 'index.html';

            if (isHtml && !isIndex) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let updated = cleanHTML(content);

                if (content !== updated) {
                    fs.writeFileSync(fullPath, updated, 'utf8');
                    console.log(`   ✅ Clean: ...${fullPath.slice(-40)}`);
                }
            }
        }
    });
}

// 🔥 DAFTAR 7 FOLDER KATEGORI LAYAR KOSONG
const targetFolders = [
    "gaya-hidup",
    "jejak-sejarah",
    "lainnya",
    "olah-media",
    "opini-sosial",
    "sistem-terbuka",
    "warta-tekno"
];

console.log('---------------------------------------------------------');
console.log('🚀 Memulai Operasi "Layar Kosong Bersih" (7 Kategori)');
console.log('---------------------------------------------------------');

targetFolders.forEach(folder => {
    const targetPath = path.join(rootDir, folder);
    console.log(`📂 Processing: /${folder}`);
    processFolder(targetPath);
});

console.log('---------------------------------------------------------');
console.log('🏁 Selesai! Semua artikel kini lebih ramping & SEO Friendly.');
console.log('---------------------------------------------------------');
