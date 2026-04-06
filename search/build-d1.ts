import { readdirSync, readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import * as cheerio from "cheerio";

// --- KONFIGURASI ---
const ROOT_DIR = "./deploy_dir";
const ARTICLE_DIRS = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"];
const SQL_FILE = "./temp_sync.sql";
const TEMP_CONFIG = "/tmp/wrangler.toml";

/**
 * 🧹 FUNGSI STERILISASI TEKS (DIET MODE V8.6)
 * 1. Menghapus semua rentang Emoji (Unicode 15+ compatible)
 * 2. Menghapus Character Variation Selectors (FE00-FE0F)
 * 3. Menghapus Zero Width Joiners
 * 4. Merapikan spasi dan newline berlebih
 * 5. Escape single quote untuk SQL
 */
const superCleanText = (text: string) => {
    return text
        // 1. Hapus Emoji (tetap sama)
        .replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}]/gu, '')
        .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
        .replace(/[\uFE00-\uFE0F]/g, '')
        .replace(/\u200D/g, '')
        // 2. Rapikan Spasi
        .replace(/\s+/g, ' ')
        // 3. NETRALISIR SQL TRANSACTION KEYWORDS
        // Kita ubah "BEGIN TRANSACTION" menjadi "BEGIN_TRANSACTION" agar tidak dieksekusi Wrangler
        .replace(/BEGIN\s+TRANSACTION/gi, 'BEGIN_TRANSACTION')
        .replace(/COMMIT/gi, 'COMMIT_DONE')
        .replace(/ROLLBACK/gi, 'ROLLBACK_DONE')
        .replace(/SAVEPOINT/gi, 'SAVEPOINT_DONE')
        // 4. Escape Kutip (PENTING)
        .replace(/'/g, "''")
        .trim();
};

console.log("🛠️ Memulai Sinkronisasi D1: Operasi Sterilisasi Emoji & Metadata...");

let sqlCommands: string[] = ["DELETE FROM articles_fts;"];

for (const cat of ARTICLE_DIRS) {
    const fullCatPath = join(ROOT_DIR, cat);
    if (!existsSync(fullCatPath)) continue;

    const files = readdirSync(fullCatPath).filter(f => f.endsWith(".html"));
    console.log(`📂 Processing Kategori: ${cat} (${files.length} file)`);

    for (const file of files) {
        try {
            const html = readFileSync(join(fullCatPath, file), "utf-8");
            const $ = cheerio.load(html);

            // 1. Ambil Metadata (Judul & Deskripsi)
            let title = $('title').text() || file;
            title = superCleanText(title);

            let desc = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || "";
            desc = superCleanText(desc);
            
            // Image & Date (Cukup escape kutip saja, jarang ada emoji di sini)
            const image = ($('meta[property="og:image"]').attr('content') || "/thumbnail.webp").replace(/'/g, "''");
            const dateISO = $('meta[property="article:published_time"]').attr('content') || new Date().toISOString();

            // 2. OPERASI PEMBERSIHAN (CHEERIO)
            // Buang semua tag yang mengandung "sampah" narasi
            $('script, style, meta, link, noscript, i, header, footer, nav, aside, #header-placeholder, #loading-indicator').remove();

            // 3. AMBIL KONTEN UTAMA
            // Kita fokus pada <article> agar teks menu/sidebar tidak ikut masuk
            const articleArea = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
            
            // Konversi ke teks murni dan sterilkan dari Emoji
            let bodyContent = superCleanText(articleArea.text());

            // 4. SUSUN SQL
            sqlCommands.push(
                `INSERT INTO articles_fts (title, description, content, id, category, image, date) ` +
                `VALUES ('${title}', '${desc}', '${bodyContent}', '${file}', '${cat}', '${image}', '${dateISO}');`
            );

        } catch (e) {
            console.error(`❌ Gagal olah file: ${file} di ${cat}`);
        }
    }
}

sqlCommands.push("COMMIT;");

// Tulis ke file SQL sementara
writeFileSync(SQL_FILE, sqlCommands.join("\n"));

console.log(`🚀 Mengirim ${sqlCommands.length - 3} data ke Cloudflare D1 (Remote)...`);

try {
    if (existsSync(TEMP_CONFIG)) {
        execSync(`bunx wrangler d1 execute layarkosong-db --remote --file=${SQL_FILE} -c ${TEMP_CONFIG}`, { stdio: 'inherit' });
        console.log("✅ BERHASIL! Database D1 sekarang steril dari Emoji & Metadata.");
    } else {
        throw new Error(`Wrangler config tidak ditemukan di ${TEMP_CONFIG}`);
    }
} catch (err) {
    console.error("❌ Gagal update D1.");
    process.exit(1);
} finally {
    if (existsSync(SQL_FILE)) unlinkSync(SQL_FILE);
}
