import { readdir, stat, rm, mkdir, rename, exists } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { $, BunFile } from "bun";

// --- CONFIG ---
const TARGET_KARANTINA = "./dapur/XXX";
const SCAN_FOLDERS = ["./dapur"];
const IGNORE_DIRS = ['node_modules', 'ext', '.git', 'dist', 'out', 'XXX'];
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.html', '.yml', '.yaml', '.toml'];
const SCRIPT_NAME = basename(import.meta.url);

// --- HELPER UNTUK CEK IDENTIK ---
async function getNormalizedContent(file: BunFile) {
    let text = await file.text();
    return text
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Hapus komentar
        .replace(/:\s*[a-zA-Z<>\[\]]+/g, '')    // Hapus Type Annotations
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
            const items = await readdir(dir);
            for (const item of items) {
                const fullPath = join(dir, item);
                if (IGNORE_DIRS.includes(item)) continue;
                const s = await stat(fullPath);
                if (s.isDirectory()) await scanner(fullPath);
                else if (EXTENSIONS.includes(extname(item)) && item !== SCRIPT_NAME) {
                    const content = await Bun.file(fullPath).text();
                    allDeps.forEach(dep => {
                        const regex = new RegExp(`(['"]${dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\/])|(\\b${dep}\\b)`, 'g');
                        if (regex.test(content)) packageToFiles.get(dep)?.add(fullPath);
                    });
                }
            }
        };
        await scanner("./");
        
        const unused: string[] = [];
        packageToFiles.forEach((paths, dep) => {
            if (paths.size === 0) unused.push(dep);
        });
        console.log(`   ✅ Audit selesai. Ditemukan ${unused.length} paket mubazir.\n`);
    }

    // ============================================================
    // 2. BEDAH-KODE: Tampilkan Perbedaan Visual
    // ============================================================
    console.log("🕵️ LANGKAH 2: Bedah-Kode (Diff Visual)");
    for (const folder of SCAN_FOLDERS) {
        if (!(await exists(folder))) continue;
        const files = await readdir(folder);
        const jsFiles = files.filter(f => extname(f) === '.js');

        for (const jsFile of jsFiles) {
            const base = basename(jsFile, '.js');
            const tsFile = `${base}.ts`;
            if (files.includes(tsFile)) {
                console.log(`   🔍 Perbedaan di ${base}:`);
                const proc = await $`diff -u -b -B ${join(folder, jsFile)} ${join(folder, tsFile)}`.nothrow().quiet();
                const diffLines = proc.stdout.toString().split('\n')
                    .filter(line => (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('---') && !line.startsWith('+++'))
                    .slice(0, 3); // Ambil 3 baris saja buat preview
                diffLines.forEach(l => console.log(`      ${l.startsWith('+') ? '\x1b[32m' : '\x1b[31m'}${l}\x1b[0m`));
            }
        }
    }
    console.log("");

    // ============================================================
    // 3. CEK-IDENTIK: Verifikasi Logika Inti
    // ============================================================
    console.log("🧬 LANGKAH 3: Cek-Identik (Verifikasi Logika)");
    for (const folder of SCAN_FOLDERS) {
        if (!(await exists(folder))) continue;
        const files = await readdir(folder);
        const jsFiles = files.filter(f => extname(f) === '.js');

        for (const jsFile of jsFiles) {
            const base = basename(jsFile, '.js');
            const tsFile = `${base}.ts`;
            if (files.includes(tsFile)) {
                const cJs = await getNormalizedContent(Bun.file(join(folder, jsFile)));
                const cTs = await getNormalizedContent(Bun.file(join(folder, tsFile)));
                const status = (cJs === cTs) ? "✅ IDENTIK" : "⚠️ BERBEDA";
                console.log(`   📄 ${base.padEnd(25)} -> ${status}`);
            }
        }
    }
    console.log("");

    // ============================================================
    // 4. KARANTINA: Eksekusi Pemindahan
    // ============================================================
    console.log(`📦 LANGKAH 4: Karantina (Pemindahan ke ${TARGET_KARANTINA})`);
    if (!(await exists(TARGET_KARANTINA))) await mkdir(TARGET_KARANTINA, { recursive: true });

    let movedCount = 0;
    for (const folder of SCAN_FOLDERS) {
        if (!(await exists(folder))) continue;
        const files = await readdir(folder);
        for (const f of files.filter(f => extname(f) === '.ts')) {
            const jsFile = `${basename(f, '.ts')}.js`;
            if (files.includes(jsFile)) {
                await rename(join(folder, jsFile), join(TARGET_KARANTINA, jsFile));
                movedCount++;
            }
        }
    }

    console.log(`\n🔥 Finishing: Reinstalling Dependencies...`);
    await rm('node_modules', { recursive: true, force: true }).catch(() => {});
    await $`bun install`;

    console.log("\n" + "=".repeat(50));
    console.log(`✨ SELESAI! ${movedCount} file .js masuk XXX. Dapur sudah steril.`);
    console.log("=".repeat(50));
}

main().catch(console.error);
