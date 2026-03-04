import { readdir, stat, rm } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { $ } from "bun";

/**
 * CONFIG: Menyertakan folder .github agar penggunaan di workflow terdeteksi.
 */
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'out', '.well-known'];
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.html', '.yml', '.yaml', '.toml'];
const SCRIPT_NAME = basename(import.meta.url);

async function main() {
    console.log("🚀 Memulai Operasi Sapu Bersih (Audit Full-Path & Workflows)...");

    const pkgFile = Bun.file("./package.json");
    if (!(await pkgFile.exists())) return;

    const pkg = await pkgFile.json();
    const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    
    const usageTracker = new Map<string, Set<string>>();
    allDeps.forEach(dep => usageTracker.set(dep, new Set()));

    async function scan(dir: string) {
        const items = await readdir(dir);
        for (const item of items) {
            const fullPath = join(dir, item);
            
            // Jangan skip folder .github
            if (IGNORE_DIRS.includes(item)) continue;

            const s = await stat(fullPath);
            if (s.isDirectory()) {
                await scan(fullPath);
            } else if (EXTENSIONS.includes(extname(item)) && item !== SCRIPT_NAME) {
                const content = await Bun.file(fullPath).text();
                
                allDeps.forEach(dep => {
                    // Regex fleksibel: mendeteksi paket di import, script shell, atau command YAML/bunx
                    const escapedDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(['"]${escapedDep}['"\/])|(\\b${escapedDep}\\b)`, 'g');
                    
                    if (regex.test(content)) {
                        usageTracker.get(dep)?.add(fullPath);
                    }
                });
            }
        }
    }

    console.log("🔍 Memindai seluruh kode dan GitHub Workflows...");
    await scan("./");

    console.log("\n" + "=".repeat(60));
    console.log("📋 AUDIT PENGGUNAAN PAKET LAYAR KOSONG");
    console.log("=".repeat(60));

    const unused: string[] = [];

    usageTracker.forEach((paths, dep) => {
        if (paths.size > 0) {
            console.log(`✅ ${dep.toUpperCase()}`);
            console.log(`   Ditemukan di: ${Array.from(paths).join(', ')}`);
        } else {
            unused.push(dep);
            console.log(`❌ ${dep.toUpperCase()}: Tidak terdeteksi penggunaan.`);
        }
    });

    console.log("=".repeat(60));

    // Eksekusi penghapusan otomatis
    if (unused.length > 0) {
        console.log(`🧹 Membuang paket mubazir: ${unused.join(', ')}`);
        await $`bun remove ${unused}`;
    }

    // Hard Reset Ekosistem
    console.log("\n🔥 Hard Reset: Menghapus lockfile lama & Reinstall via Bun...");
    const garbage = ['node_modules', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];
    for (const target of garbage) {
        await rm(target, { recursive: true, force: true }).catch(() => {});
    }

    // Instalasi murni menggunakan Bun
    await $`bun install`;

    console.log("\n✨ SEMUA SELESAI! Repo murni Bun, ramping, dan siap deploy.");
}

main().catch(console.error);
