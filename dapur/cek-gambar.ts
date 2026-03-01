import { file as bunFile, write, existsSync, readdirSync, lstatSync } from "bun";
import { execSync } from "node:child_process";
import path from "node:path";

// ========== CONFIG ==========
const IMG_FOLDER = './img/';
const OUTPUT_FILE = './img/gambarnganggur.txt';
const SKIP_FOLDERS = new Set(['node_modules', '.git', 'img', 'sementara', 'artikelx', 'mini', 'ext', '.github']);

interface ImageFile {
  fullPath: string;
  basename: string;
}

const usedBasenames = new Set<string>();

/**
 * Fungsi Rekursif untuk ambil SEMUA .webp di dalam img/ sub-sub-sub folder
 */
function getAllPhysicalImages(dir: string): ImageFile[] {
  let results: ImageFile[] = [];
  if (!existsSync(dir)) return results;

  const list = readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllPhysicalImages(res));
    } else if (entry.name.toLowerCase().endsWith('.webp')) {
      results.push({
        fullPath: res,
        basename: entry.name
      });
    }
  }
  return results;
}

/**
 * Fungsi Rekursif untuk scan referensi di semua file .html
 */
async function walkAndScanHtml(dir: string): Promise<void> {
  const files = readdirSync(dir, { withFileTypes: true });

  for (const entry of files) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_FOLDERS.has(entry.name)) continue;
      await walkAndScanHtml(fullPath);
    } else if (entry.name.endsWith('.html')) {
      try {
        const content = await bunFile(fullPath).text();
        // Regex untuk mencari nama file .webp di dalam atribut src, content, dsb
        const matches = content.match(/([^/\\"\']+\.webp)/ig);
        if (matches) {
          matches.forEach(m => usedBasenames.add(path.basename(m)));
        }
      } catch (e) {
        console.warn(`⚠️ Gagal baca ${fullPath}`);
      }
    }
  }
}

async function runCleaner() {
  console.log('🚀 Memulai Deep Scan V10.0 (Bun Recursive Mode)...');
  console.log('📍 Lokasi: Balikpapan | Status: Cleaning Mode ON');

  // 1. Ambil semua gambar fisik (Deep Dive)
  const allImages = getAllPhysicalImages(IMG_FOLDER);

  // 2. Cari semua yang terpakai di HTML (Async)
  await walkAndScanHtml('./');

  // 3. Filter: Cari yang fisiknya ada tapi namanya TIDAK ADA di daftar referensi HTML
  const unused = allImages.filter(img => !usedBasenames.has(img.basename));

  // 4. Eksekusi
  if (unused.length > 0) {
    const logContent = unused.map(img => img.fullPath).sort().join('\n') + '\n';
    await write(OUTPUT_FILE, logContent);

    console.log(`✅ Ditemukan ${unused.length} gambar nganggur di kedalaman folder.`);

    let cleanedCount = 0;
    for (const img of unused) {
      if (existsSync(img.fullPath)) {
        try {
          console.log(`→ Git RM: ${img.fullPath}`);
          // Gunakan execSync untuk memastikan operasi git selesai sebelum lanjut
          execSync(`git rm -f "${img.fullPath}"`, { stdio: 'ignore' });
          cleanedCount++;
        } catch (err) {
          console.error(`❌ Gagal hapus ${img.fullPath}`);
        }
      }
    }
    console.log(`\n✨ Successfully cleaned ${cleanedCount} files from various depths.`);
  } else {
    await write(OUTPUT_FILE, '');
    console.log("😎 Aman! Semua gambar di semua subfolder terpakai.");
  }
}

runCleaner();
