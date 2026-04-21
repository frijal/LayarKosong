import { Database } from "bun:sqlite";
import { readdirSync, readFileSync, existsSync, execSync } from "fs";
import { join } from "path";
import * as cheerio from "cheerio";

const ROOT_DIR = "./deploy_dir";
const ARTICLE_DIRS = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"];
const DB_PATH = "./articles.db"; // Database fisik di repo
const TEMP_CONFIG = "/tmp/wrangler.toml";

// 🎯 FILTER: File yang Harus Di-Skip
const SKIP_PATTERNS = [
    /^index\.html$/i,
    /^agregat.*\.html$/i,
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
        .trim();
};

/**
 * 📄 Extract metadata & content dari HTML file
 */
const extractArticleData = (filePath: string, file: string, category: string) => {
    const html = readFileSync(filePath, "utf-8");
    const $ = cheerio.load(html);

    const title = superCleanText($('title').text() || file);
    const image = $('meta[property="og:image"]').attr('content') || "/thumbnail.webp";
    const dateISO = $('meta[property="article:published_time"]').attr('content') || new Date().toISOString();

    // Hapus elemen yang tidak relevan
    $('script, style, meta, link, noscript, i, header, footer, nav, aside, #header-placeholder, #loading-indicator').remove();

    // Ambil konten dari area artikel
    const articleArea = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
    const bodyContent = superCleanText(articleArea.text());

    return { title, image, dateISO, bodyContent };
};

// ============================================
// 🚀 MAIN EXECUTION
// ============================================

console.log("🔧 Inisialisasi database fisik...");

// Buka/buat database fisik
const db = new Database(DB_PATH);

// Inisialisasi tabel FTS5 (hanya jalan jika belum ada)
db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
        title, 
        content, 
        id, 
        category, 
        image, 
        date
    );
`);

// Prepare statement untuk INSERT OR REPLACE (UPSERT)
const upsertStmt = db.prepare(`
    INSERT OR REPLACE INTO articles_fts (title, content, id, category, image, date)
    VALUES ($title, $content, $id, $category, $image, $date)
`);

let totalProcessed = 0;
let totalSkipped = 0;

console.log("📁 Memproses artikel...\n");

// Mulai transaksi untuk performa lebih cepat
db.run("BEGIN TRANSACTION");

try {
    for (const cat of ARTICLE_DIRS) {
        const fullCatPath = join(ROOT_DIR, cat);
        if (!existsSync(fullCatPath)) continue;

        const files = readdirSync(fullCatPath).filter(f => f.endsWith(".html"));

        for (const file of files) {
            if (shouldSkipFile(file)) {
                totalSkipped++;
                continue;
            }

            try {
                const data = extractArticleData(join(fullCatPath, file), file, cat);
                
                // Insert langsung ke database fisik
                upsertStmt.run({
                    $title: data.title,
                    $content: data.bodyContent,
                    $id: file,
                    $category: cat,
                    $image: data.image,
                    $date: data.dateISO
                });
                
                totalProcessed++;
            } catch (e: any) {
                console.error(`❌ Gagal olah file: ${file} (${e.message})`);
            }
        }
    }

    // Commit transaksi
    db.run("COMMIT");
    
    // Optimize database untuk performa pencarian
    console.log("\n🔍 Mengoptimalkan indeks FTS5...");
    db.run("INSERT INTO articles_fts(articles_fts) VALUES('optimize')");
    db.run("VACUUM");
    
} catch (err: any) {
    db.run("ROLLBACK");
    console.error(`❌ Terjadi kesalahan saat update database: ${err.message}`);
    process.exit(1);
}

// Tutup koneksi database
db.close();

console.log(`\n✅ Database lokal berhasil diperbarui!`);
console.log(`   📊 ${totalProcessed} artikel diproses | ${totalSkipped} file di-skip`);

// ============================================
// 🌐 SYNC KE CLOUDFLARE D1
// ============================================

console.log("\n🚀 Mengirim database ke Cloudflare D1...");

try {
    if (existsSync(TEMP_CONFIG)) {
        // Opsi 1: Import langsung file .db (RECOMMENDED - paling cepat)
        execSync(
            `bunx wrangler d1 import layarkosong-db --remote ${DB_PATH} -c ${TEMP_CONFIG}`,
            { stdio: 'inherit' }
        );
        
        console.log("\n✅ Sync ke Cloudflare D1 Berhasil!");
        
    } else {
        console.error("❌ File konfigurasi wrangler.toml tidak ditemukan.");
        process.exit(1);
    }
} catch (err: any) {
    console.error(`❌ Gagal sync ke Cloudflare: ${err.message}`);
    process.exit(1);
}

// ============================================
// 📊 STATISTIK AKHIR
// ============================================

// Reopen database untuk ambil stats
const dbStats = new Database(DB_PATH, { readonly: true });
const totalArticles = dbStats.prepare("SELECT COUNT(*) as count FROM articles_fts").get() as { count: number };
dbStats.close();

console.log("\n📈 Statistik Database:");
console.log(`   Total artikel di database: ${totalArticles.count}`);
console.log(`   Ukuran file: ${(Bun.file(DB_PATH).size / 1024 / 1024).toFixed(2)} MB`);
