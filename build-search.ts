import { Database } from "bun:sqlite";
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join } from "path";

// 1. Konfigurasi
const DB_PATH = "./search.db"; // Letakkan di root sesuai permintaan
const ARTICLE_DIRS = [
    "gaya-hidup", "jejak-sejarah", "lainnya", 
    "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"
];

// 2. Inisialisasi Database FTS5
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

// 3. Helper untuk Ekstraksi Metadata Sederhana dari HTML
function extractMetadata(html: string) {
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
    const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
    // Asumsi tanggal ada di meta tag atau kamu bisa pakai statSync file
    const dateMatch = html.match(/<meta name="publish-date" content="(.*?)"/i);

    return {
        title: titleMatch ? titleMatch[1] : "Tanpa Judul",
        description: descMatch ? descMatch[1] : "",
        image: imageMatch ? imageMatch[1] : "/thumbnail.webp",
        date: dateMatch ? dateMatch[1] : new Date().toISOString()
    };
}

// 4. Proses Indexing
console.log("🚀 Memulai indexing artikel...");

for (const cat of ARTICLE_DIRS) {
    if (!existsSync(cat)) continue;

    const files = readdirSync(cat).filter(f => f.endsWith(".html"));
    console.log(`📂 Memproses kategori: ${cat} (${files.length} artikel)`);

    for (const file of files) {
        const filePath = join(cat, file);
        const html = readFileSync(filePath, "utf-8");
        
        const meta = extractMetadata(html);
        
        // Bersihkan konten: Hapus script, style, dan tag HTML
        const cleanContent = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        
        insert.run({
            $title: meta.title,
            $description: meta.description,
            $content: cleanContent,
            $id: file,
            $category: cat,
            $date: meta.date,
            $image: meta.image
        });
    }
}

// 5. Optimasi Database (Penting agar file .db sekecil mungkin)
db.run("INSERT INTO articles_fts(articles_fts) VALUES('optimize')");
db.close();

console.log(`✅ Selesai! File ${DB_PATH} siap di-deploy ke Cloudflare Pages.`);
