import { file as bunFile, write, Glob } from "bun";
import * as fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

// ========== CONFIG ==========
const ROOT_DIR = process.cwd();
const IMG_FOLDER = path.join(ROOT_DIR, "img");
const OUTPUT_FILE = path.join(IMG_FOLDER, "gambarnganggur.txt");
const CACHE_FILE = path.join(ROOT_DIR, "mini", "srcset-gambar.txt");
const ARTIKEL_LITE_FILE = path.join(ROOT_DIR, "artikel-lite.json");

// Ubah ke false kalau mau langsung eksekusi hapus file via Git
const DRY_RUN = false;

// 🔥 7 folder kategori — HANYA dipakai untuk mengecualikan index.html di dalamnya.
const CATEGORY_FOLDERS_FOR_INDEX_EXCLUSION = [
  "gaya-hidup",
  "jejak-sejarah",
  "lainnya",
  "olah-media",
  "opini-sosial",
  "sistem-terbuka",
  "warta-tekno",
];

// 🔥 Folder yang dikecualikan total dari scan HTML
const EXCLUDED_DIR_NAMES = new Set([
  ".cache",
  ".git",
  ".github",
  ".wrangler",
  "artikelx",
  "build",
  "dapur",
  "dist",
  "ext",
  "functions",
  "mini",
  "node_modules",
  "search",
  "sementara",
  path.basename(IMG_FOLDER), // "img" — folder gambar sendiri, gak ada HTML-nya
]);

// Semua ekstensi gambar yang akan dicek di folder img/
const IMAGE_EXTENSIONS = [
  ".webp",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
  ".avif",
  ".ico",
  ".bmp",
  ".tif",
  ".tiff",
];

// 🔥 Varian hasil resize/generator yang ikut dilindungi secara UMUM
const VARIANT_SUFFIXES = ["-sm", "-md"];

const FORBIDDEN_CHARS = /[*:"<>|?]/g;

const IMAGE_EXT_PATTERN = IMAGE_EXTENSIONS
  .map((ext) => ext.replace(".", ""))
  .join("|");

// 🔥 FIX #1: exclude \s dan , — biar srcset multi-entry
//    "artikel-md.webp 720w, artikel-sm.webp 400w" gak ke-gado jadi 1 match sampah,
//    tapi kepecah bersih jadi 2 match terpisah.
// 🔥 FIX #2: exclude ( dan ) — biar CSS "url(foto.jpg)" tanpa quote gak nempelin
//    prefix "url(" ke depan nama file pas di-capture.
const IMAGE_REF_REGEX = new RegExp(
  String.raw`([^/\\\"'\s,()]+\.(?:${IMAGE_EXT_PATTERN}))`,
  "gi"
);

const IMAGE_GLOB_PATTERN = `**/*.{${IMAGE_EXTENSIONS.map((ext) => ext.slice(1)).join(",")}}`;
const HTML_GLOB_PATTERN = "**/*.html";

interface ImageFile {
  fullPath: string;
  basename: string;
}

const usedBasenames = new Set<string>();

/**
 * Mengambil semua file gambar dari folder img secara rekursif pakai Bun.Glob
 */
async function getAllPhysicalImages(dir: string): Promise<ImageFile[]> {
  if (!fs.existsSync(dir)) return [];

  const glob = new Glob(IMAGE_GLOB_PATTERN);
  const results: ImageFile[] = [];

  for await (const relativePath of glob.scan({ cwd: dir, onlyFiles: true, dot: false })) {
    const fullPath = path.join(dir, relativePath);
    results.push({ fullPath, basename: path.basename(fullPath) });
  }

  return results;
}

/**
 * Lindungi nama gambar yang ditemukan.
 */
function protectImageReference(ref: string) {
  const cleanRef = ref.split("?")[0].split("#")[0];
  const baseName = path.basename(cleanRef);
  const ext = path.extname(baseName).toLowerCase();

  if (!IMAGE_EXTENSIONS.includes(ext)) return;

  const rawName = path.basename(baseName, path.extname(baseName));
  const nameSafe = rawName.replace(FORBIDDEN_CHARS, "-");

  // Lindungi nama asli sebagaimana muncul di HTML/cache
  usedBasenames.add(baseName);

  // Lindungi versi ekstensi lowercase
  usedBasenames.add(`${nameSafe}${ext}`);

  // Lindungi versi WebP utama
  usedBasenames.add(`${nameSafe}.webp`);

  // 🔥 Lindungi varian resize umum (-sm, -md)
  for (const suffix of VARIANT_SUFFIXES) {
    usedBasenames.add(`${nameSafe}${suffix}${ext}`);
    if (ext !== ".webp") {
      usedBasenames.add(`${nameSafe}${suffix}.webp`);
    }
  }
}

/**
 * Proteksi berbasis Cache Srcset
 */
function loadSrcsetCache() {
  if (!fs.existsSync(CACHE_FILE)) return;

  const cacheLines = fs
    .readFileSync(CACHE_FILE, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of cacheLines) {
    protectImageReference(line);
  }

  console.log(`🛡️  Whitelist Cache: ${cacheLines.length} entri dilindungi.`);
}

/**
 * Proteksi khusus untuk thumbnail -rg berbasis artikel-lite.json
 */
function loadArtikelLite() {
  if (!fs.existsSync(ARTIKEL_LITE_FILE)) {
    console.warn(`⚠️  File ${ARTIKEL_LITE_FILE} tidak ditemukan. Semua varian -rg mungkin akan disapu bersih!`);
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(ARTIKEL_LITE_FILE, "utf-8"));
    let protectedCount = 0;

    for (const kategori in data) {
      const daftarArtikel = data[kategori];

      if (Array.isArray(daftarArtikel)) {
        for (const artikel of daftarArtikel) {
          if (Array.isArray(artikel) && artikel.length > 2 && typeof artikel[2] === "string") {
            const imageUrl = artikel[2];

            const cleanRef = imageUrl.split("?")[0].split("#")[0];
            const baseName = path.basename(cleanRef);
            const rawName = path.basename(baseName, path.extname(baseName));
            const nameSafe = rawName.replace(FORBIDDEN_CHARS, "-");

            // KHUSUS meloloskan file -rg.avif ke dalam whitelist
            usedBasenames.add(`${nameSafe}-rg.avif`);
            protectedCount++;
          }
        }
      }
    }

    console.log(`🛡️  Whitelist Related Grid: ${protectedCount} varian -rg.avif dilindungi dari artikel-lite.json.`);
  } catch (e) {
    console.error(`❌ Gagal membaca ${ARTIKEL_LITE_FILE}:`, e);
  }
}

/**
 * Cek apakah sebuah file HTML adalah index.html yang berada
 * DI DALAM salah satu folder kategori.
 */
function isExcludedCategoryIndex(fullPath: string): boolean {
  if (path.basename(fullPath) !== "index.html") return false;

  const relativePath = path.relative(ROOT_DIR, fullPath);
  const segments = relativePath.split(path.sep);

  return CATEGORY_FOLDERS_FOR_INDEX_EXCLUSION.includes(segments[0]);
}

/**
 * Kumpulkan semua .html di seluruh repo pakai Bun.Glob.
 */
async function getAllHtmlFilesInRepo(dir: string): Promise<string[]> {
  if (!fs.existsSync(dir)) return [];

  const results: string[] = [];
  const htmlGlob = new Glob(HTML_GLOB_PATTERN);
  const topLevelEntries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of topLevelEntries) {
    if (entry.isFile() && entry.name.endsWith(".html")) {
      const fullPath = path.join(dir, entry.name);
      if (!isExcludedCategoryIndex(fullPath)) results.push(fullPath);
      continue;
    }

    if (entry.isDirectory()) {
      if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;

      const subDir = path.join(dir, entry.name);

      for await (const relativePath of htmlGlob.scan({ cwd: subDir, onlyFiles: true, dot: false })) {
        const segments = relativePath.split("/");
        if (segments.some((seg) => EXCLUDED_DIR_NAMES.has(seg))) continue;

        const fullPath = path.join(subDir, relativePath);
        if (isExcludedCategoryIndex(fullPath)) continue;

        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Ekstraksi gambar murni menggunakan Regex.
 * Super cepat, ringan, dan menangkap semua teks yang berakhiran
 * ekstensi gambar (meskipun ada di dalam custom tag atau script).
 */
function extractImageRefsFromHtml(html: string): string[] {
  const matches = html.match(IMAGE_REF_REGEX);
  return matches ? Array.from(matches) : [];
}

/**
 * Baca satu file HTML dan ekstrak referensinya
 */
async function scanHtmlFile(fullPath: string) {
  try {
    const content = await bunFile(fullPath).text();
    const matches = extractImageRefsFromHtml(content);

    for (const match of matches) {
      protectImageReference(match);
    }
  } catch {
    console.warn(`⚠️  Gagal baca: ${fullPath}`);
  }
}

/**
 * Scan seluruh HTML
 */
async function scanEntireRepoForHtml() {
  const htmlFiles = await getAllHtmlFilesInRepo(ROOT_DIR);

  if (htmlFiles.length > 0) {
    console.log(`📂 Seluruh repo: ${htmlFiles.length} file HTML dipindai (Regex) untuk proteksi gambar.`);
  }

  for (const fullPath of htmlFiles) {
    await scanHtmlFile(fullPath);
  }
}

/**
 * Deteksi file varian (-sm, -md) yang yatim (induknya gak ada)
 */
function findOrphanVariants(allImages: ImageFile[]): string[] {
  const orphanFiles: string[] = [];

  const allBasenamesLower = new Set(allImages.map((img) => img.basename.toLowerCase()));

  for (const img of allImages) {
    const lowerName = img.basename.toLowerCase();
    const ext = path.extname(lowerName);

    if (!IMAGE_EXTENSIONS.includes(ext)) continue;

    for (const suffix of VARIANT_SUFFIXES) {
      const variantEnding = `${suffix}${ext}`;

      if (lowerName.endsWith(variantEnding)) {
        const lowerRawName = lowerName.slice(0, -variantEnding.length);

        let hasParent = false;

        for (const parentExt of IMAGE_EXTENSIONS) {
          if (allBasenamesLower.has(`${lowerRawName}${parentExt}`)) {
            hasParent = true;
            break;
          }
        }

        if (!hasParent) {
          orphanFiles.push(img.fullPath);
        }

        break;
      }
    }
  }

  return orphanFiles;
}

async function runCleaner() {
  console.log("🚀 Memulai Pembersih Gambar (Bun.Glob + Regex String Scanner)...");

  const allImages = await getAllPhysicalImages(IMG_FOLDER);

  if (allImages.length === 0) {
    return console.log("📭 Tidak ada file gambar di folder img.");
  }

  console.log(`🖼️  Total gambar fisik ditemukan: ${allImages.length}`);

  // 1. Load perlindungan dari cache srcset
  loadSrcsetCache();

  // 2. Load perlindungan khusus -rg dari JSON
  loadArtikelLite();

  // 3. Scan SELURUH .html di repo
  await scanEntireRepoForHtml();

  // 4. Deteksi gambar varian yang yatim
  const orphanVariantFiles = findOrphanVariants(allImages);

  if (orphanVariantFiles.length > 0) {
    console.log(
      `🕵️  Menemukan ${orphanVariantFiles.length} file varian (-sm/-md) yatim.`
    );
  }

  // Filter utama: Cek apakah basename gambar fisik ada di Set perlindungan (usedBasenames)
  const unusedFromHtml = allImages.filter(
    (img) => !usedBasenames.has(img.basename)
  );

  const toDeletePaths = new Set<string>([
    ...unusedFromHtml.map((img) => img.fullPath),
    ...orphanVariantFiles,
  ]);

  if (toDeletePaths.size > 0) {
    const finalDeleteList = Array.from(toDeletePaths).sort();

    await write(OUTPUT_FILE, finalDeleteList.join("\n") + "\n");

    console.log(`🗑️  Total file akan dihapus: ${finalDeleteList.length}`);
    console.log(`📝 Daftar ditulis ke: ${OUTPUT_FILE}`);

    let cleanedCount = 0;

    for (const fullPath of finalDeleteList) {
      if (!fs.existsSync(fullPath)) continue;

      try {
        if (DRY_RUN) {
          console.log(`DRY RUN → git rm ${fullPath}`);
        } else {
          console.log(`→ git rm ${fullPath}`);

          execFileSync("git", ["rm", "-f", fullPath], {
            stdio: "ignore",
          });
        }

        cleanedCount++;
      } catch {
        console.error(`❌ Gagal hapus: ${fullPath}`);
      }
    }

    if (DRY_RUN) {
      console.log(
        `🧪 Dry run selesai. ${cleanedCount} file terdeteksi, belum dihapus.`
      );
    } else {
      console.log(`✨ Selesai! ${cleanedCount} file dibersihkan.`);
    }
  } else {
    await write(OUTPUT_FILE, "");
    console.log("😎 Semua gambar aman, terpakai, dan punya keluarga lengkap.");
  }
}

runCleaner();
