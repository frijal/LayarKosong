import { file as bunFile, write } from "bun";
import * as fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

// ========== CONFIG ==========
const ROOT_DIR = process.cwd();
const IMG_FOLDER = path.join(ROOT_DIR, "img");
const OUTPUT_FILE = path.join(IMG_FOLDER, "gambarnganggur.txt");
const CACHE_FILE = path.join(ROOT_DIR, "mini", "srcset-gambar.txt");

const ALLOWED_CATEGORIES = [
  "gaya-hidup",
  "jejak-sejarah",
  "lainnya",
  "olah-media",
  "opini-sosial",
  "sistem-terbuka",
  "warta-tekno",
];

const FORBIDDEN_CHARS = /[*:"<>|?]/g; 

interface ImageFile {
  fullPath: string;
  basename: string;
}

const usedBasenames = new Set<string>();

/**
 * Ambil semua file .webp dari folder img
 */
function getAllPhysicalImages(dir: string): ImageFile[] {
  let results: ImageFile[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllPhysicalImages(fullPath));
    } else if (entry.name.toLowerCase().endsWith(".webp")) {
      results.push({ fullPath, basename: entry.name });
    }
  }
  return results;
}

/**
 * Proteksi berbasis Cache Srcset
 */
function loadSrcsetCache() {
  if (fs.existsSync(CACHE_FILE)) {
    const cacheLines = fs.readFileSync(CACHE_FILE, "utf-8")
      .split("\n").map(l => l.trim()).filter(Boolean);

    for (const line of cacheLines) {
      const baseName = path.basename(line);
      const ext = path.extname(baseName);
      const nameSafe = path.basename(baseName, ext).replace(FORBIDDEN_CHARS, "-");
      usedBasenames.add(`${nameSafe}.webp`);
      usedBasenames.add(`${nameSafe}-sm.webp`);
    }
    console.log(`🛡️  Whitelist Cache: ${cacheLines.length} entri dilindungi.`);
  }
}

/**
 * Scan HTML di folder kategori
 */
async function scanCategoryFolders() {
  for (const category of ALLOWED_CATEGORIES) {
    const categoryPath = path.join(ROOT_DIR, category);
    if (!fs.existsSync(categoryPath)) continue;

    const files = fs.readdirSync(categoryPath);
    for (const fileName of files) {
      if (fileName.endsWith(".html") && fileName !== "index.html") {
        const fullPath = path.join(categoryPath, fileName);
        try {
          const content = await bunFile(fullPath).text();
          const matches = content.match(/([^/\\\"']+\.(?:webp|jpg|jpeg|png|gif|svg))/gi);

          if (matches) {
            matches.forEach(m => {
              const baseName = path.basename(m);
              const ext = path.extname(baseName);
              const nameSafe = path.basename(baseName, ext).replace(FORBIDDEN_CHARS, "-");

              usedBasenames.add(baseName);
              usedBasenames.add(`${nameSafe}.webp`);
              usedBasenames.add(`${nameSafe}-sm.webp`);
            });
          }
        } catch {
          console.warn(`⚠️  Gagal baca: ${fullPath}`);
        }
      }
    }
  }
}

async function runCleaner() {
  console.log("🚀 Memulai Pembersih WebP V10.2 + Orphan Detector...");

  const allImages = getAllPhysicalImages(IMG_FOLDER);
  if (allImages.length === 0) return console.log("📭 Tidak ada .webp.");

  loadSrcsetCache();
  await scanCategoryFolders();

  // --- LOGIKA BARU: DETEKSI FILE -SM.WEBP YATIM ---
  const orphanSmallFiles: string[] = [];
  const allBasenames = new Set(allImages.map(img => img.basename));

  for (const img of allImages) {
    if (img.basename.endsWith("-sm.webp")) {
      const parentName = img.basename.replace("-sm.webp", ".webp");
      // Jika file -sm ada tapi file .webp aslinya TIDAK ADA di folder img
      if (!allBasenames.has(parentName)) {
        orphanSmallFiles.push(img.fullPath);
      }
    }
  }

  if (orphanSmallFiles.length > 0) {
    console.log(`🕵️  Menemukan ${orphanSmallFiles.length} file '-sm.webp' yatim.`);
  }

  // --- GABUNGKAN HASIL ---
  const unusedFromHtml = allImages.filter(img => !usedBasenames.has(img.basename));
  
  // Gabungkan daftar hapus (Unused + Orphan), pastikan unik
  const toDeletePaths = new Set([
    ...unusedFromHtml.map(img => img.fullPath),
    ...orphanSmallFiles
  ]);

  if (toDeletePaths.size > 0) {
    const finalDeleteList = Array.from(toDeletePaths).sort();
    await write(OUTPUT_FILE, finalDeleteList.join("\n") + "\n");

    console.log(`🗑️  Total file akan dihapus: ${finalDeleteList.size}`);

    let cleanedCount = 0;
    for (const fullPath of finalDeleteList) {
      if (fs.existsSync(fullPath)) {
        try {
          console.log(`→ git rm ${fullPath}`);
          execSync(`git rm -f "${fullPath}"`, { stdio: "ignore" });
          cleanedCount++;
        } catch {
          console.error(`❌ Gagal hapus: ${fullPath}`);
        }
      }
    }
    console.log(`✨ Selesai! ${cleanedCount} file dibersihkan.`);
  } else {
    await write(OUTPUT_FILE, "");
    console.log("😎 Semua gambar aman, terpakai, dan punya keluarga lengkap.");
  }
}

runCleaner();
