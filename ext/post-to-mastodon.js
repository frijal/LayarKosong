import fs from "fs";
import fetch from "node-fetch";

/* =====================
 K onfigurasi        *
 ===================== */
const ARTICLE_FILE = "artikel.json";
const STATE_FILE = "mini/posted-mastodon.txt"; // Ganti jadi .txt
const LIMIT = 500;
const DELAY_MS = 8000;

const INSTANCE = process.env.MASTODON_INSTANCE;
const TOKEN = process.env.MASTODON_TOKEN;

if (!INSTANCE || !TOKEN) {
  console.error("❌ MASTODON_INSTANCE / MASTODON_TOKEN belum diset");
  process.exit(1);
}

/* =====================
 U til               *
 ===================== */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const cleanHashtag = (str) =>
"#" + str
.replace(/&/g, "dan")
.replace(/[^\w\s]/g, "")
.replace(/\s+/g, "");

/* =====================
 L oad State (Plain T*ext)
 ===================== */
let postedUrls = [];
if (fs.existsSync(STATE_FILE)) {
  postedUrls = fs.readFileSync(STATE_FILE, "utf8")
  .split("\n")
  .map(line => line.trim())
  .filter(line => line !== "");
}

/* =====================
 L oad & Flatten Arti*kel
 ===================== */
const raw = JSON.parse(fs.readFileSync(ARTICLE_FILE, "utf8"));
let articles = [];

for (const [category, items] of Object.entries(raw)) {
  for (const item of items) {
    const [title, slug, image, date, desc] = item;

    // Bersihkan .html dan pastikan slug konsisten
    const cleanSlug = slug.replace('.html', '').replace(/^\//, '');
    const fullUrl = slug.startsWith("http")
    ? slug
    : `https://dalam.web.id/artikel/${cleanSlug}`;

    articles.push({
      title,
      url: fullUrl,
      date: new Date(date),
                  desc: desc || "",
                  category
    });
  }
}

/* =====================
 S ort Tertua → Terba*ru
 ===================== */
articles.sort((a, b) => a.date - b.date);

/* =====================
 C ari Artikel Belum *Dipost
 ===================== */
// Bandingkan URL langsung tanpa hash
const queue = articles.filter(a => !postedUrls.includes(a.url));

if (!queue.length) {
  console.log("✅ Semua artikel sudah dipost ke Mastodon");
  process.exit(0);
}

const article = queue[0];

/* =====================
 H ashtag            *
 ===================== */
const hashtags = new Set();
hashtags.add("#LayarKosong");
hashtags.add("#Repost");
hashtags.add(cleanHashtag(article.category));

// Tambah hashtag dari judul (max 3 kata > 4 huruf)
article.title
.split(/\s+/)
.filter(w => w.length > 4)
.slice(0, 3)
.forEach(w => hashtags.add(cleanHashtag(w)));

/* =====================
 S tatus             *
 ===================== */
let status = `${article.desc || "Archive."}

${[...hashtags].join(" ")}

${article.url}`;

if (status.length > LIMIT) {
  status = status.slice(0, LIMIT - 1) + "…";
}

/* =====================
 P ost ke Mastodon   *
 ===================== */
const res = await fetch(`https://${INSTANCE}/api/v1/statuses`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    status,
    visibility: "public"
  })
});

if (!res.ok) {
  const err = await res.text();
  console.error("❌ Gagal post Mastodon:", err);
  process.exit(1);
}

/* =====================
 S impan State (Appen*d Plain Text)
 ===================== */
if (!fs.existsSync("mini")) fs.mkdirSync("mini", { recursive: true });
fs.appendFileSync(STATE_FILE, article.url + "\n");

console.log("✅ Berhasil post ke Mastodon:", article.url);

/* =====================
 D elay Aman         *
 ===================== */
await sleep(DELAY_MS);
