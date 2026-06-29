import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { nanoseconds } from "bun";
import * as minifyHtml from "@minify-html/node";
import * as cheerio from "cheerio";

// ========== CONFIG ==========
const MINIFY_SIGNATURE = "minify_oleh_Fakhrul_Rijal";
const rootDir          = join(import.meta.dir, "..");

const folders: string[] = [
    "gaya-hidup", "jejak-sejarah", "lainnya", "olah-media",
    "opini-sosial", "sistem-terbuka", "warta-tekno",
];

// ========== TYPES ==========
interface ErrorDetail {
    path:  string;
    error: string;
}

interface Stats {
    success:     number;
    skipped:     number;
    failed:      number;
    errorList:   ErrorDetail[];
    totalSaved:  number;
    totalBefore: number;
    totalAfter:  number;
}

const stats: Stats = {
    success:     0,
    skipped:     0,
    failed:      0,
    errorList:   [],
    totalSaved:  0,
    totalBefore: 0,
    totalAfter:  0,
};

// ========== SANITASI UNICODE ==========
/**
 * Bersihkan semua karakter invisible / hidden unicode dari HTML.
 *
 * Karakter yang ditangani:
 *   \u00AD        → Soft Hyphen (dari Word/Google Docs)
 *   \u200B        → Zero-Width Space
 *   \u200C        → Zero-Width Non-Joiner
 *   \u200D        → Zero-Width Joiner
 *   \u200E        → Left-to-Right Mark
 *   \u200F        → Right-to-Left Mark
 *   \u2060        → Word Joiner
 *   \uFEFF        → BOM / Zero-Width No-Break Space
 *   \u00A0        → Non-Breaking Space → dikonversi ke &nbsp; (bukan dihapus)
 */
const sanitizeUnicode = (html: string): string =>
    html
        .replace(/\u00A0/g, "&nbsp;")
        .replace(/[\u00AD\u200B-\u200F\u2060\uFEFF]/g, "");

// ========== PROTECTION: ATRIBUT ==========
const protectAttributes = (html: string): { html: string; vault: string[] } => {
    const vault: string[] = [];

    const protectedHtml = html
        .replace(/<script\b[^>]*\bsrc\s*=\s*"[^"]*"[^>]*>/gi, (match) => {
            const id = `___ATTR_${vault.length}___`;
            vault.push(match);
            return id;
        })
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

// ========== PROTECTION: STYLE BLOCKS ==========
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

// ========== NORMALIZE SPACES ==========
const normalizeSpaces = (html: string): string =>
    html.replace(/ {2,}/g, " ");

// ========== CHEERIO FINALIZER ==========
const finalizeHtmlWithCheerio = (html: string): string => {
    const signature = `<noscript>${MINIFY_SIGNATURE}</noscript>`;

    // Simpan status doctype agar tidak hilang setelah parse/serialize.
    const hasDoctype = /^\s*<!doctype\s+html>/i.test(html);

    // Mode dokumen penuh.
    // Cheerio akan membentuk struktur <html>, <head>, dan <body>.
    const $ = cheerio.load(html, {}, true);

    // Hapus signature lama agar tidak dobel.
    $("noscript").each((_, el) => {
        const text = $(el).text().trim();

        if (text === MINIFY_SIGNATURE) {
            $(el).remove();
        }
    });

    // Pastikan <html> ada.
    if ($("html").length === 0) {
        $.root().append("<html></html>");
    }

    // Pastikan <head> ada.
    if ($("head").length === 0) {
        $("html").prepend("<head></head>");
    }

    // Pastikan <body> ada.
    if ($("body").length === 0) {
        $("html").append("<body></body>");
    }

    // Bubuhkan signature tepat di akhir body.
    $("body").append(signature);

    let output = $.html().trimEnd();

    // Normalisasi doctype menjadi bentuk ringkas.
    output = output.replace(/^\s*<!doctype\s+html>/i, "<!doctype html>");

    // Jaga-jaga jika doctype hilang.
    if (hasDoctype && !/^\s*<!doctype\s+html>/i.test(output)) {
        output = "<!doctype html>" + output;
    }

    return output;
};

// ========== PROCESSOR ==========
const processFile = async (filePath: string): Promise<void> => {
    try {
        const content = await readFile(filePath, "utf8");

        if (content.includes(MINIFY_SIGNATURE)) {
            stats.skipped++;
            return;
        }

        const before = content.length;

        // 🧹 Langkah 1: Sanitasi unicode tersembunyi — SEBELUM semua protect chain
        const cleaned = sanitizeUnicode(content);

        // 🔒 Langkah 2: Protect → process → restore
        const { html: protected1, vault } = protectAttributes(cleaned);
        const { html: noStyle, styles }   = protectStyleBlocks(protected1);
        const stylesRestored              = restoreStyleBlocks(noStyle, styles);
        const restored                    = restoreAttributes(stylesRestored, vault);

        // ⚡ Langkah 3: Minify
        const minified = minifyHtml.minify(Buffer.from(restored), {
            allow_noncompliant_unquoted_attribute_values:    true,
            collapse_whitespaces:                            false,
            ensure_spec_compliant_unquoted_attribute_values: true,
            keep_comments:                                   false,
            keep_closing_tags:                               true,
            keep_html_and_head_opening_tags:                 true,
            keep_spaces_between_attributes:                  false,
            minify_css:                                      true,
            minify_js:                                       false,
        }).toString();

        // 🔁 Langkah 4: Normalize multi-spasi
        const spacesRestored = normalizeSpaces(minified);

        // 🖊️  Langkah 5: Finalisasi struktur HTML dengan Cheerio + bubuhkan signature
        const signed = finalizeHtmlWithCheerio(spacesRestored);

        const after = signed.length;

        stats.totalBefore += before;
        stats.totalAfter  += after;
        stats.totalSaved  += before - after;
        stats.success++;

        // Tulis hanya kalau ada perubahan nyata
        if (signed !== content) {
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

    const k     = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i     = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// ========== RUNNER ==========
const run = async (): Promise<void> => {
    const startTime = nanoseconds();

    const allFiles = (
        await Promise.all(
            folders.map(async (folder) => {
                try {
                    const files = await readdir(join(rootDir, folder));

                    return files
                        .filter((f) => f.endsWith(".html"))
                        .map((f) => join(rootDir, folder, f));
                } catch {
                    console.error(`⚠️  Gagal membaca folder: ${folder}`);
                    return [];
                }
            })
        )
    ).flat();

    // Tambahkan feed.html dari root
    allFiles.push(join(rootDir, "feed.html"));

    await Promise.all(allFiles.map(processFile));

    const duration = (nanoseconds() - startTime) / 1e9;

    console.log("\n" + "=".repeat(60));
    console.log("📊 REKAP MINIFIKASI LAYAR KOSONG");
    console.log("=".repeat(60));
    console.log(`⏱️  Waktu Tempuh      : ${duration.toFixed(4)} detik`);
    console.log(`✅ Berhasil Dijepit   : ${stats.success} file`);
    console.log(`⏭️  Di-skip           : ${stats.skipped} file`);
    console.log(`❌ Gagal Proses       : ${stats.failed} file`);
    console.log("-".repeat(60));
    console.log(`📉 Ukuran Sebelum     : ${formatBytes(stats.totalBefore)}`);
    console.log(`📦 Ukuran Sesudah     : ${formatBytes(stats.totalAfter)}`);
    console.log(`🚀 Ruang Dihemat      : ${formatBytes(stats.totalSaved)}`);
    console.log("=".repeat(60));

    if (stats.failed > 0) {
        console.log("\n⚠️  DETAIL ERROR:");

        stats.errorList.forEach((item, i) =>
            console.log(`  ${i + 1}. ${item.path} → ${item.error}`)
        );
    }
};

run();
