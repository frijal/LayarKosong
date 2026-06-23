import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const HOST = "dalam.web.id";
const ORIGIN = `https://${HOST}`;
const KEY = process.env.INDEXNOW_KEY;

const SITEMAP_FILE = "./sitemap.txt";
const CACHE_FILE = "./mini/indexnow-cache.txt";

// Aman. IndexNow mendukung sampai 10.000 URL per POST.
// 700 tetap konservatif agar tidak terlalu agresif.
const BATCH_SIZE = 700;

// Cukup pakai endpoint global IndexNow.
// Submission akan dibagikan ke search engine IndexNow yang berpartisipasi.
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

// Jeda antar batch dalam milidetik.
const BATCH_DELAY_MS = 2000;

function readLines(filePath: string): string[] {
  if (!existsSync(filePath)) return [];

  return readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function uniqueUrls(urls: string[]): string[] {
  return Array.from(new Set(urls));
}

function isValidOwnUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "https:" &&
      parsed.hostname === HOST &&
      parsed.href.startsWith(`${ORIGIN}/`)
    );
  } catch {
    return false;
  }
}

function ensureCacheDir(): void {
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
}

function saveCache(cache: Set<string>): void {
  ensureCacheDir();
  writeFileSync(CACHE_FILE, Array.from(cache).sort().join("\n") + "\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function submitBatch(batch: string[], batchNumber: number, totalBatches: number): Promise<boolean> {
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: `${ORIGIN}/${KEY}.txt`,
    urlList: batch
  };

  console.log(`\n📦 Memproses Batch ${batchNumber}/${totalBatches} (${batch.length} URL)...`);

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text().catch(() => "");

    if (response.status === 200 || response.status === 202) {
      console.log(`   ✅ Success [${new URL(INDEXNOW_ENDPOINT).hostname}]: ${response.status}`);
      return true;
    }

    console.error(`   ❌ Failed [${new URL(INDEXNOW_ENDPOINT).hostname}]: ${response.status}`);
    if (text) console.error(`   ↳ Response: ${text}`);

    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`   💥 Error [${new URL(INDEXNOW_ENDPOINT).hostname}]: ${message}`);
    return false;
  }
}

async function submitIndexNow(): Promise<void> {
  if (!KEY) {
    throw new Error("INDEXNOW_KEY is missing!");
  }

  const sitemapUrls = uniqueUrls(readLines(SITEMAP_FILE));
  const cache = new Set<string>(readLines(CACHE_FILE));

  const validUrls = sitemapUrls.filter(isValidOwnUrl);
  const skippedUrls = sitemapUrls.length - validUrls.length;

  if (skippedUrls > 0) {
    console.log(`⚠️ ${skippedUrls} baris dilewati karena bukan URL valid milik ${ORIGIN}.`);
  }

  const newUrls = validUrls.filter((url) => !cache.has(url));

  if (newUrls.length === 0) {
    console.log("✅ Tidak ada URL baru.");
    return;
  }

  console.log(`📂 Total URL valid di sitemap: ${validUrls.length}`);
  console.log(`🆕 Total URL baru ditemukan: ${newUrls.length}`);

  const totalBatches = Math.ceil(newUrls.length / BATCH_SIZE);
  let successBatches = 0;
  let failedBatches = 0;
  let submittedUrls = 0;

  for (let i = 0; i < newUrls.length; i += BATCH_SIZE) {
    const batch = newUrls.slice(i, i + BATCH_SIZE);
    const currentBatchNumber = Math.floor(i / BATCH_SIZE) + 1;

    const ok = await submitBatch(batch, currentBatchNumber, totalBatches);

    if (ok) {
      batch.forEach((url) => cache.add(url));
      saveCache(cache);

      successBatches++;
      submittedUrls += batch.length;

      console.log(`   💾 Cache diperbarui untuk ${batch.length} URL.`);
    } else {
      failedBatches++;
      console.log("   ⚠️ Batch gagal, URL tidak dimasukkan ke cache agar bisa dicoba ulang nanti.");
    }

    if (i + BATCH_SIZE < newUrls.length) {
      console.log(`   ⏳ Menunggu ${BATCH_DELAY_MS / 1000} detik sebelum batch berikutnya...`);
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log("\n✨ Semua proses selesai!");
  console.log(`✅ Batch sukses: ${successBatches}`);
  console.log(`❌ Batch gagal: ${failedBatches}`);
  console.log(`📨 URL berhasil dikirim dan masuk cache: ${submittedUrls}`);

  if (failedBatches > 0) {
    process.exitCode = 1;
  }
}

submitIndexNow().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`\n💥 Fatal Error:\n${message}`);
  process.exit(1);
});
