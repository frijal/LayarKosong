import { readdir, stat } from "node:fs/promises";
import { join, basename, extname } from "node:path";

/**
 * KONFIGURASI SCANNER
 */
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'out', '.well-known'];
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.html', '.yml', '.yaml'];
const SCRIPT_NAME = basename(import.meta.url);

async function main() {
    // 1. Load package.json menggunakan Bun.file
    const pkgFile = Bun.file("./package.json");
    if (!(await pkgFile.exists())) {
        console.error("❌ Waduh, package.json mana? Pastikan jalankan di root ya.");
        return;
    }

    const pkg = await pkgFile.json();
    const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

    // Tempat menyimpan hasil investigasi
    const usageMap = new Map<string, Set<string>>();
    allDeps.forEach(dep => usageMap.set(dep, new Set()));

    console.log(`🔍 Investigasi Paket Layar Kosong (JS/TS/HTML/YAML)... \n`);

    // 2. Fungsi Scan Rekursif (Asynchronous)
    async function scan(dir: string) {
        const items = await readdir(dir);

        const tasks = items.map(async (item) => {
            const fullPath = join(dir, item);

            // Skip folder yang tidak perlu
            if (IGNORE_DIRS.includes(item)) return;

            const s = await stat(fullPath);
            if (s.isDirectory()) {
                await scan(fullPath);
                return;
            }

            // Filter file berdasarkan ekstensi
            const ext = extname(item);
            if (EXTENSIONS.includes(ext) && item !== SCRIPT_NAME) {
                const content = await Bun.file(fullPath).text();

                allDeps.forEach(dep => {
                    // Regex fleksibel untuk import, require, atau CLI command di YAML
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

    // 3. CETAK LAPORAN
    console.log('='.repeat(80));
    console.log('📊 LAPORAN PENGGUNAAN PAKET (TOTAL SCAN)');
    console.log('='.repeat(80));

    const unused: string[] = [];

    usageMap.forEach((files, dep) => {
        if (files.size > 0) {
            console.log(`✅ ${dep.toUpperCase()}`);
            console.log(`   Ditemukan di ${files.size} file.`);
            // Tampilkan 3 lokasi pertama saja biar tidak banjir log
            const locations = Array.from(files).slice(0, 3);
            locations.forEach(f => console.log(`   - ${f}`));
            if (files.size > 3) console.log(`   - ...dan ${files.size - 3} lainnya.`);
            console.log('');
        } else {
            unused.push(dep);
            console.log(`❌ ${dep.toUpperCase()}`);
            console.log(`   (SAMA SEKALI TIDAK DITEMUKAN)\n`);
        }
    });

    console.log('='.repeat(80));
    if (unused.length > 0) {
        console.log(`\n💡 Mas Bro, paket ini resmi jadi "penumpang gelap":`);
        console.log(`👉 bun remove ${unused.join(' ')}`);
    } else {
        console.log('\n✨ Bersih! Semua paket ternyata punya andil di kode atau workflow.');
    }
    console.log('='.repeat(80) + '\n');
}

main();
