import { join, relative, basename, dirname, extname } from "path";
import { writeFileSync, statSync } from "fs";
import { glob } from "glob";
import sharp from "sharp";

// Konfigurasi Folder & Aturan Main
const ROOT_IMG_DIR = "./img"; 
const OUTPUT_JSON = "./img/galeri-data.json"; 

// Hanya izinkan format gambar ini, selain dari ini otomatis DENY (termasuk file sistem/sampah)
const ONLY_IMAGES_PATTERN = "**/*.{jpg,jpeg,png,webp,gif,svg,avif}";

interface FileItem {
    name: string;
    path: string;
    thumbPath: string | null;
    size: number;
    width?: number;
    height?: number;
    format?: string;
    type: "file";
}

interface DirItem {
    name: string;
    path: string;
    type: "dir";
}

type GalleryData = {
    [key: string]: (FileItem | DirItem)[];
};

async function generateGalleryJson() {
    console.log("🚀 Memulai pemindaian dapur gambar (Mode: Whitelist Gambar)...");

    // Scan murni file gambar saja
    const allFiles = await glob(ONLY_IMAGES_PATTERN, {
        cwd: ROOT_IMG_DIR,
        nodir: true,
        nocase: true // Kebal terhadap perbedaan kapitalisasi eksensi (cth: .WEBP / .jpg)
    });

    const galleryMap: GalleryData = { root: [] };
    const processedThumbnails = new Set<string>();

    // Langkah 1: Pilah varian thumbnail agar tidak mengotori list utama
    allFiles.forEach(file => {
        const ext = extname(file);
        const nameWithoutExt = basename(file, ext);
        if (nameWithoutExt.endsWith("-sm") || nameWithoutExt.endsWith("-md")) {
            processedThumbnails.add(file);
        }
    });

    // Langkah 2: Ekstrak file utama & kumpulkan metadatanya
    for (const file of allFiles) {
        if (processedThumbnails.has(file)) continue;

        const fullPath = join(ROOT_IMG_DIR, file);
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
            path: file, // Murni relatif terhadap /img/ untuk Cloudflare
            thumbPath: hasThumb ? potentialThumb.replace(/\\/g, "/") : null,
            size: stats.size,
            type: "file"
        };

        // Gali dimensi gambar lewat Sharp jika bukan SVG
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
        }

        galleryMap[pathKey].push(fileData);

        // Langkah 3: Rekonstruksi struktur navigasi folder (Tiruan Apache)
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
                        type: "dir"
                    });
                }
            }
        }
    }

    // Langkah 4: Tulis & Minify total data ke berkas target
    try {
        const minifiedJson = JSON.stringify(galleryMap);
        writeFileSync(OUTPUT_JSON, minifiedJson, "utf-8");
        
        console.log(`\n✨ SUKSES! Berkas galeri termunifikasi (murni gambar) disimpan di: ${OUTPUT_JSON}`);
        console.log(`📊 Total folder teregistrasi: ${Object.keys(galleryMap).length} lokasi.`);
    } catch (writeErr) {
        console.error("❌ Gagal meminify JSON:", writeErr);
    }
}

generateGalleryJson();
