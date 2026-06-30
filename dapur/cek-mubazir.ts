import { readdir, stat } from "node:fs/promises";
import { join, basename, extname } from "node:path";

/**
 * KONFIGURASI SCANNER
 */
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'out', '.well-known'];
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.html', '.yml', '.yaml'];
const SCRIPT_NAME = basename(import.meta.url);

async function main() {
    // 1. Load package.json
    const pkgFile = Bun.file("./package.json");
    if (!(await pkgFile.exists())) {
        console.error("❌ Waduh, package.json mana? Pastikan jalankan di root ya.");
        return;
    }

    const pkg = await pkgFile.json();
    const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

    // 2. Periksa bun.lock (Penting untuk integritas instalasi)
    const lockFile = Bun.file("./bun.lock"); 
    // Catatan: Jika kamu pakai versi lama, mungkin namanya bun.lockb
    const lockFileOld = Bun.file("./bun.lockb");

    console.log(`\n--- 🛡️ INTEGRITY CHECK ---`);
    if (await lockFile.exists() || await lockFileOld.exists()) {
        console.log("✅ bun.lock ditemukan. Dependensi terkunci dengan aman.");
    } else {
        console.warn("⚠️ Peringatan: bun.lock tidak ditemukan! Jalankan `bun install` dulu Mas Bro.");
    }
    console.log(`--------------------------\n`);

    const usageMap = new Map<string, Set<string>>();
    allDeps.forEach(dep => usageMap.set(dep, new Set()));

    console.log(`🔍 Investigasi Paket Layar Kosong (JS/TS/HTML/YAML)... \n`);

    // 3. Fungsi Scan Rekursif
    async function scan(dir: string) {
        const items = await readdir(dir);

        const tasks = items.map(async (item) => {
            const fullPath = join(dir, item);
            if (IGNORE_DIRS.includes(item)) return;

            const s = await stat(fullPath);
            if (s.isDirectory()) {
                await scan(fullPath);
                return;
            }

            const ext = extname(item);
            if (EXTENSIONS.includes(ext) && item !== SCRIPT_NAME) {
                const content = await Bun.file(fullPath).text();

                allDeps.forEach(dep => {
                    const escapedDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(['"]${escapedDep}['"\/])|(\\b${escapedDep}\\b)`, 'g');

                    if (regex.test(content)) {
                        usageMap.get(dep)?.add(fullPath);
                    }
                });
            }
        });

        await Promise.all(tasks);
    }

    await scan("./");

    // 4. CETAK LAPORAN
    console.log('='.repeat(80));
    console.log('📊 LAPORAN PENGGUNAAN PAKET');
    console.log('='.repeat(80));

    const unused: string[] = [];

    usageMap.forEach((files, dep) => {
        if (files.size > 0) {
            console.log(`✅ ${dep.toUpperCase()} (${files.size} file)`);
        } else {
            unused.push(dep);
            console.log(`❌ ${dep.toUpperCase()} (TIDAK TERPAKAI)`);
        }
    });

    console.log('='.repeat(80));
    
    if (unused.length > 0) {
        console.log(`\n💡 Paket "Penumpang Gelap" ditemukan!`);
        console.log(`Untuk membersihkan, jalankan:`);
        console.log(`👉 bun remove ${unused.join(' ')}`);
        console.log(`\nSetelah itu, bun.lock akan otomatis terupdate.`);
    } else {
        console.log('\n✨ Bersih! Semua paket aman terkendali.');
    }
}

main();
