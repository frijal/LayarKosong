import fs from "fs";
import tumblr from "tumblr.js";

/* =====================
   Konfigurasi
   ===================== */
const ARTICLE_FILE = "artikel.json";
const DATABASE_FILE = "mini/posted-tumblr.txt"; 
const BLOG_NAME = "frijal";

// Pastikan nama variabel di sini SAMA PERSIS dengan yang ada di GitHub Secrets & YAML
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
    const [title, slug, image, date, desc] = item;
    // Bersihkan .html dan pastikan slashess konsisten
    const cleanSlug = slug.replace('.html', '').replace(/^\//, '');
    const fullUrl = slug.startsWith("http") 
      ? slug 
      : `https://dalam.web.id/artikel/${cleanSlug}`;

    allArticles.push({ title, url: fullUrl, date: new Date(date), desc, category });
  }
}

// Sort tertua ke terbaru
allArticles.sort((a, b) => a.date - b.date);

// Cari artikel pertama yang belum ada di database txt
const target = allArticles.find(a => !postedUrls.includes(a.url));

if (!target) {
  console.log("✅ Tumblr: Misi selesai, semua sudah terposting.");
  process.exit(0);
}

/* =====================
   Posting (Format NPF untuk v5.x)
   ===================== */
const tags = ["Layar Kosong", "Repost", "Ngopi", "Indonesia", target.category];

// Format NPF mengharapkan array of content blocks
const content = [
  {
    type: "text",
    text: target.desc || "Archive.",
  },
  {
    type: "text",
    text: "#reblogged #indonesia",
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
    // Log error lengkap untuk melihat pesan dari server Tumblr
    console.error("❌ Gagal post Tumblr:", JSON.stringify(err, null, 2));
    process.exit(1);
  }

  // Simpan URL baru ke file TXT (Append)
  if (!fs.existsSync("mini")) fs.mkdirSync("mini", { recursive: true });
  fs.appendFileSync(DATABASE_FILE, target.url + "\n");

  console.log("✅ Berhasil post ke Tumblr (NPF Mode):", target.url);
  setTimeout(() => process.exit(0), 500);
});
