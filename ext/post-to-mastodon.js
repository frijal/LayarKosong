import fs from "fs";
import crypto from "crypto";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* =====================
   Konstanta
===================== */
const RSS_FILE = "rss.xml";
const STATE_FILE = "mini/mastodon-posted.json";
const LIMIT = 500;

const INSTANCE = process.env.MASTODON_INSTANCE;
const TOKEN = process.env.MASTODON_TOKEN;

if (!INSTANCE || !TOKEN) {
  console.error("❌ MASTODON_INSTANCE / MASTODON_TOKEN belum diset");
  process.exit(1);
}

/* =====================
   Helper
===================== */
const hashLink = (link) =>
  crypto.createHash("sha256").update(link).digest("hex");

/* =====================
   Parse RSS
===================== */
const xml = fs.readFileSync(RSS_FILE, "utf8");

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true
});

const feed = parser.parse(xml);

if (!feed?.rss?.channel?.item) {
  console.error("❌ Struktur RSS tidak dikenali");
  process.exit(1);
}

const items = Array.isArray(feed.rss.channel.item)
  ? feed.rss.channel.item
  : [feed.rss.channel.item];

/* =====================
   Load state
===================== */
let state = { posted: [] };

if (fs.existsSync(STATE_FILE)) {
  state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

const postedSet = new Set(state.posted);

/* =====================
   Cari item belum dipost
===================== */
let target = null;

for (const item of items) {
  const link = item.link?.["#text"] ?? item.link;
  if (!link) continue;

  const hash = hashLink(link);

  if (!postedSet.has(hash)) {
    target = { item, link, hash };
    break;
  }
}

if (!target) {
  console.log("⏭️  Tidak ada artikel baru untuk diposting");
  process.exit(0);
}

/* =====================
   Bangun status
===================== */
const title = target.item.title?.["#text"] ?? target.item.title ?? "";
const desc =
  target.item.description?.["#text"] ??
  target.item.description ??
  "";

const category = target.item.category?.["#text"] ?? target.item.category;

let hashtags = [];
if (category) {
  hashtags.push(
    "#" + category.replace(/\s+/g, "").replace(/[^\w]/g, "")
  );
}

let status = `${title}\n\n${desc}\n\n${target.link}\n\n${hashtags.join(" ")}`;

if (status.length > LIMIT) {
  status = status.slice(0, LIMIT - 1) + "…";
}

/* =====================
   Post ke Mastodon
===================== */
const API_BASE = `https://${INSTANCE.replace(/^https?:\/\//, "")}`;

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
state.posted.push(target.hash);

fs.mkdirSync("mini", { recursive: true });
fs.writeFileSync(
  STATE_FILE,
  JSON.stringify(state, null, 2)
);

console.log("✅ Berhasil post ke Mastodon:", target.link);
