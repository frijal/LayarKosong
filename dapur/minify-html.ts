import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { nanoseconds } from "bun";
import * as minifyHtml from "@minify-html/node";

// ========== CONFIG ==========
const MINIFY_SIGNATURE = "minify_oleh_Fakhrul_Rijal";

const folders: string[] = [
    "gaya-hidup", "jejak-sejarah", "lainnya", "olah-media",
"opini-sosial", "sistem-terbuka", "warta-tekno"
];

// ========== TYPES ==========
interface ErrorDetail {
    path: string;
    error: string;
}

interface Stats {
    success: number;
    skipped: number;
    failed: number;
    errorList: ErrorDetail[];
    totalSaved: number;
    totalBefore: number;
    totalAfter: number;
}

const stats: Stats = {
    success: 0,
    skipped: 0,
    failed: 0,
    errorList: [],
    totalSaved: 0,
    totalBefore: 0,
    totalAfter: 0,
};

// ========== PROTECTION: ATRIBUT ==========
const protectAttributes = (html: string): { html: string; vault: string[] } => {
    const vault: string[] = [];

    const protectedHtml = html
    // 1. Proteksi tag <script src="..."> — script eksternal
    .replace(/<script\b[^>]*\bsrc\s*=\s*"[^"]*"[^>]*>/gi, (match) => {
        const id = `___ATTR_${vault.length}___`;
        vault.push(match);
        return id;
    })
    // 2. Proteksi semua atribut bernilai penting
    .replace(
        /\b(src|href|srcset|content|action|data-src|data-href|poster)\s*=\s*"([^"]*)"/gi,
             (match) => {
                 const id = `___ATTR_${vault.length}___`;
                 vault.push(match);
                 return id;
             }
    );

    return { html: protectedHtml, vault };
};

const restoreAttributes = (html: string, vault: string[]): string =>
vault.reduce((acc, original, i) => acc.replace(`___ATTR_${i}___`, original), html);

// Normalisasi double space → single space di seluruh dokumen
const normalizeSpaces = (html: string): string =>
html.replace(/ {2,}/g, ' ');

// ========== PROTECTION: STYLE BLOCKS ==========
// Proteksi <style> HANYA selama protectMarkdownSpaces jalan
// agar CSS selector seperti * { } tidak ikut terkena replace spasi
// Setelah protectMarkdownSpaces selesai, style DILEPAS kembali
// supaya minify_css: true tetap bisa minify CSS
const protectStyleBlocks = (html: string): { html: string; styles: string[] } => {
    const styles: string[] = [];
    const protected_ = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, (match) => {
        const id = `___STYLE_${styles.length}___`;
        styles.push(match);
        return id;
    });
    return { html: protected_, styles };
};

const restoreStyleBlocks = (html: string, styles: string[]): string =>
styles.reduce((acc, style, i) => acc.replace(`___STYLE_${i}___`, style), html);

// ========== PROTECTION: MARKDOWN SPACES ==========
// Spasi di sekitar markdown marker dilindungi agar tidak dibuang minifier
// markdown.js butuh spasi sebagai boundary untuk render ** * ~~ `
const protectMarkdownSpaces = (html: string): string =>
html
.replace(/ (\*\*|__|\*|_|~~|`)/g, '&#32;$1')
.replace(/(\*\*|__|\*|_|~~|`) /g, '$1&#32;');

const restoreMarkdownSpaces = (html: string): string => {
    const restored = html.replaceAll('&#32;', ' ');
    // Normalisasi double space yang mungkin terjadi di sekitar markdown marker
    // akibat kombinasi spasi dari html-to-markdown + protectMarkdownSpaces
    return restored
    .replace(/ {2,}(\*\*|__|\*(?!\*)|_(?!_)|~~|`)/g, ' $1')  // double space SEBELUM marker
    .replace(/(\*\*|__|\*(?!\*)|_(?!_)|~~|`) {2,}/g, '$1 '); // double space SESUDAH marker
};

// ========== PROCESSOR ==========
const processFile = async (filePath: string): Promise<void> => {
    try {
        const content = await readFile(filePath, "utf8");

        // Skip jika sudah ada signature — artikel sudah pernah diminify
        if (content.includes(MINIFY_SIGNATURE)) {
            stats.skipped++;
            return;
        }

        const before = content.length;

        // 1. Proteksi atribut penting (src, href, content, dll)
        const { html: protected1, vault } = protectAttributes(content);

        // 2. Proteksi <style> sementara — agar CSS tidak kena protectMarkdownSpaces
        const { html: noStyle, styles } = protectStyleBlocks(protected1);

        // 3. Proteksi spasi markdown — aman, <style> sudah disingkirkan
        const mdProtected = protectMarkdownSpaces(noStyle);

        // 4. Lepaskan <style> kembali — siap diminify oleh minify_css: true
        const stylesRestored = restoreStyleBlocks(mdProtected, styles);

        // 5. Kembalikan atribut yang diproteksi
        const restored = restoreAttributes(stylesRestored, vault);

        // 6. Minifikasi — minify_css: true akan handle <style> dengan benar
        const minified = minifyHtml.minify(Buffer.from(restored), {
            allow_noncompliant_unquoted_attribute_values: true,
            collapse_whitespaces: false,
            ensure_spec_compliant_unquoted_attribute_values: true,
            keep_comments: false,
            keep_html_and_head_opening_tags: true,
            keep_spaces_between_attributes: false,
            minify_css: true,
            minify_js: false,
        }).toString();

        // 7. Restore spasi markdown + normalisasi double space
        // normalizeSpaces harus SETELAH minify karena minifier bisa
        // re-introduce double space saat serialisasi atribut
        const spacesRestored = normalizeSpaces(restoreMarkdownSpaces(minified));

        // 8. Injeksi signature rapat ke </body>
        const signature = `<noscript>${MINIFY_SIGNATURE}</noscript>`;
        const signed = spacesRestored.includes("</body>")
        ? spacesRestored.replace(/<\/body>\s*$/i, "").trimEnd() + `${signature}</body>`
        : spacesRestored.trimEnd() + signature;

        const after = signed.length;

        stats.totalBefore += before;
        stats.totalAfter  += after;
        stats.totalSaved  += before - after;
        stats.success++;

        // Hanya tulis jika benar-benar lebih kecil
        if (after < before) {
            await writeFile(filePath, signed, "utf8");
        }

    } catch (err: any) {
        stats.failed++;
        stats.errorList.push({ path: filePath, error: err.message });
    }
};

// ========== HELPERS ==========
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// ========== RUNNER ==========
const run = async (): Promise<void> => {
    const startTime = nanoseconds();

    const allFiles = (
        await Promise.all(
            folders.map(async (folder) => {
                try {
                    const files = await readdir(folder);
                    return files
                    .filter(f => f.endsWith(".html") && f !== "index.html")
                    .map(f => join(folder, f));
                } catch {
                    console.error(`⚠️  Gagal membaca folder: ${folder}`);
                    return [];
                }
            })
        )
    ).flat();

    await Promise.all(allFiles.map(processFile));

    const duration = (nanoseconds() - startTime) / 1e9;

    console.log("\n" + "=".repeat(60));
    console.log("📊 REKAP MINIFIKASI LAYAR KOSONG");
    console.log("=".repeat(60));
    console.log(`⏱️  Waktu Tempuh      : ${duration.toFixed(4)} detik`);
    console.log(`✅ Berhasil Dijepit  : ${stats.success} file`);
    console.log(`⏭️  Di-skip           : ${stats.skipped} file`);
    console.log(`❌ Gagal Proses      : ${stats.failed} file`);
    console.log("-".repeat(60));
    console.log(`📉 Ukuran Sebelum    : ${formatBytes(stats.totalBefore)}`);
    console.log(`📉 Ukuran Sesudah    : ${formatBytes(stats.totalAfter)}`);
    console.log(`🚀 Ruang Dihemat     : ${formatBytes(stats.totalSaved)}`);
    console.log("=".repeat(60));

    if (stats.failed > 0) {
        console.log("\n⚠️  DETAIL ERROR:");
        stats.errorList.forEach((item, i) =>
        console.log(`  ${i + 1}. ${item.path} → ${item.error}`)
        );
    }
};

run();