import fs from "fs";
import crypto from "crypto";
import fetch from "node-fetch";

/* =====================
   KONFIGURASI
===================== */
const ARTICLE_FILE = "artikel.json";
const STATE_FILE = "mini/mastodon-posted.json";
const LIMIT = 500;

const INSTANCE = process.env.MASTODON_INSTANCE;
const TOKEN = process.env.MASTODON_TOKEN;

if (!INSTANCE || !TOKEN) {
  console.error("❌ MASTODON_INSTANCE / MASTODON_TOKEN belum diset");
  process.exit(1);
}

/* =====================
   LOAD STATE
===================== */
let posted = [];
if (fs.existsSync(STATE_FILE)) {
  posted = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

/* =====================
   LOAD & FLATTEN ARTIKEL
===================== */
const raw = JSON.parse(fs.readFileSync(ARTICLE_FILE, "utf8"));

let articles = [];

for (const category in raw) {
  raw[category].forEach(item => {
    const [
      title,
      slug,
      image,
      date,
      description
    ] = item;

    articles.push({
      title,
      slug,
      url: slug.startsWith("http")
        ? slug
        : `https://dalam.web.id/artikel/${slug.replace(/^\//, "")}`,
      image,
      date,
      description,
      category
    });
  });
}

/* =====================
   SORT TERBARU
===================== */
articles.sort((a, b) => new Date(b.date) - new Date(a.date));

/* =====================
   PILIH YANG BELUM DIPOST
===================== */
const next = articles.find(a => !posted.includes(a.url));

if (!next) {
  console.log("⏭️  Tidak ada artikel baru");
  process.exit(0);
}

/* =====================
   HASHTAG
===================== */
function makeHashtag(text) {
  return (
    "#" +
    text
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join("")
  );
}

let hashtags = [];

/* kategori */
hashtags.push(makeHashtag(next.category));

/* judul → multi hashtag */
next.title
  .split(/\s+/)
  .filter(w => w.length > 4)
  .slice(0, 4)
  .forEach(w => hashtags.push(makeHashtag(w)));

hashtags = [...new Set(hashtags)];

/* =====================
   BANGUN STATUS
===================== */
const desc =
  next.description && next.description.trim()
    ? next.description.trim()
    : "sambil Ngopi.";

let status = [
  next.title,
  "",
  desc,
  "",
  next.url,
  "",
  hashtags.join(" ")
].join("\n");

/* limit 500 */
if (status.length > LIMIT) {
  status = status.slice(0, LIMIT - 1) + "…";
}

/* =====================
   POST KE MASTODON
===================== */
const apiBase = INSTANCE.startsWith("http")
  ? INSTANCE
  : `https://${INSTANCE}`;

const res = await fetch(`${apiBase}/api/v1/statuses`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    status,
    visibility: "public",
    language: "id"
  })
});

if (!res.ok) {
  console.error("❌ Gagal post:", await res.text());
  process.exit(1);
}

/* =====================
   SIMPAN STATE
===================== */
posted.push(next.url);
fs.mkdirSync("mini", { recursive: true });
fs.writeFileSync(STATE_FILE, JSON.stringify(posted, null, 2));

console.log("✅ Berhasil post ke Mastodon:");
console.log(next.url);
