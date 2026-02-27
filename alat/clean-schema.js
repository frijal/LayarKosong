// cleaner.js
import { readdir, stat } from "node:fs/promises";
import { join, resolve, extname } from "node:path";

// ======================================================
// KONFIGURASI PEMBERSIH (OPTIMIZED FOR BUN)
// ======================================================
const TARGET_FOLDER = Bun.argv[2] || './artikelx/';
const SCHEMA_REGEX = /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi;
const EXTENSIONS = [".html", ".htm"];

async function cleanSchemaInFile(filePath) {
    try {
        const file = Bun.file(filePath);
        const content = await file.text();

        // Pakai Regex.test dulu biar nggak perlu write kalau nggak ada perubahan
        if (SCHEMA_REGEX.test(content)) {
            const cleanedContent = content.replace(SCHEMA_REGEX, "");
            
            // Bun.write jauh lebih cepat dibanding fs.writeFileSync
            await Bun.write(filePath, cleanedContent);
            return true;
        }
        return false;
    } catch (err) {
        console.error(`❌ Error pada ${filePath}: ${err.message}`);
        return false;
    }
}

async function runCleanerLocal() {
    const absolutePath = resolve(TARGET_FOLDER);
    
    // Cek folder pakai Bun.file().exists()
    if (!(await Bun.file(absolutePath).exists) && (await stat(absolutePath).catch(() => ({ isDirectory: () => false }))).isDirectory() === false) {
        // Fallback check simple
        try { await readdir(absolutePath) } catch {
            console.error(`❌ Folder tidak ditemukan atau bukan direktori: ${absolutePath}`);
            return;
        }
    }

    console.log(`\n🧹 Memulai pembersihan STRICT LOCAL (Bun Mode) di: ${absolutePath}`);
    console.log("⚠️  Non-Recursive Mode: Sub-folder tidak akan disentuh.");
    console.log("-".repeat(50));
    
    let countCleaned = 0;
    let countTotal = 0;

    // Ambil semua file di folder tersebut
    const items = await readdir(absolutePath);

    // Kita pakai Promise.all agar prosesnya paralel (Concurrent), bukan satu-satu (Sequential)
    // Ini yang bikin Bun makin berasa ngebutnya.
    const tasks = items.map(async (item) => {
        const itemPath = join(absolutePath, item);
        const itemStat = await stat(itemPath);

        const isHtml = EXTENSIONS.includes(extname(item).toLowerCase());

        if (itemStat.isFile() && isHtml) {
            countTotal++;
            const wasCleaned = await cleanSchemaInFile(itemPath);
            if (wasCleaned) {
                console.log(`✅ Cleaned: ${item}`);
                countCleaned++;
            }
        }
    });

    await Promise.all(tasks);

    console.log("-".repeat(50));
    console.log(`📊 HASIL PEMBERSIHAN (BUN OPTIMIZED)`);
    console.log(`📂 Total file HTML ditemukan : ${countTotal}`);
    console.log(`✨ File yang dibersihkan      : ${countCleaned}`);
    console.log(`😴 File sudah bersih          : ${countTotal - countCleaned}`);
    console.log("-".repeat(50));
}

runCleanerLocal();
