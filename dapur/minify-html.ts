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
    totalInvisibleRemoved: number;
}

const stats: Stats = {
    success: 0,
    skipped: 0,
    failed: 0,
    errorList: [],
    totalSaved: 0,
    totalBefore: 0,
    totalAfter: 0,
    totalInvisibleRemoved: 0,
};

// ========== URL PROTECTION ==========
const protectUrls = (html: string): { html: string; urls: string[] } => {
    const urls: string[] = [];
    const protectedHtml = html.replace(/(src|href)="([^"]*)"/gi, (match) => {
        const id = `___URL_${urls.length}___`;
        urls.push(match);
        return id;
    });
    return { html: protectedHtml, urls };
};

const restoreUrls = (html: string, urls: string[]): string =>
urls.reduce((acc, url, i) => acc.replace(`___URL_${i}___`, url), html);

// ========== CLEANER ==========
/**
 * Hapus invisible chars & decode entitas umum.
 * &gt; dan &lt; DIKECUALIKAN — dikonsumsi Markdown Enhancer v7.5 di browser.
 */
const cleanContent = (html: string): string => {
    const before = html.length;
    const { html: protectedHtml, urls } = protectUrls(html);

    let cleaned = protectedHtml
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "");

    const entities: Record<string, string> = {
        "&nbsp;": " ",
        "&amp;": "&",
        "&quot;": '"',
        "&reg;": "®",
        "&deg;": "°",
    };

    for (const [entity, symbol] of Object.entries(entities)) {
        cleaned = cleaned.replaceAll(entity, symbol);
    }

    cleaned = restoreUrls(cleaned, urls);
    stats.totalInvisibleRemoved += before - cleaned.length;
    return cleaned;
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

        const before  = content.length;
        const cleaned = cleanContent(content);

        const minified = minifyHtml.minify(Buffer.from(cleaned), {
            allow_noncompliant_unquoted_attribute_values: true,
            collapse_whitespaces: false,
            ensure_spec_compliant_unquoted_attribute_values: true,
            keep_comments: false,
            keep_html_and_head_opening_tags: true,
            keep_spaces_between_attributes: false,
            minify_css: true,
            minify_js: false,
        }).toString();

        // Injeksi signature setelah minifikasi — rapat ke </html>
        const signature = `<noscript>${MINIFY_SIGNATURE}</noscript>`;
        const signed = minified.includes("</html>")
        ? minified.replace(/<\/html>\s*$/i, "").trimEnd() + `${signature}</html>`
        : minified.trimEnd() + signature;

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

    // Kumpulkan semua file dari semua folder sekaligus
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

    // Proses semua file secara paralel penuh — lintas folder
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
    console.log(`🧹 Karakter Dibuang  : ${stats.totalInvisibleRemoved} chars`);
    console.log("=".repeat(60));

    if (stats.failed > 0) {
        console.log("\n⚠️  DETAIL ERROR:");
        stats.errorList.forEach((item, i) =>
        console.log(`  ${i + 1}. ${item.path} → ${item.error}`)
        );
    }
};

run();