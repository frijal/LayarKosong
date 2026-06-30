import { TwitterApi } from 'twitter-api-v2';
import fs from 'node:fs';

// Konfigurasi Path & URL
const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-twitter.txt'; 
const DOMAIN_URL = 'https://dalam.web.id';

const slugify = (text) => {
  return text.toString().trim().toLowerCase().replace(/\s+/g, '-');
};

async function main() {
  if (!fs.existsSync(JSON_FILE)) {
    console.error("❌ Error: artikel.json tidak ditemukan");
    process.exit(1);
  }

  const data = await Bun.file(JSON_FILE).json();
  
  let postedDatabase = "";
  if (fs.existsSync(DATABASE_FILE)) {
    postedDatabase = await Bun.file(DATABASE_FILE).text();
  }

  const allPosts = [];
  for (const [categoryName, posts] of Object.entries(data)) {
    const catSlug = slugify(categoryName);
    for (const post of posts) {
      const fileSlug = post[1].trim().replace('.html', '').replace(/\//g, '');
      
      if (fileSlug.startsWith("agregat-20")) continue;

      const fullUrl = `${DOMAIN_URL}/${catSlug}/${fileSlug}`;

      if (!postedDatabase.includes(fileSlug)) {
        allPosts.push({
          title: post[0],
          url: fullUrl,
          date: post[3],
          slug: fileSlug
        });
      }
    }
  }

  allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allPosts.length > 0) {
    const targetPost = allPosts[0];

    // MENGGUNAKAN NAMA VARIABLE YANG KAMU BERIKAN
    const client = new TwitterApi({
      appKey: Bun.env.TWITTER_API_KEY,
      appSecret: Bun.env.TWITTER_API_SECRET,
      accessToken: Bun.env.TWITTER_ACCESS_TOKEN,
      accessSecret: Bun.env.TWITTER_ACCESS_SECRET,
    });

    try {
      const tweetText = `${targetPost.title}\n\nBaca di sini:\n${targetPost.url}`;

      console.log(`🚀 Mengirim tweet untuk: ${targetPost.title}`);
      
      await client.v2.tweet(tweetText);

      // Simpan slug ke database mini
      fs.appendFileSync(DATABASE_FILE, `${targetPost.slug}\n`);

      console.log(`✅ Berhasil update ke Twitter @responaja`);
    } catch (e) {
      console.error(`❌ Error Twitter API:`, e.data || e.message);
      process.exit(1);
    }
  } else {
    console.log("✅ Belum ada artikel baru untuk diposting ke Twitter.");
  }
}

main();
