import fs from "fs";
import crypto from "crypto";
import fetch from "node-fetch";

/* =====================
   Konfigurasi
===================== */
const ARTICLE_FILE = "artikel.json";
const STATE_FILE = "mini/posted-mastodon.json";
const LIMIT = 500;
const DELAY_MS = 8000;

const INSTANCE = process.env.MASTODON_INSTANCE;
const TOKEN = process.env.MASTODON_TOKEN;

if (!INSTANCE || !TOKEN) {
  console.error("❌ MASTODON_INSTANCE / MASTODON_TOKEN belum diset");
  process.exit(1);
}

/* =====================
   Util
===================== */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const cleanHashtag = (str) =>
  "#" + str
    .replace(/&/g, "dan")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "");

const hashUrl = (url) =>
  crypto.createHash("sha256").update(url).digest("hex");

/* =====================
   Load State
===================== */
let posted = [];
if (fs.existsSync(STATE_FILE)) {
  posted = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

/* =====================
   Load & Flatten Artikel
===================== */
const raw = JSON.parse(fs.readFileSync(ARTICLE_FILE, "utf8"));

let articles = [];

for (const [category, items] of Object.entries(raw)) {
  for (const item of items) {
    const [title, slug, image, date, desc] = item;

    articles.push({
      title,
      url: slug.startsWith("http")
        ? slug
        : `https://dalam.web.id/artikel/${slug}`,
      image,
      date: new Date(date),
      desc: desc || "",
      category
    });
  }
}

/* =====================
   Sort Tertua → Terbaru
===================== */
articles.sort((a, b) => a.date - b.date);

/* =====================
   Cari Artikel Belum Dipost
===================== */
const queue = articles.filter(a => {
  const h = hashUrl(a.url);
  return !posted.includes(h);
});

if (!queue.length) {
  console.log("✅ Semua artikel sudah dipost");
  process.exit(0);
}

const article = queue[0];
const urlHash = hashUrl(article.url);

/* =====================
   Hashtag
===================== */
const hashtags = new Set();

/* kategori */
hashtags.add(cleanHashtag(article.category));

/* judul → max 3 kata penting */
article.title
  .split(/\s+/)
  .filter(w => w.length > 4)
  .slice(0, 3)
  .forEach(w => hashtags.add(cleanHashtag(w)));

/* =====================
   Status
===================== */
let status = `📝 ${article.title}

${article.desc || "arsip Layar Kosong."}

🔗 ${article.url}

${[...hashtags].join(" ")}`;

/* limit 500 */
if (status.length > LIMIT) {
  status = status.slice(0, LIMIT - 1) + "…";
}

/* =====================
   Post ke Mastodon
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
   Simpan State
===================== */
posted.push(urlHash);
fs.mkdirSync("mini", { recursive: true });
fs.writeFileSync(STATE_FILE, JSON.stringify(posted, null, 2));

console.log("✅ Berhasil post:", article.url);

/* =====================
   Delay Aman
===================== */
await sleep(DELAY_MS);
