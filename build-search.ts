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

// 3. HELPER: EKSTRAKSI & PEMBERSIHAN (Fungsi Terpisah)
function getCleanData(html: string, fileName: string) {
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
    const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
    const dateMatch = html.match(/<meta name="publish-date" content="(.*?)"/i);

    // Pembersihan Tag Pengganggu
    let processHtml = html
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
        .replace(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gmi, "")
        .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gmi, "")
        .replace(//g, "");

    // Ambil isi <article> jika ada, jika tidak pakai seluruh html yang sudah dibersihkan
    const articleMatch = processHtml.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    const targetContent = articleMatch ? articleMatch[1] : processHtml;

    // Hapus semua tag HTML dan rapikan spasi
    const finalContent = targetContent
        .replace(/<[^>]*>/g, " ") 
        .replace(/\s+/g, " ")
        .trim();

    return {
        title: titleMatch ? titleMatch[1] : fileName.replace(".html", ""),
        description: descMatch ? descMatch[1] : "",
        content: finalContent,
        image: imageMatch ? imageMatch[1] : "/thumbnail.webp",
        date: dateMatch ? dateMatch[1] : new Date().toISOString()
    };
}

// 4. PROSES INDEXING
console.log("🚀 Memulai Full-Text Indexing...");

let totalIndexed = 0;

for (const cat of ARTICLE_DIRS) {
    if (!existsSync(cat)) continue;

    const files = readdirSync(cat).filter(f => f.endsWith(".html"));
    console.log(`📂 Kategori: ${cat} (${files.length} file)`);

    for (const file of files) {
        try {
            const html = readFileSync(join(cat, file), "utf-8");
            const data = getCleanData(html, file);
            
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
            console.error(`❌ Gagal: ${file}`, e);
        }
    }
}

// 5. OPTIMASI
console.log("🧹 Mengoptimasi database...");
db.run("INSERT INTO articles_fts(articles_fts) VALUES('optimize')");
db.run("VACUUM");
db.close();

console.log(`✅ Selesai! ${totalIndexed} artikel masuk ke search.db`);
