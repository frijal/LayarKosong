import { writeFileSync, statSync } from "fs";
import { join, extname, basename, dirname } from "path";
import { glob } from "glob";
import sharp from "sharp";

// ==========================================
// KONFIGURASI & DEFINISI TIPE DATA (JALUR SESUAI REQUEST)
// ==========================================
const TARGET_DIR = "./img";
const OUTPUT_JSON = "./mini/galeri-data.json";
const SRCSET_TXT_PATH = "./mini/srcset-gambar.txt"; // Disiapkan jika dibutuhkan untuk sinkronisasi berikutnya

const ONLY_IMAGES_PATTERN = "**/*.{jpg,jpeg,png,webp,avif,svg}";

interface FileItem {
    name: string;
    path: string;
    thumbPath: string | null;
    size: number;
    date: string;
    type: "file" | "dir";
    width?: number;
    height?: number;
    format?: string;
    directFiles?: number;
    totalFiles?: number;
}

interface GalleryData {
    [key: string]: FileItem[];
}

// Fungsi pembantu pemformatan tanggal
function formatDate(date: Date): string {
    return date.toISOString().split("T")[0]; // Menghasilkan format YYYY-MM-DD
}

// ==========================================
// FUNGSI UTAMA GENERATOR
// ==========================================
async function generateGalleryJson() {
    console.log("🚀 Memulai pemindaian dapur gambar (Mode: Informasi Kaya + Counter Bottom-Up)...");

    // Scan murni file gambar saja
    const allFiles = await glob(ONLY_IMAGES_PATTERN, {
        cwd: TARGET_DIR,
        nodir: true,
        nocase: true
    });

    const galleryMap: GalleryData = { root: [] };
    const processedThumbnails = new Set<string>();

    // -------------------------------------------------------------------------
    // Langkah 1: Pilah varian thumbnail untuk penentuan thumbPath di UI browser
    // -------------------------------------------------------------------------
    allFiles.forEach(file => {
        const ext = extname(file);
        const nameWithoutExt = basename(file, ext);
        if (nameWithoutExt.endsWith("-sm") || nameWithoutExt.endsWith("-md")) {
            processedThumbnails.add(file);
        }
    });

    // -------------------------------------------------------------------------
    // Langkah 2: Ekstrak file utama & kumpulkan metadatanya
    // -------------------------------------------------------------------------
    for (const file of allFiles) {
        // Lewati berkas varian thumbnail agar tidak duplikat di list baris UI utama
        if (processedThumbnails.has(file)) continue;

        const fullPath = join(TARGET_DIR, file);
        const stats = statSync(fullPath);
        const filename = basename(file);
        const fileExt = extname(file).toLowerCase();

        const relDir = dirname(file);
        const pathKey = relDir === "." ? "root" : relDir;

        if (!galleryMap[pathKey]) {
            galleryMap[pathKey] = [];
        }

        const nameWithoutExt = basename(file, fileExt);
        const potentialThumb = join(relDir, `${nameWithoutExt}-sm${fileExt}`);
        const hasThumb = allFiles.includes(potentialThumb.replace(/\\/g, "/"));

        let fileData: FileItem = {
            name: filename,
            path: file,
            thumbPath: hasThumb ? potentialThumb.replace(/\\/g, "/") : null,
            size: stats.size,
            date: formatDate(stats.mtime),
            type: "file"
        };

        if (fileExt !== ".svg") {
            try {
                const metadata = await sharp(fullPath).metadata();
                fileData.width = metadata.width;
                fileData.height = metadata.height;
                fileData.format = metadata.format;
            } catch (err) {
                console.warn(`⚠️ Gagal membaca metadata Sharp untuk berkas: ${file}`);
            }
        } else {
            fileData.format = "svg";
            fileData.width = 0;
            fileData.height = 0;
        }

        galleryMap[pathKey].push(fileData);
    }

    // -------------------------------------------------------------------------
    // Langkah 3: Rekonstruksi navigasi folder tiruan Apache
    // (Dipisah dari loop utama agar pemetaan objek map stabil)
    // -------------------------------------------------------------------------
    Object.keys(galleryMap).forEach(pathKey => {
        if (pathKey !== "root") {
            const parts = pathKey.split("/");
            let currentBuildPath = "";

            for (let i = 0; i < parts.length; i++) {
                const parentKey = i === 0 ? "root" : currentBuildPath;
                const dirName = parts[i];
                currentBuildPath = currentBuildPath ? `${currentBuildPath}/${dirName}` : dirName;

                if (!galleryMap[parentKey]) galleryMap[parentKey] = [];

                const isDirExist = galleryMap[parentKey].some(
                    item => item.type === "dir" && item.path === currentBuildPath
                );

                if (!isDirExist) {
                    galleryMap[parentKey].unshift({
                        name: dirName,
                        path: currentBuildPath,
                        type: "dir",
                        directFiles: 0,
                        totalFiles: 0 
                    });
                }
            }
        }
    });

    // -------------------------------------------------------------------------
    // 🔥 LANGKAH BARU (OPTIMASI): Hitung Semua Berkas dari Bawah ke Atas (Bottom-Up)
    // -------------------------------------------------------------------------
    
    // 1. Dapatkan list gambar mentah murni tanpa filter thumbnail (Termasuk single, -md, -sm, .svg)
    const cleanFilesList = allFiles.filter(file => {
        const lowerFile = file.toLowerCase();
        return lowerFile.endsWith('.jpg') || 
               lowerFile.endsWith('.jpeg') || 
               lowerFile.endsWith('.png') || 
               lowerFile.endsWith('.webp') || 
               lowerFile.endsWith('.avif') || 
               lowerFile.endsWith('.svg');
    });

    // 2. Hitung 'directFiles' (berkas langsung) untuk semua folder terlebih dahulu
    Object.keys(galleryMap).forEach(folderPath => {
        galleryMap[folderPath].forEach(item => {
            if (item.type === "dir") {
                item.directFiles = cleanFilesList.filter(file => dirname(file) === item.path).length;
                item.totalFiles = item.directFiles; // Set dasar awal totalFiles
            }
        });
    });

    // 3. Ambil semua path folder unik, urutkan dari yang PALING DALAM ke dangkal (berdasarkan jumlah '/')
    const sortedFolderPaths = Object.keys(galleryMap).sort((a, b) => {
        const levelsA = a.split('/').length;
        const levelsB = b.split('/').length;
        return levelsB - levelsA; // Nilai kedalaman besar didahulukan
    });

    // 4. Lakukan akumulasi nilai ke atas (Bubble Up)
    sortedFolderPaths.forEach(currentPath => {
        if (currentPath === "root") return; // Skip karena root tidak memiliki induk lagi

        // Tentukan path induknya
        const parts = currentPath.split('/');
        parts.pop();
        const parentPath = parts.length === 0 ? "root" : parts.join('/');

        // Hitung total akumulasi dari semua subfolder di dalam currentPath saat ini
        let subfolderTotalSum = 0;
        if (galleryMap[currentPath]) {
            galleryMap[currentPath].forEach(item => {
                if (item.type === "dir") {
                    subfolderTotalSum += item.totalFiles || 0;
                }
            });
        }

        // Cari item folder ini di dalam data INDUKNYA, lalu perbarui total nilainya
        if (galleryMap[parentPath]) {
            const dirItemInParent = galleryMap[parentPath].find(
                item => item.type === "dir" && item.path === currentPath
            );
            if (dirItemInParent) {
                // totalFiles induk adalah file langsung miliknya ditambah total file dari subfolder di bawahnya
                dirItemInParent.totalFiles = (dirItemInParent.directFiles || 0) + subfolderTotalSum;
            }
        }
    });

    // -------------------------------------------------------------------------
    // Langkah 4: Tulis data mentah ke berkas target JSON
    // -------------------------------------------------------------------------
    try {
        const prettyJson = JSON.stringify(galleryMap, null, 2);
        writeFileSync(OUTPUT_JSON, prettyJson, "utf-8");
        
        console.log(`\n✨ SUKSES! Berkas galeri berhasil disimpan di: ${OUTPUT_JSON}`);
        console.log(`📊 Total folder teregistrasi: ${Object.keys(galleryMap).length} lokasi.`);
    } catch (writeErr) {
        console.error(`❌ Gagal menulis berkas ${OUTPUT_JSON}:`, writeErr);
    }
}

// Eksekusi skrip secara langsung
generateGalleryJson();
