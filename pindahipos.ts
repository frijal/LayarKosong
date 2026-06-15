import { file as bunFile, write } from "bun";
import * as fs from "node:fs";
import path from "node:path";

// ========== CONFIG ==========
const ROOT_DIR = process.cwd();

// true  = hanya simulasi, file tidak ditulis
// false = file benar-benar diubah
const DRY_RUN = false;

// Folder yang tidak perlu dipindai
const EXCLUDED_DIRS = new Set([
  ".git",
  ".github",
  ".vscode",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".wrangler",
  ".vercel",
  ".netlify",
  "vendor",
  "coverage",
]);

const IPOS_DIV_CANONICAL = `<div id=iposbrowser></div>`;

/**
 * Guard:
 * Cek apakah file punya id=iposbrowser.
 *
 * Mendukung:
 * id=iposbrowser
 * id="iposbrowser"
 * id='iposbrowser'
 */
const HAS_IPOSBROWSER_REGEX =
  /\bid\s*=\s*(?:"iposbrowser"|'iposbrowser'|iposbrowser\b)/i;

/**
 * Target pola:
 *
 * <h1 ...>...</h1><div id=iposbrowser></div>
 *
 * Akan diubah menjadi:
 *
 * <div id=iposbrowser></div><h1 ...>...</h1>
 *
 * Mendukung variasi:
 * <div id=iposbrowser></div>
 * <div id="iposbrowser"></div>
 * <div id='iposbrowser'></div>
 * <div class="x" id="iposbrowser"></div>
 */
const H1_THEN_IPOS_REGEX =
  /(<h1\b[^>]*>[\s\S]*?<\/h1>)\s*<div\b(?=[^>]*\bid\s*=\s*(?:"iposbrowser"|'iposbrowser'|iposbrowser\b))[^>]*>\s*<\/div>/gi;

/**
 * Ambil semua file .html secara rekursif dari root repo.
 */
function getHtmlFilesRecursive(dir: string): string[] {
  let results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;

      results = results.concat(getHtmlFilesRecursive(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Pindahkan <div id=iposbrowser></div>
 * dari setelah </h1> menjadi sebelum <h1>.
 */
function moveIposBeforeH1(content: string): {
  changed: boolean;
  output: string;
  reason?: string;
} {
  // Pastikan file memang punya iposbrowser.
  // Kalau tidak ada, file langsung dilewati.
  if (!HAS_IPOSBROWSER_REGEX.test(content)) {
    return {
      changed: false,
      output: content,
      reason: "tidak ada iposbrowser",
    };
  }

  const output = content.replace(
    H1_THEN_IPOS_REGEX,
    `${IPOS_DIV_CANONICAL}$1`
  );

  if (output === content) {
    return {
      changed: false,
      output: content,
      reason: "iposbrowser ada, tapi pola tidak cocok",
    };
  }

  return {
    changed: true,
    output,
  };
}

async function run() {
  console.log("🚀 Memindahkan <div id=iposbrowser></div> ke depan <h1>...");
  console.log(`📁 Root repo: ${ROOT_DIR}`);
  console.log(`🧪 DRY_RUN: ${DRY_RUN ? "aktif" : "nonaktif"}`);
  console.log("");

  const htmlFiles = getHtmlFilesRecursive(ROOT_DIR);

  if (htmlFiles.length === 0) {
    console.log("📭 Tidak ada file HTML ditemukan.");
    return;
  }

  console.log(`📄 Total HTML ditemukan: ${htmlFiles.length}`);
  console.log("");

  let changedCount = 0;
  let skippedNoIpos = 0;
  let skippedNoPattern = 0;

  const changedPaths: string[] = [];
  const skippedNoPatternPaths: string[] = [];

  for (const fullPath of htmlFiles) {
    const relativePath = path.relative(ROOT_DIR, fullPath);

    let content = "";

    try {
      content = await bunFile(fullPath).text();
    } catch {
      console.warn(`⚠️  Gagal baca: ${relativePath}`);
      continue;
    }

    const result = moveIposBeforeH1(content);

    if (!result.changed) {
      if (result.reason === "tidak ada iposbrowser") {
        skippedNoIpos++;
      } else {
        skippedNoPattern++;
        skippedNoPatternPaths.push(relativePath);
        console.log(`⏭️  Lewati: ${relativePath} — ${result.reason}`);
      }

      continue;
    }

    changedCount++;
    changedPaths.push(relativePath);

    if (DRY_RUN) {
      console.log(`DRY RUN → ${relativePath}`);
    } else {
      try {
        await write(fullPath, result.output);
        console.log(`✅ Update → ${relativePath}`);
      } catch {
        console.error(`❌ Gagal tulis: ${relativePath}`);
      }
    }
  }

  console.log("");
  console.log("✨ Selesai.");
  console.log(`✅ File berubah: ${changedCount}`);
  console.log(`🚫 File tanpa iposbrowser dilewati: ${skippedNoIpos}`);
  console.log(`⏭️  File punya iposbrowser tapi pola tidak cocok: ${skippedNoPattern}`);

  if (changedPaths.length > 0) {
    console.log("");
    console.log("📌 Daftar file yang cocok dan akan/berhasil diubah:");

    for (const filePath of changedPaths) {
      console.log(`- ${filePath}`);
    }
  }

  if (skippedNoPatternPaths.length > 0) {
    console.log("");
    console.log("📌 Daftar file punya iposbrowser tapi pola tidak cocok:");

    for (const filePath of skippedNoPatternPaths) {
      console.log(`- ${filePath}`);
    }
  }

  if (DRY_RUN) {
    console.log("");
    console.log("🧪 DRY_RUN masih aktif. Belum ada file yang ditulis.");
    console.log("Ubah DRY_RUN menjadi false kalau hasilnya sudah cocok.");
  }
}

run();
