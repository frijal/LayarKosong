import fs from "fs";
import tumblr from "tumblr.js";

/* =====================
 * Konfigurasi
 * ===================== */
const ARTICLE_FILE = "artikel.json";
const DATABASE_FILE = "mini/posted-tumblr.txt";
const BLOG_NAME = "frijal";
const BASE_URL = "https://dalam.web.id";

const client = tumblr.createClient({
  consumer_key: process.env.TUMBLR_CONSUMER_KEY,
  consumer_secret: process.env.TUMBLR_CONSUMER_SECRET,
  token: process.env.TUMBLR_TOKEN,
  token_secret: process.env.TUMBLR_TOKEN_SECRET,
});

/* =====================
 * Util
 * ===================== */
const cleanTag = (str) =>
str.replace(/&/g, "dan").replace(/[^\w\s]/g, "").trim();

const slugify = (text) =>
text.toLowerCase().trim().replace(/\s+/g, '-');

/* =====================
 * Load Database (Cari Berdasarkan Keyword/Slug)
 * ===================== */
let postedDatabase = "";
if (fs.existsSync(DATABASE_FILE)) {
  // Kita baca semua isinya sebagai satu string besar supaya gampang di-search
  postedDatabase = fs.readFileSync(DATABASE_FILE, "utf8");
}

/* =====================
 * Load & Cari Artikel
 * ===================== */
const raw = JSON.parse(fs.readFileSync(ARTICLE_FILE, "utf8"));
let allArticles = [];

for (const [category, items] of Object.entries(raw)) {
  const catSlug = slugify(category);

  for (const item of items) {
    const fileSlug = item[1].replace('.html', '').replace(/^\//, '');
    const fullUrl = `${BASE_URL}/${cat_slug}/${fileSlug}/`;

    // --- LOGIKA BARU: CEK SLUG ---
    // Jika slug "kesimpulan-ai-umkm" ada di dalam database, maka skip.
    const isPosted = postedDatabase.includes(fileSlug);

    if (!isPosted) {
      allArticles.push({
        title: item[0],
        url: fullUrl,
        slug: fileSlug, // Kita simpan slug-nya buat referensi simpan nanti
        date: item[3],
        desc: item[4] || "Archive.",
        category: category
      });
    }
  }
}

// Sorting terbaru
allArticles.sort((a, b) => b.date.localeCompare(a.date));

const target = allArticles[0]; // Ambil yang paling baru dari yang belum di-post

if (!target) {
  console.log("✅ Tumblr: Misi selesai, tidak ada artikel baru (berdasarkan slug).");
  process.exit(0);
}

/* =====================
 * Posting
 * ===================== */
const tags = ["fediverse", "Repost", "Ngopi", "Indonesia", target.category];

console.log(`🚀 Mengirim ke Tumblr: ${target.title}`);

const content = [
  { type: "text", text: target.desc },
{ type: "text", text: "#fediverse #Indonesia" },
{ type: "link", url: target.url }
];

client.createPost(BLOG_NAME, {
  content: content,
  tags: tags.map(t => cleanTag(t))
}, (err, data) => {
  if (err) {
    console.error("❌ Gagal post Tumblr:", JSON.stringify(err, null, 2));
    process.exit(1);
  }

  // SIMPAN FULL URL ke database (biar tetap rapi, tapi nanti dicek cuma slug-nya)
  if (!fs.existsSync("mini")) fs.mkdirSync("mini", { recursive: true });
  fs.appendFileSync(DATABASE_FILE, target.url + "\n");

  console.log("✅ Berhasil post ke Tumblr:", target.url);
  setTimeout(() => process.exit(0), 500);
});
