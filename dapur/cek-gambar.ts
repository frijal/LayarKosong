import { file as bunFile, write } from "bun";
import * as fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

// ========== CONFIG ==========
const ROOT_DIR = process.cwd();
const IMG_FOLDER = path.join(ROOT_DIR, "img");
const OUTPUT_FILE = path.join(IMG_FOLDER, "gambarnganggur.txt");

const SKIP_FOLDERS = new Set([
  "node_modules",
  ".git",
  "img",
  "dapur",
  "sementara",
  "artikelx",
  "mini",
  "ext",
  ".github"
]);

interface ImageFile {
  fullPath: string;
  basename: string;
}

const usedBasenames = new Set<string>();

/**
 * Ambil SEMUA file .webp secara rekursif
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
      results.push({
        fullPath,
        basename: entry.name
      });
    }
  }

  return results;
}

/**
 * Scan semua file HTML dan kumpulkan referensi .webp
 */
async function walkAndScanHtml(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of files) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_FOLDERS.has(entry.name)) continue;
      await walkAndScanHtml(fullPath);
    } else if (entry.name.endsWith(".html")) {
      try {
        const content = await bunFile(fullPath).text();
        const matches = content.match(/([^/\\\"']+\.webp)/gi);

        if (matches) {
          matches.forEach(m =>
          usedBasenames.add(path.basename(m))
          );
        }
      } catch {
        console.warn(`⚠️ Gagal baca ${fullPath}`);
      }
    }
  }
}

async function runCleaner() {
  console.log("🚀 Memulai Deep Scan V10.0 (Bun CI Safe Mode)...");
  console.log("📍 Mode: Deterministic | Git Runner Compatible");

  // 1️⃣ Ambil semua gambar fisik
  const allImages = getAllPhysicalImages(IMG_FOLDER);

  if (allImages.length === 0) {
    console.log("📭 Tidak ada file .webp ditemukan.");
  }

  // 2️⃣ Scan referensi HTML
  await walkAndScanHtml(ROOT_DIR);

  // 3️⃣ Cari yang tidak terpakai
  const unused = allImages.filter(
    img => !usedBasenames.has(img.basename)
  );

  // 4️⃣ Eksekusi
  if (unused.length > 0) {
    const logContent =
    unused.map(img => img.fullPath).sort().join("\n") + "\n";

    await write(OUTPUT_FILE, logContent);

    console.log(
      `🗑️ Ditemukan ${unused.length} gambar tidak terpakai.`
    );

    let cleanedCount = 0;

    for (const img of unused) {
      if (fs.existsSync(img.fullPath)) {
        try {
          console.log(`→ git rm ${img.fullPath}`);
          execSync(`git rm -f "${img.fullPath}"`, {
            stdio: "ignore"
          });
          cleanedCount++;
        } catch {
          console.error(`❌ Gagal hapus ${img.fullPath}`);
        }
      }
    }

    console.log(`✨ Berhasil membersihkan ${cleanedCount} file.`);
  } else {
    await write(OUTPUT_FILE, "");
    console.log("😎 Aman! Semua gambar masih dipakai.");
  }
}

runCleaner();