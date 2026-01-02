import fs from "fs";
import tumblr from "tumblr.js";

/* =====================
   Konfigurasi
   ===================== */
const ARTICLE_FILE = "artikel.json";
const DATABASE_FILE = "mini/posted-tumblr.txt"; 
const BLOG_NAME = "frijal";

const client = tumblr.createClient({
  consumer_key: process.env.TUMBLR_CONSUMER_KEY,
  consumer_secret: process.env.TUMBLR_CONSUMER_SECRET,
  token: process.env.TUMBLR_TOKEN,
  token_secret: process.env.TUMBLR_TOKEN_SECRET, 
});

/* =====================
   Util
   ===================== */
const cleanTag = (str) => 
  str.replace(/&/g, "dan").replace(/[^\w\s]/g, "").trim();

/* =====================
   Load Database (Plain Text)
   ===================== */
let postedUrls = [];
if (fs.existsSync(DATABASE_FILE)) {
  postedUrls = fs.readFileSync(DATABASE_FILE, "utf8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "");
}

/* =====================
   Load & Cari Artikel
   ===================== */
const raw = JSON.parse(fs.readFileSync(ARTICLE_FILE, "utf8"));
let allArticles = [];

for (const [category, items] of Object.entries(raw)) {
  for (const item of items) {
    // p[0]: judul, p[1]: slug, p[2]: image, p[3]: ISO Date, p[4]: desc
    const slug = item[1].replace('.html', '').replace(/^\//, '');
    const fullUrl = item[1].startsWith("http") 
      ? item[1] 
      : `https://dalam.web.id/artikel/${slug}`;

    allArticles.push({ 
      title: item[0], 
      url: fullUrl, 
      date: item[3], // ISO String (2026-01-01T...)
      desc: item[4] || "Archive.", 
      category: category 
    });
  }
}

// --- SORTING TERBARU DULUAN ---
// Menggunakan localeCompare agar presisi hingga detik/milidetik
allArticles.sort((a, b) => b.date.localeCompare(a.date));

// Cari artikel terbaru yang belum ada di database txt
const target = allArticles.find(a => !postedUrls.includes(a.url));

if (!target) {
  console.log("✅ Tumblr: Misi selesai, semua sudah terposting.");
  process.exit(0);
}

/* =====================
   Posting (Format NPF untuk v5.x)
   ===================== */
const tags = ["fediverse", "Repost", "Ngopi", "Indonesia", target.category];

console.log(`🚀 Mengirim ke Tumblr: ${target.title} (${target.date})`);

const content = [
  {
    type: "text",
    text: target.desc,
  },
  {
    type: "text",
    text: "#fediverse #Indonesia",
  },
  {
    type: "link",
    url: target.url,
  }
];

client.createPost(BLOG_NAME, {
  content: content,
  tags: tags.map(t => cleanTag(t))
}, (err, data) => {
  if (err) {
    console.error("❌ Gagal post Tumblr:", JSON.stringify(err, null, 2));
    process.exit(1);
  }

  // Simpan ke database txt
  if (!fs.existsSync("mini")) fs.mkdirSync("mini", { recursive: true });
  fs.appendFileSync(DATABASE_FILE, target.url + "\n");

  console.log("✅ Berhasil post ke Tumblr:", target.url);
  setTimeout(() => process.exit(0), 500);
});
