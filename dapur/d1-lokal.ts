import { Database } from "bun:sqlite";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as cheerio from "cheerio";

// 📍 Konfigurasi Path
const ROOT_DIR = process.cwd();
const DB_PATH = join(ROOT_DIR, "artikel.db");
const JSON_PATH = join(ROOT_DIR, "artikel.json");

// 🗄️ Inisialisasi Database SQLite (Tabel Fisik)
const db = new Database(DB_PATH);

// Buat tabel virtual FTS5 jika belum ada
db.run(`
  CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
    title, content, id UNINDEXED, category, image, date
  );
`);

/**
 * 🧹 Super Clean Text - Sterilisasi konten
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
 * 📄 Extract CONTENT saja dari HTML file 
 */
const extractContentOnly = (filePath: string): string => {
    const html = readFileSync(filePath, "utf-8");
    const $ = cheerio.load(html);

    // Hapus elemen yang tidak relevan
    $('script, style, meta, link, noscript, i, header, footer, nav, aside, #header-placeholder, #loading-indicator').remove();

    // Area artikel utama
    const articleArea = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
    
    return superCleanText(articleArea.text());
};

// ============================================
// 🚀 MAIN EXECUTION (HYBRID MODE)
// ============================================

if (!existsSync(JSON_PATH)) {
    console.error("❌ File artikel.json tidak ditemukan!");
    process.exit(1);
}

// 1. Baca dan Pastikan Format Data adalah Array
const rawData = readFileSync(JSON_PATH, "utf-8");
let articlesMetadata;

try {
    articlesMetadata = JSON.parse(rawData);
} catch (e) {
    console.error("❌ Gagal mem-parsing artikel.json. Pastikan format JSON valid.");
    process.exit(1);
}

// FIX: Konversi ke Array jika struktur JSON ternyata berupa Object
const articleList = Array.isArray(articlesMetadata) ? articlesMetadata : Object.values(articlesMetadata);

let totalProcessed = 0;

// 2. Prepare statement untuk Upsert
const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO articles_fts (title, content, id, category, image, date)
    VALUES ($title, $content, $id, $category, $image, $date)
`);

// 3. Definisikan Transaksi (Menerima parameter array)
const syncTransaction = db.transaction((dataArray) => {
    for (const art of dataArray) {
        // Lewati jika properti yang dibutuhkan tidak ada
        if (!art || !art.category || !art.file) continue;

        const filePath = join(ROOT_DIR, art.category, art.file);

        if (existsSync(filePath)) {
            try {
                const bodyContent = extractContentOnly(filePath);

                insertStmt.run({
                    $title: art.title || "Tanpa Judul",
                    $content: bodyContent,
                    $id: art.file,
                    $category: art.category,
                    $image: art.image || "/thumbnail.webp",
                    $date: art.date || new Date().toISOString()
                });
                totalProcessed++;
            } catch (e: any) {
                console.error(`❌ Gagal olah file: ${art.file} (${e.message})`);
            }
        } else {
            console.warn(`⚠️ File HTML tidak ditemukan: ${filePath}`);
        }
    }
});

// 4. Eksekusi Transaksi
console.log(`⏳ Memulai sinkronisasi ${articleList.length} artikel dari JSON...`);
try {
    syncTransaction(articleList);
} catch (err: any) {
    console.error(`❌ Terjadi kesalahan saat transaksi database: ${err.message}`);
    process.exit(1);
}

// 5. Optimasi internal SQLite FTS5
db.run(`INSERT INTO articles_fts(articles_fts) VALUES('optimize');`);
db.run(`VACUUM;`);

console.log(`\n✅ Database fisik 'articles.db' berhasil diperbarui!`);
console.log(`📊 Total: ${totalProcessed} artikel berhasil masuk ke indeks pencarian.`);
