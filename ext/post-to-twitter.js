import fs from 'fs';
import { TwitterApi } from 'twitter-api-v2';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-twitter.txt';
const BASE_URL = 'https://dalam.web.id';

const slugify = (text) => text.toLowerCase().trim().replace(/\s+/g, '-');

async function postToTwitter() {
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });

  if (!fs.existsSync(JSON_FILE)) return;

  const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
  let postedDatabase = fs.existsSync(DATABASE_FILE) ? fs.readFileSync(DATABASE_FILE, 'utf8') : "";
  let allPosts = [];

  for (const [cat, posts] of Object.entries(data)) {
    const catSlug = slugify(cat);
    posts.forEach(p => {
      const fileSlug = p[1].replace('.html', '').replace(/^\//, '');
      // 2. Masukkan pengecekanmu di sini
      if (fileSlug.startsWith("agregat-20")) {
        return; // Skip artikel ini, lanjut ke artikel berikutnya
      }
      const fullUrl = `${BASE_URL}/${catSlug}/${fileSlug}`;
      if (!postedDatabase.includes(fileSlug)) {
        allPosts.push({ title: p[0], slug: fileSlug, url: fullUrl });
      }
    });
  }

  if (allPosts.length === 0) {
    console.log("🏁 Tidak ada artikel baru untuk Twitter.");
    return;
  }

  // Ambil artikel paling terbaru
  const target = allPosts[0];
  const tweetText = `🚀 Artikel Baru di Layar Kosong:\n\n${target.title}\n\nCek selengkapnya di sini: ${target.url}\n\n#CachyOS #Linux #ArchLinux #LayarKosong`;

  try {
    console.log(`🐦 Mengirim Tweet: ${target.title}`);
    await client.v2.tweet(tweetText);

    if (!fs.existsSync('mini')) fs.mkdirSync('mini', { recursive: true });
    fs.appendFileSync(DATABASE_FILE, target.slug + '\n');
    console.log("✅ Tweet Berhasil!");
  } catch (err) {
    console.error("❌ Gagal ngetweet:", err);
    process.exit(1);
  }
}

postToTwitter();
