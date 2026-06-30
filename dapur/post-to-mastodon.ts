// Menggunakan Bun.file lebih cepat daripada fs.readFileSync
const ARTICLE_FILE = "artikel.json";
const STATE_FILE = "mini/posted-mastodon.txt";
const LIMIT = 500;
const DELAY_MS = 8000;
const BASE_URL = "https://dalam.web.id";

const INSTANCE = Bun.env.MASTODON_INSTANCE;
const TOKEN = Bun.env.MASTODON_TOKEN;

if (!INSTANCE || !TOKEN) {
  console.error("❌ MASTODON_INSTANCE / MASTODON_TOKEN belum diset");
  process.exit(1);
}

/* =====================
  Interfaces & Types
 ===================== */
// Struktur artikel: [judul, path, ?, tanggal, deskripsi]
type RawArticle = [string, string, any, string, string?];
interface ArticleData {
  [category: string]: RawArticle[];
}

interface Article {
  title: string;
  url: string;
  slug: string;
  date: string;
  desc: string;
  category: string;
}

/* =====================
  Utils
 ===================== */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/\s+/g, '-');

const cleanHashtag = (str: string) =>
  "#" + str
    .replace(/&/g, "dan")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "");

/* =====================
  Load State
 ===================== */
const stateFile = Bun.file(STATE_FILE);
let postedDatabase = "";
if (await stateFile.exists()) {
  postedDatabase = await stateFile.text();
}

/* =====================
  Load & Flatten Articles
 ===================== */
const articleFile = Bun.file(ARTICLE_FILE);
if (!(await articleFile.exists())) {
  console.error(`❌ File ${ARTICLE_FILE} tidak ditemukan`);
  process.exit(1);
}

const raw = await articleFile.json() as ArticleData;
let articles: Article[] = [];

for (const [category, items] of Object.entries(raw)) {
  const catSlug = slugify(category);

  for (const item of items) {
    const [title, fileName, , isoDate, desc = ""] = item;
    const fileSlug = fileName.replace('.html', '').replace(/^\//, '');
    const fullUrl = `${BASE_URL}/${catSlug}/${fileSlug}`;

    // 1. FILTER AGREGAT
    if (fileSlug.startsWith("agregat-20")) continue;

    if (!postedDatabase.includes(fileSlug)) {
      articles.push({
        title,
        url: fullUrl,
        slug: fileSlug,
        date: isoDate,
        desc,
        category
      });
    }
  }
}

// Urutkan dari yang terbaru
articles.sort((a, b) => b.date.localeCompare(a.date));

if (articles.length === 0) {
  console.log("✅ Semua artikel sudah dipost ke Mastodon");
  process.exit(0);
}

const article = articles[0];

/* =====================
  Hashtag Generation
 ===================== */
const hashtags = new Set<string>();
hashtags.add("#fediverse");

article.title
  .split(/\s+/)
  .filter(w => w.length > 4)
  .slice(0, 3)
  .forEach(w => hashtags.add(cleanHashtag(w)));

/* =====================
  Status Formatting
 ===================== */
let status = `${article.desc || "Archive."}\n\n${[...hashtags].join(" ")}\n\n${article.url}`;

if (status.length > LIMIT) {
  status = status.slice(0, LIMIT - 5) + "...";
}

/* =====================
  Post to Mastodon
 ===================== */
console.log(`🚀 Mengirim ke Mastodon: ${article.title}`);

try {
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
    console.error("❌ Gagal post Mastodon:", err);
    process.exit(1);
  }

  /* =====================
    Save State (Bun Style)
   ===================== */
  const currentContent = postedDatabase;
  const newContent = currentContent + article.url + "\n";
  await Bun.write(STATE_FILE, newContent);

  console.log("✅ Berhasil post ke Mastodon:", article.url);

} catch (e: any) {
  console.error("❌ Network Error:", e.message);
  process.exit(1);
}

await sleep(DELAY_MS);
