import { writeFileSync, statSync } from "fs";
import { join, extname, basename, dirname } from "path";
import { glob } from "glob";
import sharp from "sharp";

// ==========================================
// KONFIGURASI & DEFINISI TIPE DATA
// ==========================================
const TARGET_DIR = "./img";
const OUTPUT_JSON = "./img/galeri-data.json";
const SRCSET_TXT_PATH = "./mini/srcset-gambar.txt";

const ONLY_IMAGES_PATTERN = "**/*.{jpg,jpeg,png,webp,avif,svg}";

interface FileItem {
    name: string;
    path: string;
    thumbPath: string | null; // null untuk folder
    size: number | null;       // null untuk folder
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

// FIX #3: Gunakan local timezone, bukan UTC
function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// Normalisasi path separator (Windows compat)
function normPath(p: string): string {
    return p.replace(/\\/g, "/");
}

// ==========================================
// FUNGSI UTAMA GENERATOR
// ==========================================
async function generateGalleryJson() {
    console.log("🚀 Memulai pemindaian galeri...");

    const allFiles = await glob(ONLY_IMAGES_PATTERN, {
        cwd: TARGET_DIR,
        nodir: true,
        nocase: true
    });

    const galleryMap: GalleryData = { root: [] };
    const processedThumbnails = new Set<string>();

    // FIX #2: Buat Set lowercase untuk pencarian case-insensitive
    const allFilesLowerSet = new Set(allFiles.map(f => normPath(f).toLowerCase()));
    // Map: lowercase path → original path (untuk retrieve path asli)
    const allFilesLowerMap = new Map<string, string>(
        allFiles.map(f => [normPath(f).toLowerCase(), normPath(f)])
    );

    // -------------------------------------------------------------------------
    // Langkah 1: Pilah varian thumbnail
    // -------------------------------------------------------------------------
    allFiles.forEach(file => {
        const originalExt = extname(file);          // Extension asli, misal ".JPG"
        const nameWithoutExt = basename(file, originalExt); // FIX #1: pakai originalExt
        if (nameWithoutExt.endsWith("-sm") || nameWithoutExt.endsWith("-md")) {
            processedThumbnails.add(normPath(file));
        }
    });

    // -------------------------------------------------------------------------
    // Langkah 2: Ekstrak file utama & kumpulkan metadata
    // -------------------------------------------------------------------------
    for (const file of allFiles) {
        const normalizedFile = normPath(file);

        if (processedThumbnails.has(normalizedFile)) continue;

        const fullPath = join(TARGET_DIR, file);
        const stats = statSync(fullPath);
        const filename = basename(file);

        // FIX #1: Pisahkan originalExt & fileExtLower agar basename() benar
        const originalExt = extname(file);
        const fileExtLower = originalExt.toLowerCase();
        const nameWithoutExt = basename(file, originalExt); // Sekarang benar

        const relDir = normPath(dirname(file));
        const pathKey = relDir === "." ? "root" : relDir;

        if (!galleryMap[pathKey]) {
            galleryMap[pathKey] = [];
        }

        // FIX #1 + #2: potentialThumb pakai nameWithoutExt yang benar + case-insensitive lookup
        const potentialThumbRaw = relDir === "."
        ? `${nameWithoutExt}-sm${fileExtLower}`
        : `${relDir}/${nameWithoutExt}-sm${fileExtLower}`;
        const potentialThumbLower = potentialThumbRaw.toLowerCase();

        const hasThumb = allFilesLowerSet.has(potentialThumbLower);
        const actualThumbPath = hasThumb
        ? (allFilesLowerMap.get(potentialThumbLower) ?? null)
        : null;

        let fileData: FileItem = {
            name: filename,
            path: normalizedFile,
            thumbPath: actualThumbPath,
            size: stats.size,
            date: formatDate(stats.mtime), // FIX #3: local timezone
            type: "file"
        };

        if (fileExtLower !== ".svg") {
            try {
                const metadata = await sharp(fullPath).metadata();
                fileData.width = metadata.width;
                fileData.height = metadata.height;
                fileData.format = metadata.format;
            } catch (err) {
                console.warn(`⚠️ Gagal baca metadata Sharp: ${file}`);
            }
        } else {
            // FIX #5: undefined lebih proper daripada 0 untuk SVG
            fileData.format = "svg";
            fileData.width = undefined;
            fileData.height = undefined;
        }

        galleryMap[pathKey].push(fileData);
    }

    // -------------------------------------------------------------------------
    // Langkah 3: Rekonstruksi navigasi folder tiruan
    // -------------------------------------------------------------------------
    Object.keys(galleryMap).forEach(pathKey => {
        if (pathKey !== "root") {
            const parts = pathKey.split("/");
            let currentBuildPath = "";

            for (let i = 0; i < parts.length; i++) {
                const parentKey = i === 0 ? "root" : currentBuildPath;
                const dirName = parts[i];
                currentBuildPath = currentBuildPath
                ? `${currentBuildPath}/${dirName}`
                : dirName;

                if (!galleryMap[parentKey]) galleryMap[parentKey] = [];

                const isDirExist = galleryMap[parentKey].some(
                    item => item.type === "dir" && item.path === currentBuildPath
                );

                if (!isDirExist) {
                    // FIX #4: Tambah field yang hilang agar interface terpenuhi
                    galleryMap[parentKey].unshift({
                        name: dirName,
                        path: currentBuildPath,
                        thumbPath: null,
                        size: null,
                        date: "",   // Akan diisi enrichFolderData() di HTML
                                                  type: "dir",
                                                  directFiles: 0,
                                                  totalFiles: 0
                    });
                }
            }
        }
    });

    // -------------------------------------------------------------------------
    // Langkah 4: Hitung file dari bawah ke atas (Bottom-Up)
    // -------------------------------------------------------------------------
    const cleanFilesList = allFiles.map(normPath);

    Object.keys(galleryMap).forEach(folderPath => {
        galleryMap[folderPath].forEach(item => {
            if (item.type === "dir") {
                item.directFiles = cleanFilesList.filter(
                    file => normPath(dirname(file)) === item.path ||
                    (dirname(file) === "." && item.path === "root")
                ).length;
                item.totalFiles = item.directFiles;
            }
        });
    });

    const sortedFolderPaths = Object.keys(galleryMap).sort((a, b) => {
        return b.split("/").length - a.split("/").length;
    });

    sortedFolderPaths.forEach(currentPath => {
        if (currentPath === "root") return;

        const parts = currentPath.split("/");
        parts.pop();
        const parentPath = parts.length === 0 ? "root" : parts.join("/");

        let subfolderTotalSum = 0;
        if (galleryMap[currentPath]) {
            galleryMap[currentPath].forEach(item => {
                if (item.type === "dir") {
                    subfolderTotalSum += item.totalFiles || 0;
                }
            });
        }

        if (galleryMap[parentPath]) {
            const dirItemInParent = galleryMap[parentPath].find(
                item => item.type === "dir" && item.path === currentPath
            );
            if (dirItemInParent) {
                dirItemInParent.totalFiles =
                (dirItemInParent.directFiles || 0) + subfolderTotalSum;
            }
        }
    });

    // -------------------------------------------------------------------------
    // Langkah 5: Tulis ke JSON
    // -------------------------------------------------------------------------
    try {
        const prettyJson = JSON.stringify(galleryMap, null, 2);
        writeFileSync(OUTPUT_JSON, prettyJson, "utf-8");
        console.log(`\n✨ SUKSES! Disimpan di: ${OUTPUT_JSON}`);
        console.log(`📊 Total folder: ${Object.keys(galleryMap).length} lokasi.`);
    } catch (writeErr) {
        console.error(`❌ Gagal menulis ${OUTPUT_JSON}:`, writeErr);
    }
}

generateGalleryJson();
