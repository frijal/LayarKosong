import { file, write, Glob } from "bun";

// 1. Ambil target folder
const targetFolder = Bun.argv[2];

if (!targetFolder) {
  console.error("❌ Mohon masukkan nama folder tujuan! Contoh: bun run cleaner.ts ./artikel");
  process.exit(1);
}

// 2. Baca "sampah" (junkCode) sekali saja di awal
const junkCode = (await file("file.txt").text()).trim();

if (!junkCode) {
  console.error("❌ file.txt kosong atau tidak ditemukan!");
  process.exit(1);
}

async function cleanJunkCode(filePath: string) {
  const f = file(filePath);
  const content = await f.text();

  if (content.includes(junkCode)) {
    // Bun.write secara otomatis melakukan overwrite file tersebut
    await write(filePath, content.split(junkCode).join(""));
    return true; // Menandakan file dibersihkan
  }
  return false;
}

async function main() {
  console.log(`🚀 Memulai pembersihan...`);

  const glob = new Glob(`${targetFolder}/**/*.html`);
  let cleanedCount = 0;
  let totalFiles = 0;

  // Scan file dan jalankan pembersihan secara paralel
  // Menggunakan Promise.all agar I/O tidak mengantri
  const tasks: Promise<void>[] = [];

  for await (const path of glob.scan()) {
    totalFiles++;
    tasks.push(
      cleanJunkCode(path).then(wasCleaned => {
        if (wasCleaned) {
          console.log(`✅ Dibersihkan: ${path}`);
          cleanedCount++;
        }
      })
    );
  }

  await Promise.all(tasks);

  console.log(`\n✨ Selesai!`);
  console.log(`📊 Total file diperiksa: ${totalFiles}`);
  console.log(`🗑️ Total file dibersihkan: ${cleanedCount}`);
}

main();
