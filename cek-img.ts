// check-files.ts
import { Glob } from "bun";

// Kita buat daftar pola regex untuk menangkap kedua format
const patterns = [
  // Format 1: Tanpa kutip, atribut acak (mengandalkan kehadiran keyword)
  /<link\s+[^>]*href=["']?[^" >]+["']?\s+fetchpriority=high\s+as=image\s+rel=preload[^>]*>/gi,
  // Format 2: Standar HTML5 (pakai kutip)
  /<link\s+rel=["']preload["']\s+as=["']image["']\s+href=["'][^"']*["']\s+fetchpriority=["']high["'][^>]*>/gi
];

const glob = new Glob("**/*.html");
const logFile = "list-to-clean.txt";
const foundFiles: string[] = [];

console.log("🔍 Sedang memindai (mode gabungan)...");

for await (const file of glob.scan(".")) {
  const content = await Bun.file(file).text();
  
  // Cek apakah salah satu dari pola tersebut cocok
  const isMatch = patterns.some(pattern => pattern.test(content));
  
  if (isMatch) {
    foundFiles.push(file);
    console.log(`✅ Ditemukan target di: ${file}`);
  }
}

await Bun.write(logFile, foundFiles.join("\n"));
console.log(`\n📄 Daftar file telah disimpan ke: ${logFile}`);
console.log(`Total file: ${foundFiles.length}`);
