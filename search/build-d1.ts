import { readdirSync, readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import * as cheerio from "cheerio";

const ROOT_DIR = "./deploy_dir";
const ARTICLE_DIRS = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"];
const SQL_FILE = "./temp_sync.sql";
const TEMP_CONFIG = "/tmp/wrangler.toml";

// 🎯 FILTER: File yang Harus Di-Skip
const SKIP_PATTERNS = [
    /^index\.html$/i,           // Landing page
/^agregat.*\.html$/i,       // Agregat pages (agregat.html, agregat-2024.html, dll)
];

/**
 * 🚫 Cek apakah file harus di-skip berdasarkan pattern
 */
const shouldSkipFile = (filename: string): boolean => {
    return SKIP_PATTERNS.some(pattern => pattern.test(filename));
};

/**
 * 🧹 Super Clean Text - Sterilisasi konten untuk FTS
 */
const superCleanText = (text: string): string => {
    return text
    // 1. HAPUS MARKDOWN SYMBOLS
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/#+\s+/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/>\s+/g, '')
    .replace(/`{1,3}.*?`{1,3}/g, '')

    // 2. HAPUS EMOJI & UNICODE
    .replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}]/gu, '')
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/\u200D/g, '')

    // 3. NETRALISIR SQL KEYWORDS
    .replace(/BEGIN\s+TRANSACTION/gi, 'BEGIN_TRANSACTION')
    .replace(/COMMIT/gi, 'COMMIT_DONE')
    .replace(/ROLLBACK/gi, 'ROLLBACK_DONE')
    .replace(/SAVEPOINT/gi, 'SAVEPOINT_DONE')

    // 4. CLEANUP AKHIR
    .replace(/\s+/g, ' ')
    .replace(/'/g, "''")
    .trim();
};

/**
 * 📄 Extract metadata & content dari HTML file
 */
const extractArticleData = (filePath: string, file: string, category: string) => {
    const html = readFileSync(filePath, "utf-8");
    const $ = cheerio.load(html);

    const title = superCleanText($('title').text() || file);
    const desc = superCleanText(
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        ""
    );
    const image = ($('meta[property="og:image"]').attr('content') || "/thumbnail.webp").replace(/'/g, "''");
    const dateISO = $('meta[property="article:published_time"]').attr('content') || new Date().toISOString();

    // Hapus elemen yang tidak relevan
    $('script, style, meta, link, noscript, i, header, footer, nav, aside, #header-placeholder, #loading-indicator').remove();

    // Ambil konten dari area artikel
    const articleArea = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
    const bodyContent = superCleanText(articleArea.text());

    return { title, desc, image, dateISO, bodyContent };
};

/**
 * 🏗️ Generate SQL INSERT statement
 */
const generateInsertSQL = (data: { title: string; desc: string; bodyContent: string; file: string; category: string; image: string; dateISO: string }) => {
    return `INSERT INTO articles_fts (title, description, content, id, category, image, date) ` +
    `VALUES ('${data.title}', '${data.desc}', '${data.bodyContent}', '${data.file}', '${data.category}', '${data.image}', '${data.dateISO}');`;
};

// ============================================
// 🚀 MAIN EXECUTION
// ============================================

console.log("🛠️ Memulai Sinkronisasi D1: Operasi Sterilisasi & Smart Filtering...");

let sqlCommands: string[] = ["DELETE FROM articles_fts;"];
let totalProcessed = 0;
let totalSkipped = 0;

for (const cat of ARTICLE_DIRS) {
    const fullCatPath = join(ROOT_DIR, cat);
    if (!existsSync(fullCatPath)) {
        console.log(`⚠️ Kategori ${cat} tidak ditemukan, skip...`);
        continue;
    }

    const files = readdirSync(fullCatPath).filter(f => f.endsWith(".html"));
    console.log(`\n📂 Processing Kategori: ${cat} (${files.length} file)`);

    for (const file of files) {
        // --- 🚫 SKIP FILE BERDASARKAN PATTERN ---
        if (shouldSkipFile(file)) {
            console.log(`   ⏭️ Skip: ${file}`);
            totalSkipped++;
            continue;
        }

        try {
            const data = extractArticleData(join(fullCatPath, file), file, cat);
            sqlCommands.push(generateInsertSQL({ ...data, file, category: cat }));
            totalProcessed++;

            // Progress indicator setiap 10 file
            if (totalProcessed % 10 === 0) {
                process.stdout.write(`   ✓ Processed ${totalProcessed} articles...\r`);
            }
        } catch (e: any) {
            console.error(`   ❌ Gagal olah file: ${file} (${e.message})`);
        }
    }
}

// Clear progress line
process.stdout.write('\n');

console.log(`\n📊 Summary:`);
console.log(`   ✅ Processed: ${totalProcessed} articles`);
console.log(`   ⏭️ Skipped: ${totalSkipped} files (landing pages & agregat)`);
console.log(`   📝 Total SQL commands: ${sqlCommands.length}`);

// Write SQL file
writeFileSync(SQL_FILE, sqlCommands.join("\n"));

console.log(`\n🚀 Mengirim data ke D1...`);

try {
    if (existsSync(TEMP_CONFIG)) {
        execSync(`bunx wrangler d1 execute layarkosong-db --remote --file=${SQL_FILE} -c ${TEMP_CONFIG}`, { stdio: 'inherit' });
        console.log("\n✅ BERHASIL! Database D1 Layar Kosong telah di-update dengan data bersih.");
    } else {
        console.error("❌ File konfigurasi wrangler.toml tidak ditemukan.");
        process.exit(1);
    }
} catch (err: any) {
    console.error(`❌ Terjadi kesalahan saat update D1: ${err.message}`);
    process.exit(1);
} finally {
    if (existsSync(SQL_FILE)) {
        unlinkSync(SQL_FILE);
        console.log("🧹 Temporary SQL file cleaned up.");
    }
}

console.log("\n🎉 Proses selesai! Database siap untuk pencarian yang lebih akurat.");