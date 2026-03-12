import { writeFileSync, readFileSync, existsSync } from "node:fs";

const HOST = "dalam.web.id";
const KEY = process.env.INDEXNOW_KEY;
const SITEMAP_FILE = "./sitemap.txt";
const CACHE_FILE = "./mini/indexnow-cache.txt";

// Daftar Provider IndexNow
const PROVIDERS = [
  "https://bing.com/indexnow",
  "https://yandex.com/indexnow",
  "https://search.seznam.cz/indexnow"
];

async function submitIndexNow() {
  if (!KEY) throw new Error("INDEXNOW_KEY is missing in env!");

  // 1. Load Sitemap & Cache
  const sitemap = existsSync(SITEMAP_FILE) ? readFileSync(SITEMAP_FILE, "utf-8").split("\n").filter(Boolean) : [];
  const cache = existsSync(CACHE_FILE) ? new Set(readFileSync(CACHE_FILE, "utf-8").split("\n").filter(Boolean)) : new Set();

  // 2. Filter URL Baru
  const newUrls = sitemap.filter(url => !cache.has(url));

  if (newUrls.length === 0) {
    console.log("✅ No new URLs to submit.");
    return;
  }

  // Limit 1000 URL per batch agar tidak kena rate limit (429)
  const batch = newUrls.slice(0, 1000);
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: batch
  };

  console.log(`🚀 Submitting ${batch.length} URLs to ${PROVIDERS.length} providers...`);

  // 3. Kirim ke Semua Provider secara Paralel
  const requests = PROVIDERS.map(async (url) => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`✅ Success [${new URL(url).hostname}]`);
      } else {
        console.error(`❌ Failed [${new URL(url).hostname}]: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error(`💥 Error [${new URL(url).hostname}]:`, err.message);
    }
  });

  await Promise.all(requests);

  // 4. Update Cache (Hanya yang masuk batch)
  const updatedCache = [...Array.from(cache), ...batch].join("\n");
  writeFileSync(CACHE_FILE, updatedCache);
  console.log("💾 Cache updated.");
}

submitIndexNow();
