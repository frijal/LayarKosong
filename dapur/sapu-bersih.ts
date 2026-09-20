import { readdir, stat, rm, mkdir, rename, exists } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { $, BunFile } from "bun";

// --- CONFIG ---
const TARGET_KARANTINA = "./dapur/XXX";
const SCAN_FOLDERS = ["./dapur"]; // Fokus hanya di area pengembangan
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'out', 'XXX'];
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.html', '.yml', '.yaml', '.toml'];

// DAFTAR FILE JS YANG TIDAK BOLEH DISAPU
const PROTECTED_FILES = ['highlight.js'];

// DAFTAR PAKET/PREFIX UNTUK DIKECUALIKAN DARI LAPORAN AUDIT (Dev Tools, Types, CLI)
const IGNORE_AUDIT_PREFIXES = [
  '@types/',
  'typescript',
  'wrangler',
  'bun-types',
  'eslint',
  'prettier'
];

const SCRIPT_NAME = basename(import.meta.url);

// --- HELPER UNTUK CEK IDENTIK ---
async function getNormalizedContent(file: BunFile) {
    let text = await file.text();
    return text
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Hapus komentar
        .replace(/\s+/g, ' ')                   // Normalisasi whitespace
        .trim();
}

async function main() {
    console.log("🚀 MEMULAI OPERASI SUPER CLEANER (Layar Kosong Edition)\n");

    // ============================================================
    // 1. SAPU-NODE: Audit Dependensi (Laporan Sahaja - Zero Deletion)
    // ============================================================
    console.log("🔍 LANGKAH 1: Sapu-Node (Audit Dependensi - Read Only)");
    const pkgFile = Bun.file("./package.json");
    if (await pkgFile.exists()) {
        const pkg = await pkgFile.json();
        const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
        
        // Filter agar dev tools & types tidak mengotori laporan audit
        const scanableDeps = allDeps.filter(dep => 
            !IGNORE_AUDIT_PREFIXES.some(prefix => dep.startsWith(prefix))
        );

        const packageToFiles = new Map<string, Set<string>>();
        scanableDeps.forEach(dep => packageToFiles.set(dep, new Set()));

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
                    scanableDeps.forEach(dep => {
                        const escapedDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(['"]${escapedDep}(?:/[^'"]*)?['"])`, 'g');
                        if (regex.test(content)) packageToFiles.get(dep)?.add(fullPath);
                    });
                }
            }
        };

        await scanner("./");

        const unused = scanableDeps.filter(dep => packageToFiles.get(dep)?.size === 0);

        if (unused.length > 0) {
            console.log(`   ℹ️ [CATATAN AUDIT] Terdeteksi ${unused.length} paket tidak dipanggil via import: ${unused.join(', ')}`);
            console.log(`   🔒 KETENTUAN HAK AKSES: Script ini TIDAK DIANUGERAHKAN IZIN untuk menghapus baris di package.json. Paket tetap aman.`);
        } else {
            console.log("   ✅ Semua dependensi terdeteksi aktif digunakan.");
        }
    }

    // ============================================================
    // 2. BEDAH-KODE & 3. CEK-IDENTIK (.js vs .ts)
    // ============================================================
    console.log("\n🕵️ LANGKAH 2 & 3: Audit Isi File (.js vs .ts)");
    for (const folder of SCAN_FOLDERS) {
        if (!(await exists(folder))) continue;
        const files = await readdir(folder);

        const jsFiles = files.filter(f =>
            extname(f) === '.js' && !PROTECTED_FILES.includes(f)
        );

        for (const jsFile of jsFiles) {
            const base = basename(jsFile, '.js');
            const tsFile = `${base}.ts`;

            if (files.includes(tsFile)) {
                const jsPath = join(folder, jsFile);
                const tsPath = join(folder, tsFile);

                const cJs = await getNormalizedContent(Bun.file(jsPath));
                const cTs = await getNormalizedContent(Bun.file(tsPath));
                const status = (cJs === cTs) ? "\x1b[32m✅ IDENTIK\x1b[0m" : "\x1b[33m⚠️ BERBEDA\x1b[0m";

                console.log(`   📄 ${base.padEnd(25)} -> ${status}`);

                if (cJs !== cTs) {
                    const proc = await $`diff -u -b -B ${jsPath} ${tsPath}`.nothrow().quiet();
                    const diffLines = proc.stdout.toString().split('\n')
                        .filter(l => (l.startsWith('+') || l.startsWith('-')) && !l.match(/^(\+\+\+|---)/))
                        .slice(0, 2);

                    diffLines.forEach(l => {
                        const color = l.startsWith('+') ? '\x1b[32m' : '\x1b[31m';
                        console.log(`      ${color}${l}\x1b[0m`);
                    });
                }
            }
        }
    }

    // ============================================================
    // 4. KARANTINA: Pemindahan File JS Redundan ke /XXX
    // ============================================================
    console.log(`\n📦 LANGKAH 4: Karantina Berkas JS Redundan (Pemindahan ke ${TARGET_KARANTINA})`);
    if (!(await exists(TARGET_KARANTINA))) await mkdir(TARGET_KARANTINA, { recursive: true });

    let movedCount = 0;
    for (const folder of SCAN_FOLDERS) {
        if (!(await exists(folder))) continue;
        const files = await readdir(folder);

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
    const isCI = process.env.GITHUB_ACTIONS === 'true';
    if (!isCI) {
        await rm('node_modules', { recursive: true, force: true }).catch(() => {});
        await rm('bun.lockb', { force: true }).catch(() => {});
    }
    await $`bun install`;

    console.log("\n" + "=".repeat(50));
    console.log(`\n✨ SELESAI! ${movedCount} file .js dikarantina ke ${TARGET_KARANTINA}. package.json utuh 100%.`);
    console.log("=".repeat(50));
}

main().catch(console.error);
