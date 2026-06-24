import { readdir, stat } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import sharp from "sharp"; // Tetap dipakai untuk ambil dimensi lebar/tinggi asli

const TARGET_DIR = "./img";
const OUTPUT_JSON = "./mini/galeri-data.json";
const SRCSET_TXT_PATH = "./mini/srcset-gambar.txt"; // Jalur file list foto kamu

const IMG_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"]);

interface DirectoryNode {
  type: "dir" | "file";
  name: string;
  path: string;
  size?: number;
  width?: number;
  height?: number;
  format?: string;
  thumbPath?: string; // Menyimpan varian lokal terbaik (-sm, -md, atau asli)
}

// Fungsi utama untuk memuat isi daftar gambar srcset ke dalam Set agar pencarian instan (O(1))
async function loadSrcsetDatabase(filePath: string): Promise<Set<string>> {
  try {
    const fileContent = await Bun.file(filePath).text();
    // Pecah per baris, bersihkan whitespace, dan pastikan lowercase/konsisten jika perlu
    const lines = fileContent.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    return new Set(lines);
  } catch (error) {
    console.warn(`⚠️ Gagal membaca ${filePath}, pencocokan varian ukuran dinonaktifkan.`);
    return new Set();
  }
}

async function scanDirectory(dirPath: string, srcsetDb: Set<string>): Promise<DirectoryNode[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const result: DirectoryNode[] = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    const relPath = relative(TARGET_DIR, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      result.push({
        type: "dir",
        name: entry.name,
        path: relPath,
      });
    } else {
      const ext = extname(entry.name).toLowerCase();
      if (IMG_EXTS.has(ext)) {
        try {
          const fileStat = await stat(fullPath);
          const meta = await sharp(fullPath).metadata();

          // Formulasi path dasar tanpa ekstensi, misal: "img/folder/nama-foto"
          const fullImgKey = `img/${relPath}`;
          const baseNameWithoutExt = fullImgKey.substring(0, fullImgKey.lastIndexOf("."));

          // Tentukan opsi varian
          const smVariant = `${baseNameWithoutExt}-sm${ext}`;
          const mdVariant = `${baseNameWithoutExt}-md${ext}`;

          let selectedThumb = fullImgKey; // Default fallback ke dirinya sendiri (Single Foto)

          // Cek prioritas: cari -sm dulu, kalau gak ada cari -md, kalau gak ada balik ke file asli
          if (srcsetDb.has(smVariant)) {
            selectedThumb = smVariant;
          } else if (srcsetDb.has(mdVariant)) {
            selectedThumb = mdVariant;
          }

          // Bersihkan prefix 'img/' agar path-nya sesuai struktur folder lokal browser kamu nanti
          const cleanThumbPath = selectedThumb.replace(/^img\//, "");

          result.push({
            type: "file",
            name: entry.name,
            path: relPath,
            size: fileStat.size,
            width: meta.width || 0,
            height: meta.height || 0,
            format: meta.format || ext.substring(1),
            thumbPath: cleanThumbPath // Otomatis mengarah ke -sm, -md, atau file aslinya
          });
        } catch (err) {
          console.error(`⚠️ Gagal membaca metadata untuk: ${entry.name}`, err);
          const fileStat = await stat(fullPath);
          result.push({ type: "file", name: entry.name, path: relPath, size: fileStat.size });
        }
      }
    }
  }

  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function main() {
  console.log("🚀 Memulai scanning galeri dengan pencocokan otomatis varian dari srcset-gambar.txt...");

  // Load database teks kamu ke memori
  const srcsetDb = await loadSrcsetDatabase(SRCSET_TXT_PATH);
  console.log(`📂 Berhasil memuat ${srcsetDb.size} daftar file gambar dari database.`);

  const galleryMap: Record<string, DirectoryNode[]> = {};
  galleryMap["root"] = await scanDirectory(TARGET_DIR, srcsetDb);

  async function deepScan(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = join(currentDir, entry.name);
        const relPath = relative(TARGET_DIR, subPath).replace(/\\/g, "/");
        galleryMap[relPath] = await scanDirectory(subPath, srcsetDb);
        await deepScan(subPath);
      }
    }
  }

  await deepScan(TARGET_DIR);

  await Bun.write(OUTPUT_JSON, JSON.stringify(galleryMap, null, 2));
  console.log(`✨ Sukses! File ${OUTPUT_JSON} berhasil di-generate.`);
}

main().catch(console.error);
