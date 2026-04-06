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
 * 🧹 SUPER CLEAN TEXT (DIET MODE V8.6 + SQL NEUTRALIZER)
 * Menggabungkan sterilisasi Emoji, pembersihan spasi, 
 * dan pengamanan keyword SQL agar tidak crash di Wrangler Runner.
 */
const superCleanText = (text: string) => {
    return text
        // 1. Hapus Emoji & Unicode Variants
        .replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}]/gu, '')
        .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
        .replace(/[\uFE00-\uFE0F]/g, '')
        .replace(/\u200D/g, '')
        // 2. Rapikan Spasi & Newline
        .replace(/\s+/g, ' ')
        // 3. NETRALISIR SQL TRANSACTION KEYWORDS
        // Mengubah keyword agar tidak dieksekusi sebagai perintah oleh Wrangler/D1
        .replace(/BEGIN\s+TRANSACTION/gi, 'BEGIN_TRANSACTION')
        .replace(/COMMIT/gi, 'COMMIT_DONE')
        .replace(/ROLLBACK/gi, 'ROLLBACK_DONE')
        .replace(/SAVEPOINT/gi, 'SAVEPOINT_DONE')
        // 4. Escape Kutip Satu (Wajib untuk SQL Insert)
        .replace(/'/g, "''")
        .trim();
};

console.log("🛠️ Memulai Sinkronisasi D1: Operasi Sterilisasi & SQL Neutralizer...");

// Inisialisasi SQL tanpa BEGIN TRANSACTION (Wrangler akan handle transaksinya otomatis)
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

            // 1. Ambil Metadata Dasar
            let title = $('title').text() || file;
            title = superCleanText(title);

            let desc = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || "";
            desc = superCleanText(desc);
            
            // Image & Date (Cukup escape kutip)
            const image = ($('meta[property="og:image"]').attr('content') || "/thumbnail.webp").replace(/'/g, "''");
            const dateISO = $('meta[property="article:published_time"]').attr('content') || new Date().toISOString();

            // 2. OPERASI PEMBERSIHAN (DIET MODE via CHEERIO)
            // Hapus semua elemen non-narasi sesuai hasil audit lokal
            $('script, style, meta, link, noscript, i, header, footer, nav, aside, #header-placeholder, #loading-indicator').remove();

            // 3. AMBIL KONTEN UTAMA
            // Fokus ke <article> untuk akurasi teks
            const articleArea = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
            
            // Ekstrak teks murni dan sterilkan
            let bodyContent = superCleanText(articleArea.text());

            // 4. SUSUN PERINTAH SQL
            sqlCommands.push(
                `INSERT INTO articles_fts (title, description, content, id, category, image, date) ` +
                `VALUES ('${title}', '${desc}', '${bodyContent}', '${file}', '${cat}', '${image}', '${dateISO}');`
            );

        } catch (e) {
            console.error(`❌ Gagal olah file: ${file} di kategori ${cat}`);
        }
    }
}

// Tulis file SQL tanpa footer COMMIT
writeFileSync(SQL_FILE, sqlCommands.join("\n"));

console.log(`🚀 Mengirim ${sqlCommands.length - 1} data artikel ke Cloudflare D1 (Remote)...`);

try {
    if (existsSync(TEMP_CONFIG)) {
        // Eksekusi SQL di remote D1
        execSync(`bunx wrangler d1 execute layarkosong-db --remote --file=${SQL_FILE} -c ${TEMP_CONFIG}`, { stdio: 'inherit' });
        console.log("✅ BERHASIL! Database D1 Layar Kosong sekarang steril dan terupdate.");
    } else {
        throw new Error(`File config ${TEMP_CONFIG} tidak ditemukan!`);
    }
} catch (err) {
    console.error("❌ Terjadi kesalahan saat update D1.");
    process.exit(1);
} finally {
    // Bersihkan jejak file SQL sementara
    if (existsSync(SQL_FILE)) unlinkSync(SQL_FILE);
}
