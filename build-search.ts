import { Database } from "bun:sqlite";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

// 1. KONFIGURASI
const DB_PATH = "./search.db"; 
const ARTICLE_DIRS = [
    "gaya-hidup", "jejak-sejarah", "lainnya", 
    "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"
];

// 2. INISIALISASI DATABASE FTS5
// Kita gunakan tokenize unicode61 agar pencarian mendukung karakter spesial & case-insensitive
const db = new Database(DB_PATH, { create: true });
db.run("DROP TABLE IF EXISTS articles_fts");
db.run(`
  CREATE VIRTUAL TABLE articles_fts USING fts5(
    title, 
    description, 
    content, 
    id UNINDEXED, 
    category UNINDEXED, 
    date UNINDEXED, 
    image UNINDEXED,
    tokenize="unicode61"
  )
`);

const insert = db.prepare(`
  INSERT INTO articles_fts (title, description, content, id, category, date, image) 
  VALUES ($title, $description, $content, $id, $category, $date, $image)
`);

// 3. HELPER: EKSTRAKSI METADATA & PEMBERSIHAN KONTEN
function getCleanData(html: string, fileName: string, category: string) {
    // Ekstraksi Metadata Dasar
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
    const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
    const dateMatch = html.match(/<meta name="publish-date" content="(.*?)"/i);

    // Proses Pembersihan Content (Full Article)
    let clean = html
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")     // Buang CSS
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")   // Buang JS
        .replace(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gmi, "") // Buang Noscript
        .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gmi, "")   // Buang Footer
        .replace(//g, "");                      // Buang Komentar HTML

    // Jika artikel kamu dibungkus tag <article>, ambil isinya saja agar lebih presisi
    const articleMatch = clean.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
        clean = articleMatch[1];
    }

    // Hapus sisa tag HTML dan rapikan spasi
    clean = clean
        .replace(/<[^>]*>/g, " ") 
        .replace(/\s+/g, " ")
        .trim();

    return {
        title: titleMatch ? titleMatch[1] : fileName.replace(".html", ""),
        description: descMatch ? descMatch[1] : "",
        content: clean, // FULL CONTENT
        image: imageMatch ? imageMatch[1] : "/thumbnail.webp",
        date: dateMatch ? dateMatch[1] : new Date().toISOString()
    };
}

// 4. PROSES INDEXING
console.log("🚀 Memulai Full-Text Indexing untuk Layar Kosong...");

let totalIndexed = 0;

for (const cat of ARTICLE_DIRS) {
    if (!existsSync(cat)) {
        console.warn(`⚠️ Folder ${cat} tidak ditemukan, melewati...`);
        continue;
    }

    const files = readdirSync(cat).filter(f => f.endsWith(".html"));
    console.log(`📂 Kategori: ${cat} | Menemukan ${files.length} file.`);

    for (const file of files) {
        try {
            const filePath = join(cat, file);
            const html = readFileSync(filePath, "utf-8");
            
            const data = getCleanData(html, file, cat);
            
            insert.run({
                $title: data.title,
                $description: data.description,
                $content: data.content,
                $id: file,
                $category: cat,
                $date: data.date,
                $image: data.image
            });
            totalIndexed++;
        } catch (e) {
            console.error(`❌ Gagal memproses ${file}:`, e);
        }
    }
}

// 5. OPTIMASI & FINISHING
console.log("Kasih makan database dengan optimasi...");
db.run("INSERT INTO articles_fts(articles_fts) VALUES('optimize')");
db.run("VACUUM"); // Merampingkan ukuran file di disk
db.close();

console.log(`\n✅ BERHASIL!`);
console.log(`📊 Total Artikel: ${totalIndexed}`);
console.log(`📂 Output: ${DB_PATH}`);
