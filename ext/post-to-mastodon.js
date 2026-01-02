import fs from "fs";
import fetch from "node-fetch";

/* =====================
   Konfigurasi
   ===================== */
const ARTICLE_FILE = "artikel.json";
const STATE_FILE = "mini/posted-mastodon.txt"; 
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

/* =====================
   Load State (Plain Text)
   ===================== */
let postedUrls = [];
if (fs.existsSync(STATE_FILE)) {
  postedUrls = fs.readFileSync(STATE_FILE, "utf8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "");
}

/* =====================
   Load & Flatten Artikel
   ===================== */
const raw = JSON.parse(fs.readFileSync(ARTICLE_FILE, "utf8"));
let articles = [];

for (const [category, items] of Object.entries(raw)) {
  for (const item of items) {
    // Struktur JSON: [0:judul, 1:slug, 2:image, 3:date(ISO), 4:desc]
    const title = item[0];
    const slug = item[1];
    const isoDate = item[3]; // Ambil jam & menit lengkap
    const desc = item[4] || "";

    const cleanSlug = slug.replace('.html', '').replace(/^\//, '');
    const fullUrl = slug.startsWith("http")
      ? slug
      : `https://dalam.web.id/artikel/${cleanSlug}`;

    articles.push({
      title,
      url: fullUrl,
      date: isoDate, // Gunakan string ISO asli untuk sort presisi
      desc,
      category
    });
  }
}

/* =====================
   Sort TERBARU → TERLAMA
   ===================== */
// Menggunakan localeCompare pada string ISO agar akurat hingga milidetik
articles.sort((a, b) => b.date.localeCompare(a.date));

/* =====================
   Cari Artikel Belum Dipost
   ===================== */
const queue = articles.filter(a => !postedUrls.includes(a.url));

if (!queue.length) {
  console.log("✅ Semua artikel sudah dipost ke Mastodon");
  process.exit(0);
}

// Ambil yang paling atas (terbaru hasil sorting tadi)
const article = queue[0];

/* =====================
   Hashtag
   ===================== */
const hashtags = new Set();
hashtags.add("#fediverse");
hashtags.add("#Repost");
hashtags.add(cleanHashtag(article.category));

article.title
  .split(/\s+/)
  .filter(w => w.length > 4)
  .slice(0, 3)
  .forEach(w => hashtags.add(cleanHashtag(w)));

/* =====================
   Status
   ===================== */
let status = `${article.desc || "Archive."}

${[...hashtags].join(" ")}

${article.url}`;

if (status.length > LIMIT) {
  status = status.slice(0, LIMIT - 1) + "…";
}

/* =====================
   Post ke Mastodon
   ===================== */
console.log(`🚀 Mengirim ke Mastodon: ${article.title} (${article.date})`);

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
if (!fs.existsSync("mini")) fs.mkdirSync("mini", { recursive: true });
fs.appendFileSync(STATE_FILE, article.url + "\n");

console.log("✅ Berhasil post ke Mastodon:", article.url);

/* =====================
   Delay Aman
   ===================== */
await sleep(DELAY_MS);
