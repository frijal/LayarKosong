import { writeFileSync, statSync } from "fs";
import { join, extname, basename, dirname } from "path";
import { glob } from "glob";
import sharp from "sharp";

const TARGET_DIR = "./img";
const OUTPUT_JSON = "./img/galeri-data.json";
const ONLY_IMAGES_PATTERN = "**/*.{jpg,jpeg,png,webp,avif,svg}";

interface FileItem {
    name: string;
    path: string;
    thumbPath: string | null;
    size: number | null;
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

// ─── FIX #1: Local timezone, bukan UTC ───────────────────────────────────────
function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// ─── FIX #2: Normalisasi path separator ──────────────────────────────────────
function normPath(p: string): string {
    return p.replace(/\\/g, "/");
}

// ─── FIX UTAMA: Tanggal dari git log (kapan file pertama di-commit) ──────────
// Fallback ke mtime kalau file belum di-track git
function getGitAddedDate(fullPath: string): string | null {
    try {
        const proc = Bun.spawnSync(
            // --follow      : ikuti rename
            // --diff-filter=A : hanya event "Added"
            // --format=%aI  : ISO 8601 dengan timezone
            ["git", "log", "--follow", "--format=%aI", "--diff-filter=A", "--", fullPath],
            { cwd: process.cwd() }
        );
        if (proc.exitCode !== 0) return null;

        const output = proc.stdout.toString().trim();
        if (!output) return null;

        // git log bisa return beberapa baris kalau ada rename history
        // ambil yang TERAKHIR = yang paling lama (tanggal asli pertama kali masuk)
        const lines = output.split("\n").filter(l => l.trim());
        if (lines.length === 0) return null;

        const oldest = lines[lines.length - 1].trim();
        const d = new Date(oldest);
        return isNaN(d.getTime()) ? null : formatDate(d);
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
async function generateGalleryJson() {
    console.log("🚀 Memulai pemindaian galeri...");

    const allFiles = await glob(ONLY_IMAGES_PATTERN, {
        cwd: TARGET_DIR,
        nodir: true,
        nocase: true
    });

    const galleryMap: GalleryData = { root: [] };
    const processedThumbnails = new Set<string>();

    // ── Set lowercase untuk lookup case-insensitive (fix Bug #2 sebelumnya) ──
    const allFilesLowerSet = new Set(allFiles.map(f => normPath(f).toLowerCase()));
    const allFilesLowerMap = new Map<string, string>(
        allFiles.map(f => [normPath(f).toLowerCase(), normPath(f)])
    );

    // ── Langkah 1: Tandai varian thumbnail ───────────────────────────────────
    allFiles.forEach(file => {
        const originalExt = extname(file);
        const nameWithoutExt = basename(file, originalExt); // pakai ext asli
        if (nameWithoutExt.endsWith("-sm") || nameWithoutExt.endsWith("-md")) {
            processedThumbnails.add(normPath(file));
        }
    });

    // ── Langkah 2: Proses file utama ─────────────────────────────────────────
    for (const file of allFiles) {
        const normalizedFile = normPath(file);
        if (processedThumbnails.has(normalizedFile)) continue;

        const fullPath = join(TARGET_DIR, file);
        const stats = statSync(fullPath);
        const filename = basename(file);

        const originalExt = extname(file);
        const fileExtLower = originalExt.toLowerCase();
        const nameWithoutExt = basename(file, originalExt); // fix: ext asli, bukan lowercase

        const relDir = normPath(dirname(file));
        const pathKey = relDir === "." ? "root" : relDir;
        if (!galleryMap[pathKey]) galleryMap[pathKey] = [];

        // Cari thumbnail secara case-insensitive
        const potentialThumbRaw = relDir === "."
            ? `${nameWithoutExt}-sm${fileExtLower}`
            : `${relDir}/${nameWithoutExt}-sm${fileExtLower}`;
        const potentialThumbLower = potentialThumbRaw.toLowerCase();
        const hasThumb = allFilesLowerSet.has(potentialThumbLower);
        const actualThumbPath = hasThumb
            ? (allFilesLowerMap.get(potentialThumbLower) ?? null)
            : null;

        // ── FIX UTAMA: git log → fallback mtime ──────────────────────────────
        const gitDate = getGitAddedDate(fullPath);
        const fileDate = gitDate ?? formatDate(stats.mtime);

        if (!gitDate) {
            console.warn(`⚠️ Git date tidak ditemukan, pakai mtime: ${file}`);
        }

        let fileData: FileItem = {
            name: filename,
            path: normalizedFile,
            thumbPath: actualThumbPath,
            size: stats.size,
            date: fileDate, // ← Sekarang pakai tanggal git, bukan mtime
            type: "file"
        };

        if (fileExtLower !== ".svg") {
            try {
                const metadata = await sharp(fullPath).metadata();
                fileData.width = metadata.width;
                fileData.height = metadata.height;
                fileData.format = metadata.format;
            } catch {
                console.warn(`⚠️ Gagal baca metadata Sharp: ${file}`);
            }
        } else {
            fileData.format = "svg";
            // undefined lebih proper dari 0 — HTML sudah handle: item.width ? ... : 'N/A'
        }

        galleryMap[pathKey].push(fileData);
    }

    // ── Langkah 3: Rekonstruksi folder tiruan ────────────────────────────────
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
                    galleryMap[parentKey].unshift({
                        name: dirName,
                        path: currentBuildPath,
                        thumbPath: null,
                        size: null,
                        date: "", // diisi enrichFolderData() di HTML
                        type: "dir",
                        directFiles: 0,
                        totalFiles: 0
                    });
                }
            }
        }
    });

    // ── Langkah 4: Counter bottom-up ─────────────────────────────────────────
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

    const sortedFolderPaths = Object.keys(galleryMap).sort(
        (a, b) => b.split("/").length - a.split("/").length
    );

    sortedFolderPaths.forEach(currentPath => {
        if (currentPath === "root") return;
        const parts = currentPath.split("/");
        parts.pop();
        const parentPath = parts.length === 0 ? "root" : parts.join("/");
        let subfolderTotalSum = 0;
        galleryMap[currentPath]?.forEach(item => {
            if (item.type === "dir") subfolderTotalSum += item.totalFiles || 0;
        });
        const dirItemInParent = galleryMap[parentPath]?.find(
            item => item.type === "dir" && item.path === currentPath
        );
        if (dirItemInParent) {
            dirItemInParent.totalFiles = (dirItemInParent.directFiles || 0) + subfolderTotalSum;
        }
    });

    // ── Langkah 5: Tulis JSON ─────────────────────────────────────────────────
    try {
        writeFileSync(OUTPUT_JSON, JSON.stringify(galleryMap, null, 2), "utf-8");
        console.log(`\n✨ SUKSES! Disimpan di: ${OUTPUT_JSON}`);
        console.log(`📊 Total folder: ${Object.keys(galleryMap).length} lokasi.`);
    } catch (err) {
        console.error(`❌ Gagal tulis ${OUTPUT_JSON}:`, err);
    }
}

generateGalleryJson();
