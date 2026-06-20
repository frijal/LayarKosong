// execute-cleanup.ts
const pattern = /<link\s+href="[^"]*"\s+fetchpriority=high\s+as=image\s+rel=preload\s*>/g;
const logFile = Bun.file("list-to-clean.txt");

if (!(await logFile.exists())) {
  console.error("❌ File list-to-clean.txt tidak ditemukan! Jalankan check-files.ts dulu.");
  process.exit(1);
}

const content = await logFile.text();
const files = content.split("\n").filter((line) => line.trim() !== "");

console.log(`🚀 Memulai pembersihan untuk ${files.length} file...`);

for (const file of files) {
  try {
    const handle = Bun.file(file);
    let htmlContent = await handle.text();
    
    // Replace target dengan string kosong
    const newContent = htmlContent.replace(pattern, "");
    
    await Bun.write(file, newContent);
    console.log(`✅ Dibersihkan: ${file}`);
  } catch (err) {
    console.error(`❌ Gagal membersihkan ${file}:`, err);
  }
}

console.log("\n🎉 Semua file di dalam list telah dibersihkan.");
