import { readdir, stat, rm } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { $ } from "bun";

/**
 * KONFIGURASI
 */
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'out', '.well-known'];
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.html', '.yml', '.yaml'];
const SCRIPT_NAME = basename(import.meta.url);

async function main() {
    console.log("🚀 Memulai Operasi Sapu Bersih (Full Bun Migration)...");

    // 1. LOAD PACKAGE.JSON
    const pkgFile = Bun.file("./package.json");
    if (!(await pkgFile.exists())) {
        console.error("❌ package.json tidak ketemu!");
        return;
    }
    const pkg = await pkgFile.json();
    const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const usageMap = new Map<string, number>();
    allDeps.forEach(dep => usageMap.set(dep, 0));

    // 2. SCAN PENGGUNAAN (DETEKTIF MUBAZIR)
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
                    if (regex.test(content)) usageMap.set(dep, (usageMap.get(dep) || 0) + 1);
                });
            }
        }
    }

    console.log("🔍 Menganalisis paket yang tidak terpakai...");
    await scan("./");

    // Filter paket mubazir (kecuali wrangler/paket penting lainnya)
    const unused = allDeps.filter(dep => usageMap.get(dep) === 0 && dep !== 'wrangler');

    // 3. EKSEKUSI PENGHAPUSAN PAKET
    if (unused.length > 0) {
        console.log(`🧹 Menghapus ${unused.length} paket mubazir: ${unused.join(', ')}`);
        await $`bun remove ${unused}`;
    } else {
        console.log("✨ Tidak ada paket mubazir. Semua bersih!");
    }

    // 4. HARD RESET (HAPUS JEJAK NON-BUN)
    console.log("🔥 Melakukan Hard Reset & Pembersihan Lockfile...");
    const garbage = ['node_modules', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];
    for (const target of garbage) {
        await rm(target, { recursive: true, force: true }).catch(() => {});
    }

    // 5. FRESH INSTALL
    console.log("📦 Menginstal ulang dependensi (Murni Bun)...");
    await $`bun install`;

    console.log("\n✅ SEMUA SELESAI! Repo Layar Kosong sekarang super ramping dan murni Bun.");
}

main().catch(console.error);
