import fetch from "node-fetch";
import fs from "fs";
import crypto from "crypto";
import { XMLParser } from "fast-xml-parser";

/* ================= CONFIG ================= */
const RSS_URL = "https://dalam.web.id/rss.xml";
const POSTED_FILE = "mini/.posted.json";
const MAX_CHARS = 500;

const INSTANCE = process.env.MASTODON_INSTANCE;
const TOKEN = process.env.MASTODON_TOKEN;

/* ================= HELPERS ================= */
const hash = (str) =>
  crypto.createHash("sha1").update(str).digest("hex");

const truncate = (text, max) =>
  text.length > max ? text.slice(0, max - 1) + "…" : text;

const toHashtag = (str) =>
  "#" + str
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

const getText = (v) =>
  typeof v === "string"
    ? v
    : v?.__cdata || v?.["#text"] || "";

/* ================= LOAD POSTED ================= */
const posted = fs.existsSync(POSTED_FILE)
  ? JSON.parse(fs.readFileSync(POSTED_FILE, "utf8"))
  : [];

/* ================= FETCH RSS ================= */
const rssText = await fetch(RSS_URL).then(r => r.text());

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "__cdata",
});

const feed = parser.parse(rssText);

if (!feed?.rss?.channel?.item) {
  console.error("❌ Struktur RSS tidak dikenali");
  process.exit(1);
}

/* ================= NORMALIZE ITEM ================= */
const items = Array.isArray(feed.rss.channel.item)
  ? feed.rss.channel.item
  : [feed.rss.channel.item];

const item = items[0];

const title = getText(item.title);
const link = getText(item.link);
const guid = getText(item.guid);
const description = getText(item.description);
const category = getText(item.category);

const guidHash = hash(guid);

if (posted.includes(guidHash)) {
  console.log("⏭ Sudah pernah dipost, skip.");
  process.exit(0);
}

/* ================= HASHTAGS ================= */
const hashtags = new Set(["#LayarKosong"]);

if (category) {
  hashtags.add(toHashtag(category));
}

const hashtagText = [...hashtags].join(" ");

/* ================= BUILD STATUS ================= */
let status = `📰 ${title}

${description}

🔗 ${link}

${hashtagText}`;

status = truncate(status, MAX_CHARS);

/* ================= POST ================= */
const res = await fetch(`${INSTANCE}/api/v1/statuses`, {
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
  console.error("❌ Gagal posting ke Mastodon");
  console.error(await res.text());
  process.exit(1);
}

/* ================= SAVE HASH ================= */
posted.push(guidHash);
fs.writeFileSync(POSTED_FILE, JSON.stringify(posted, null, 2));

console.log("✅ Berhasil posting ke Mastodon");
