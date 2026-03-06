import { file, write } from "bun";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename, extname } from "node:path";

// --- 1. KONFIGURASI SCANNER (Pakai Bun.Glob bawaan) ---
const globScanner = new Bun.Glob("**/*.{py,ts,js,sh}");

const allFiles = await Array.fromAsync(globScanner.scan({
    ignore: [
        "node_modules/**", "dist/**", "mini", "artikel/**", "ext/**",
        "sementara/**", "artikelx/**", "dapur/XXX/**", ".git/**", "functions/**"
    ]
}));

// --- 2. KONFIGURASI SEARCHER ---
const SEARCH_DIR = './';
const SKIP_FOLDERS = new Set(['node_modules', '.git', 'img', 'sementara', 'artikelx', 'mini', 'XXX']);
const EXTENSIONS = new Set(['.html', '.js', '.yml', '.ts', '.py', '.css', '.json', '.sh']);

/**
 * Cek keberadaan string di dalam file (Fast Stream)
 */
async function isStringInFile(filePath: string, query: string): Promise<boolean> {
    try {
        const content = await file(filePath).text();
        return content.includes(query);
    } catch {
        return false;
    }
}

/**
 * Rekursif: Cari string ke seluruh penjuru dapur
 */
async function checkExistenceGlobally(dir: string, query: string, originalPath: string): Promise<boolean> {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
            if (SKIP_FOLDERS.has(entry.name)) continue;
            if (await checkExistenceGlobally(fullPath, query, originalPath)) return true;
            continue;
        }

        const ext = extname(entry.name).toLowerCase();
        if (!EXTENSIONS.has(ext)) continue;

        // Jangan cek diri sendiri
        if (fullPath.includes(originalPath)) continue;

        if (await isStringInFile(fullPath, query)) return true;
    }
    return false;
}

// --- 3. EKSEKUSI ---
console.log(`🔍 Memulai audit referensi untuk ${allFiles.length} file...`);
const fileHilang: string[] = [];

for (const filePath of allFiles) {
    const nameOnly = basename(filePath);

    // Tampilkan progres di terminal agar tidak dikira hang
    process.stdout.write(`🔎 Check: ${nameOnly} ... `);

    const isUsed = await checkExistenceGlobally(SEARCH_DIR, nameOnly, filePath);

    if (!isUsed) {
        console.log("❌ HILANG");
        fileHilang.push(filePath);
    } else {
        console.log("✅ OK");
    }
}

// --- 4. OUTPUT KE hilang.txt ---
const resultData = fileHilang.join("\n");
await write("hilang.txt", resultData || "Semua file ditemukan referensinya.");

console.log("\n---");
console.log(`✅ Selesai! ${fileHilang.length} file masuk daftar hilang.txt`);
