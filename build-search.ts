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

// 3. HELPER: PEMBERSIHAN (Gunakan let untuk fleksibilitas runtime)
function getCleanData(html: string, fileName: string) {
    let titleMatch = html.match(/<title>(.*?)<\/title>/i);
    let descMatch = html.match(/<meta name="description" content="(.*?)"/i);
    let imageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
    let dateMatch = html.match(/<meta name="publish-date" content="(.*?)"/i);

    // Proses Pembersihan
    let tmp = html
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
        .replace(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gmi, "")
        .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gmi, "")
        .replace(//g, "");

    // Cek tag <article>
    let articlePart = tmp.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    let finalBody = articlePart ? articlePart[1] : tmp;

    // Hapus tag HTML & Rapikan Spasi
    let cleanText = finalBody
        .replace(/<[^>]*>/g, " ") 
        .replace(/\s+/g, " ")
        .trim();

    return {
        title: titleMatch ? titleMatch[1] : fileName.replace(".html", ""),
        description: descMatch ? descMatch[1] : "",
        content: cleanText,
        image: imageMatch ? imageMatch[1] : "/thumbnail.webp",
        date: dateMatch ? dateMatch[1] : new Date().toISOString()
    };
}

// 4. PROSES INDEXING
console.log("🚀 Memulai Indexing...");
let count = 0;

for (let cat of ARTICLE_DIRS) {
    if (!existsSync(cat)) continue;

    let files = readdirSync(cat).filter(f => f.endsWith(".html"));
    console.log(`📂 ${cat}: ${files.length} file`);

    for (let file of files) {
        try {
            let raw = readFileSync(join(cat, file), "utf-8");
            let data = getCleanData(raw, file);
            
            insert.run({
                $title: data.title,
                $description: data.description,
                $content: data.content,
                $id: file,
                $category: cat,
                $date: data.date,
                $image: data.image
            });
            count++;
        } catch (e) {
            console.error(`❌ Gagal: ${file}`);
        }
    }
}

// 5. FINISHING
db.run("INSERT INTO articles_fts(articles_fts) VALUES('optimize')");
db.run("VACUUM");
db.close();

console.log(`✅ Selesai! ${count} artikel terindeks ke ${DB_PATH}`);
