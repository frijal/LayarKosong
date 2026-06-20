// execute-cleanup.ts
// Gunakan pola yang sama
const patterns = [
  /<link\s+[^>]*href=["']?[^" >]+["']?\s+fetchpriority=high\s+as=image\s+rel=preload[^>]*>/gi,
  /<link\s+rel=["']preload["']\s+as=["']image["']\s+href=["'][^"']*["']\s+fetchpriority=["']high["'][^>]*>/gi
];

const logFile = Bun.file("list-to-clean.txt");

if (!(await logFile.exists())) {
  console.error("❌ File list-to-clean.txt tidak ditemukan!");
  process.exit(1);
}

const content = await logFile.text();
const files = content.split("\n").filter((line) => line.trim() !== "");

console.log(`🚀 Memulai pembersihan untuk ${files.length} file...`);

for (const file of files) {
  try {
    const handle = Bun.file(file);
    let htmlContent = await handle.text();
    
    // Loop untuk menghapus semua pattern yang cocok
    let newContent = htmlContent;
    for (const pattern of patterns) {
      newContent = newContent.replace(pattern, "");
    }
    
    await Bun.write(file, newContent);
    console.log(`✅ Dibersihkan: ${file}`);
  } catch (err) {
    console.error(`❌ Gagal membersihkan ${file}:`, err);
  }
}

console.log("\n🎉 Selesai! Semua format preload berhasil dibersihkan.");
