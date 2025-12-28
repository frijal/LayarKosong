import fs from "fs";
import crypto from "crypto";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const RSS_FILE = "rss.xml";
const STATE_FILE = ".last-guid";
const LIMIT = 500;

const INSTANCE = process.env.MASTODON_INSTANCE;
const TOKEN = process.env.MASTODON_TOKEN;

if (!INSTANCE || !TOKEN) {
  console.error("❌ MASTODON_INSTANCE / MASTODON_TOKEN belum diset");
  process.exit(1);
}

/* =====================
   Parse RSS
===================== */
const xml = fs.readFileSync(RSS_FILE, "utf8");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true
});

const feed = parser.parse(xml);

if (!feed?.rss?.channel?.item) {
  console.error("❌ Struktur RSS tidak dikenali");
  process.exit(1);
}

const item = feed.rss.channel.item[0];
const guid = item.guid?.["#text"] ?? item.guid;

if (!guid) {
  console.error("❌ GUID tidak ditemukan");
  process.exit(1);
}

/* =====================
   Anti dobel post
===================== */
const hash = crypto.createHash("sha256").update(guid).digest("hex");

if (fs.existsSync(STATE_FILE)) {
  const last = fs.readFileSync(STATE_FILE, "utf8");
  if (last === hash) {
    console.log("⏭️  Artikel ini sudah diposting");
    process.exit(0);
  }
}

/* =====================
   Bangun status
===================== */
const title = item.title?.["#text"] ?? item.title;
const link = item.link?.["#text"] ?? item.link;
const desc = item.description?.["#text"] ?? item.description ?? "";
const category = item.category?.["#text"] ?? item.category;

let hashtags = [];
if (category) {
  hashtags.push(
    "#" + category.replace(/\s+/g, "").replace(/[^\w]/g, "")
  );
}

let status = `${title}\n\n${desc}\n\n${link}\n\n${hashtags.join(" ")}`;

/* Limit 500 karakter */
if (status.length > LIMIT) {
  status = status.slice(0, LIMIT - 1) + "…";
}

/* =====================
   Kirim ke Mastodon
===================== */
const API_BASE = `https://${INSTANCE}`;

const res = await fetch(`${API_BASE}/api/v1/statuses`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${TOKEN}`,
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
   Simpan GUID hash
===================== */
fs.writeFileSync(STATE_FILE, hash);

console.log("✅ Berhasil post ke Mastodon");
