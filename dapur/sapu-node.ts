import { readdir, stat, rm } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { $ } from "bun";

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'out', '.well-known'];
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.html', '.yml', '.yaml', '.toml'];
const SCRIPT_NAME = basename(import.meta.url);

async function main() {
    console.log("🚀 Memulai Operasi Sapu Node (Dual Audit Mode)...");

    const pkgFile = Bun.file("./package.json");
    if (!(await pkgFile.exists())) return;

    const pkg = await pkgFile.json();
    const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    
    // Map untuk Output 1: Paket -> List Files
    const packageToFiles = new Map<string, Set<string>>();
    // Map untuk Output 2: File -> List Pakets
    const fileToPackages = new Map<string, Set<string>>();

    allDeps.forEach(dep => packageToFiles.set(dep, new Set()));

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
                    const regex = new RegExp(`(['"]${escapedDep}['"\/])|(\\b${escapedDep}\\b)`, 'g');
                    
                    if (regex.test(content)) {
                        // Isi data untuk Output 1
                        packageToFiles.get(dep)?.add(fullPath);
                        
                        // Isi data untuk Output 2
                        if (!fileToPackages.has(fullPath)) fileToPackages.set(fullPath, new Set());
                        fileToPackages.get(fullPath)?.add(dep.toUpperCase());
                    }
                });
            }
        }
    }

    console.log("🔍 Memindai folder dan workflow...");
    await scan("./");

    // --- OUTPUT 1: BERDASARKAN PAKET ---
    console.log("\n" + "=".repeat(80));
    console.log("📋 LAPORAN 1: AUDIT PENGGUNAAN PER PAKET");
    console.log("=".repeat(80));

    const unused: string[] = [];
    packageToFiles.forEach((paths, dep) => {
        if (paths.size > 0) {
            console.log(`✅ ${dep.toUpperCase()} (${paths.size} lokasi)`);
            Array.from(paths).sort().forEach(p => console.log(`   └─ ${p}`));
            console.log("");
        } else {
            unused.push(dep);
            console.log(`❌ ${dep.toUpperCase()} (0 lokasi) - SIAP DIHAPUS\n`);
        }
    });

    // --- OUTPUT 2: BERDASARKAN PATH SCRIPT (DURUTKAN) ---
    console.log("\n" + "=".repeat(80));
    console.log("📋 LAPORAN 2: DAFTAR DEPENDENSI PER PATH SCRIPT");
    console.log("=".repeat(80));
    
    // Urutkan path secara alfabetis
    const sortedPaths = Array.from(fileToPackages.keys()).sort();
    
    sortedPaths.forEach(path => {
        const deps = Array.from(fileToPackages.get(path) || []).sort().join(", ");
        console.log(`${path.padEnd(50)} -> ${deps}`);
    });
    console.log("=".repeat(80));

    // --- EKSEKUSI PEMBERSIHAN ---
    if (unused.length > 0) {
        console.log(`🧹 Menghapus ${unused.length} paket mubazir...`);
        await $`bun remove ${unused}`;
    }

    console.log("\n🔥 Hard Reset & Reinstall...");
    const garbage = ['node_modules', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];
    for (const target of garbage) {
        await rm(target, { recursive: true, force: true }).catch(() => {});
    }

    await $`bun install`;
    console.log("\n✨ SEMUA SELESAI! Dapur Layar Kosong makin rapi.");
}

main().catch(console.error);
