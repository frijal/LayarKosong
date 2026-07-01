import { file as bunFile, write } from "bun";
import * as fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

// ========== CONFIG ==========
const ROOT_DIR = process.cwd();
const IMG_FOLDER = path.join(ROOT_DIR, "img");
const OUTPUT_FILE = path.join(IMG_FOLDER, "gambarnganggur.txt");
const CACHE_FILE = path.join(ROOT_DIR, "mini", "srcset-gambar.txt");
const ARTIKEL_LITE_FILE = path.join(ROOT_DIR, "artikel-lite.json");

// Ubah ke true kalau mau tes dulu tanpa benar-benar menghapus file
const DRY_RUN = false;

// 🔥 Script HANYA akan memindai folder di bawah ini (Sub-directory)
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

// 🔥 Varian hasil resize/generator yang ikut dilindungi secara UMUM (Untuk semua ekstensi)
// CATATAN: -rg TIDAK dimasukkan ke sini agar tidak dilindungi secara buta.
const VARIANT_SUFFIXES = ["-sm", "-md"];

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

  // Lindungi versi WebP utama (jika HTML panggil .jpg tapi fisik ada .webp)
  usedBasenames.add(`${nameSafe}.webp`);

  // 🔥 Lindungi varian resize umum (-sm, -md) SESUAI ekstensinya & versi WebP-nya
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
 * Scan HTML di folder kategori (Sub-directory)
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
 * 🔥 DIPERBAIKI: Deteksi file varian (-sm, -md) yang yatim UNTUK SEMUA EKSTENSI.
 */
function findOrphanVariants(allImages: ImageFile[]): string[] {
  const orphanFiles: string[] = [];

  // Ubah ke lowercase semua supaya pencocokan parent kebal case-sensitive
  const allBasenamesLower = new Set(allImages.map((img) => img.basename.toLowerCase()));

  for (const img of allImages) {
    const lowerName = img.basename.toLowerCase();
    const ext = path.extname(lowerName);

    // Filter awal: Pastikan ekstensinya kita pantau
    if (!IMAGE_EXTENSIONS.includes(ext)) continue;

    for (const suffix of VARIANT_SUFFIXES) {
      const variantEnding = `${suffix}${ext}`;

      if (lowerName.endsWith(variantEnding)) {
        // Ambil nama dasar tanpa suffix dan ekstensi (misal: "gambar-sm.png" -> "gambar")
        const lowerRawName = lowerName.slice(0, -variantEnding.length);

        let hasParent = false;

        // Cek apakah ada parent dengan ekstensi APAPUN (bisa jadi file.png, file.jpg, file.webp)
        for (const parentExt of IMAGE_EXTENSIONS) {
          if (allBasenamesLower.has(`${lowerRawName}${parentExt}`)) {
            hasParent = true;
            break;
          }
        }

        if (!hasParent) {
          orphanFiles.push(img.fullPath);
        }

        // Kalau sudah dipastikan yatim di satu suffix, nggak usah cek suffix lain untuk gambar ini
        break;
      }
    }
  }

  return orphanFiles;
}

async function runCleaner() {
  console.log("🚀 Memulai Pembersih Gambar (Sub-Folder Only & Multi-Extension Variants)...");

  const allImages = getAllPhysicalImages(IMG_FOLDER);

  if (allImages.length === 0) {
    return console.log("📭 Tidak ada file gambar di folder img.");
  }

  console.log(`🖼️  Total gambar fisik ditemukan: ${allImages.length}`);

  // 1. Load perlindungan dari cache srcset
  loadSrcsetCache();

  // 2. Load perlindungan khusus -rg dari JSON
  loadArtikelLite();

  // 3. Scan HTML HANYA di dalam folder Kategori (Melewati Root)
  await scanCategoryFolders();

  // 4. Deteksi gambar varian dari segala jenis format yang nggak punya parent
  const orphanVariantFiles = findOrphanVariants(allImages);

  if (orphanVariantFiles.length > 0) {
    console.log(
      `🕵️  Menemukan ${orphanVariantFiles.length} file varian (-sm/-md) yatim dari berbagai format.`
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
