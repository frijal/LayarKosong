import { readdir, mkdir, rename, exists } from "node:fs/promises";
import { join, basename, extname } from "node:path";

const TARGET_KARANTINA = "./dapur/XXX";
const SCAN_FOLDERS = ["./dapur", "./ext"];

async function main() {
    console.log(`📦 Memulai operasi karantina ke ${TARGET_KARANTINA}...\n`);

    // 1. Pastikan folder penampung ada
    if (!(await exists(TARGET_KARANTINA))) {
        await mkdir(TARGET_KARANTINA, { recursive: true });
        console.log(`📁 Folder ${TARGET_KARANTINA} berhasil dibuat.`);
    }

    let movedCount = 0;

    for (const folder of SCAN_FOLDERS) {
        if (!(await exists(folder))) continue;

        const files = await readdir(folder);
        // Ambil semua file .ts di folder tersebut
        const tsFiles = files.filter(f => extname(f) === '.ts');

        for (const tsFile of tsFiles) {
            const baseName = basename(tsFile, '.ts');
            const jsFile = `${baseName}.js`;
            const jsPath = join(folder, jsFile);

            // Jika ada file .js dengan nama yang sama
            if (files.includes(jsFile)) {
                const destination = join(TARGET_KARANTINA, jsFile);
                
                try {
                    await rename(jsPath, destination);
                    console.log(`🚚 [${folder}] ${jsFile} -> XXX/`);
                    movedCount++;
                } catch (err) {
                    console.error(`❌ Gagal memindahkan ${jsFile}:`, err);
                }
            }
        }
    }

    console.log("\n" + "=".repeat(40));
    console.log(`✨ SELESAI! ${movedCount} file .js berhasil diamankan.`);
    console.log(`Dapur kamu sekarang 100% TypeScript (Native Bun).`);
    console.log("=".repeat(40));
}

main().catch(console.error);
