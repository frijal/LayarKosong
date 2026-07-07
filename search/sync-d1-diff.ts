import { readdirSync, readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import * as cheerio from "cheerio";

// Konfigurasi Path
const ROOT_DIR = "./deploy_dir";
const STATE_FILE = "./current_d1_state.json";
const PATCH_FILE = "./d1-patch.sql";

const ARTICLE_DIRS = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"];

// 🎯 FILTER: File yang Harus Di-Skip
const SKIP_PATTERNS = [
    /^index\.html$/i,        // Landing page
    /^agregat.*\.html$/i,    // Agregat pages
];

/**
 * 🚫 Cek apakah file harus di-skip berdasarkan pattern
 */
const shouldSkipFile = (filename: string): boolean => {
    return SKIP_PATTERNS.some(pattern => pattern.test(filename));
};

/**
 * 🔗 STOP WORDS: Kata Penghubung (Konjungsi)
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

const STOP_WORDS_PATTERN = new RegExp(
    "\\b(" + [...STOP_WORDS].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|") + ")\\b",
    "gi"
);

/**
 * 🔗 Buang kata penghubung dari teks
 */
const stripStopWords = (text: string): string => {
    return text.replace(STOP_WORDS_PATTERN, " ").replace(/\s+/g, " ").trim();
};

/**
 * 🧹 Super Clean Text - Sterilisasi konten untuk FTS
 */
const superCleanText = (text: string): string => {
    return text
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/#+\s+/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/>\s+/g, '')
    .replace(/`{1,3}.*?`{1,3}/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}]/gu, '')
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/\u200D/g, '')
    .replace(/BEGIN\s+TRANSACTION/gi, 'BEGIN_TRANSACTION')
    .replace(/COMMIT/gi, 'COMMIT_DONE')
    .replace(/ROLLBACK/gi, 'ROLLBACK_DONE')
    .replace(/SAVEPOINT/gi, 'SAVEPOINT_DONE')
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

    $('script, style, meta, link, noscript, footer, nav, aside, h1, #header-placeholder, #loading-indicator').remove();

    const articleArea = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
    const bodyContent = stripStopWords(superCleanText(articleArea.text()));

    return { title, image, dateISO, bodyContent, description };
};

// ============================================
// 🚀 MAIN EXECUTION (DIFF CHECKER)
// ============================================

// 1. Parse State D1 Lama
interface D1Row { id: string; date: string; code: string; }
const d1State = new Map<string, D1Row>();

// Membaca file JSON state yang didownload oleh GitHub Actions
if (existsSync(STATE_FILE)) {
    try {
        const raw = readFileSync(STATE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        // Format balikan wrangler D1 json biasanya ada di index 0 -> results
        if (Array.isArray(parsed) && parsed[0]?.results) {
            parsed[0].results.forEach((row: any) => {
                d1State.set(row.id, { id: row.id, date: row.date, code: row.code });
            });
        }
        console.log(`✅ D1 State terbaca: ${d1State.size} artikel di database.`);
    } catch (e: any) {
        console.log(`⚠️ Gagal membaca state D1 lama (${e.message}), asumsi database kosong.`);
    }
} else {
    console.log("⚠️ File state D1 tidak ditemukan, asumsi database kosong.");
}

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

let sqlCommands: string[] = [];
let processedIds = new Set<string>();
let stats = { insert: 0, update: 0, delete: 0, skip: 0 };

for (const cat of Object.keys(CATEGORY_MAP)) {
    const catNumber = CATEGORY_MAP[cat];
    const fullCatPath = join(ROOT_DIR, cat);
    if (!existsSync(fullCatPath)) continue;

    const files = readdirSync(fullCatPath).filter(f => f.endsWith(".html"));

    // Kumpulkan semua data artikel dalam kategori ini
    let categoryArticles: any[] = [];

    for (const file of files) {
        if (shouldSkipFile(file)) continue;

        try {
            const data = extractArticleData(join(fullCatPath, file), file, cat);
            // Simpan data beserta file name-nya
            categoryArticles.push({ ...data, file });
        } catch (e: any) {
            console.error(`❌ Gagal olah file: ${file} (${e.message})`);
        }
    }

    // Sort berdasarkan tanggal (Oldest to Newest)
    categoryArticles.sort((a, b) => {
        return new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime();
    });

    // Evaluasi Diff (Insert, Update, Skip)
    categoryArticles.forEach((article, index) => {
        const seqNumber = index + 1;
        const code = `${catNumber}-${seqNumber}`;
        
        // Tandai bahwa ID ini eksis di folder lokal
        processedIds.add(article.file);

        // Cari tahu apakah artikel ini sudah ada di D1 sebelumnya
        const oldState = d1State.get(article.file);

        if (!oldState) {
            // 🌟 ARTIKEL BARU -> INSERT
            sqlCommands.push(`INSERT INTO articles_fts (title, content, id, category, image, date, code, description) VALUES ('${article.title}', '${article.bodyContent}', '${article.file}', '${cat}', '${article.image}', '${article.dateISO}', '${code}', '${article.description}');`);
            stats.insert++;
        } else if (oldState.date !== article.dateISO || oldState.code !== code) {
            // 🔄 ARTIKEL BERUBAH (Tanggal / Urutan Code) -> UPDATE
            sqlCommands.push(`UPDATE articles_fts SET title='${article.title}', content='${article.bodyContent}', category='${cat}', image='${article.image}', date='${article.dateISO}', code='${code}', description='${article.description}' WHERE id='${article.file}';`);
            stats.update++;
        } else {
            // ⏭️ TIDAK ADA PERUBAHAN -> SKIP
            stats.skip++;
        }
    });
}

// Evaluasi Artikel yang Dihapus (Delete)
for (const oldId of d1State.keys()) {
    if (!processedIds.has(oldId)) {
        // 🗑️ ARTIKEL HILANG DARI LOKAL -> DELETE DI DATABASE
        sqlCommands.push(`DELETE FROM articles_fts WHERE id='${oldId}';`);
        stats.delete++;
    }
}

// Tulis file Patch SQL
if (sqlCommands.length > 0) {
    // Bungkus semua perintah dalam TRANSACTION agar eksekusinya kilat dan aman
    const finalSQL = `BEGIN TRANSACTION;\n${sqlCommands.join("\n")}\nCOMMIT;`;
    writeFileSync(PATCH_FILE, finalSQL);
    console.log(`\n🎉 Patch SQL berhasil dibuat (${sqlCommands.length} perintah modifikasi).`);
} else {
    // Buat file kosong agar workflow GitHub tahu tidak ada perubahan
    writeFileSync(PATCH_FILE, "");
    console.log(`\n🎉 Tidak ada perubahan data. Patch SQL kosong.`);
}

console.log(`📊 Statistik: ${stats.insert} Insert | ${stats.update} Update | ${stats.delete} Delete | ${stats.skip} Skipped.`);
