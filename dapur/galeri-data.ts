import { join, relative, basename, dirname, extname } from "path";
import { writeFileSync, statSync } from "fs";
import { glob } from "glob";
import sharp from "sharp";

const ROOT_IMG_DIR = "./img"; 
const OUTPUT_JSON = "./img/galeri-data.json"; 
const ONLY_IMAGES_PATTERN = "**/*.{jpg,jpeg,png,webp,gif,svg,avif}";

interface FileItem {
    name: string;
    path: string;
    thumbPath: string | null;
    size: number;
    date: string;       // 📅 Tambahan Kolom Tanggal
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

// Fungsi pembantu merapikan format tanggal ISO ke YYYY-MM-DD HH:mm
function formatDate(dateObj: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
}

async function generateGalleryJson() {
    console.log("🚀 Memulai pemindaian dapur gambar (Mode: Informasi Kaya)...");

    const allFiles = await glob(ONLY_IMAGES_PATTERN, {
        cwd: ROOT_IMG_DIR,
        nodir: true,
        nocase: true
    });

    const galleryMap: GalleryData = { root: [] };
    const processedThumbnails = new Set<string>();

    allFiles.forEach(file => {
        const ext = extname(file);
        const nameWithoutExt = basename(file, ext);
        if (nameWithoutExt.endsWith("-sm") || nameWithoutExt.endsWith("-md")) {
            processedThumbnails.add(file);
        }
    });

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

        // Set tanggal default dari waktu modifikasi file fisik di OS (sangat akurat untuk optimasi aset)
        let fileDateStr = formatDate(stats.mtime);

        let fileData: FileItem = {
            name: filename,
            path: file,
            thumbPath: hasThumb ? potentialThumb.replace(/\\/g, "/") : null,
            size: stats.size,
            date: fileDateStr,
            type: "file"
        };

        if (fileExt !== ".svg") {
            try {
                const metadata = await sharp(fullPath).metadata();
                fileData.width = metadata.width;
                fileData.height = metadata.height;
                fileData.format = metadata.format;
                
                // Opsional: Jika ada data EXIF DateTime asli dari jepretan kamera, kamu bisa parse di sini.
                // Namun stats.mtime jauh lebih konsisten untuk semua jenis format (termasuk webp hasil konversi).
            } catch (err) {
                console.warn(`⚠️ Gagal membaca metadata Sharp untuk berkas: ${file}`);
            }
        } else {
            fileData.format = "svg";
            fileData.width = 0;
            fileData.height = 0;
        }

        galleryMap[pathKey].push(fileData);

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

    try {
        const minifiedJson = JSON.stringify(galleryMap);
        writeFileSync(OUTPUT_JSON, minifiedJson, "utf-8");
        console.log(`\n✨ SUKSES! Berkas JSON kaya informasi berhasil disimpan.`);
    } catch (writeErr) {
        console.error("❌ Gagal meminify JSON:", writeErr);
    }
}

generateGalleryJson();
