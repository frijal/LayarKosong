import { file, write, Glob } from "bun";
import path from "node:path";

const rootDir = path.join(import.meta.dir, '..');

const targetFolders = [
    "gaya-hidup", "jejak-sejarah", "lainnya", "olah-media",
"opini-sosial", "sistem-terbuka", "warta-tekno"
];

// Signature — skip jika artikel sudah pernah diproses
const MD_SIGNATURE = "markdown_oleh_Fakhrul_Rijal";

interface Stats {
    processed: number;
    changed: number;
    skipped: number;
    totalBefore: number;
    totalAfter: number;
}

let stats: Stats = {
    processed: 0,
    changed: 0,
    skipped: 0,
    totalBefore: 0,
    totalAfter: 0
};

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
        updated = updated.replace(`__SCRIPT_PROTECT_${index}__`, tag);
    });

    // Injeksi signature di akhir file — sama polanya dengan inject-schema.ts
    const signature = `<noscript>${MD_SIGNATURE}</noscript>`;
    if (updated.includes("</html>")) {
        updated = updated.replace(/<\/html>\s*$/i, "").trimEnd() + `${signature}</html>`;
    } else {
        updated = updated.trimEnd() + signature;
    }

    return updated;
}

async function processFiles() {
    console.log('🚀 Memulai Operasi "Layar Kosong Bersih" (Bun Native)');

    const pattern = `{${targetFolders.join(',')}}/**/!(index).html`;
    const glob = new Glob(pattern);

    for await (const fileName of glob.scan({ cwd: rootDir, onlyFiles: true })) {
        const fullPath = path.join(rootDir, fileName);
        const content  = await file(fullPath).text();

        // Skip jika sudah ada signature — artikel sudah pernah diproses
        if (content.includes(MD_SIGNATURE)) {
            stats.skipped++;
            continue;
        }

        const updated = cleanHTML(content);
        stats.processed++;
        stats.totalBefore += Buffer.byteLength(content, 'utf8');
        stats.totalAfter  += Buffer.byteLength(updated, 'utf8');

        if (content !== updated) {
            await write(fullPath, updated);
            stats.changed++;
            console.log(`   ✅ Markdown Style: ...${fileName}`);
        }
    }

    const saved   = stats.totalBefore - stats.totalAfter;
    const percent = stats.totalBefore > 0
    ? ((saved / stats.totalBefore) * 100).toFixed(2) : "0";

    console.log('\n' + '='.repeat(60));
    console.log('📊 Rekap konversi ke Markdown Sederhana');
    console.log('='.repeat(60));
    console.log(`📂 File diproses   : ${stats.processed}`);
    console.log(`✅ File diubah     : ${stats.changed}`);
    console.log(`⏭️  File di-skip    : ${stats.skipped}`);
    console.log(`📉 Total sebelum   : ${stats.totalBefore} bytes`);
    console.log(`📉 Total sesudah   : ${stats.totalAfter} bytes`);
    console.log(`🚀 Ruang dihemat   : ${saved} bytes (${percent}%)`);
    console.log('='.repeat(60) + '\n');
}

await processFiles();
console.log('🏁 Selesai! Semua artikel kini lebih ramping.');