import { file, write, Glob } from "bun";
import { extname, join } from "node:path";

// 1. Ambil Argumen (Tetap mempertahankan logika aslimu)
const SEARCH  = Bun.argv[2] ?? "";
const REPLACE = Bun.argv[3] ?? "";
const TARGET  = Bun.argv[4] ?? ".";
const EXTS    = (Bun.argv[5] ?? "").split(",").map(e => e.trim()).filter(Boolean);

if (!SEARCH) {
  console.error("❌ Argumen SEARCH tidak boleh kosong.");
  process.exit(1);
}

// 2. Setup Glob (Pencarian file jadi jauh lebih simpel & cepat)
const pattern = `${TARGET}/**/*.{${EXTS.join(',') || '*'}}`;
const scanner = new Glob(pattern);
const EXCLUDED = ["node_modules", "functions", "img", "mini", "sementara", ".git"];

console.log(`🔍 Mencari   : "${SEARCH}"`);
console.log(`✏️  Mengganti : "${REPLACE}"`);
console.log("─".repeat(50));

let changedCount = 0;
let checkedCount = 0;
const changedFiles: string[] = [];

// 3. Eksekusi Asinkron (Lebih ngebut dari rekursif manual)
for await (const path of scanner.scan()) {
  // Manual filter untuk folder yang di-skip
  if (EXCLUDED.some(ex => path.includes(ex))) continue;

  checkedCount++;
  const f = file(path);
  const original = await f.text();
  
  if (original.includes(SEARCH)) {
    const updated = original.replaceAll(SEARCH, REPLACE);
    await write(path, updated);
    
    console.log(`✅ ${path}`);
    changedFiles.push(path);
    changedCount++;
  }
}

// 4. Output Statistik
console.log("─".repeat(50));
console.log(`📊 Diperiksa : ${checkedCount} file`);
console.log(`📝 Diubah    : ${changedCount} file`);

// 5. Simpan daftar perubahan
if (changedFiles.length > 0) {
  const outputPath = join(TARGET, "../sementara/changed_files.txt");
  await write(outputPath, changedFiles.join(","));
}
