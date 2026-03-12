import { writeFileSync, readFileSync, existsSync } from "node:fs";

const HOST = "dalam.web.id";
const KEY = process.env.INDEXNOW_KEY;
const SITEMAP_FILE = "./sitemap.txt";
const CACHE_FILE = "./mini/indexnow-cache.txt";
const BATCH_SIZE = 700; // Ukuran maksimal per pengiriman

const PROVIDERS = [
  "https://bing.com/indexnow",
  "https://yandex.com/indexnow",
  "https://search.seznam.cz/indexnow"
];

async function submitIndexNow() {
  if (!KEY) throw new Error("INDEXNOW_KEY is missing!");

  const sitemap = existsSync(SITEMAP_FILE) ? readFileSync(SITEMAP_FILE, "utf-8").split("\n").filter(Boolean) : [];
  const cache = existsSync(CACHE_FILE) ? new Set(readFileSync(CACHE_FILE, "utf-8").split("\n").filter(Boolean)) : new Set();

  const newUrls = sitemap.filter(url => !cache.has(url));

  if (newUrls.length === 0) {
    console.log("✅ Tidak ada URL baru.");
    return;
  }

  console.log(`📂 Total URL baru ditemukan: ${newUrls.length}`);

  // 1. Proses pemecahan menjadi batch
  for (let i = 0; i < newUrls.length; i += BATCH_SIZE) {
    const batch = newUrls.slice(i, i + BATCH_SIZE);
    const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(newUrls.length / BATCH_SIZE);

    console.log(`\n📦 Memproses Batch ${currentBatchNum}/${totalBatches} (${batch.length} URL)...`);

    const payload = {
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList: batch
    };

    // 2. Kirim ke semua provider untuk batch saat ini
    const requests = PROVIDERS.map(async (url) => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          console.log(`   ✅ Success [${new URL(url).hostname}]`);
        } else {
          console.error(`   ❌ Failed [${new URL(url).hostname}]: ${response.status}`);
        }
      } catch (err) {
        console.error(`   💥 Error [${new URL(url).hostname}]:`, err.message);
      }
    });

    await Promise.all(requests);

    // 3. Update cache per batch agar jika batch selanjutnya gagal, batch ini tetap aman
    batch.forEach(url => cache.add(url));
    writeFileSync(CACHE_FILE, Array.from(cache).join("\n"));
    
    // Beri jeda 2 detik antar batch agar tidak dianggap spam
    if (i + BATCH_SIZE < newUrls.length) {
      console.log("   ⏳ Menunggu 2 detik sebelum batch berikutnya...");
      await new Promise(resolve => setTimeout(resolve, 3600));
    }
  }

  console.log("\n✨ Semua proses selesai!");
}

submitIndexNow();
