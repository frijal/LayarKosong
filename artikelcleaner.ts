import { Glob } from "bun";

// 1. Ambil target folder dari argumen terminal (contoh: bun run cleaner-text.ts ./artikel)
const targetFolder = Bun.argv[2];

if (!targetFolder) {
  console.error("❌ Mohon masukkan nama folder tujuan!");
  console.log("Contoh: bun run cleaner-text.ts ./nama-folder");
  process.exit(1);
}

// 2. Baca isi file.txt yang berisi "sampah" kode
const blacklistFile = Bun.file("file.txt");
if (!(await blacklistFile.exists())) {
  console.error("❌ file.txt tidak ditemukan!");
  process.exit(1);
}

// Ambil teks, trim spasi di awal/akhir agar pencarian lebih akurat
const junkCode = (await blacklistFile.text()).trim();

async function cleanJunkCode(filePath: string) {
  const file = Bun.file(filePath);
  const originalContent = await file.text();

  // Jika kode junk ditemukan, hapus (ganti dengan string kosong)
  if (originalContent.includes(junkCode)) {
    // Kita gunakan replaceAll untuk jaga-jaga kalau kodenya muncul berkali-kali di satu file
    const cleanedContent = originalContent.split(junkCode).join("");
    
    await Bun.write(filePath, cleanedContent);
    console.log(`✅ Berhasil dibersihkan: ${filePath}`);
  } else {
    console.log(`– Tidak ditemukan kode junk di: ${filePath}`);
  }
}

async function main() {
  const glob = new Glob(`${targetFolder}/**/*.html`);
  
  console.log(`🚀 Memulai operasi pembersihan teks...`);
  console.log(`📝 Mencari kode yang ada di file.txt...`);

  let count = 0;
  for await (const file of glob.scan()) {
    await cleanJunkCode(file);
    count++;
  }

  console.log(`\n✨ Selesai! Memeriksa total ${count} file.`);
}

main();
