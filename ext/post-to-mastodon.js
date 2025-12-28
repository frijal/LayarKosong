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

/* ================= LOAD POSTED ================= */
const posted = fs.existsSync(POSTED_FILE)
  ? JSON.parse(fs.readFileSync(POSTED_FILE, "utf8"))
  : [];

/* ================= FETCH RSS ================= */
const rssText = await fetch(RSS_URL).then(r => r.text());
const parser = new XMLParser({ ignoreAttributes: false });
const feed = parser.parse(rssText);

const item = feed.rss.channel.item[0];

const title = item.title;
const link = item.link;
const guid = item.guid;
const description = item.description || "";
const category = item.category || "";

const guidHash = hash(guid);

if (posted.includes(guidHash)) {
  console.log("⏭ Artikel sudah pernah dipost. Skip.");
  process.exit(0);
}

/* ================= HASHTAGS ================= */
const hashtags = new Set();
hashtags.add("#LayarKosong");

if (category) {
  hashtags.add(toHashtag(category));
}

const hashtagText = Array.from(hashtags).join(" ");

/* ================= BUILD STATUS ================= */
let status = `📰 ${title}

${description}

🔗 ${link}

${hashtagText}`;

status = truncate(status, MAX_CHARS);

/* ================= POST TO MASTODON ================= */
const response = await fetch(`${INSTANCE}/api/v1/statuses`, {
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

if (!response.ok) {
  console.error("❌ Gagal posting ke Mastodon:");
  console.error(await response.text());
  process.exit(1);
}

/* ================= SAVE HASH ================= */
posted.push(guidHash);
fs.writeFileSync(POSTED_FILE, JSON.stringify(posted, null, 2));

console.log("✅ Berhasil posting ke Mastodon");
