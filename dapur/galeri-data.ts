import { writeFileSync, readFileSync, statSync, existsSync } from "fs";
import { join, extname, basename, dirname } from "path";
import { glob } from "glob";
import sharp from "sharp";

const TARGET_DIR = "./img";
const OUTPUT_JSON = "./img/galeri-data.json";
const PATH_LIST_FILE = "./mini/srcset-gambar.txt";
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

// ─── Format tanggal lokal, bukan UTC ─────────────────────────────────────────
function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// ─── Normalisasi separator path ──────────────────────────────────────────────
function normPath(p: string): string {
    return p.replace(/\\/g, "/");
}

// ─── Normalisasi TARGET_DIR menjadi prefix repo ──────────────────────────────
// "./img" -> "img"
// "img"   -> "img"
function getTargetRepoPrefix(): string {
    return normPath(TARGET_DIR)
        .replace(/^\.\//, "")
        .replace(/\/+$/, "");
}

const TARGET_REPO_PREFIX = getTargetRepoPrefix();

// ─── Cek ekstensi gambar ─────────────────────────────────────────────────────
function isImageFile(p: string): boolean {
    return /\.(jpe?g|png|webp|avif|svg)$/i.test(p);
}

// ─── Ubah path dari srcset-gambar.txt menjadi relatif terhadap folder img ────
// Contoh:
// "img/foo/bar.webp" -> "foo/bar.webp"
// "./img/foo.webp"   -> "foo.webp"
// "/img/foo.webp"    -> "foo.webp"
function toImgRelativePath(rawPath: string): string | null {
    let p = normPath(rawPath.trim());

    if (!p) return null;
    if (p.startsWith("#")) return null;

    p = p.replace(/^\/+/, "");
    p = p.replace(/^\.\//, "");

    const prefix = `${TARGET_REPO_PREFIX}/`;

    if (p === TARGET_REPO_PREFIX) return null;

    if (p.startsWith(prefix)) {
        p = p.slice(prefix.length);
    }

    if (!p || !isImageFile(p)) return null;

    return p;
}

// ─── Ubah path relatif img menjadi path repo untuk Git ───────────────────────
// Contoh:
// "foo/bar.webp" -> "img/foo/bar.webp"
function toGitRepoPath(imgRelativePath: string): string {
    return `${TARGET_REPO_PREFIX}/${normPath(imgRelativePath)}`;
}

// ─── Baca daftar gambar dari mini/srcset-gambar.txt ──────────────────────────
function readImageListFromCache(): string[] {
    if (!existsSync(PATH_LIST_FILE)) return [];

    const lines = readFileSync(PATH_LIST_FILE, "utf-8")
        .split(/\r?\n/)
        .map(toImgRelativePath)
        .filter((p): p is string => Boolean(p));

    const unique = Array.from(new Set(lines));

    const existingFiles: string[] = [];

    for (const file of unique) {
        const fullPath = join(TARGET_DIR, file);

        if (existsSync(fullPath)) {
            existingFiles.push(file);
        } else {
            console.warn(`⚠️ Path ada di ${PATH_LIST_FILE}, tapi file tidak ditemukan: ${toGitRepoPath(file)}`);
        }
    }

    return existingFiles;
}

// ─── Fallback: scan langsung folder img pakai glob ───────────────────────────
async function readImageListFromGlob(): Promise<string[]> {
    const files = await glob(ONLY_IMAGES_PATTERN, {
        cwd: TARGET_DIR,
        nodir: true,
        nocase: true
    });

    return Array.from(new Set(files.map(normPath).filter(isImageFile)));
}

// ─── Ambil daftar gambar utama ───────────────────────────────────────────────
async function getAllImageFiles(): Promise<string[]> {
    const fromCache = readImageListFromCache();

    if (fromCache.length > 0) {
        console.log(`📄 Menggunakan daftar path dari: ${PATH_LIST_FILE}`);
        console.log(`🖼️ Total path gambar valid dari cache: ${fromCache.length}`);
        return fromCache;
    }

    console.warn(`⚠️ ${PATH_LIST_FILE} tidak ditemukan/kosong. Fallback ke glob folder ${TARGET_DIR}`);
    const fromGlob = await readImageListFromGlob();

    console.log(`🖼️ Total path gambar dari glob: ${fromGlob.length}`);
    return fromGlob;
}

// ─── Tanggal dari "Last commit date" Git/GitHub ──────────────────────────────
// Mengambil commit TERAKHIR yang menyentuh file.
// Setara dengan konsep "Last commit date" selama repo lokal sudah up-to-date.
// Fallback ke mtime kalau file belum pernah masuk Git.
function getGitLastCommitDate(imgRelativePath: string): string | null {
    try {
        const repoPath = toGitRepoPath(imgRelativePath);

        const proc = Bun.spawnSync(
            [
                "git",
                "log",
                "-1",
                "--follow",
                "--format=%cI",
                "--",
                repoPath
            ],
            { cwd: process.cwd() }
        );

        if (proc.exitCode !== 0) return null;

        const output = proc.stdout.toString().trim();
        if (!output) return null;

        const d = new Date(output);
        return isNaN(d.getTime()) ? null : formatDate(d);
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
async function generateGalleryJson() {
    console.log("🚀 Memulai pemindaian galeri...");

    const allFiles = await getAllImageFiles();

    const galleryMap: GalleryData = { root: [] };
    const processedThumbnails = new Set<string>();

    // Lookup case-insensitive untuk mencari thumbnail -sm
    const allFilesLowerSet = new Set(
        allFiles.map(file => normPath(file).toLowerCase())
    );

    const allFilesLowerMap = new Map<string, string>(
        allFiles.map(file => [
            normPath(file).toLowerCase(),
            normPath(file)
        ])
    );

    // ── Langkah 1: Tandai varian thumbnail ───────────────────────────────────
    allFiles.forEach(file => {
        const normalizedFile = normPath(file);
        const originalExt = extname(normalizedFile);
        const nameWithoutExt = basename(normalizedFile, originalExt);

        if (nameWithoutExt.endsWith("-sm") || nameWithoutExt.endsWith("-md")) {
            processedThumbnails.add(normalizedFile);
        }
    });

    // ── Langkah 2: Proses file utama ─────────────────────────────────────────
    for (const file of allFiles) {
        const normalizedFile = normPath(file);

        // Lewati thumbnail agar tidak muncul sebagai item utama galeri
        if (processedThumbnails.has(normalizedFile)) continue;

        const fullPath = join(TARGET_DIR, normalizedFile);

        if (!existsSync(fullPath)) {
            console.warn(`⚠️ File hilang saat proses: ${toGitRepoPath(normalizedFile)}`);
            continue;
        }

        const stats = statSync(fullPath);
        const filename = basename(normalizedFile);

        const originalExt = extname(normalizedFile);
        const fileExtLower = originalExt.toLowerCase();
        const nameWithoutExt = basename(normalizedFile, originalExt);

        const relDir = normPath(dirname(normalizedFile));
        const pathKey = relDir === "." ? "root" : relDir;

        if (!galleryMap[pathKey]) galleryMap[pathKey] = [];

        // Cari thumbnail -sm secara case-insensitive
        const potentialThumbRaw = relDir === "."
            ? `${nameWithoutExt}-sm${fileExtLower}`
            : `${relDir}/${nameWithoutExt}-sm${fileExtLower}`;

        const potentialThumbLower = potentialThumbRaw.toLowerCase();
        const hasThumb = allFilesLowerSet.has(potentialThumbLower);

        const actualThumbPath = hasThumb
            ? (allFilesLowerMap.get(potentialThumbLower) ?? null)
            : null;

        // ── TANGGAL UTAMA: Last commit date Git/GitHub ───────────────────────
        const gitDate = getGitLastCommitDate(normalizedFile);
        const fileDate = gitDate ?? formatDate(stats.mtime);

        if (!gitDate) {
            console.warn(`⚠️ Last commit date tidak ditemukan, pakai mtime: ${toGitRepoPath(normalizedFile)}`);
        }

        const fileData: FileItem = {
            name: filename,
            path: normalizedFile,
            thumbPath: actualThumbPath,
            size: stats.size,
            date: fileDate,
            type: "file"
        };

        // Sharp hanya untuk metadata teknis gambar: width, height, format
        if (fileExtLower !== ".svg") {
            try {
                const metadata = await sharp(fullPath).metadata();

                fileData.width = metadata.width;
                fileData.height = metadata.height;
                fileData.format = metadata.format;
            } catch {
                console.warn(`⚠️ Gagal baca metadata Sharp: ${toGitRepoPath(normalizedFile)}`);
            }
        } else {
            fileData.format = "svg";
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
                        date: "",
                        type: "dir",
                        directFiles: 0,
                        totalFiles: 0
                    });
                }
            }
        }
    });

    // ── Langkah 4: Counter bottom-up ─────────────────────────────────────────
    const cleanFilesList = allFiles
        .map(normPath)
        .filter(file => !processedThumbnails.has(file));

    Object.keys(galleryMap).forEach(folderPath => {
        galleryMap[folderPath].forEach(item => {
            if (item.type === "dir") {
                item.directFiles = cleanFilesList.filter(file => {
                    const fileDir = normPath(dirname(file));

                    return fileDir === item.path ||
                        (fileDir === "." && item.path === "root");
                }).length;

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
            if (item.type === "dir") {
                subfolderTotalSum += item.totalFiles || 0;
            }
        });

        const dirItemInParent = galleryMap[parentPath]?.find(
            item => item.type === "dir" && item.path === currentPath
        );

        if (dirItemInParent) {
            dirItemInParent.totalFiles =
                (dirItemInParent.directFiles || 0) + subfolderTotalSum;
        }
    });

    // ── Langkah 5: Urutkan isi setiap folder ─────────────────────────────────
    Object.keys(galleryMap).forEach(pathKey => {
        galleryMap[pathKey].sort((a, b) => {
            // Folder tetap di atas file
            if (a.type === "dir" && b.type !== "dir") return -1;
            if (a.type !== "dir" && b.type === "dir") return 1;

            // File terbaru lebih dulu berdasarkan Last commit date
            if (a.type === "file" && b.type === "file") {
                const dateCompare = b.date.localeCompare(a.date);
                if (dateCompare !== 0) return dateCompare;
            }

            return a.name.localeCompare(b.name, "id", {
                numeric: true,
                sensitivity: "base"
            });
        });
    });

    // ── Langkah 6: Tulis JSON ────────────────────────────────────────────────
    try {
        writeFileSync(
            OUTPUT_JSON,
            JSON.stringify(galleryMap, null, 2),
            "utf-8"
        );

        console.log(`\n✨ SUKSES! Disimpan di: ${OUTPUT_JSON}`);
        console.log(`📊 Total folder: ${Object.keys(galleryMap).length} lokasi.`);
        console.log(`📦 Output JSON: ${OUTPUT_JSON}`);
    } catch (err) {
        console.error(`❌ Gagal tulis ${OUTPUT_JSON}:`, err);
    }
}

generateGalleryJson();
