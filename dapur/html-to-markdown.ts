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

// Logika pembersihan tetap utuh, tapi skip isi <script>
function cleanHTML(html: string): string {
    // Lindungi isi <script> agar tidak ikut diubah
    const scriptPlaceholders: string[] = [];
    let protectedHTML = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
        const id = `__SCRIPT_PROTECT_${scriptPlaceholders.length}__`;
        scriptPlaceholders.push(match);
        return id;
    });

    // Konversi markup umum
    let updated = protectedHTML
    .replace(/<pre>`([\s\S]*?)`<\/pre>/gi, '<pre><code>$1</code></pre>')
    .replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*')
    .replace(/<(del|s|strike)>(.*?)<\/\1>/gi, '~~$2~~')
    .replace(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, url, text) => {
        const isProtected = /class=|id=|style=|target=|rel=/i.test(match);
        const containsImg = /<img\s[^>]*>/i.test(text);
        return (isProtected || containsImg) ? match : `[${text}](${url})`;
    });

    updated = updated.replace(/<pre[\s\S]*?<\/pre>|<code>([\s\S]*?)<\/code>/gi, (match, codeText) => {
        if (match.toLowerCase().startsWith('<pre')) return match;
        if (codeText && !/\r|\n/.test(codeText) && !match.includes('class=') && !match.includes('id=')) {
            return `\`${codeText}\``;
        }
        return match;
    });

    // Kembalikan isi <script> yang dilindungi
    scriptPlaceholders.forEach((tag, index) => {
        const id = `__SCRIPT_PROTECT_${index}__`;
        updated = updated.replace(id, tag);
    });

    return updated;
}

// Proses file dengan log statistik
async function processFiles() {
    console.log('🚀 Memulai Operasi "Layar Kosong Bersih" (Bun Native)');

    const pattern = `{${targetFolders.join(',')}}/**/!(index).html`;
    const glob = new Glob(pattern);

    for await (const fileName of glob.scan({ cwd: rootDir, onlyFiles: true })) {
        const fullPath = path.join(rootDir, fileName);
        const f = file(fullPath);
        const content = await f.text();
        const updated = cleanHTML(content);

        stats.processed++;
        stats.totalBefore += Buffer.byteLength(content, 'utf8');
        stats.totalAfter += Buffer.byteLength(updated, 'utf8');

        if (content !== updated) {
            await write(fullPath, updated);
            stats.changed++;
            console.log(`   ✅ Clean: ...${fileName}`);
        } else {
            console.log(`   ⏭️ Skip (no change): ...${fileName}`);
        }
    }

    // Rekap akhir
    const saved = stats.totalBefore - stats.totalAfter;
    const percent = stats.totalBefore > 0 ? ((saved / stats.totalBefore) * 100).toFixed(2) : "0";

    console.log('\n' + '='.repeat(60));
    console.log('📊 REKAP OPERASI "LAYAR KOSONG BERSIH"');
    console.log('='.repeat(60));
    console.log(`📂 File diproses   : ${stats.processed}`);
    console.log(`✅ File diubah     : ${stats.changed}`);
    console.log(`📉 Total sebelum   : ${stats.totalBefore} bytes`);
    console.log(`📉 Total sesudah   : ${stats.totalAfter} bytes`);
    console.log(`🚀 Ruang dihemat   : ${saved} bytes (${percent}%)`);
    console.log('='.repeat(60) + '\n');
}

await processFiles();
console.log('🏁 Selesai! Semua artikel kini lebih ramping.');
