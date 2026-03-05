import { glob } from "glob";
import fs from "node:fs";
import path from "node:path";

// --- 1. KONFIGURASI SCANNER (Sama dengan carikembar.ts) ---
const allFiles = await glob("**/*.{py,ts,js,sh}", {
    ignore: [
        "node_modules/**", "dist/**", "artikel/**", "ext/**", 
        "sementara/**", "artikelx/**", "dapur/XXX/**", ".git/**"
    ]
});

// --- 2. KONFIGURASI SEARCHER (Sama dengan script cari kamu) ---
const SEARCH_DIR = './';
const SKIP_FOLDERS = new Set(['node_modules', '.git', 'img', 'sementara', 'artikelx', 'mini', 'XXX']);
const EXTENSIONS = new Set(['.html', '.js', '.yml', '.ts', '.py', '.css', '.json', '.sh']);

/**
 * Fungsi untuk mengecek apakah sebuah string (fileName) ada di dalam file lain
 */
function isStringInFile(filePath, query) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.includes(query);
    } catch (err) {
        return false;
    }
}

/**
 * Fungsi rekursif untuk mencari keberadaan string di seluruh direktori
 */
function checkExistenceGlobally(dir, query, originalFilePath) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (SKIP_FOLDERS.has(entry.name)) continue;
            if (checkExistenceGlobally(fullPath, query, originalFilePath)) return true;
            continue;
        }

        const ext = path.extname(entry.name).toLowerCase();
        if (!EXTENSIONS.has(ext)) continue;

        // Jangan hitung jika query ditemukan di dalam dirinya sendiri
        if (fullPath === originalFilePath) continue;

        if (isStringInFile(fullPath, query)) return true;
    }
    return false;
}

// --- 3. EKSEKUSI AUDIT ---
console.log("🚀 Memulai audit file 'Yatim Piatu'...");
const fileHilang: string[] = [];

for (const filePath of allFiles) {
    const fileName = path.basename(filePath);
    
    // Kita cari nama filenya saja (misal: 'audit-seo.ts') di file lain
    process.stdout.write(`🔍 Mengecek: ${fileName} ... `);
    
    const isUsed = checkExistenceGlobally(SEARCH_DIR, fileName, filePath);
    
    if (!isUsed) {
        console.log("❌ TIDAK DITEMUKAN");
        fileHilang.push(filePath);
    } else {
        console.log("✅ Digunakan");
    }
}

// --- 4. SIMPAN HASIL ---
const outputContent = fileHilang.length > 0 
    ? fileHilang.join('\n') 
    : "Semua file aktif ditemukan panggilannya di file lain.";

fs.writeFileSync('hilang.txt', outputContent, 'utf8');

console.log("\n---");
console.log(`📝 Selesai! Ada ${fileHilang.length} file yang tidak ditemukan panggilannya.`);
console.log(`📂 Daftar file hilang telah disimpan di: hilang.txt`);
