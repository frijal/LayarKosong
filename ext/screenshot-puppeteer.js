// server-screenshot.js
// CI-safe, package.json-aligned, deterministic

import fs from "fs";
import path from "path";
import express from "express";
import puppeteer from "puppeteer";

const ROOT_DIR = process.cwd();
const ARTIKEL_DIR = path.join(ROOT_DIR, "artikel");
const IMG_DIR = path.join(ROOT_DIR, "img");

const EXT = "webp";
const PORT = Number(process.env.PORT) || 4173;
const BASE_URL = `http://localhost/artikel/`;

const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 630;

function startServer() {
  return new Promise((resolve, reject) => {
    const app = express();

    app.use((req, res, next) => {
      res.set("Cache-Control", "public, max-age=60");
      next();
    });

    app.use(express.static(ROOT_DIR));

    const server = app.listen(PORT, () => {
      console.log(`[🌐] Server lokal aktif di http://localhost:${PORT}`);
      resolve(server);
    });

    server.on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(ARTIKEL_DIR)) {
    throw new Error("Folder 'artikel/' tidak ditemukan.");
  }

  fs.mkdirSync(IMG_DIR, { recursive: true });

  // --- LOGIKA BARU: Baca daftar gambar nganggur ----
  const NGANGGUR_FILE = path.join(IMG_DIR, "gambarnganggur.txt");
  let gambarNganggur = [];

  if (fs.existsSync(NGANGGUR_FILE)) {
    const content = fs.readFileSync(NGANGGUR_FILE, "utf-8");
    // Pecah jadi array, bersihkan spasi/line break, dan ambil yang tidak kosong
    gambarNganggur = content.split("\n").map(name => name.trim()).filter(Boolean);
    console.log(`[📄] Terdeteksi ${gambarNganggur.length} nama file di gambarnganggur.txt`);
  }
  // -----------------------------------------------

  const files = fs.readdirSync(ARTIKEL_DIR).filter(f => f.endsWith(".html"));
  console.log(`🧭 ${files.length} artikel ditemukan`);

  if (files.length === 0) {
    console.log("ℹ️ Tidak ada artikel untuk diproses");
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
      // 1. Cek fisik file
      const isExist = fs.existsSync(outputPath);
      // 2. Cek apakah ada di daftar nganggur
      const isNganggur = gambarNganggur.includes(outputName);

      if (isExist || isNganggur) {
        const alasan = isExist ? "Fisik file sudah ada" : "Terdaftar di gambarnganggur.txt";
        console.log(`[⏭️] Skip ${outputName} (${alasan})`);
        continue;
      }
      // ----------------------------

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
          path: output,
          type: EXT,
          quality: 90,
        });

        console.log(`[📸] Disimpan: ${output}`);
      } catch (err) {
        console.error(`[❌] Gagal ${url}: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, 400));
    }

    console.log("🎉 Screenshot selesai");

  } finally {
    if (browser) await browser.close();
    server.close(() => console.log("[🛑] Server dihentikan"));
  }
}

main().catch(err => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(1);
});
