import { readdir, stat, rm } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { $ } from "bun";

/**
 * CONFIG: Menyertakan folder .github dan dapur agar audit menyeluruh.
 */
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'out', '.well-known'];
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.html', '.yml', '.yaml', '.toml'];
const SCRIPT_NAME = basename(import.meta.url);

async function main() {
    console.log("🚀 Memulai Operasi Sapu Bersih (Audit Full Path & Counter)...");

    const pkgFile = Bun.file("./package.json");
    if (!(await pkgFile.exists())) return;

    const pkg = await pkgFile.json();
    const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    
    // Tracker untuk menyimpan Set path untuk setiap paket
    const usageTracker = new Map<string, Set<string>>();
    allDeps.forEach(dep => usageTracker.set(dep, new Set()));

    async function scan(dir: string) {
        const items = await readdir(dir);
        for (const item of items) {
            const fullPath = join(dir, item);
            if (IGNORE_DIRS.includes(item)) continue;

            const s = await stat(fullPath);
            if (s.isDirectory()) {
                await scan(fullPath);
            } else if (EXTENSIONS.includes(extname(item)) && item !== SCRIPT_NAME) {
                const content = await Bun.file(fullPath).text();
                
                allDeps.forEach(dep => {
                    const escapedDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    // Deteksi di import, require, shell commands, atau string config
                    const regex = new RegExp(`(['"]${escapedDep}['"\/])|(\\b${escapedDep}\\b)`, 'g');
                    
                    if (regex.test(content)) {
                        usageTracker.get(dep)?.add(fullPath);
                    }
                });
            }
        }
    }

    console.log("🔍 Memindai seluruh folder untuk melacak jejak paket...");
    await scan("./");

    console.log("\n" + "=".repeat(80));
    console.log("📋 LAPORAN AUDIT PENGGUNAAN PAKET LAYAR KOSONG");
    console.log("=".repeat(80));

    const unused: string[] = [];

    usageTracker.forEach((paths, dep) => {
        const count = paths.size;
        if (count > 0) {
            console.log(`✅ ${dep.toUpperCase()} (${count} lokasi)`);
            // Menampilkan list path secara vertikal agar mudah dibaca
            paths.forEach(p => console.log(`   └─ ${p}`));
            console.log(""); // Beri jarak antar paket
        } else {
            unused.push(dep);
            console.log(`❌ ${dep.toUpperCase()} (0 lokasi)`);
            console.log(`   └─ Status: SIAP DIHAPUS\n`);
        }
    });

    console.log("=".repeat(80));

    // Eksekusi penghapusan paket mubazir
    if (unused.length > 0) {
        console.log(`🧹 Menghapus ${unused.length} paket mubazir...`);
        await $`bun remove ${unused}`;
    }

    // Hard Reset Ekosistem (Migrasi Total ke Bun)
    console.log("\n🔥 Hard Reset: Menghapus lockfile lama & Reinstall via Bun...");
    const garbage = ['node_modules', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];
    for (const target of garbage) {
        await rm(target, { recursive: true, force: true }).catch(() => {});
    }

    await $`bun install`;

    console.log("\n✨ SEMUA SELESAI! Dapur Layar Kosong sekarang super ramping dan transparan.");
}

main().catch(console.error);
