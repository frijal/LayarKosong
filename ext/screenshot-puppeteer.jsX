// server-screenshot.js
import fs from "fs";
import path from "path";
import express from "express";
import puppeteer from "puppeteer";

const ROOT_DIR = process.cwd();          // melayani seluruh repo
const ARTIKEL_DIR = path.join(ROOT_DIR, "artikel");
const IMG_DIR = path.join(ROOT_DIR, "img");
const EXT = "webp";                      // bisa "jpeg"
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/artikel/`;

const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 630;

function startServer() {
  return new Promise((resolve, reject) => {
    const app = express();

    // Cache statis ringan (opsional)
    app.use((req, res, next) => {
      res.set("Cache-Control", "public, max-age=60");
      next();
    });

    // Layani semua file dari root repo (CSS/JS/img relatif akan ditemukan)
    app.use(express.static(ROOT_DIR));

    const server = app.listen(PORT, () => {
      console.log(`[🌐] Server lokal berjalan di http://localhost:${PORT}`);
      resolve(server);
    });

    server.on("error", reject);
  });
}

async function takeScreenshot(url, outputPath) {
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: TARGET_WIDTH, height: TARGET_HEIGHT },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    if (!response || response.status() !== 200) {
      console.error(`[❌] Gagal memuat ${url} (status ${response?.status()})`);
      return;
    }

    await page.screenshot({
      path: outputPath,
      type: EXT === "webp" ? "webp" : "jpeg",
      quality: 90,
    });
    console.log(`[✅] Screenshot (${TARGET_WIDTH}x${TARGET_HEIGHT}) disimpan: ${outputPath}`);
  } catch (err) {
    console.error(`[⚠️] Gagal screenshot ${url}: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  // Mulai server lokal
  const server = await startServer();

  try {
    if (!fs.existsSync(ARTIKEL_DIR)) {
      console.error(`[FATAL] Folder 'artikel/' tidak ditemukan.`);
      process.exit(1);
    }
    if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

    const files = fs.readdirSync(ARTIKEL_DIR).filter(f => f.endsWith(".html"));
    console.log(`🧭 Menemukan ${files.length} artikel...`);

    for (const file of files) {
      const base = path.basename(file, ".html");
      const output = path.join(IMG_DIR, `${base}.${EXT}`);

      if (fs.existsSync(output)) {
        console.log(`[⏭️] Lewati ${output} (sudah ada)`);
        continue;
      }

      const url = `${BASE_URL}${base}.html`;
      await takeScreenshot(url, output);

      // Delay ringan antar screenshot
      await new Promise(r => setTimeout(r, 800));
    }
    console.log("🎉 Semua screenshot selesai diproses!");
  } catch (err) {
    console.error(`[FATAL] ${err.message}`);
  } finally {
    // Tutup server
    server.close(() => console.log("[🛑] Server lokal ditutup."));
  }
}

main();
