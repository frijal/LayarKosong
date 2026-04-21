import { Database } from "bun:sqlite";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import * as cheerio from "cheerio";

// 📍 Set root ke direktori tempat script dijalankan
const ROOT_DIR = process.cwd();
const DB_PATH = join(ROOT_DIR, "articles.db");

const ARTICLE_DIRS = [
    "gaya-hidup", 
    "jejak-sejarah", 
    "lainnya", 
    "olah-media", 
    "opini-sosial", 
    "sistem-terbuka", 
    "warta-tekno"
];

// 🎯 FILTER: File yang Harus Di-Skip
const SKIP_PATTERNS = [/^index\.html$/i, /^agregat.*\.html$/i];

// 🗄️ Inisialisasi Database
const db = new Database(DB_PATH);

db.run(`
  CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
    title, content, id UNINDEXED, category, image, date
  );
`);

/**
 * 🧹 Super Clean Text - Sterilisasi konten untuk FTS
 */
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
        .replace(/BEGIN\s+TRANSACTION/gi, 'BEGIN_TRANSACTION')
        .replace(/COMMIT/gi, 'COMMIT_DONE')
        .replace(/ROLLBACK/gi, 'ROLLBACK_DONE')
        .replace(/SAVEPOINT/gi, 'SAVEPOINT_DONE')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * 📄 Extract metadata & content dari HTML file
 */
const extractArticleData = (filePath: string, file: string) => {
    const html = readFileSync(filePath, "utf-8");
    const $ = cheerio.load(html);

    const title = superCleanText($('title').text() || file);
    const image = $('meta[property="og:image"]').attr('content') || "/thumbnail.webp";
    const dateISO = $('meta[property="article:published_time"]').attr('content') || new Date().toISOString();

    $('script, style, meta, link, noscript, i, header, footer, nav, aside, #header-placeholder, #loading-indicator').remove();

    const articleArea = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
    const bodyContent = superCleanText(articleArea.text());

    return { title, image, dateISO, bodyContent };
};

// ============================================
// 🚀 MAIN EXECUTION
// ============================================

let totalProcessed = 0;
let totalSkipped = 0;
const allData = [];

// 1. Kumpulkan Data dari File HTML
for (const cat of ARTICLE_DIRS) {
    const fullCatPath = join(ROOT_DIR, cat);
    
    if (!existsSync(fullCatPath)) {
        console.warn(`⚠️ Folder ${cat} tidak ditemukan di root, skipping...`);
        continue;
    }

    const files = readdirSync(fullCatPath).filter(f => f.endsWith(".html"));

    for (const file of files) {
        if (SKIP_PATTERNS.some(p => p.test(file))) {
            totalSkipped++;
            continue;
        }

        try {
            const data = extractArticleData(join(fullCatPath, file), file);
            allData.push({ ...data, file, category: cat });
        } catch (e: any) {
            console.error(`❌ Gagal parse file: ${file} (${e.message})`);
        }
    }
}

// 2. Insert ke SQLite menggunakan Transaction (Cepat & Aman)
const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO articles_fts (title, content, id, category, image, date)
    VALUES ($title, $content, $id, $category, $image, $date)
`);

const syncTransaction = db.transaction((articles) => {
    for (const art of articles) {
        insertStmt.run({
            $title: art.title,
            $content: art.bodyContent,
            $id: art.file,
            $category: art.category,
            $image: art.image,
            $date: art.dateISO
        });
        totalProcessed++;
    }
});

syncTransaction(allData);

// 3. Rapikan Database agar pencarian rank/BM25 maksimal
db.run(`INSERT INTO articles_fts(articles_fts) VALUES('optimize');`);
db.run(`VACUUM;`);

console.log(`\n✅ Database fisik lokal berhasil diperbarui!`);
console.log(`   📊 ${totalProcessed} artikel diproses | ${totalSkipped} file di-skip`);
