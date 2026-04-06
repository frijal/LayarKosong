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

// 3. FUNGSI PEMBERSIH (Gaya Klasik agar tidak error di Runner)
function parseHtml(rawHtml: string, name: string) {
    var tMatch = rawHtml.match(/<title>(.*?)<\/title>/i);
    var dMatch = rawHtml.match(/<meta name="description" content="(.*?)"/i);
    var iMatch = rawHtml.match(/<meta property="og:image" content="(.*?)"/i);
    var dtMatch = rawHtml.match(/<meta name="publish-date" content="(.*?)"/i);

    // Pembersihan berantai
    var s = rawHtml
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
        .replace(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gmi, "")
        .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gmi, "")
        .replace(//g, "");

    // Ambil isi artikel
    var matchArt = s.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    var bodyText = (matchArt && matchArt[1]) ? matchArt[1] : s;

    // Bersihkan tag HTML & Spasi
    var finalTxt = bodyText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

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
var total = 0;

for (var i = 0; i < CATEGORIES.length; i++) {
    var folder = CATEGORIES[i];
    if (!existsSync(folder)) continue;

    var allFiles = readdirSync(folder).filter(function(x) { return x.endsWith(".html"); });
    console.log("[*] Kategori " + folder + ": " + allFiles.length + " file");

    for (var j = 0; j < allFiles.length; j++) {
        var fName = allFiles[j];
        try {
            var contentRaw = readFileSync(join(folder, fName), "utf-8");
            var res = parseHtml(contentRaw, fName);
            
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
            console.error("[!] Error di file: " + fName);
        }
    }
}

// 5. FINISH
db.run("INSERT INTO articles_fts(articles_fts) VALUES('optimize');");
db.run("VACUUM;");
db.close();

console.log("--- Selesai! " + total + " artikel masuk ---");
