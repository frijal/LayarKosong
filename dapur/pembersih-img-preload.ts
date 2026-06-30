import { Glob } from "bun";
import { join } from "path";

// Pola Regex untuk kedua format yang biasa muncul
const patterns = [
  /<link\s+[^>]*href=["']?[^" >]+["']?\s+fetchpriority=high\s+as=image\s+rel=preload[^>]*>/gi,
  /<link\s+rel=["']preload["']\s+as=["']image["']\s+href=["'][^"']*["']\s+fetchpriority=["']high["'][^>]*>/gi
];

// Target direktori (folder root di atas dapur/)
const rootDir = "..";
const glob = new Glob("**/*.html");
let totalFilesCleaned = 0;

console.log("🚀 Memulai pembersihan dari folder dapur/ menuju root...");

// Scan file di folder root (..)
for await (const relativePath of glob.scan(rootDir)) {
  // Gabungkan path untuk mendapatkan lokasi file yang akurat
  const fullPath = join(rootDir, relativePath);
  const file = Bun.file(fullPath);
  
  let content = await file.text();
  const originalContent = content;

  // Jalankan replace untuk semua pola
  for (const pattern of patterns) {
    content = content.replace(pattern, "");
  }

  // Tulis ulang hanya jika konten berubah
  if (content !== originalContent) {
    await Bun.write(fullPath, content);
    console.log(`✅ Dibersihkan: ${relativePath}`);
    totalFilesCleaned++;
  }
}

console.log(`\n🎉 Selesai! ${totalFilesCleaned} file telah dibersihkan.`);
