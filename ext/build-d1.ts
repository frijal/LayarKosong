import { readdirSync, readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ARTICLE_DIRS = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"];
const SQL_FILE = "./temp_sync.sql";

console.log("🛠️  Memulai proses sinkronisasi 1.200+ artikel...");

let sqlCommands = ["BEGIN TRANSACTION;", "DELETE FROM articles_fts;"];

for (const cat of ARTICLE_DIRS) {
    if (!existsSync(cat)) continue;
    const files = readdirSync(cat).filter(f => f.endsWith(".html"));
    
    for (const file of files) {
        try {
            const html = readFileSync(join(cat, file), "utf-8");
            const title = (html.match(/<title>(.*?)<\/title>/i)?.[1] || file).replace(/'/g, "''");
            const desc = (html.match(/<meta name="description" content="(.*?)"/i)?.[1] || "").replace(/'/g, "''");
            
            // Bersihkan isi artikel dari elemen tak perlu
            let body = html
                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")
                .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
                .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gmi, "");
            
            const articleMatch = body.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
            body = (articleMatch ? articleMatch[1] : body)
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .replace(/'/g, "''")
                .trim();

            sqlCommands.push(`INSERT INTO articles_fts (title, description, content, id, category) VALUES ('${title}', '${desc}', '${body}', '${file}', '${cat}');`);
        } catch (e) { console.error(`Gagal baca: ${file}`); }
    }
}
sqlCommands.push("COMMIT;");
writeFileSync(SQL_FILE, sqlCommands.join("\n"));

console.log("🚀 Mengirim ke Cloudflare D1...");
try {
    // Gunakan file config di dalam folder ext
    execSync(`bunx wrangler d1 execute layarkosong-db --remote --file=${SQL_FILE} -c ext/layarkosong-api/wrangler.jsonc`, { stdio: 'inherit' });
    console.log("✅ Database D1 Berhasil Diperbarui!");
} catch (err) {
    console.error("❌ Gagal update D1.");
} finally {
    if (existsSync(SQL_FILE)) unlinkSync(SQL_FILE);
}
