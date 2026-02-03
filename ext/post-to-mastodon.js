import fs from "fs";

/* =====================
 K onfigurasi         **
 ===================== */
const ARTICLE_FILE = "artikel.json";
const STATE_FILE = "mini/posted-mastodon.txt";
const LIMIT = 500;
const DELAY_MS = 8000;
const BASE_URL = "https://dalam.web.id";

// Gunakan global fetch (Native Node.js 18+)
// Tidak perlu import fetch lagi

const INSTANCE = process.env.MASTODON_INSTANCE;
const TOKEN = process.env.MASTODON_TOKEN;

if (!INSTANCE || !TOKEN) {
  console.error("❌ MASTODON_INSTANCE / MASTODON_TOKEN belum diset");
  process.exit(1);
}

/* =====================
 U til                **
 ===================== */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const slugify = (text) =>
text.toLowerCase().trim().replace(/\s+/g, '-');

const cleanHashtag = (str) =>
"#" + str
.replace(/&/g, "dan")
.replace(/[^\w\s]/g, "")
.replace(/\s+/g, "");

/* =====================
 L oad State          *
 ===================== */
let postedDatabase = "";
if (fs.existsSync(STATE_FILE)) {
  postedDatabase = fs.readFileSync(STATE_FILE, "utf8");
}

/* =====================
 L oad & Flatten Artik*el
 ===================== */
if (!fs.existsSync(ARTICLE_FILE)) {
  console.error(`❌ File ${ARTICLE_FILE} tidak ditemukan`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(ARTICLE_FILE, "utf8"));
let articles = [];

for (const [category, items] of Object.entries(raw)) {
  const catSlug = slugify(category);

  for (const item of items) {
    const title = item[0];
    const fileName = item[1];
    const fileSlug = fileName.replace('.html', '').replace(/^\//, '');
    const isoDate = item[3];
    const desc = item[4] || "";

    const fullUrl = `${BASE_URL}/${catSlug}/${fileSlug}/`;

    if (!postedDatabase.includes(fileSlug)) {
      articles.push({
        title,
        url: fullUrl,
        slug: fileSlug,
        date: isoDate,
        desc,
        category
      });
    }
  }
}

articles.sort((a, b) => b.date.localeCompare(a.date));

if (!articles.length) {
  console.log("✅ Semua artikel sudah dipost ke Mastodon");
  process.exit(0);
}

const article = articles[0];

/* =====================
 H ashtag             **
 ===================== */
const hashtags = new Set();
hashtags.add("#fediverse");
hashtags.add("#Repost");
hashtags.add("#Indonesia");
hashtags.add(cleanHashtag(article.category));

article.title
.split(/\s+/)
.filter(w => w.length > 4)
.slice(0, 3)
.forEach(w => hashtags.add(cleanHashtag(w)));

/* =====================
 S tatus              **
 ===================== */
let status = `${article.desc || "Archive."}\n\n${[...hashtags].join(" ")}\n\n${article.url}`;

if (status.length > LIMIT) {
  status = status.slice(0, LIMIT - 5) + "...";
}

/* =====================
 P ost ke Mastodon    **
 ===================== */
console.log(`🚀 Mengirim ke Mastodon: ${article.title}`);

try {
  // Langsung pakai fetch bawaan Node.js
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
   S impan State      *  *
   ===================== */
  if (!fs.existsSync("mini")) fs.mkdirSync("mini", { recursive: true });
  fs.appendFileSync(STATE_FILE, article.url + "\n");

  console.log("✅ Berhasil post ke Mastodon:", article.url);

} catch (e) {
  console.error("❌ Network Error:", e.message);
  process.exit(1);
}

await sleep(DELAY_MS);
