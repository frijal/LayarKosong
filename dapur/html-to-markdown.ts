import { file, write, Glob } from "bun";
import path from "node:path";

const rootDir = path.join(import.meta.dir, '..');
const targetFolders = [
"gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"
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

    // 1. PROTEKSI: Sembunyikan isi <script>
    let updated = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
        const id = `__SCRIPT_PROTECT_${scriptPlaceholders.length}__`;
        scriptPlaceholders.push(match);
        return id;
    });

    /**
     * FUNGSI PEMBANTU: smartConvert
     * Menambahkan spasi hanya jika didahului alfabet/angka.
     * Tidak akan menyentuh/memakan karakter '>' dari tag sebelumnya.
     */
    const smartConvert = (text: string, regex: RegExp, symbol: string) => {
        return text.replace(regex, (match, prevChar, tag, content) => {
            const trimmed = content.trim();
            if (!trimmed) return '';

            // LOGIKA KRITIKAL:
            // Jika prevChar adalah '>', itu milik tag HTML. JANGAN tambah spasi.
            // Jika prevChar adalah huruf/angka, TAMBAH spasi.
            let prefix = prevChar || '';
            if (prevChar && /[\w\d]/.test(prevChar)) {
                prefix = `${prevChar} `;
            }

            return `${prefix}${symbol}${trimmed}${symbol}`;
        });
    };

    // 2. CONVERT: Bold, Italic, Strikethrough
    // Regex diubah: ([^>])? artinya tangkap 1 karakter asalkan BUKAN penutup tag '>'
    updated = smartConvert(updated, /([^>])?<(strong|b)[^>]*>([\s\S]*?)<\/\2>/gi, '**');
    updated = smartConvert(updated, /([^>])?<(em|i)[^>]*>([\s\S]*?)<\/\2>/gi, '*');
    updated = smartConvert(updated, /([^>])?<(del|s|strike)[^>]*>([\s\S]*?)<\/\2>/gi, '~~');

    // 3. CONVERT: Inline Code
    updated = updated.replace(/([^>])?<code[^>]*>\s*([\s\S]*?)\s*<\/code>/gi, (match, prevChar, codeText) => {
        if (codeText && !/\r|\n/.test(codeText) && !match.includes('class=') && !match.includes('id=')) {
            let prefix = prevChar || '';
    if (prevChar && /[\w\d]/.test(prevChar)) {
        prefix = `${prevChar} `;
    }
    return `${prefix}\`${codeText.trim()}\``;
        }
        return match;
    });

    // 4. FIX: Pembersihan Spasi Internal Markdown
    updated = updated
    .replace(/\*\*\s+/g, '**').replace(/\s+\*\*/g, '**')
    .replace(/\*\s+/g, '*').replace(/\s+\*/g, '*')
    .replace(/~~\s+/g, '~~').replace(/\s+~~/g, '~~');

    // 5. RESTORE: Kembalikan isi <script>
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