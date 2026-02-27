import fs from "node:fs";
import path from "node:path";
import http from "node:http"; // 🔥 Pakai bawaan Node.js
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT_DIR = process.cwd();
const ARTIKEL_DIR = path.join(ROOT_DIR, "artikel");
const IMG_DIR = path.join(ROOT_DIR, "img");

const EXT = "webp";
const PORT = Number(process.env.PORT) || 4173;
const BASE_URL = `http://localhost:${PORT}/artikel/`;

const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 630;

/**
 * Server lokal tanpa Express - Ringan & Tanpa Beban Dependency
 */
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Hilangkan query string kalau ada
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(ROOT_DIR, decodeURI(urlPath));

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("File tidak ditemukan");
          return;
        }
        
        // Cache Control biar Puppeteer nggak rewel
        res.setHeader("Cache-Control", "public, max-age=60");
        
        // Simpel MIME Type
        if (filePath.endsWith(".html")) res.setHeader("Content-Type", "text/html");
        if (filePath.endsWith(".css")) res.setHeader("Content-Type", "text/css");
        if (filePath.endsWith(".js")) res.setHeader("Content-Type", "application/javascript");
        
        res.writeHead(200);
        res.end(data);
      });
    });

    server.listen(PORT, () => {
      console.log(`[🌐] Server Native aktif di http://localhost:${PORT}`);
      resolve(server);
    });

    server.on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(ARTIKEL_DIR)) {
    throw new Error("Folder 'artikel/' tidak ditemukan.");
  }

  // Pastikan folder img ada
  if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
  }

  // --- LOGIKA FILTER: Baca daftar gambar nganggur ---
  const NGANGGUR_FILE = path.join(IMG_DIR, "gambarnganggur.txt");
  let gambarNganggur = [];
  
  if (fs.existsSync(NGANGGUR_FILE)) {
    try {
      const content = fs.readFileSync(NGANGGUR_FILE, "utf-8");
      // Pecah baris, hapus spasi, dan filter yang bukan kosong
      gambarNganggur = content.split("\n").map(name => name.trim()).filter(Boolean);
      console.log(`[📄] Memuat daftar pengecualian: ${gambarNganggur.length} file di gambarnganggur.txt`);
    } catch (err) {
      console.warn(`[⚠️] Gagal membaca ${NGANGGUR_FILE}: ${err.message}`);
    }
  }

  // Ambil semua daftar artikel
  const files = fs.readdirSync(ARTIKEL_DIR).filter(f => f.endsWith(".html"));
  console.log(`🧭 ${files.length} artikel ditemukan dalam antrean`);

  if (files.length === 0) {
    console.log("ℹ️ Tidak ada artikel untuk diproses.");
    return;
  }

  const server = await startServer();

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      defaultViewport: {
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
      },
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    for (const file of files) {
      const base = path.basename(file, ".html");
      const outputName = `${base}.${EXT}`;
      const outputPath = path.join(IMG_DIR, outputName);

      // --- LOGIKA FILTER GANDA ---
      const isExist = fs.existsSync(outputPath);
      const isNganggur = gambarNganggur.includes(outputName);

      if (isExist || isNganggur) {
        const alasan = isExist ? "Fisik file sudah ada" : "Masuk daftar 'gambarnganggur.txt'";
        console.log(`[⏭️] Skip ${outputName} (${alasan})`);
        continue;
      }

      const url = `${BASE_URL}${base}.html`;
      console.log(`[🔍] Render ${url}`);

      try {
        const response = await page.goto(url, {
          waitUntil: ["load", "networkidle2"],
          timeout: 45000,
        });

        if (!response || response.status() !== 200) {
          console.warn(`[⚠️] Status ${response?.status()} untuk ${url}`);
          continue;
        }

        await page.screenshot({
          path: outputPath,
          type: EXT,
          quality: 90,
        });

        console.log(`[📸] Disimpan: ${outputName}`);
      } catch (err) {
        console.error(`[❌] Gagal memproses ${url}: ${err.message}`);
      }

      // Delay kecil agar server tidak overload
      await new Promise(r => setTimeout(r, 400));
    }

    console.log("🎉 Proses screenshot selesai.");

  } finally {
    if (browser) await browser.close();
    server.close(() => console.log("[🛑] Server lokal dihentikan"));
  }
}

main().catch(err => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(1);
});
