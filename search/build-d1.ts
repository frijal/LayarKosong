import { readdirSync, readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import * as cheerio from "cheerio";

const ROOT_DIR = "./deploy_dir";
const ARTICLE_DIRS = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"];
const SQL_FILE = "./temp_sync.sql";
const TEMP_CONFIG = "/tmp/wrangler.toml";

// 🎯 FILTER: File yang Harus Di-Skip
const SKIP_PATTERNS = [
    /^index\.html$/i,        // Landing page
    /^agregat.*\.html$/i,       // Agregat pages (agregat.html, agregat-2024.html, dll)
];

/**
 * 🚫 Cek apakah file harus di-skip berdasarkan pattern
 */
const shouldSkipFile = (filename: string): boolean => {
    return SKIP_PATTERNS.some(pattern => pattern.test(filename));
};

/**
 * 🔗 STOP WORDS: Kata Penghubung (Konjungsi)
 * Dipakai buat mangkas noise di FTS index, BUKAN buat title/display.
 * 93 entri unik (100 item asli dikurangi 7 duplikat: kemudian, padahal,
 * sebab, akibatnya, apabila, biarpun, bahwa masing-masing muncul 2x di sumber).
 *
 * ⚠️ Beberapa kata di sini homonim (jadi, asal, biar, guna, kedua, serta) —
 * bisa punya makna non-konjungsi. Strip ini mengorbankan searchability kata
 * tsb demi index yang lebih bersih dari filler words.
 */
const STOP_WORDS: string[] = [
    "dan", "atau", "tetapi", "sedangkan", "melainkan", "lalu", "kemudian", "padahal",
    "sesudah", "setelah", "sebelum", "sejak", "ketika", "sementara", "sambil", "selama",
    "sampai", "jika", "kalau", "asalkan", "bila", "andaikan", "sekiranya", "agar",
    "supaya", "biarpun", "meskipun", "walaupun", "seakan-akan", "seolah-olah", "sebab",
    "karena", "sehingga", "bahwa", "dengan",
    "biarpun demikian", "sekalipun begitu", "walaupun demikian", "meskipun begitu",
    "sesudah itu", "selanjutnya", "tambahan pula", "lagi pula", "selain itu",
    "sebaliknya", "sesungguhnya", "bahwasanya", "malahan", "bahkan", "akan tetapi",
    "namun", "kecuali itu", "dengan demikian", "oleh karena itu", "oleh sebab itu",
    "sebelum itu",
    "begitu pula", "demikian juga", "tambahan lagi", "di samping itu", "kedua",
    "akhirnya", "bagaimanapun juga", "sebagaimana", "sama halnya", "jadi", "akibatnya",
    "untuk maksud itu", "untuk mencapai hal itu", "ringkasnya", "secara singkat",
    "pada intinya", "sementara itu",
    "serta", "apabila", "bilamana", "guna", "ataupun", "bagai", "ibarat", "serupa",
    "mula-mula", "biar", "yaitu", "yakni", "asal",
    "maka", "adapun", "kendati", "lantaran", "alhasil", "andaikata", "manakala",
];

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Urutkan dari yang paling panjang biar frasa multi-kata (mis. "oleh karena itu")
// ke-match duluan sebelum kata tunggal di dalamnya (mis. "karena") ikut ke-strip.
const STOP_WORDS_PATTERN = new RegExp(
    "\\b(" + [...STOP_WORDS].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|") + ")\\b",
    "gi"
);

/**
 * 🔗 Buang kata penghubung dari teks (khusus buat konten yang di-index FTS)
 */
const stripStopWords = (text: string): string => {
    return text.replace(STOP_WORDS_PATTERN, " ").replace(/\s+/g, " ").trim();
};

/**
 * 🧹 Super Clean Text - Sterilisasi konten untuk FTS
 */
const superCleanText = (text: string): string => {
    return text
    // 1. HAPUS MARKDOWN SYMBOLS
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/#+\s+/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/>\s+/g, '')
    .replace(/`{1,3}.*?`{1,3}/g, '')

    // 2. HAPUS EMOJI & UNICODE
    .replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}]/gu, '')
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/\u200D/g, '')

    // 3. NETRALISIR SQL KEYWORDS
    .replace(/BEGIN\s+TRANSACTION/gi, 'BEGIN_TRANSACTION')
    .replace(/COMMIT/gi, 'COMMIT_DONE')
    .replace(/ROLLBACK/gi, 'ROLLBACK_DONE')
    .replace(/SAVEPOINT/gi, 'SAVEPOINT_DONE')

    // 4. CLEANUP AKHIR
    .replace(/\s+/g, ' ')
    .replace(/'/g, "''")
    .trim();
};

/**
 * 📄 Extract metadata & content dari HTML file
 */
const extractArticleData = (filePath: string, file: string, category: string) => {
    const html = readFileSync(filePath, "utf-8");
    const $ = cheerio.load(html);

    const title = superCleanText($('title').text() || file);
    const image = ($('meta[property="og:image"]').attr('content') || "/thumbnail.webp").replace(/'/g, "''");
    const dateISO = $('meta[property="article:published_time"]').attr('content') || new Date().toISOString();
    const description = ($('meta[name="description"]').attr('content') || "").replace(/'/g, "''");

    // Hapus elemen yang tidak relevan
    // Catatan: "i" SENGAJA gak dimasukkan lagi ke sini. Font Awesome icon (<i class="fa-...">)
    // emang kosong dari teks jadi gak ngefek ke .text(), tapi italic asli (<i>istilah</i>)
    // sekarang ikut ke-index dengan benar.
    // Catatan: "header" JUGA sengaja gak dimasukkan lagi. Di template artikel, <header>
    // membungkus breadcrumb + <h1> + paragraf .lead jadi satu — kalau tag header dihapus
    // utuh, h1 dan .lead ikut lenyap padahal .lead adalah satu-satunya sumber teks ringkasan
    // yang gak punya kolom lain di skema tabel. Breadcrumb tetap ke-strip lewat selector "nav".
    // "h1" ditambahin ke sini (bukan lewat header) karena h1 udah redundan sama kolom title,
    // dan strip di level tag h1 ini gak nyenggol <p class="lead"> yang tag-nya beda —
    // jadi ringkasan lead tetap aman masuk index, cuma judulnya yang gak dobel.
    $('script, style, meta, link, noscript, footer, nav, aside, h1, #header-placeholder, #loading-indicator').remove();

    // Ambil konten dari area artikel
    const articleArea = $('article').length ? $('article') : $('main').length ? $('main') : $('body');

    // Title TIDAK di-strip stopwords (biar tetap natural buat display di hasil search).
    // bodyContent DI-strip stopwords karena ini yang dipakai buat FTS matching.
    const bodyContent = stripStopWords(superCleanText(articleArea.text()));

    return { title, image, dateISO, bodyContent, description };
};

/**
 * 🏗️ Generate SQL INSERT statement (Sesuai dengan kolom D1 yang baru)
 */
const generateInsertSQL = (data: { title: string; bodyContent: string; file: string; category: string; image: string; dateISO: string; code: string; description: string }) => {
    return `INSERT INTO articles_fts (title, content, id, category, image, date, code, description) ` +
    `VALUES ('${data.title}', '${data.bodyContent}', '${data.file}', '${data.category}', '${data.image}', '${data.dateISO}', '${data.code}', '${data.description}');`;
};

// ============================================
// 🚀 MAIN EXECUTION
// ============================================

let sqlCommands: string[] = ["DELETE FROM articles_fts;"];
let totalProcessed = 0;
let totalSkipped = 0;

// Mapping kategori fix
const CATEGORY_MAP: Record<string, number> = {
    "gaya-hidup": 1,
    "jejak-sejarah": 2,
    "lainnya": 3,
    "olah-media": 4,
    "opini-sosial": 5,
    "sistem-terbuka": 6,
    "warta-tekno": 7
};

for (const cat of Object.keys(CATEGORY_MAP)) {
    const catNumber = CATEGORY_MAP[cat];
    const fullCatPath = join(ROOT_DIR, cat);
    if (!existsSync(fullCatPath)) continue;

    const files = readdirSync(fullCatPath).filter(f => f.endsWith(".html"));

    // 1. Kumpulkan semua data artikel dalam kategori ini
    let categoryArticles: any[] = [];

    for (const file of files) {
        if (shouldSkipFile(file)) {
            totalSkipped++;
            continue;
        }

        try {
            const data = extractArticleData(join(fullCatPath, file), file, cat);
            // Simpan data beserta file name-nya
            categoryArticles.push({ ...data, file });
        } catch (e: any) {
            console.error(`❌ Gagal olah file: ${file} (${e.message})`);
        }
    }

    // 2. Sort berdasarkan tanggal (Oldest to Newest)
    categoryArticles.sort((a, b) => {
        return new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime();
    });

    // 3. Assign nomor urut dan masukkan ke SQL commands
    categoryArticles.forEach((article, index) => {
        const seqNumber = index + 1;
        const code = `${catNumber}-${seqNumber}`;

        sqlCommands.push(generateInsertSQL({ ...article, category: cat, code }));
        totalProcessed++;
    });
}

writeFileSync(SQL_FILE, sqlCommands.join("\n"));

try {
    if (existsSync(TEMP_CONFIG)) {
        execSync(`bunx wrangler d1 execute layarkosong-db --remote --file=${SQL_FILE} -c ${TEMP_CONFIG}`, { stdio: 'inherit' });
        console.log(`\n✅ Sync D1 Berhasil!`);
        console.log(`    📊 ${totalProcessed} artikel diproses | ${totalSkipped} file di-skip`);
    } else {
        console.error("❌ File konfigurasi wrangler.toml tidak ditemukan.");
        process.exit(1);
    }
} catch (err: any) {
    console.error(`❌ Terjadi kesalahan saat update D1: ${err.message}`);
    process.exit(1);
} finally {
    if (existsSync(SQL_FILE)) unlinkSync(SQL_FILE);
}
