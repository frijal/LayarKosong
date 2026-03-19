import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { nanoseconds } from "bun";
import * as minifyHtml from "@minify-html/node";

interface ErrorDetail {
    path: string;
    error: string;
}

interface Stats {
    success: number;
    failed: number;
    errorList: ErrorDetail[];
    totalSaved: number;
    totalBefore: number;
    totalAfter: number;
    totalInvisibleRemoved: number;
}

let stats: Stats = {
    success: 0,
    failed: 0,
    errorList: [],
    totalSaved: 0,
    totalBefore: 0,
    totalAfter: 0,
    totalInvisibleRemoved: 0,
};

// Folder target sesuai struktur kategori Layar Kosong
const folders: string[] = [
    "gaya-hidup", "jejak-sejarah", "lainnya", "olah-media",
"opini-sosial", "sistem-terbuka", "warta-tekno"
];

/**
 * 1. PROTEKSI URL: Mencegah karakter di dalam src/href ikut ter-minify
 * atau terhapus oleh proses pembersihan.
 */
const protectUrls = (html: string): { html: string; urls: string[] } => {
    const urls: string[] = [];
    let counter = 0;
    const protectedHtml = html.replace(/(src|href)="([^"]*)"/gi, (match) => {
        const id = `___URL_${counter++}___`;
        urls.push(match);
        return id;
    });
    return { html: protectedHtml, urls };
};

const restoreUrls = (html: string, urls: string[]): string => {
    let restored = html;
    urls.forEach((url, i) => {
        restored = restored.replace(`___URL_${i}___`, url);
    });
    return restored;
};

/**
 * 2. CLEANER: Menghapus karakter invisible dan menormalkan entitas HTML
 * agar ukuran file lebih ramping sebelum di-minify.
 */
const cleanContent = (html: string): string => {
    const before = html.length;
    const { html: protectedHtml, urls } = protectUrls(html);

    let cleaned = protectedHtml
    .replace(/\u00A0/g, " ") // Ubah non-breaking space ke spasi biasa
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, ""); // Hapus zero-width chars

    // Sederhanakan entitas umum ke simbol asli (UTF-8)
    const entities: { [key: string]: string } = {
        "&nbsp;": " ",
        "&amp;": "&",
        "&quot;": "\"",
        "&lt;": "<",
        "&gt;": ">", // Sangat penting agar Markdown Enhancer v7.3 bisa baca boundary
        "&copy;": "©",
        "&reg;": "®",
        "&deg;": "°"
    };

    for (const [entity, symbol] of Object.entries(entities)) {
        cleaned = cleaned.replace(new RegExp(entity, "g"), symbol);
    }

    cleaned = restoreUrls(cleaned, urls);
    stats.totalInvisibleRemoved += (before - cleaned.length);
    return cleaned;
};

/**
 * 3. PROCESSOR: Fungsi utama pemrosesan file
 */
const processFile = async (filePath: string) => {
    try {
        const content = await readFile(filePath, "utf8");
        const before = content.length;

        // Tahap A: Pembersihan karakter
        const cleaned = cleanContent(content);

        // Tahap B: Minifikasi dengan @minify-html/node
        // PENTING: collapse_whitespaces: false & minify_js: false agar aman
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

        const after = minified.length;

        stats.totalBefore += before;
        stats.totalAfter += after;
        stats.totalSaved += (before - after);
        stats.success++;

        await writeFile(filePath, minified, "utf8");
    } catch (err: any) {
        stats.failed++;
        stats.errorList.push({ path: filePath, error: err.message });
    }
};

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * RUNNER
 */
const run = async () => {
    const startTime = nanoseconds();

    for (const folder of folders) {
        try {
            const files = (await readdir(folder)).filter(f => f.endsWith('.html') && f !== 'index.html');
            const fileList = files.map(f => join(folder, f));

            // Proses secara paralel untuk kecepatan maksimal di Bun
            await Promise.all(fileList.map(file => processFile(file)));
        } catch (e) {
            console.error(`⚠️ Gagal membaca folder: ${folder}`);
        }
    }

    const endTime = nanoseconds();
    const duration = (endTime - startTime) / 1e9;

    console.log("\n" + "=".repeat(60));
    console.log("📊 REKAP MINIFIKASI LAYAR KOSONG");
    console.log("=".repeat(60));
    console.log(`⏱️ Waktu Tempuh      : ${duration.toFixed(4)} detik`);
    console.log(`✅ Berhasil Dijepit  : ${stats.success} file`);
    console.log(`❌ Gagal Proses      : ${stats.failed} file`);
    console.log("-".repeat(60));
    console.log(`📉 Ukuran Sebelum    : ${formatBytes(stats.totalBefore)}`);
    console.log(`📉 Ukuran Sesudah    : ${formatBytes(stats.totalAfter)}`);
    console.log(`🚀 Ruang Dihemat     : ${formatBytes(stats.totalSaved)}`);
    console.log(`🧹 Karakter Dibuang  : ${stats.totalInvisibleRemoved} chars`);
    console.log("=".repeat(60));

    if (stats.failed > 0) {
        console.log("\n⚠️ DETAIL ERROR:");
        stats.errorList.forEach((item, i) => console.log(`${i + 1}. ${item.path} -> ${item.error}`));
    }
};

run();