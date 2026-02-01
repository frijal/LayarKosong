import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper karena di ESM tidak ada __dirname secara default
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

function cleanHTML(html) {
    let updated = html;

    // --- FASE 1: SAPU JAGAT (Balikin backtick di dalam <pre> jadi <code>) ---
    updated = updated.replace(/<pre>`([\s\S]*?)`<\/pre>/gi, '<pre><code>$1</code></pre>');

    // --- FASE 2: CLEANUP STANDARD (Bold, Italic, Link) ---
    updated = updated
    .replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*')
    .replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (match, url, text) => {
        // Abaikan jika link punya class, id, atau style (biar CSS nggak pecah)
        return (match.includes('class=') || match.includes('id=') || match.includes('style=')) ? match : `[${text}](${url})`;
    });

    // --- FASE 3: SMART INLINE CODE (Hanya ganti yang aman) ---
    // Logika: Tangkap <pre> dan <code>. Jika <pre>, biarkan. Jika <code> polos, jadikan backtick.
    updated = updated.replace(/<pre[\s\S]*?<\/pre>|<code>([\s\S]*?)<\/code>/gi, (match, codeText) => {
        if (match.toLowerCase().startsWith('<pre')) return match; // Lindungi blok kode

        // Hanya jadikan backtick jika: satu baris, tidak ada atribut class/id/style
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

            if (isHtml && !isIndex) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let updated = cleanHTML(content);

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

// Tambahkan folder kategori lainnya di sini jika ingin sapu bersih semua
const targetFolders = 'artikelx gaya-hidup jejak-sejarah lainnya olah-media opini-sosial sistem-terbuka warta-tekno'.split(' ');

console.log('🚀 Memulai operasi "Layar Kosong Bersih" via ESM...');
targetFolders.forEach(folder => {
    processFolder(path.join(rootDir, folder));
});
console.log('🏁 Selesai! Semua artikel di "artikelx" kini lebih ramping dan rapi.');
