import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* =====================
   CONFIG
===================== */
const RSS_FILE = "rss.xml";
const STATE_FILE = "mini/mastodon-posted.json";
const LIMIT = 500;

const DELAY_MINUTES = 120;

if (lastPostTime) {
  const diff = (Date.now() - new Date(lastPostTime)) / 60000;
  if (diff < DELAY_MINUTES) {
    console.log("⏳ Delay belum terpenuhi, skip");
    process.exit(0);
  }
}


const INSTANCE = process.env.MASTODON_INSTANCE;
const TOKEN = process.env.MASTODON_TOKEN;

if (!INSTANCE || !TOKEN) {
  console.error("❌ MASTODON_INSTANCE / MASTODON_TOKEN belum diset");
  process.exit(1);
}

/* =====================
   Utils
===================== */
const sleep = ms => new Promise(r => setTimeout(r, ms));

const loadState = () => {
  if (!fs.existsSync(STATE_FILE)) return [];
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
};

const saveState = data => {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
};

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
  console.error("❌ Struktur RSS tidak valid");
  process.exit(1);
}

/* =====================
   Cari item belum dipost
===================== */
const postedLinks = loadState();

const nextItem = items
  .slice()               // copy
  .reverse()             // dari paling lama
  .find(it => {
    const link = it.link?.["#text"] ?? it.link;
    return link && !postedLinks.includes(link);
  });

if (!nextItem) {
  console.log("✅ Semua artikel sudah dipost");
  process.exit(0);
}

/* =====================
   Bangun status
===================== */
const title = nextItem.title?.["#text"] ?? nextItem.title;
const link = nextItem.link?.["#text"] ?? nextItem.link;
const desc = nextItem.description?.["#text"] ?? "";
const category = nextItem.category?.["#text"] ?? nextItem.category;

let hashtags = [];
if (category) {
  hashtags.push(
    "#" + category.replace(/\s+/g, "").replace(/[^\w]/g, "")
  );
}

let status = `${title}\n\n${desc}\n\n${link}\n\n${hashtags.join(" ")}`;

if (status.length > LIMIT) {
  status = status.slice(0, LIMIT - 1) + "…";
}

/* =====================
   Delay (anti spam)
===================== */
console.log("⏳ Delay sebelum posting...");
await sleep(DELAY_MS);

/* =====================
   Kirim ke Mastodon
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
  console.error("❌ Gagal post ke Mastodon:", err);
  process.exit(1);
}

/* =====================
   Simpan state
===================== */
postedLinks.push(link);
saveState(postedLinks);

console.log("✅ Berhasil post ke Mastodon:");
console.log(link);
