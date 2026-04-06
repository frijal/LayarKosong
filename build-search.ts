import { Database } from "bun:sqlite";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

// 1. KONFIGURASI
const DB_FILE = "./search.db"; 
const CATEGORIES = [
    "gaya-hidup", "jejak-sejarah", "lainnya", 
    "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"
];

// 2. INISIALISASI DATABASE
const db = new Database(DB_FILE, { create: true });
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

const stmt = db.prepare(`
  INSERT INTO articles_fts (title, description, content, id, category, date, image) 
  VALUES ($title, $description, $content, $id, $category, $date, $image)
`);

// 3. FUNGSI PEMBERSIH (Gaya Linear/Flat)
function parseHtml(rawHtml: string, name: string) {
    const tMatch = rawHtml.match(/<title>(.*?)<\/title>/i);
    const dMatch = rawHtml.match(/<meta name="description" content="(.*?)"/i);
    const iMatch = rawHtml.match(/<meta property="og:image" content="(.*?)"/i);
    const dtMatch = rawHtml.match(/<meta name="publish-date" content="(.*?)"/i);

    // Step-by-step cleaning
    let s = rawHtml;
    s = s.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "");
    s = s.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "");
    s = s.replace(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gmi, "");
    s = s.replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gmi, "");
    s = s.replace(//g, "");

    // Ambil isi artikel jika ada
    const matchArt = s.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    const bodyText = (matchArt && matchArt[1]) ? matchArt[1] : s;

    // Bersihkan tag HTML
    const finalTxt = bodyText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    return {
        t: tMatch ? tMatch[1] : name.replace(".html", ""),
        d: dMatch ? dMatch[1] : "",
        c: finalTxt,
        i: iMatch ? iMatch[1] : "/thumbnail.webp",
        dt: dtMatch ? dtMatch[1] : new Date().toISOString()
    };
}

// 4. MAIN LOOP
console.log("--- Memulai Indexing Layar Kosong ---");
let total = 0;

for (const folder of CATEGORIES) {
    if (!existsSync(folder)) continue;

    const allFiles = readdirSync(folder).filter(x => x.endsWith(".html"));
    console.log(`[*] Kategori ${folder}: ${allFiles.length} file`);

    for (const fName of allFiles) {
        try {
            const contentRaw = readFileSync(join(folder, fName), "utf-8");
            const res = parseHtml(contentRaw, fName);
            
            stmt.run({
                $title: res.t,
                $description: res.d,
                $content: res.c,
                $id: fName,
                $category: folder,
                $date: res.dt,
                $image: res.i
            });
            total++;
        } catch (err) {
            console.error(`[!] Error di file: ${fName}`);
        }
    }
}

// 5. FINISH
db.run("INSERT INTO articles_fts(articles_fts) VALUES('optimize')");
db.run("VACUUM");
db.close();

console.log(`--- Selesai! ${total} artikel masuk ke ${DB_FILE} ---`);
