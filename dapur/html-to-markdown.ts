import { file, write } from "bun";
import { readdirSync, lstatSync, existsSync } from "node:fs";
import path from "node:path";

// Menunjuk ke root folder (satu tingkat di atas script ini)
const rootDir = path.join(import.meta.dir, '..');

/**
 * Fungsi utama untuk membersihkan HTML menjadi Markdown ramping
 */
function cleanHTML(html: string): string {
    let updated = html;

    // --- FASE 1: SAPU JAGAT ---
    updated = updated.replace(/<pre>`([\s\S]*?)`<\/pre>/gi, '<pre><code>$1</code></pre>');

    // --- FASE 2: CLEANUP TEXT & LINKS ---
    updated = updated
        .replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')       // Bold
        .replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*')             // Italic
        .replace(/<(del|s|strike)>(.*?)<\/\1>/gi, '~~$2~~')   // Strikethrough
        // Konversi Link - SMART MODE
        .replace(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, url, text) => {
            const isProtected = /class=|id=|style=|target=|rel=/i.test(match);
            const containsImg = /<img\s[^>]*>/i.test(text);
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

function codeContentContainsNewLine(text: string): boolean {
    return /\r|\n/.test(text);
}

/**
 * Fungsi rekursif untuk memproses file (Async untuk Bun Speed)
 */
async function processFolder(dir: string): Promise<void> {
    if (!existsSync(dir)) {
        console.log(`⚠️  Folder tidak ditemukan: ${dir}`);
        return;
    }

    const files = readdirSync(dir);

    for (const fileName of files) {
        const fullPath = path.join(dir, fileName);

        if (lstatSync(fullPath).isDirectory()) {
            await processFolder(fullPath);
        } else {
            const isHtml = fileName.toLowerCase().endsWith('.html');
            const isIndex = fileName.toLowerCase() === 'index.html';

            if (isHtml && !isIndex) {
                const bunFile = file(fullPath);
                const content = await bunFile.text();
                const updated = cleanHTML(content);

                if (content !== updated) {
                    // Gunakan Bun.write untuk performa maksimal
                    await write(fullPath, updated);
                    console.log(`   ✅ Clean: ...${fullPath.slice(-40)}`);
                }
            }
        }
    }
}

// 🔥 DAFTAR 7 FOLDER KATEGORI LAYAR KOSONG
const targetFolders: string[] = [
    "gaya-hidup",
    "jejak-sejarah",
    "lainnya",
    "olah-media",
    "opini-sosial",
    "sistem-terbuka",
    "warta-tekno"
];

// Main Runner
(async () => {
    console.log('---------------------------------------------------------');
    console.log('🚀 Memulai Operasi "Layar Kosong Bersih" (7 Kategori)');
    console.log('---------------------------------------------------------');

    for (const folder of targetFolders) {
        const targetPath = path.join(rootDir, folder);
        console.log(`📂 Processing: /${folder}`);
        await processFolder(targetPath);
    }

    console.log('---------------------------------------------------------');
    console.log('🏁 Selesai! Semua artikel kini lebih ramping & SEO Friendly.');
    console.log('---------------------------------------------------------');
})();
