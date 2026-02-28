import tumblr from "tumblr.js";

/* =====================
 * Interfaces
 * ===================== */
type RawArticle = [string, string, any, string, string?];
interface ArticleData {
    [category: string]: RawArticle[];
}

interface Article {
    title: string;
    url: string;
    slug: string;
    date: string;
    desc: string;
    category: string;
}

/* =====================
 * Konfigurasi
 * ===================== */
const ARTICLE_FILE = "artikel.json";
const DATABASE_FILE = "mini/posted-tumblr.txt";
const BLOG_NAME = "frijal";
const BASE_URL = "https://dalam.web.id";

// Pakai Bun.env agar lebih "native"
const client = tumblr.createClient({
    consumer_key: Bun.env.TUMBLR_CONSUMER_KEY!,
    consumer_secret: Bun.env.TUMBLR_CONSUMER_SECRET!,
    token: Bun.env.TUMBLR_TOKEN!,
    token_secret: Bun.env.TUMBLR_TOKEN_SECRET!,
});

/* =====================
 * Util
 * ===================== */
const cleanTag = (str: string): string =>
str.replace(/&/g, "dan").replace(/[^\w\s]/g, "").trim();

const slugify = (text: string): string =>
text.toLowerCase().trim().replace(/\s+/g, '-');

/* =====================
 * Load Database & Artikel
 * ===================== */
const dbFile = Bun.file(DATABASE_FILE);
const postedDatabase = (await dbFile.exists()) ? await dbFile.text() : "";

const articleFile = Bun.file(ARTICLE_FILE);
if (!(await articleFile.exists())) {
    console.error(`❌ File ${ARTICLE_FILE} tidak ditemukan`);
    process.exit(1);
}

const raw = (await articleFile.json()) as ArticleData;
let allArticles: Article[] = [];

for (const [category, items] of Object.entries(raw)) {
    const catSlug = slugify(category);

    for (const item of items) {
        const [title, fileName, , date, desc = "Archive."] = item;
        const fileSlug = fileName.replace('.html', '').replace(/^\//, '');

        if (fileSlug.startsWith("agregat-20")) continue;

        const fullUrl = `${BASE_URL}/${catSlug}/${fileSlug}`;

        if (!postedDatabase.includes(fileSlug)) {
            allArticles.push({
                title,
                url: fullUrl,
                slug: fileSlug,
                date,
                desc,
                category
            });
        }
    }
}

allArticles.sort((a, b) => b.date.localeCompare(a.date));
const target = allArticles[0];

if (!target) {
    console.log("✅ Tumblr: Tidak ada artikel baru.");
    process.exit(0);
}

/* =====================
 * Posting (Promisified)
 * ===================== */
const tags = ["fediverse", "Repost", "Ngopi", "Indonesia", target.category];

console.log(`🚀 Mengirim ke Tumblr: ${target.title}`);

const content = [
    { type: "text", text: target.desc },
{ type: "text", text: "#fediverse #Indonesia" },
{ type: "link", url: target.url }
];

// Kita bungkus createPost ke dalam Promise supaya lebih modern di Bun
const postToTumblr = () => {
    return new Promise((resolve, reject) => {
        client.createPost(BLOG_NAME, {
            content: content,
            tags: tags.map(t => cleanTag(t))
        }, (err, data) => {
            if (err) return reject(err);
            resolve(data);
        });
    });
};

try {
    await postToTumblr();

    // Simpan state pakai Bun.write (lebih kencang & otomatis buat folder)
    const newContent = postedDatabase + target.url + "\n";
    await Bun.write(DATABASE_FILE, newContent);

    console.log("✅ Berhasil post ke Tumblr:", target.url);
    process.exit(0);
} catch (err: any) {
    console.error("❌ Gagal post Tumblr:", JSON.stringify(err, null, 2));
    process.exit(1);
}
