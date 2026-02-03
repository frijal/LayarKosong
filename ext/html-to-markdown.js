import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper karena di ESM tidak ada __dirname secara default
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Fungsi utama untuk membersihkan HTML menjadi Markdown ramping
 * Fokus pada teks: Bold, Italic, Strikethrough, Link, dan Inline Code.
 */
function cleanHTML(html) {
    let updated = html;

    // --- FASE 1: SAPU JAGAT ---
    // Mengembalikan backtick di dalam <pre> yang salah format menjadi <code> standar
    updated = updated.replace(/<pre>`([\s\S]*?)`<\/pre>/gi, '<pre><code>$1</code></pre>');

    // --- FASE 2: CLEANUP TEXT & LINKS ---
    updated = updated
    .replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')       // Bold
    .replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*')             // Italic
    .replace(/<(del|s|strike)>(.*?)<\/\1>/gi, '~~$2~~')   // Strikethrough

    // Konversi Link dengan Proteksi Atribut
    .replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (match, url, text) => {
        /**
         * Jangan ubah ke Markdown jika mengandung:
         * - class, id, style (untuk menjaga desain CSS)
         * - target, rel (untuk fungsi buka tab baru/target="_blank")
         */
        const isProtected = /class=|id=|style=|target=|rel=/i.test(match);

        return isProtected ? match : `[${text}](${url})`;
    });

    // --- FASE 3: SMART INLINE CODE ---
    // Mengubah <code> sederhana menjadi backtick jika aman (satu baris & tanpa class)
    updated = updated.replace(/<pre[\s\S]*?<\/pre>|<code>([\s\S]*?)<\/code>/gi, (match, codeText) => {
        // Abaikan jika ini adalah bagian dari blok <pre>
        if (match.toLowerCase().startsWith('<pre')) return match;

        // Hanya jadikan backtick jika: satu baris, tidak ada atribut class/id
        if (codeText && !codeContentContainsNewLine(codeText) && !match.includes('class=') && !match.includes('id=')) {
            return `\`${codeText}\``;
        }
        return match;
    });

    return updated;
}

// Helper untuk cek baris baru di dalam tag code
function codeContentContainsNewLine(text) {
    return /\r|\n/.test(text);
}

/**
 * Fungsi rekursif untuk memproses semua file di dalam folder
 */
function processFolder(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`⚠️ Skip: Folder ${dir} tidak ditemukan.`);
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

            // Proses hanya file HTML dan abaikan index.html untuk keamanan struktur
            if (isHtml && !isIndex) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let updated = cleanHTML(content);

                // Hanya tulis ulang file jika ada perubahan konten
                if (content !== updated) {
                    fs.writeFileSync(fullPath, updated, 'utf8');
                    console.log(`✅ Berhasil dibersihkan: ${fullPath}`);
                }
            } else if (isIndex) {
                console.log(`🚫 Proteksi: Mengabaikan ${fullPath}`);
            }
        }
    });
}

// Daftar folder target di blog Layar Kosong
const targetFolders = [
    'artikelx'
];

console.log('🚀 Memulai operasi "Layar Kosong Bersih" via ESM...');
targetFolders.forEach(folder => {
    processFolder(path.join(rootDir, folder));
});
console.log('🏁 Selesai! Artikel di "artikelx" kini lebih ramping dan link eksternal tetap aman.');