import { readdir, stat, rm, mkdir, rename, exists } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { $, BunFile } from "bun";

// --- CONFIG ---
const TARGET_KARANTINA = "./dapur/XXX";
const SCAN_FOLDERS = ["./dapur"]; // Fokus hanya di area pengembangan
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'out', 'XXX'];
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.html', '.yml', '.yaml', '.toml'];
// DAFTAR FILE JS YANG TIDAK BOLEH DISAPU (Pengecualian)
const PROTECTED_FILES = ['highlight.js'];
//////////
const SCRIPT_NAME = basename(import.meta.url);

// --- HELPER UNTUK CEK IDENTIK ---
async function getNormalizedContent(file: BunFile) {
    let text = await file.text();
    return text
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Hapus komentar
    .replace(/:\s*[a-zA-Z<>\[\]]+/g, '')    // Hapus Type Annotations sederhana
    .replace(/\s+/g, ' ')                   // Normalisasi whitespace
    .trim();
}

async function main() {
    console.log("🚀 MEMULAI OPERASI SUPER CLEANER (Layar Kosong Edition)\n");

    // ============================================================
    // 1. SAPU-NODE: Audit Dependensi
    // ============================================================
    console.log("🔍 LANGKAH 1: Sapu-Node (Audit Dependensi)");
    const pkgFile = Bun.file("./package.json");
    if (await pkgFile.exists()) {
        const pkg = await pkgFile.json();
        const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
        const packageToFiles = new Map<string, Set<string>>();

        allDeps.forEach(dep => packageToFiles.set(dep, new Set()));

        const scanner = async (dir: string) => {
            if (!(await exists(dir))) return;
            const items = await readdir(dir);
            for (const item of items) {
                const fullPath = join(dir, item);
                if (IGNORE_DIRS.includes(item)) continue;

                const s = await stat(fullPath);
                if (s.isDirectory()) {
                    await scanner(fullPath);
                } else if (EXTENSIONS.includes(extname(item)) && item !== SCRIPT_NAME) {
                    const content = await Bun.file(fullPath).text();
                    allDeps.forEach(dep => {
                        // Regex diperkuat: mencari import, require, atau pemanggilan string paket
                        const escapedDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(['"]${escapedDep}['"\/])|(\\b${escapedDep}\\b)`, 'g');
                        if (regex.test(content)) packageToFiles.get(dep)?.add(fullPath);
                    });
                }
            }
        };

        await scanner("./");

        const unused = allDeps.filter(dep => packageToFiles.get(dep)?.size === 0);

        if (unused.length > 0) {
            console.log(`   🧹 Menghapus ${unused.length} paket mubazir: ${unused.join(', ')}`);
            await $`bun remove ${unused}`.quiet();
        } else {
            console.log("   ✅ Tidak ada paket mubazir. Semua dependensi terpakai.");
        }
    }

    // ============================================================
    // 2. BEDAH-KODE & 3. CEK-IDENTIK (Digabung agar lebih efisien)
    // ============================================================
    console.log("\n🕵️ LANGKAH 2 & 3: Audit Isi File (.js vs .ts)");
    for (const folder of SCAN_FOLDERS) {
        if (!(await exists(folder))) continue;
        const files = await readdir(folder);

        // Filter file .js yang bukan bagian dari PROTECTED_FILES
        const jsFiles = files.filter(f =>
        extname(f) === '.js' && !PROTECTED_FILES.includes(f)
        );

        for (const jsFile of jsFiles) {
            const base = basename(jsFile, '.js');
            const tsFile = `${base}.ts`;

            // Hanya proses jika ada kembaran .ts-nya
            if (files.includes(tsFile)) {
                const jsPath = join(folder, jsFile);
                const tsPath = join(folder, tsFile);

                // --- 🧬 PROSES AUDIT IDENTITAS ---
                const cJs = await getNormalizedContent(Bun.file(jsPath));
                const cTs = await getNormalizedContent(Bun.file(tsPath));
                const status = (cJs === cTs) ? "\x1b[32m✅ IDENTIK\x1b[0m" : "\x1b[33m⚠️ BERBEDA\x1b[0m";

                console.log(`   📄 ${base.padEnd(25)} -> ${status}`);

                // --- 🕵️ TAMPILKAN DIFF JIKA BERBEDA ---
                if (cJs !== cTs) {
                    const proc = await $`diff -u -b -B ${jsPath} ${tsPath}`.nothrow().quiet();
                    const diffLines = proc.stdout.toString().split('\n')
                    .filter(l => (l.startsWith('+') || l.startsWith('-')) && !l.match(/^(\+\+\+|---)/))
                    .slice(0, 2); // Ambil 2 baris perbedaan teratas

                    diffLines.forEach(l => {
                        const color = l.startsWith('+') ? '\x1b[32m' : '\x1b[31m';
                        console.log(`      ${color}${l}\x1b[0m`);
                    });
                }
            }
        }
    }

    // ============================================================
    // 4. KARANTINA: Eksekusi Pemindahan
    // ============================================================
    console.log(`\n📦 LANGKAH 4: Karantina (Pemindahan ke ${TARGET_KARANTINA})`);
    if (!(await exists(TARGET_KARANTINA))) await mkdir(TARGET_KARANTINA, { recursive: true });

    let movedCount = 0;
    for (const folder of SCAN_FOLDERS) {
        if (!(await exists(folder))) continue;
        const files = await readdir(folder);

        // Hanya pindahkan JS yang punya kembaran TS DAN tidak masuk PROTECTED_FILES
        for (const tsFile of files.filter(f => extname(f) === '.ts')) {
            const jsFile = `${basename(tsFile, '.ts')}.js`;

            if (files.includes(jsFile) && !PROTECTED_FILES.includes(jsFile)) {
                await rename(join(folder, jsFile), join(TARGET_KARANTINA, jsFile));
                console.log(`   🚚 Moved to Karantina: ${jsFile}`);
                movedCount++;
            }
        }
    }

    console.log(`\n🔥 Finishing: Reinstalling Dependencies...`);
    // Jangan hapus node_modules jika di CI/Actions untuk menghemat waktu (kecuali jika package.json berubah)
    const isCI = process.env.GITHUB_ACTIONS === 'true';
    if (!isCI) {
        await rm('node_modules', { recursive: true, force: true }).catch(() => {});
        await rm('bun.lockb', { force: true }).catch(() => {});
    }
    await $`bun install`;

    console.log("\n" + "=".repeat(50));
    console.log(`\n✨ SELESAI! ${movedCount} file .js masuk XXX.`);
    console.log("=".repeat(50));
}

main().catch(console.error);