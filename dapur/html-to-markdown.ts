import { file, write, Glob } from "bun";
import path from "node:path";

const rootDir = path.join(import.meta.dir, '..');
const targetFolders = [
    "gaya-hidup", "jejak-sejarah", "lainnya", "olah-media",
"opini-sosial", "sistem-terbuka", "warta-tekno"
];

interface Stats {
    processed: number;
    changed: number;
    totalBefore: number;
    totalAfter: number;
}

let stats: Stats = {
    processed: 0,
    changed: 0,
    totalBefore: 0,
    totalAfter: 0
};

function cleanHTML(html: string): string {
    const scriptPlaceholders: string[] = [];

    // 1. PROTEKSI: Script tetap aman
    let updated = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
        const id = `__SCRIPT_PROTECT_${scriptPlaceholders.length}__`;
        scriptPlaceholders.push(match);
        return id;
    });

    // 2. CONVERT: Bold, Italic, Strikethrough (DENGAN TRIMMING INTERNAL)
        updated = updated
    .replace(/<(strong|b)[^>]*>\s*([\s\S]*?)\s*<\/\1>/gi, '**$2**')
    .replace(/<(em|i)[^>]*>\s*([\s\S]*?)\s*<\/\1>/gi, '*$2*')
    .replace(/<(del|s|strike)[^>]*>\s*([\s\S]*?)\s*<\/\1>/gi, '~~$2~~');

    // 3. FIX: Pembersihan Spasi Antar Tag (Penting untuk metadata)
        updated = updated
    .replace(/\*\*\s+/g, '**')
    .replace(/\s+\*\*/g, '**')
    .replace(/\*\s+/g, '*')
    .replace(/\s+\*/g, '*');

    // 4. CONVERT: Links & Code (Sama seperti sebelumnya)
    updated = updated.replace(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, url, text) => {
        const isComplex = /class=|id=|style=|target=|rel=/i.test(match);
        const hasTags = /<[^>]+>/.test(text);
        return (isComplex || hasTags) ? match : `[${text.trim()}](${url})`;
    });

    updated = updated.replace(/<code[^>]*>\s*([\s\S]*?)\s*<\/code>/gi, (match, codeText) => {
        if (codeText && !/\r|\n/.test(codeText) && !match.includes('class=') && !match.includes('id=')) {
            return `\`${codeText.trim()}\``;
        }
        return match;
    });

    // 5. RESTORE: Kembalikan Script
    scriptPlaceholders.forEach((tag, index) => {
        const id = `__SCRIPT_PROTECT_${index}__`;
        updated = updated.replace(id, tag);
    });

    return updated;
}

/**
 * Scan file HTML di folder target dan proses konversinya.
 */
async function processFiles() {
    console.log('🚀 Memulai Operasi "Layar Kosong Bersih" (Bun Native)');

    // Mencari semua file .html kecuali index.html di folder target
    const pattern = `{${targetFolders.join(',')}}/**/!(index).html`;
    const glob = new Glob(pattern);

    for await (const fileName of glob.scan({ cwd: rootDir, onlyFiles: true })) {
        const fullPath = path.join(rootDir, fileName);
        const f = file(fullPath);

        try {
            const content = await f.text();
            const updated = cleanHTML(content);

            stats.processed++;
            stats.totalBefore += Buffer.byteLength(content, 'utf8');
            stats.totalAfter += Buffer.byteLength(updated, 'utf8');

            if (content !== updated) {
                await write(fullPath, updated);
                stats.changed++;
                console.log(`   ✅ Markdownized: ...${fileName}`);
            }
        } catch (e) {
            console.error(`   ❌ Gagal memproses: ${fileName}`);
        }
    }

    // Tampilkan Hasil
    const saved = stats.totalBefore - stats.totalAfter;
    const percent = stats.totalBefore > 0 ? ((saved / stats.totalBefore) * 100).toFixed(2) : "0";

    console.log('\n' + '='.repeat(60));
    console.log('📊 Rekap Konversi HTML ke Markdown');
    console.log('='.repeat(60));
    console.log(`📂 File diproses   : ${stats.processed}`);
    console.log(`✅ File diubah     : ${stats.changed}`);
    console.log(`📉 Ukuran Awal     : ${(stats.totalBefore / 1024).toFixed(2)} KB`);
    console.log(`📉 Ukuran Akhir    : ${(stats.totalAfter / 1024).toFixed(2)} KB`);
    console.log(`🚀 Ruang Dihemat   : ${saved} bytes (${percent}%)`);
    console.log('='.repeat(60) + '\n');
}

await processFiles();