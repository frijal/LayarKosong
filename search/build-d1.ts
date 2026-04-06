import { readdirSync, readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ROOT_DIR = "./deploy_dir";
const ARTICLE_DIRS = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"];
const SQL_FILE = "./temp_sync.sql";
// 📂 Path folder sementara di GitHub Runner
const TEMP_CONFIG = "/tmp/wrangler.toml";

const cleanEmoji = (text: string) => {
    return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}]/gu, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/\u200D/g, '')
    .replace(/\s+/g, ' ');
};

console.log("🛠️ Memulai sinkronisasi dapur D1: Sterilisasi Emoji & Image Scraping...");

let sqlCommands = ["DELETE FROM articles_fts;"];

for (const cat of ARTICLE_DIRS) {
    const fullCatPath = join(ROOT_DIR, cat);
    if (!existsSync(fullCatPath)) continue;

    const files = readdirSync(fullCatPath).filter(f => f.endsWith(".html"));

    for (const file of files) {
        try {
            const html = readFileSync(join(fullCatPath, file), "utf-8");

            let title = (html.match(/<title>(.*?)<\/title>/i)?.[1] || file);
            title = cleanEmoji(title).replace(/'/g, "''").trim();

            const descMatch = html.match(/meta content=["']?(.*?)["']?\s+(?:name|property)=["']?(?:description|og:description)["']?/i) ||
            html.match(/(?:name|property)=["']?(?:description|og:description)["']?\s+content=["']?(.*?)["']?/i);
            let desc = (descMatch?.[1] || "");
            desc = cleanEmoji(desc).replace(/'/g, "''").trim();

            const imgMatch = html.match(/content=["']?([^"'\s>]+)["']?\s+property=["']?og:image["']?/i) ||
            html.match(/property=["']?og:image["']?\s+content=["']?([^"'\s>]+)["']?/i) ||
            html.match(/itemprop=["']?image["']?\s+content=["']?([^"'\s>]+)["']?/i);
            const image = (imgMatch?.[1] || "/thumbnail.webp").replace(/'/g, "''");

            const dateMatch = html.match(/property=["']?article:published_time["']?\s+content=["']?([^"'\s>]+)["']?/i) ||
            html.match(/content=["']?([^"'\s>]+)["']?\s+property=["']?article:published_time["']?/i);
            const dateISO = dateMatch?.[1] || new Date().toISOString();

            let body = html
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
            .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gmi, "")
            .replace(/<header\b[^>]*>([\s\S]*?)<\/header>/gmi, "");

            const articleMatch = body.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
            body = (articleMatch ? articleMatch[1] : body)
            .replace(/<[^>]*>/g, " ");

            body = cleanEmoji(body).replace(/'/g, "''").trim();

            sqlCommands.push(`INSERT INTO articles_fts (title, description, content, id, category, image, date) VALUES ('${title}', '${desc}', '${body}', '${file}', '${cat}', '${image}', '${dateISO}');`);
        } catch (e) {
            console.error(`❌ Gagal olah file: ${file}`);
        }
    }
}

writeFileSync(SQL_FILE, sqlCommands.join("\n"));

console.log(`🚀 Mengirim ${sqlCommands.length - 1} data artikel ke Cloudflare D1...`);
try {
    // 🔑 Gunakan file config dari folder /tmp/
    if (existsSync(TEMP_CONFIG)) {
        execSync(`bunx wrangler d1 execute layarkosong-db --remote --file=${SQL_FILE} -c ${TEMP_CONFIG}`, { stdio: 'inherit' });
        console.log("✅ Berhasil! Database D1 diperbarui via /tmp/wrangler.toml.");
    } else {
        throw new Error("File konfigurasi sementara tidak ditemukan!");
    }
} catch (err) {
    console.error("❌ Terjadi kesalahan saat update D1.");
    process.exit(1);
} finally {
    if (existsSync(SQL_FILE)) unlinkSync(SQL_FILE);
}
