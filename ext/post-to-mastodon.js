import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";

// ================= ENV =================
const INSTANCE = process.env.MASTODON_INSTANCE;
const TOKEN = process.env.MASTODON_TOKEN;

if (!INSTANCE || !TOKEN) {
  console.error("❌ ENV Mastodon belum lengkap");
  process.exit(1);
}

// ================= LOAD RSS =================
const xml = fs.readFileSync("rss.xml", "utf8");

const parser = new XMLParser({
  ignoreAttributes: false,
  processEntities: true,
  trimValues: true,
});

const feed = parser.parse(xml);

// ================= VALIDASI STRUKTUR =================
const channel = feed?.rss?.channel;
if (!channel || !channel.item) {
  console.error("❌ Struktur RSS tidak dikenali");
  process.exit(1);
}

// Pastikan item array
const items = Array.isArray(channel.item)
  ? channel.item
  : [channel.item];

const item = items[0];

// ================= DATA ARTIKEL =================
const title = item.title?.["#text"] || item.title || "";
const link = item.link?.["#text"] || item.link || "";
const desc =
  item.description?.["#text"] ||
  item.description ||
  "";

const categoryRaw = item.category
  ? Array.isArray(item.category)
    ? item.category
    : [item.category]
  : [];

// ================= HASHTAG =================
const hashtags = categoryRaw
  .map(c =>
    (c["#text"] || c || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "")
  )
  .filter(Boolean)
  .map(c => `#${c}`)
  .join(" ");

// ================= FORMAT STATUS =================
let status = `${title}\n\n${desc}\n\n🔗 ${link}\n\n${hashtags}`;

// Limit 500 karakter
if (status.length > 500) {
  status = status.slice(0, 497) + "...";
}

// ================= ANTI DOBEL POST =================
const hash = crypto
  .createHash("sha256")
  .update(link)
  .digest("hex");

const cacheFile = "mini/.mastodon-posted.json";
let posted = [];

if (fs.existsSync(cacheFile)) {
  posted = JSON.parse(fs.readFileSync(cacheFile));
}

if (posted.includes(hash)) {
  console.log("⏭️ Sudah pernah diposting, dilewati");
  process.exit(0);
}

// ================= POST KE MASTODON =================
const api = `https://${INSTANCE}/api/v1/statuses`;

const res = await fetch(api, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    status,
    visibility: "public",
  }),
});

if (!res.ok) {
  const err = await res.text();
  console.error("❌ Gagal posting:", err);
  process.exit(1);
}

// ================= SIMPAN HASH =================
posted.push(hash);
fs.writeFileSync(cacheFile, JSON.stringify(posted, null, 2));

console.log("✅ Berhasil posting ke Mastodon");
