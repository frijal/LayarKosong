import { readdir, stat } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import sharp from "sharp";

// --- KONFIGURASI FOLDER & INPUT ---
const TARGET_DIR = "./img";
const OUTPUT_JSON = "./mini/galeri-data.json";
const SRCSET_TXT_PATH = "./mini/srcset-gambar.txt";

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

// Memuat database srcset-gambar.txt ke memori (Set) agar pencarian O(1) super cepat
async function loadSrcsetDatabase(filePath: string): Promise<Set<string>> {
    try {
        const fileContent = await Bun.file(filePath).text();
        const lines = fileContent.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        return new Set(lines);
    } catch (error) {
        console.warn(`⚠️ Gagal membaca ${filePath}, pencocokan varian ukuran dinonaktifkan.`);
        return new Set();
    }
}

// Fungsi rekursif untuk membaca isi struktur direktori
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

                    // Formulasi path dasar untuk dicocokkan ke database srcset, misal: "img/folder/nama-foto"
                    const fullImgKey = `img/${relPath}`;
                    const baseNameWithoutExt = fullImgKey.substring(0, fullImgKey.lastIndexOf("."));

                    const smVariant = `${baseNameWithoutExt}-sm${ext}`;
                    const mdVariant = `${baseNameWithoutExt}-md${ext}`;

                    let selectedThumb = fullImgKey; // Default fallback ke dirinya sendiri (Single Foto)

                    // Cek prioritas: cari -sm dulu, jika tidak ada cari -md, jika tidak ada balik ke file asli
                    if (srcsetDb.has(smVariant)) {
                        selectedThumb = smVariant;
                    } else if (srcsetDb.has(mdVariant)) {
                        selectedThumb = mdVariant;
                    }

                    // Bersihkan prefix 'img/' agar path-nya sesuai struktur folder di browser
                    const cleanThumbPath = selectedThumb.replace(/^img\//, "");

                    // 🧠 BYPASS SHARP UNTUK SVG AGAR TIDAK ERROR DI GITHUB ACTIONS
                    if (ext === ".svg") {
                        result.push({
                            type: "file",
                            name: entry.name,
                            path: relPath,
                            size: fileStat.size,
                            width: 0,
                            height: 0,
                            format: "SVG",
                                thumbPath: cleanThumbPath
                        });
                    } else {
                        // Jalur normal pakai Sharp untuk non-SVG (png, jpg, webp, dll)
                        try {
                            const meta = await sharp(fullPath).metadata();

                            result.push({
                                type: "file",
                                name: entry.name,
                                path: relPath,
                                size: fileStat.size,
                                width: meta.width || 0,
                                height: meta.height || 0,
                                format: meta.format || ext.substring(1),
                                    thumbPath: cleanThumbPath
                            });
                        } catch (err) {
                            // Jika sewaktu-waktu ada file non-SVG yang korup, proses tidak akan crash mendadak
                            console.warn(`⚠️ Gagal membaca metadata Sharp untuk: ${entry.name}`);
                            result.push({
                                type: "file",
                                name: entry.name,
                                path: relPath,
                                size: fileStat.size,
                                format: ext.substring(1),
                                    thumbPath: cleanThumbPath
                            });
                        }
                    }
                } catch (err) {
                    console.error(`❌ Gagal memproses file: ${entry.name}`, err);
                }
            }
        }
    }

    // Urutkan: Folder di atas, File di bawah (Khas Apache)
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

    // Scan folder root utama
    galleryMap["root"] = await scanDirectory(TARGET_DIR, srcsetDb);

    // Scan semua sub-folder secara mendalam
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

    // Simpan data akhir ke berkas JSON statis kamu
    await Bun.write(OUTPUT_JSON, JSON.stringify(galleryMap, null, 2));
    console.log(`✨ Sukses! File ${OUTPUT_JSON} berhasil di-generate.`);
}

main().catch(console.error);
