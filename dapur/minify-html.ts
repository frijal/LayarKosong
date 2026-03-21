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

// ========== PROTECTION ==========
/**
 * Proteksi semua atribut yang nilainya TIDAK boleh disentuh minifier/cleaner:
 * - src="..."       → URL gambar, script, link
 * - href="..."      → URL link, canonical, alternate
 * - srcset="..."    → URL responsive image
 * - content="..."   → meta og:image, og:url, robots, article:published_time, dll
 * - action="..."    → form action URL
 * - data-src="..."  → lazy-load URL
 *
 * Semua placeholder berbentuk ___ATTR_N___ sehingga minifier tidak menyentuhnya.
 */
const protectAttributes = (html: string): { html: string; vault: string[] } => {
    const vault: string[] = [];

    // Proteksi seluruh tag <script ... src="..."> agar tidak dihapus/dipecah
    // Ini proteksi tag-level, bukan hanya atribut src-nya
    const protectedHtml = html

    // 1. Proteksi <script> dengan atribut src — script eksternal
    .replace(/<script\b[^>]*\bsrc\s*=\s*"[^"]*"[^>]*>/gi, (match) => {
        const id = `___ATTR_${vault.length}___`;
        vault.push(match);
        return id;
    })

    // 2. Proteksi semua atribut bernilai penting (urutan penting!)
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

// ========== CLEANER ==========
/**
 * Hapus invisible chars & decode entitas umum.
 * AMAN: semua atribut penting sudah diproteksi sebelum fungsi ini dipanggil.
 *
 * &gt; dan &lt; DIKECUALIKAN — dikonsumsi Markdown Enhancer v7.5 di browser.
 * &amp; DIKECUALIKAN dari decode global — hanya decode di luar atribut,
 *   dan sudah aman karena atribut sudah diproteksi duluan.
 */
const cleanContent = (html: string): { cleaned: string; saved: number } => {
    const before = html.length;

    let cleaned = html
    .replace(/\u00A0/g, " ")                              // non-breaking space → spasi biasa
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "");          // hapus zero-width chars

    // Decode entitas — aman karena semua atribut sudah diproteksi
    // &amp; dibiarkan karena bisa muncul di konten HTML yang valid (mis: teks Arab, kode)
    const entities: Record<string, string> = {
        "&nbsp;": " ",
        "&quot;": '"',
        "&reg;":  "®",
        "&deg;":  "°",
    };

    for (const [entity, symbol] of Object.entries(entities)) {
        cleaned = cleaned.replaceAll(entity, symbol);
    }

    return { cleaned, saved: before - cleaned.length };
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

        // 1. Proteksi semua atribut penting dulu SEBELUM apapun disentuh
        const { html: protected1, vault } = protectAttributes(content);

        // 2. Bersihkan invisible chars & entitas di luar atribut
        const { cleaned, saved } = cleanContent(protected1);
        stats.totalInvisibleRemoved += saved;

        // 3. Kembalikan semua atribut yang diproteksi
        const restored = restoreAttributes(cleaned, vault);

        // 4. Minifikasi
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

        // 5. Injeksi signature rapat ke </html>
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