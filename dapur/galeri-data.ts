import { writeFileSync, readFileSync, statSync, existsSync, readdirSync } from "fs";
import { join, extname, basename, dirname } from "path";
import sharp from "sharp";

const TARGET_DIR = "./img";
const OUTPUT_JSON = "./img/galeri-data.json";
const PATH_LIST_FILE = "./mini/srcset-gambar.txt";

interface FileItem {
    name: string;
    path: string;
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

// ─── Normalisasi path separator ──────────────────────────────────────────────
function normPath(p: string): string {
    return p.replace(/\\/g, "/");
}

// ─── TARGET_DIR "./img" → "img" ──────────────────────────────────────────────
function getTargetRepoPrefix(): string {
    return normPath(TARGET_DIR)
        .replace(/^\.\//, "")
        .replace(/\/+$/, "");
}

const TARGET_REPO_PREFIX = getTargetRepoPrefix();

// ─── Deteksi file gambar ─────────────────────────────────────────────────────
function isImageFile(p: string): boolean {
    return /\.(jpe?g|png|webp|avif|svg)$/i.test(p);
}

// ─── Deteksi varian thumbnail, bukan file asli ───────────────────────────────
function isThumbnailVariant(p: string): boolean {
    const ext = extname(p);
    const nameWithoutExt = basename(p, ext);

    return nameWithoutExt.endsWith("-sm") || nameWithoutExt.endsWith("-md");
}

// ─── File asli = gambar, tapi bukan -sm / -md ────────────────────────────────
function isOriginalImageFile(p: string): boolean {
    return isImageFile(p) && !isThumbnailVariant(p);
}

// ─── Ubah path "img/xxx.webp" menjadi relatif terhadap folder img ────────────
// Contoh:
// "img/foo/bar.webp" -> "foo/bar.webp"
// "./img/foo.webp"   -> "foo.webp"
// "/img/foo.webp"    -> "foo.webp"
// "foo.webp"         -> "foo.webp"
function toImgRelativePath(rawPath: string): string | null {
    let p = normPath(rawPath.trim());

    if (!p) return null;
    if (p.startsWith("#")) return null;

    // Abaikan URL eksternal atau skema lain.
    if (/^[a-z][a-z0-9+.-]*:/i.test(p)) return null;

    p = p.replace(/^\/+/, "");
    p = p.replace(/^\.\//, "");

    // Hindari path keluar dari folder target.
    if (p.startsWith("../") || p.includes("/../")) return null;

    const prefix = `${TARGET_REPO_PREFIX}/`;

    if (p === TARGET_REPO_PREFIX) return null;

    if (p.startsWith(prefix)) {
        p = p.slice(prefix.length);
    }

    if (!p || !isOriginalImageFile(p)) return null;

    return p;
}

// ─── Ubah path relatif img menjadi path repo untuk Git ───────────────────────
// Contoh:
// "foo/bar.webp" -> "img/foo/bar.webp"
function toGitRepoPath(imgRelativePath: string): string {
    return `${TARGET_REPO_PREFIX}/${normPath(imgRelativePath)}`;
}

// ─── Cek apakah repo shallow; galeri-data butuh full history ─────────────────
function warnIfGitHistoryIsShallow(): void {
    try {
        const proc = Bun.spawnSync(
            ["git", "rev-parse", "--is-shallow-repository"],
            { cwd: process.cwd() }
        );

        if (proc.exitCode !== 0) return;

        const output = proc.stdout.toString().trim();

        if (output === "true") {
            console.warn("⚠️ Repo masih shallow clone.");
            console.warn("⚠️ Last Commit Date mungkin tidak akurat.");
            console.warn("⚠️ Jalankan workflow dengan fetch-depth: 0 untuk hasil terbaik.");
        }
    } catch {
        // Abaikan jika Git tidak tersedia.
    }
}

// ─── Baca daftar file asli dari mini/srcset-gambar.txt ───────────────────────
// Sekarang hanya sebagai panduan/audit, bukan sumber utama.
function readOriginalImagesFromCache(): string[] {
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
            existingFiles.push(normPath(file));
        } else {
            console.warn(`⚠️ Path ada di ${PATH_LIST_FILE}, tapi file tidak ditemukan: ${toGitRepoPath(file)}`);
        }
    }

    return existingFiles;
}

// ─── Sumber utama: scan langsung seluruh folder img pakai fs ─────────────────
function readOriginalImagesFromFs(): string[] {
    const result: string[] = [];

    function walk(relativeDir = "") {
        const currentDir = join(TARGET_DIR, relativeDir);

        if (!existsSync(currentDir)) return;

        const entries = readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const relativePath = normPath(join(relativeDir, entry.name));

            // Hindari symlink agar tidak terjadi loop/scan liar.
            if (entry.isSymbolicLink()) continue;

            if (entry.isDirectory()) {
                walk(relativePath);
                continue;
            }

            if (!entry.isFile()) continue;

            const imgRelativePath = toImgRelativePath(relativePath);

            if (imgRelativePath) {
                result.push(imgRelativePath);
            }
        }
    }

    walk("");

    return Array.from(new Set(result.map(normPath))).sort((a, b) =>
        a.localeCompare(b, "id", {
            numeric: true,
            sensitivity: "base"
        })
    );
}

// ─── Ambil daftar gambar asli ────────────────────────────────────────────────
// Prinsip baru:
// 1. Scan folder ./img adalah sumber kebenaran.
// 2. ./mini/srcset-gambar.txt hanya sebagai pembanding/panduan.
// 3. Hasil akhir adalah gabungan valid yang benar-benar ada di filesystem.
async function getAllOriginalImageFiles(): Promise<string[]> {
    const fromFs = readOriginalImagesFromFs();
    const fromCache = readOriginalImagesFromCache();

    const fsSet = new Set(fromFs.map(normPath));
    const cacheSet = new Set(fromCache.map(normPath));

    const onlyFromFs = fromFs.filter(file => !cacheSet.has(file));
    const onlyFromCache = fromCache.filter(file => !fsSet.has(file));

    console.log(`📁 Total file gambar asli dari scan folder ${TARGET_DIR}: ${fromFs.length}`);

    if (fromCache.length > 0) {
        console.log(`📄 Total file gambar asli dari panduan ${PATH_LIST_FILE}: ${fromCache.length}`);
    } else {
        console.warn(`⚠️ ${PATH_LIST_FILE} tidak ditemukan/kosong. Lanjut pakai scan folder penuh.`);
    }

    if (onlyFromFs.length > 0) {
        console.log(`🧩 File ditemukan dari scan folder, tapi tidak ada di ${PATH_LIST_FILE}: ${onlyFromFs.length}`);

        onlyFromFs.slice(0, 30).forEach(file => {
            console.log(`   + ${toGitRepoPath(file)}`);
        });

        if (onlyFromFs.length > 30) {
            console.log(`   ... dan ${onlyFromFs.length - 30} file lainnya.`);
        }
    }

    if (onlyFromCache.length > 0) {
        console.warn(`⚠️ File ada di ${PATH_LIST_FILE}, tapi tidak ditemukan oleh scan folder: ${onlyFromCache.length}`);

        onlyFromCache.slice(0, 30).forEach(file => {
            console.warn(`   ? ${toGitRepoPath(file)}`);
        });

        if (onlyFromCache.length > 30) {
            console.warn(`   ... dan ${onlyFromCache.length - 30} file lainnya.`);
        }
    }

    const merged = Array.from(new Set([...fromFs, ...fromCache].map(normPath)))
        .filter(file => {
            const fullPath = join(TARGET_DIR, file);

            if (!existsSync(fullPath)) {
                console.warn(`⚠️ Dilewati karena file tidak ditemukan: ${toGitRepoPath(file)}`);
                return false;
            }

            if (!isOriginalImageFile(file)) {
                console.warn(`⚠️ Dilewati karena bukan file gambar asli: ${toGitRepoPath(file)}`);
                return false;
            }

            return true;
        })
        .sort((a, b) =>
            a.localeCompare(b, "id", {
                numeric: true,
                sensitivity: "base"
            })
        );

    console.log(`🖼️ Total final file gambar asli untuk galeri-data.json: ${merged.length}`);

    return merged;
}

// ─── Batch Last Commit Date dari Git ─────────────────────────────────────────
// Ini lebih cepat daripada menjalankan "git log -1" untuk setiap file.
// Git log berjalan dari commit terbaru ke lama, jadi tanggal pertama yang
// ditemukan untuk sebuah path adalah Last Commit Date file itu.
function buildGitLastCommitDateMap(files: string[]): Map<string, string> {
    const result = new Map<string, string>();
    const wanted = new Set(files.map(normPath));

    if (wanted.size === 0) return result;

    try {
        const marker = "__COMMIT_DATE__";

        const proc = Bun.spawnSync(
            [
                "git",
                "log",
                `--format=${marker}%cI`,
                "--name-only",
                "--",
                TARGET_REPO_PREFIX
            ],
            { cwd: process.cwd() }
        );

        if (proc.exitCode !== 0) {
            console.warn("⚠️ Gagal membaca batch Last Commit Date dari git log.");
            return result;
        }

        const output = proc.stdout.toString();
        const lines = output.split(/\r?\n/);

        let currentDate = "";

        for (const rawLine of lines) {
            const line = rawLine.trim();

            if (!line) continue;

            if (line.startsWith(marker)) {
                const iso = line.slice(marker.length).trim();
                const d = new Date(iso);

                currentDate = isNaN(d.getTime()) ? "" : formatDate(d);
                continue;
            }

            if (!currentDate) continue;

            const imgRelativePath = toImgRelativePath(line);

            if (!imgRelativePath) continue;
            if (!wanted.has(imgRelativePath)) continue;

            // Karena git log urut terbaru → lama, jangan timpa data yang sudah ada.
            if (!result.has(imgRelativePath)) {
                result.set(imgRelativePath, currentDate);
            }

            if (result.size === wanted.size) {
                break;
            }
        }
    } catch (err) {
        console.warn("⚠️ Gagal membangun Git Last Commit Date map:", err);
    }

    return result;
}

// ─── Fallback per file jika batch map tidak menemukan tanggal ────────────────
// Pakai --follow untuk membantu kasus file pernah rename.
function getGitLastCommitDateFallback(imgRelativePath: string): string | null {
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
    console.log("📌 Sumber utama: scan langsung folder ./img");
    console.log("📌 Panduan tambahan: ./mini/srcset-gambar.txt");

    warnIfGitHistoryIsShallow();

    const allFiles = await getAllOriginalImageFiles();

    const galleryMap: GalleryData = { root: [] };
    const gitDateMap = buildGitLastCommitDateMap(allFiles);

    console.log(`🕒 Last Commit Date ditemukan untuk ${gitDateMap.size}/${allFiles.length} file.`);

    // ── Langkah 1: Proses file asli saja ─────────────────────────────────────
    for (const file of allFiles) {
        const normalizedFile = normPath(file);
        const fullPath = join(TARGET_DIR, normalizedFile);

        if (!existsSync(fullPath)) {
            console.warn(`⚠️ File hilang saat proses: ${toGitRepoPath(normalizedFile)}`);
            continue;
        }

        const stats = statSync(fullPath);
        const filename = basename(normalizedFile);

        const originalExt = extname(normalizedFile);
        const fileExtLower = originalExt.toLowerCase();

        const relDir = normPath(dirname(normalizedFile));
        const pathKey = relDir === "." ? "root" : relDir;

        if (!galleryMap[pathKey]) galleryMap[pathKey] = [];

        // ── TANGGAL UTAMA: Last Commit Date Git/GitHub ───────────────────────
        const gitDate =
            gitDateMap.get(normalizedFile) ??
            getGitLastCommitDateFallback(normalizedFile);

        const fileDate = gitDate ?? formatDate(stats.mtime);

        if (!gitDate) {
            console.warn(`⚠️ Last Commit Date tidak ditemukan, pakai mtime: ${toGitRepoPath(normalizedFile)}`);
        }

        const fileData: FileItem = {
            name: filename,
            path: normalizedFile,
            size: stats.size,
            date: fileDate,
            type: "file"
        };

        // Sharp hanya membaca metadata teknis dari file asli.
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

    // ── Langkah 2: Rekonstruksi folder tiruan ────────────────────────────────
    Object.keys(galleryMap).forEach(pathKey => {
        if (pathKey === "root") return;

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
                    size: null,
                    date: "",
                    type: "dir",
                    directFiles: 0,
                    totalFiles: 0
                });
            }
        }
    });

    // ── Langkah 3: Counter file asli bottom-up ───────────────────────────────
    const cleanFilesList = allFiles.map(normPath);

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

    // ── Langkah 4: Urutkan isi setiap folder ─────────────────────────────────
    Object.keys(galleryMap).forEach(pathKey => {
        galleryMap[pathKey].sort((a, b) => {
            // Folder tetap di atas file.
            if (a.type === "dir" && b.type !== "dir") return -1;
            if (a.type !== "dir" && b.type === "dir") return 1;

            // File terbaru lebih dulu berdasarkan Last Commit Date.
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

    // ── Langkah 5: Tulis JSON ────────────────────────────────────────────────
    try {
        writeFileSync(
            OUTPUT_JSON,
            JSON.stringify(galleryMap, null, 2),
            "utf-8"
        );

        console.log(`\n✨ SUKSES! Disimpan di: ${OUTPUT_JSON}`);
        console.log(`📊 Total folder: ${Object.keys(galleryMap).length} lokasi.`);
        console.log(`🖼️ Total file asli: ${allFiles.length}`);
        console.log(`📦 Output JSON: ${OUTPUT_JSON}`);
    } catch (err) {
        console.error(`❌ Gagal tulis ${OUTPUT_JSON}:`, err);
        process.exit(1);
    }
}

generateGalleryJson().catch((err) => {
    console.error("❌ Gagal generate galeri-data.json:", err);
    process.exit(1);
});
