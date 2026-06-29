import { readdir, stat } from "node:fs/promises";
import { join, resolve, extname } from "node:path";

// ======================================================
// KONFIGURASI PEMBERSIH (STRICT TYPE & PERFORMANCE)
// ======================================================
const TARGET_FOLDER: string = Bun.argv[2] || './artikelx/';
const SCHEMA_REGEX = /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi;
const EXTENSIONS = [".html"];

/**
 * Membersihkan schema JSON-LD dalam file
 */
async function cleanSchemaInFile(filePath: string): Promise<boolean> {
    try {
        const file = Bun.file(filePath);
        const content = await file.text();

        // Cek apakah ada script schema
        // Kita tidak pakai .test() di sini untuk menghindari issue stateful regex global
        if (content.match(SCHEMA_REGEX)) {
            const cleanedContent = content.replace(SCHEMA_REGEX, "");

            // Tulis ulang hanya jika konten benar-benar berubah
            await Bun.write(filePath, cleanedContent);
            return true;
        }
        return false;
    } catch (err: any) {
        console.error(`❌ Error pada ${filePath}: ${err.message}`);
        return false;
    }
}

async function runCleanerLocal(): Promise<void> {
    const absolutePath = resolve(TARGET_FOLDER);

    // Validasi Folder
    try {
        const s = await stat(absolutePath);
        if (!s.isDirectory()) throw new Error();
    } catch {
        console.error(`❌ Folder tidak ditemukan atau bukan direktori: ${absolutePath}`);
        return;
    }

    console.log(`\n🧹 Memulai pembersihan (Bun Native Mode) di: ${absolutePath}`);
    console.log("⚠️  Non-Recursive: Hanya memproses file di root folder target.");
    console.log("-".repeat(50));

    let countCleaned = 0;
    let countTotal = 0;

    // Ambil list item
    const items = await readdir(absolutePath);

    // Proses secara paralel menggunakan Promise.all
    //
    const tasks = items.map(async (item) => {
        const itemPath = join(absolutePath, item);

        // Filter extensi dulu sebelum panggil stat (lebih hemat resource)
        if (!EXTENSIONS.includes(extname(item).toLowerCase())) return;

        try {
            const itemStat = await stat(itemPath);
            if (itemStat.isFile()) {
                countTotal++;
                const wasCleaned = await cleanSchemaInFile(itemPath);
                if (wasCleaned) {
                    console.log(`✅ Cleaned: ${item}`);
                    countCleaned++;
                }
            }
        } catch (e) {
            // Abaikan file yang tidak bisa diakses
        }
    });

    await Promise.all(tasks);

    console.log("-".repeat(50));
    console.log(`📊 HASIL PEMBERSIHAN (BUN OPTIMIZED)`);
    console.log(`📂 Total file HTML diproses : ${countTotal}`);
    console.log(`✨ File berhasil dibersihkan : ${countCleaned}`);
    console.log(`😴 File tidak memiliki markup schema   : ${countTotal - countCleaned}`);
    console.log("-".repeat(50));
}

runCleanerLocal();
