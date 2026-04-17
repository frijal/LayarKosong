import { readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import * as cheerio from "cheerio";

const ARTIKEL_JSON = "./deploy_dir/artikel.json";
const ROOT_DIR     = "./deploy_dir";
const SQL_FILE     = "./temp_sync.sql";
const TEMP_CONFIG  = "/tmp/wrangler.toml";

const CATEGORY_SLUG_MAP: Record<string, string> = {
    "Gaya Hidup":    "gaya-hidup",
    "Jejak Sejarah": "jejak-sejarah",
    "Lainnya":       "lainnya",
    "Olah Media":    "olah-media",
    "Opini Sosial":  "opini-sosial",
    "Sistem Terbuka":"sistem-terbuka",
    "Warta Tekno":   "warta-tekno",
};

// 🎯 File yang harus di-skip
const SKIP_PATTERNS = [
    /^index\.html$/i,
    /^agregat/i,
];

const shouldSkip = (filename: string): boolean =>
    SKIP_PATTERNS.some(p => p.test(filename));

/**
 * 🛡️ Escape string aman untuk SQL
 */
const sqlEscape = (text: string): string =>
    (text || "").replace(/'/g, "''").replace(/\s+/g, " ").trim();

/**
 * 📄 Ambil full content dari HTML untuk FTS5
 */
const extractBodyContent = (filePath: string): string => {
    const html = readFileSync(filePath, "utf-8");
    const $ = cheerio.load(html);

    $("script, style, meta, link, noscript, i, header, footer, nav, aside, #header-placeholder, #loading-indicator").remove();

    const articleArea = $("article").length ? $("article")
                      : $("main").length   ? $("main")
                      : $("body");

    return sqlEscape(articleArea.text());
};

// ============================================
// 🚀 MAIN EXECUTION
// ============================================

const raw = JSON.parse(readFileSync(ARTIKEL_JSON, "utf-8")) as Record
    string,
    [string, string, string, string, string][]
>;

type ArticleRow = {
    title: string; content: string; id: string;
    category: string; image: string; date: string;
};

const allArticles: ArticleRow[] = [];
let skipped = 0;

for (const [catName, articles] of Object.entries(raw)) {
    const category = CATEGORY_SLUG_MAP[catName];
    if (!category) {
        console.warn(`⚠️  Kategori tidak dikenal: "${catName}" — di-skip`);
        continue;
    }

    for (const [title, filename, image, dateISO] of articles) {

        // 🚫 Skip agregat & index
        if (shouldSkip(filename)) {
            skipped++;
            continue;
        }

        const filePath = join(ROOT_DIR, category, filename);

        if (!existsSync(filePath)) {
            console.warn(`⚠️  File tidak ditemukan: ${filePath}`);
            skipped++;
            continue;
        }

        try {
            const id      = filename.replace(/\.html$/i, "");
            const content = extractBodyContent(filePath);

            allArticles.push({
                title:    sqlEscape(title),
                content,
                id:       sqlEscape(id),
                category: sqlEscape(category),
                image:    sqlEscape(image),
                date:     sqlEscape(dateISO),
            });
        } catch (e: any) {
            console.error(`❌ Gagal olah: ${filename} (${e.message})`);
            skipped++;
        }
    }
}

// 📅 Sort: terbaru di atas
allArticles.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
);

// 🗄️ Generate SQL
const sqlCommands = [
    "DELETE FROM articles_fts;",
    ...allArticles.map(a =>
        `INSERT INTO articles_fts (title, content, id, category, image, date) VALUES ` +
        `('${a.title}', '${a.content}', '${a.id}', '${a.category}', '${a.image}', '${a.date}');`
    ),
];

writeFileSync(SQL_FILE, sqlCommands.join("\n"));

try {
    if (!existsSync(TEMP_CONFIG)) {
        console.error("❌ File konfigurasi wrangler.toml tidak ditemukan.");
        process.exit(1);
    }

    execSync(
        `bunx wrangler d1 execute layarkosong-db --remote --file=${SQL_FILE} -c ${TEMP_CONFIG}`,
        { stdio: "inherit" }
    );

    console.log(`\n✅ Sync D1 Berhasil!`);
    console.log(`   📊 ${allArticles.length} artikel diproses | ${skipped} di-skip`);
} catch (err: any) {
    console.error(`❌ Gagal update D1: ${err.message}`);
    process.exit(1);
} finally {
    if (existsSync(SQL_FILE)) unlinkSync(SQL_FILE);
}
