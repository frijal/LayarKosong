import { Database } from "bun:sqlite";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as cheerio from "cheerio";

// 📍 Perbaikan Path: Gunakan root absolut proyek
const PROJECT_ROOT = process.cwd(); 
const DB_PATH = join(PROJECT_ROOT, "artikel.db");
const JSON_PATH = join(PROJECT_ROOT, "artikel.json");

const db = new Database(DB_PATH);

db.run(`
  CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
    title, content, id UNINDEXED, category, image, date
  );
`);

const superCleanText = (text: string): string => {
    return text
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/#+\s+/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/>\s+/g, '')
    .replace(/`{1,3}.*?`{1,3}/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}]/gu, '')
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/\u200D/g, '')
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractContentOnly = (filePath: string): string => {
    const html = readFileSync(filePath, "utf-8");
    const $ = cheerio.load(html);
    $('script, style, meta, link, noscript, i, header, footer, nav, aside, #header-placeholder, #loading-indicator').remove();
    const articleArea = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
    return superCleanText(articleArea.text());
};

if (!existsSync(JSON_PATH)) {
    console.error(`❌ File tidak ada di: ${JSON_PATH}`);
    process.exit(1);
}

const articleList = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
let totalProcessed = 0;

const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO articles_fts (title, content, id, category, image, date)
    VALUES ($title, $content, $id, $category, $image, $date)
`);

// ... (Bagian awal script tetap sama sampai insertStmt) ...

if (!existsSync(JSON_PATH)) {
    console.error(`❌ File tidak ada di: ${JSON_PATH}`);
    process.exit(1);
}

// 1. Baca data dan pastikan isinya Array
const rawData = readFileSync(JSON_PATH, "utf-8");
const parsedData = JSON.parse(rawData);

// Jika JSON ternyata { "posts": [...] }, ambil array-nya. Jika sudah [...], pakai langsung.
const articleList = Array.isArray(parsedData) 
    ? parsedData 
    : (parsedData.articles || parsedData.posts || Object.values(parsedData));

let totalProcessed = 0;

// 2. Definisi Transaksi (Terima parameter 'items')
const syncTransaction = db.transaction((items) => {
    for (const art of items) {
        // Gabungkan path dengan teliti
        const filePath = join(PROJECT_ROOT, art.category, art.file);
        
        if (existsSync(filePath)) {
            try {
                const bodyContent = extractContentOnly(filePath);
                insertStmt.run({
                    $title: art.title || "Tanpa Judul",
                    $content: bodyContent,
                    $id: art.file,
                    $category: art.category,
                    $image: art.image || "/thumbnail.webp",
                    $date: art.date
                });
                totalProcessed++;
            } catch (e: any) {
                console.error(`❌ Gagal: ${art.file} -> ${e.message}`);
            }
        } else {
            console.warn(`⚠️ Skip: File tidak ketemu -> ${filePath}`);
        }
    }
    return totalProcessed;
});

// 3. Eksekusi dengan Melempar articleList ke dalam Transaksi
console.log(`⏳ Memproses ${articleList.length} artikel dari: ${PROJECT_ROOT}`);

try {
    // CRITICAL: Harus mempassing articleList ke sini!
    syncTransaction(articleList);
} catch (err: any) {
    console.error(`❌ Error Transaksi: ${err.message}`);
    process.exit(1);
}

// 4. Finalisasi
db.run(`INSERT INTO articles_fts(articles_fts) VALUES('optimize');`);
db.run(`VACUUM;`);

console.log(`\n✅ Selesai! 📊 Total masuk: ${totalProcessed} artikel.`);
