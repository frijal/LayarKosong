import { file as bunFile, write } from "bun";
import * as fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

// ========== CONFIG ==========
const ROOT_DIR = process.cwd();
const IMG_FOLDER = path.join(ROOT_DIR, "img");
const OUTPUT_FILE = path.join(IMG_FOLDER, "gambarnganggur.txt");
const CACHE_FILE = path.join(ROOT_DIR, "mini", "srcset-gambar.txt");
const ARTIKEL_LITE_FILE = path.join(ROOT_DIR, "artikel-lite.json"); // 🔥 Target baru Tukang Sapu

// Ubah ke true kalau mau tes dulu tanpa benar-benar menghapus file
const DRY_RUN = false;

const ALLOWED_CATEGORIES = [
  "gaya-hidup",
  "jejak-sejarah",
  "lainnya",
  "olah-media",
  "opini-sosial",
  "sistem-terbuka",
  "warta-tekno",
];

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

// Varian WebP hasil resize/generator yang ikut dilindungi secara UMUM
// 🔥 CATATAN: -rg TIDAK dimasukkan ke sini agar tidak dilindungi secara buta.
const WEBP_VARIANT_SUFFIXES = ["-sm", "-md"];

const FORBIDDEN_CHARS = /[*:"<>|?]/g;

const IMAGE_EXT_PATTERN = IMAGE_EXTENSIONS
  .map((ext) => ext.replace(".", ""))
  .join("|");

const IMAGE_REF_REGEX = new RegExp(
  String.raw`([^/\\\"']+\.(?:${IMAGE_EXT_PATTERN}))`,
  "gi"
);

interface ImageFile {
  fullPath: string;
  basename: string;
}

const usedBasenames = new Set<string>();

/**
 * Cek apakah file termasuk ekstensi gambar yang dipantau
 */
function isImageFile(fileName: string): boolean {
  return IMAGE_EXTENSIONS.includes(path.extname(fileName).toLowerCase());
}

/**
 * Ambil semua file gambar dari folder img secara rekursif
 */
function getAllPhysicalImages(dir: string): ImageFile[] {
  let results: ImageFile[] = [];

  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(getAllPhysicalImages(fullPath));
    } else if (isImageFile(entry.name)) {
      results.push({
        fullPath,
        basename: entry.name,
      });
    }
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

  // Lindungi varian resize WebP umum (-sm, -md)
  for (const suffix of WEBP_VARIANT_SUFFIXES) {
    usedBasenames.add(`${nameSafe}${suffix}.webp`);
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
 * 🔥 DIPERBAIKI: Proteksi khusus untuk thumbnail -rg berbasis artikel-lite.json
 * Fungsi ini membaca array artikel dan HANYA melindungi varian -rg untuk gambar yang terdaftar di indeks [2].
 */
function loadArtikelLite() {
  if (!fs.existsSync(ARTIKEL_LITE_FILE)) {
    console.warn(`⚠️  File ${ARTIKEL_LITE_FILE} tidak ditemukan. Semua varian -rg mungkin akan disapu bersih!`);
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(ARTIKEL_LITE_FILE, "utf-8"));
    let protectedCount = 0;

    // Iterasi setiap kategori (keys) di dalam objek JSON
    for (const kategori in data) {
      const daftarArtikel = data[kategori];

      // Pastikan valuenya adalah array
      if (Array.isArray(daftarArtikel)) {
        for (const artikel of daftarArtikel) {
          // Cek apakah item ini array dan minimal punya 3 elemen (karena indeks [2] adalah URL gambar)
          if (Array.isArray(artikel) && artikel.length > 2 && typeof artikel[2] === "string") {
            const imageUrl = artikel[2];
            
            // Bersihkan URL dan ambil nama filenya
            const cleanRef = imageUrl.split("?")[0].split("#")[0];
            const baseName = path.basename(cleanRef);
            const rawName = path.basename(baseName, path.extname(baseName));
            const nameSafe = rawName.replace(FORBIDDEN_CHARS, "-");

            // KHUSUS meloloskan file -rg.webp ke dalam whitelist
            usedBasenames.add(`${nameSafe}-rg.webp`);
            protectedCount++;
          }
        }
      }
    }

    console.log(`🛡️  Whitelist Related Grid: ${protectedCount} varian -rg.webp dilindungi dari artikel-lite.json.`);
  } catch (e) {
    console.error(`❌ Gagal membaca ${ARTIKEL_LITE_FILE}:`, e);
  }
}

/**
 * Ambil semua HTML secara rekursif dari folder tertentu
 */
function getHtmlFilesRecursive(dir: string, excludeIndex = false): string[] {
  let results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(getHtmlFilesRecursive(fullPath, excludeIndex));
    } else if (
      entry.name.endsWith(".html") &&
      !(excludeIndex && entry.name === "index.html")
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Scan file HTML yang berada langsung di root repo.
 */
async function scanRootHtmlFiles() {
  if (!fs.existsSync(ROOT_DIR)) return;

  const list = fs.readdirSync(ROOT_DIR, { withFileTypes: true });

  const rootHtmlFiles = list
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => path.join(ROOT_DIR, entry.name));

  if (rootHtmlFiles.length > 0) {
    console.log(`🏠 Root HTML: ${rootHtmlFiles.length} file akan dipindai.`);
  }

  for (const fullPath of rootHtmlFiles) {
    await scanHtmlFile(fullPath);
  }
}

/**
 * Scan HTML di folder kategori
 */
async function scanCategoryFolders() {
  for (const category of ALLOWED_CATEGORIES) {
    const categoryPath = path.join(ROOT_DIR, category);

    if (!fs.existsSync(categoryPath)) continue;

    // index.html di folder kategori tetap diabaikan
    const htmlFiles = getHtmlFilesRecursive(categoryPath, true);

    if (htmlFiles.length > 0) {
      console.log(`📂 ${category}: ${htmlFiles.length} file HTML dipindai.`);
    }

    for (const fullPath of htmlFiles) {
      await scanHtmlFile(fullPath);
    }
  }
}

/**
 * Baca satu file HTML dan ambil semua referensi gambar
 */
async function scanHtmlFile(fullPath: string) {
  try {
    const content = await bunFile(fullPath).text();
    const matches = content.match(IMAGE_REF_REGEX);

    if (matches) {
      for (const match of matches) {
        protectImageReference(match);
      }
    }
  } catch {
    console.warn(`⚠️  Gagal baca: ${fullPath}`);
  }
}

/**
 * Deteksi file -sm.webp dan -md.webp yang yatim.
 */
function findOrphanWebpVariants(allImages: ImageFile[]): string[] {
  const orphanFiles: string[] = [];
  const allBasenames = new Set(allImages.map((img) => img.basename));

  for (const img of allImages) {
    const lowerName = img.basename.toLowerCase();

    for (const suffix of WEBP_VARIANT_SUFFIXES) {
      const variantEnding = `${suffix}.webp`;

      if (lowerName.endsWith(variantEnding)) {
        const parentName = img.basename.replace(
          new RegExp(`${suffix}\\.webp$`, "i"),
          ".webp"
        );

        if (!allBasenames.has(parentName)) {
          orphanFiles.push(img.fullPath);
        }
      }
    }
  }

  return orphanFiles;
}

async function runCleaner() {
  console.log("🚀 Memulai Pembersih Gambar V12.1 (Integrasi Array artikel-lite.json)...");

  const allImages = getAllPhysicalImages(IMG_FOLDER);

  if (allImages.length === 0) {
    return console.log("📭 Tidak ada file gambar di folder img.");
  }

  console.log(`🖼️  Total gambar fisik ditemukan: ${allImages.length}`);

  // 1. Load perlindungan dari cache srcset
  loadSrcsetCache();

  // 2. 🔥 Load perlindungan khusus -rg dari JSON
  loadArtikelLite();

  // 3. Scan HTML di Root
  await scanRootHtmlFiles();

  // 4. Scan HTML di Kategori
  await scanCategoryFolders();

  const orphanVariantFiles = findOrphanWebpVariants(allImages);

  if (orphanVariantFiles.length > 0) {
    console.log(
      `🕵️  Menemukan ${orphanVariantFiles.length} file varian WebP (-sm/-md) yatim.`
    );
  }

  // Filter utama: Cek apakah basename gambar fisik ada di Set perlindungan (usedBasenames)
  // File -rg.webp yang tidak terdaftar di artikel-lite.json akan otomatis terjaring di sini.
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
