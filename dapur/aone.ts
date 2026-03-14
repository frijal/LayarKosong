import { file, write, Glob } from "bun";
import { basename } from "node:path";

// --- 1. KONFIGURASI ---
const IGNORE_PATTERNS = [
    "node_modules/**", "dist/**", "mini/**", "ext/**",
"sementara/**", "artikelx/**", "dapur/XXX/**", ".git/**", "functions/**"
];

const globScanner = new Glob("**/*.{webp}");
const targetScanner = new Glob("**/*.html");

// --- 2. PROSES AUDIT ---
console.log("🔍 Memulai audit referensi gambar... (ini mungkin butuh waktu)");

// Scan semua gambar dan target file
const allImages = await Array.fromAsync(globScanner.scan({ ignore: IGNORE_PATTERNS }));
const allTargetFiles = await Array.fromAsync(targetScanner.scan({ ignore: IGNORE_PATTERNS }));

// Load semua isi HTML ke memori untuk efisiensi pencarian (Opsional tapi jauh lebih cepat)
const targetContents = await Promise.all(
    allTargetFiles.map(async (p) => await file(p).text())
);

const fileHilang: string[] = [];

// --- 3. EKSEKUSI (Logika sama, tanpa log per-file) ---
for (const imgPath of allImages) {
    const nameOnly = basename(imgPath);

    // Cek apakah nama gambar ada di salah satu isi file HTML
    const isUsed = targetContents.some(content => content.includes(nameOnly));

    if (!isUsed) {
        fileHilang.push(imgPath);
    }
}

// --- 4. OUTPUT FINAL ---
const resultData = fileHilang.length > 0
? fileHilang.join("\n")
: "Semua file ditemukan referensinya.";

await write("hilang.txt", resultData);

console.log(`✅ Audit selesai!`);
console.log(`📊 Total gambar dipindai: ${allImages.length}`);
console.log(`📝 File jomblo ditemukan: ${fileHilang.length}`);
console.log(`💾 Hasil disimpan di: hilang.txt`);
