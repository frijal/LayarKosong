import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* =====================
   CONFIG
===================== */
const RSS_FILE = "rss.xml";
const STATE_FILE = "mini/mastodon-posted.json";
const LIMIT = 500;
const DELAY_MINUTES = 120; // delay antar post (2 jam)

let INSTANCE = process.env.MASTODON_INSTANCE;
const TOKEN = process.env.MASTODON_TOKEN;

if (!INSTANCE || !TOKEN) {
  console.error("❌ MASTODON_INSTANCE / MASTODON_TOKEN belum diset");
  process.exit(1);
}

// Normalisasi instance
INSTANCE = INSTANCE.replace(/^https?:\/\//, "").replace(/\/$/, "");
const API_BASE = `https://${INSTANCE}`;

/* =====================
   Pastikan state file ada
===================== */
if (!fs.existsSync("mini")) {
  fs.mkdirSync("mini", { recursive: true });
}

if (!fs.existsSync(STATE_FILE)) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ posted: [] }, null, 2));
}

const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));

/* =====================
   Delay check
===================== */
const lastPost = state.posted[state.posted.length - 1];
if (lastPost?.posted_at) {
  const diffMinutes =
    (Date.now() - new Date(lastPost.posted_at)) / 60000;

  if (diffMinutes < DELAY_MINUTES) {
    console.log("⏳ Delay belum terpenuhi, skip posting");
    process.exit(0);
  }
}

/* =====================
   Parse RSS
===================== */
const xml = fs.readFileSync(RSS_FILE, "utf8");

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true
});

const feed = parser.parse(xml);

const items = feed?.rss?.channel?.item;
if (!Array.isArray(items)) {
  console.error("❌ Struktur RSS tidak dikenali");
  process.exit(1);
}

/* =====================
   Cari item belum dipost
===================== */
const postedLinks = new Set(state.posted.map(p => p.link));

const item = items.find(i => {
  const link = i.link?.["#text"] ?? i.link;
  return link && !postedLinks.has(link);
});

if (!item) {
  console.log("✅ Semua artikel sudah dipost");
  process.exit(0);
}

/* =====================
   Ambil data artikel
===================== */
const title = item.title?.["#text"] ?? item.title;
const link = item.link?.["#text"] ?? item.link;
const desc = item.description?.["#text"] ?? item.description ?? "";
const category = item.category?.["#text"] ?? item.category;

/* =====================
   Hashtag
===================== */
let hashtags = "";
if (category) {
  hashtags = "#" + category.replace(/\s+/g, "").replace(/[^\w]/g, "");
}

/* =====================
   Bangun status (rapi)
===================== */
let status = `📰 ${title}\n\n`;

if (desc) {
  status += `${desc}\n\n`;
}

status += `🔗 ${link}`;

if (hashtags) {
  status += `\n\n${hashtags}`;
}

/* Limit 500 karakter */
if (status.length > LIMIT) {
  status = status.slice(0, LIMIT - 1) + "…";
}

/* =====================
   Post ke Mastodon
===================== */
const res = await fetch(`${API_BASE}/api/v1/statuses`, {
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
  console.error("❌ Gagal post ke Mastodon:", err);
  process.exit(1);
}

/* =====================
   Simpan state
===================== */
state.posted.push({
  link,
  posted_at: new Date().toISOString()
});

fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

console.log("✅ Berhasil post ke Mastodon");
