import fs from "fs";
import crypto from "crypto";
import fetch from "node-fetch";

/* =====================
   Konfigurasi
===================== */
const ARTICLE_FILE = "artikel.json";
const STATE_FILE = "mini/facebook-posted.json";
const LIMIT = 5000; // Facebook long-form friendly
const DELAY_MS = 10000;

const WEBHOOK = process.env.FB_WEBHOOK_URL;

if (!WEBHOOK) {
  console.error("❌ FB_WEBHOOK_URL belum diset");
  process.exit(1);
}

/* =====================
   Util
===================== */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
   Filter Belum Dipost
===================== */
const queue = articles.filter(a => {
  const h = hashUrl(a.url);
  return !posted.includes(h);
});

if (!queue.length) {
  console.log("✅ Semua artikel sudah dipost ke Facebook");
  process.exit(0);
}

const article = queue[0];
const urlHash = hashUrl(article.url);

/* =====================
   Konten Facebook
===================== */
let message = `📰 ${article.title}

${article.desc || "Artikel terbaru dari Layar Kosong."}

👉 Baca selengkapnya:
${article.url}

#LayarKosong #Blog #LiterasiDigital`;

if (message.length > LIMIT) {
  message = message.slice(0, LIMIT - 1) + "…";
}

/* =====================
   Kirim ke Webhook
===================== */
const res = await fetch(WEBHOOK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    platform: "facebook",
    title: article.title,
    message,
    url: article.url,
    image: article.image || null
  })
});

if (!res.ok) {
  const err = await res.text();
  console.error("❌ Gagal kirim ke webhook:", err);
  process.exit(1);
}

/* =====================
   Simpan State
===================== */
posted.push(urlHash);
fs.mkdirSync("mini", { recursive: true });
fs.writeFileSync(STATE_FILE, JSON.stringify(posted, null, 2));

console.log("✅ Berhasil kirim ke Facebook:", article.url);

/* =====================
   Delay Aman
===================== */
await sleep(DELAY_MS);
