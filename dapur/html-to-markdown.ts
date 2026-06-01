import { file, write, Glob } from "bun";
import path from "node:path";

const rootDir = path.join(import.meta.dir, '..');

const targetFolders = [
    "gaya-hidup", "jejak-sejarah", "lainnya", "olah-media",
"opini-sosial", "sistem-terbuka", "warta-tekno"
];

// Signature — skip jika artikel sudah pernah diproses
const MD_SIGNATURE = "markdown_oleh_Fakhrul_Rijal";

// Boundary karakter yang TIDAK perlu tambah spasi (sudah aman untuk markdown.js)
// Kalau karakter sesudah marker bukan salah satu ini → tambah spasi
const SAFE_AFTER  = /[\s.,!?;:<)'"\/\]]/;
// Kalau karakter sebelum marker bukan salah satu ini → tambah spasi
const SAFE_BEFORE = /[\s(>'"\/\[]/;

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

/**
 * Konversi tag HTML ke markdown syntax.
 * Auto-tambah spasi sebelum/sesudah marker kalau tidak ada boundary.
 * Berlaku untuk: ** (bold), * (italic), ~~ (strikethrough), ` (inline code)
 */
function convertTag(
    tag: string,         // regex match lengkap
    before: string,      // karakter sebelum tag (dari capture group)
inner: string,       // isi tag
after: string,       // karakter sesudah tag (dari capture group)
open: string,        // marker pembuka mis: **
close: string        // marker penutup mis: **
): string {
    const needSpaceBefore = before && !SAFE_BEFORE.test(before);
    const needSpaceAfter  = after  && !SAFE_AFTER.test(after);

    const prefix = needSpaceBefore ? ' ' : '';
    const suffix = needSpaceAfter  ? ' ' : '';

    return `${before}${prefix}${open}${inner}${close}${suffix}${after}`;
}

function cleanHTML(html: string): string {
    const vault: string[] = [];
    const protect = (s: string) => {
        const id = `__VAULT_${vault.length}__`;
        vault.push(s);
        return id;
    };

    // PERBAIKAN 1: Gunakan arrow function () => v agar karakter $ di dalam <script> aman
    const restore = (s: string) =>
    vault.reduce((acc, v, i) => acc.replaceAll(`__VAULT_${i}__`, () => v), s);

    let out = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, protect);
    out = out.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, protect);

    out = out.replace(/<pre>`([\s\S]*?)`<\/pre>/gi, '<pre><code>$1</code></pre>');

    // PERBAIKAN 2: Ganti (.*?) menjadi (.+?) agar tidak memproses tag kosong
    // ===== BOLD =====
    out = out.replace(/([\s\S]?)<(strong|b)>(.+?)<\/\2>([\s\S]?)/gi,
                      (match, before, _tag, inner, after) =>
                      convertTag(match, before, inner, after, '**', '**')
    );

    // ===== ITALIC =====
    out = out.replace(/([\s\S]?)<(em|i)>(.+?)<\/\2>([\s\S]?)/gi,
                      (match, before, _tag, inner, after) =>
                      convertTag(match, before, inner, after, '*', '*')
    );

    // ===== STRIKETHROUGH =====
    out = out.replace(/([\s\S]?)<(del|s|strike)>(.+?)<\/\2>([\s\S]?)/gi,
                      (match, before, _tag, inner, after) =>
                      convertTag(match, before, inner, after, '~~', '~~')
    );

    // ===== LINK =====
    out = out.replace(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, url, text) => {
        const isProtected = /class=|id=|style=|target=|rel=/i.test(match);
        const containsImg = /<img\s[^>]*>/i.test(text);
        return (isProtected || containsImg) ? match : `[${text}](${url})`;
    });

    // ===== INLINE CODE =====
    out = out.replace(/<pre[\s\S]*?<\/pre>|<code>([\s\S]+?)<\/code>/gi, (match, codeText) => {
        if (match.toLowerCase().startsWith('<pre')) return match;
        if (codeText && !/\r|\n/.test(codeText) && !match.includes('class=') && !match.includes('id=')) {
            return match.replace(
                /([\s\S]?)<code>([\s\S]+?)<\/code>([\s\S]?)/i,
                                 (_m, before, inner, after) => convertTag(_m, before, inner, after, '`', '`')
            );
        }
        return match;
    });

    out = restore(out);

    const signature = `<noscript>${MD_SIGNATURE}</noscript>`;
    if (out.includes("</body>")) {
        out = out.replace(/<\/body>\s*$/i, "").trimEnd() + `\n${signature}\n</body>`;
    } else {
        out = out.trimEnd() + `\n${signature}`;
    }

    return out;
}

async function processFiles() {
    console.log('🚀 Memulai Operasi "Layar Kosong Bersih" (Bun Native)');

    const pattern = `{${targetFolders.join(',')}}/**/!(index).html`;
    const glob = new Glob(pattern);

    for await (const fileName of glob.scan({ cwd: rootDir, onlyFiles: true })) {
        if (path.basename(fileName) === 'index.html') continue;
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