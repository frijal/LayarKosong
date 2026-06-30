// -------------------------------------------------------
// FILE: ganti-teks.ts
// Usage: bun run ganti-teks.ts <search> <replace> <folder> <extensions>
// -------------------------------------------------------

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const SEARCH  = process.env.SEARCH  ?? process.argv[2] ?? "";
const REPLACE = process.env.REPLACE ?? process.argv[3] ?? "";
const TARGET  = process.env.FOLDER  ?? process.argv[4] ?? ".";
const EXTS    = (process.env.EXT    ?? process.argv[5] ?? "")
.split(",")
.map((e) => `.${e.trim()}`)
.filter((e) => e.length > 1);

const EXCLUDED_DIRS = new Set(["node_modules", "functions", "img", "mini", "sementara"]);

if (!SEARCH) {
  console.error("❌ Argumen SEARCH tidak boleh kosong.");
  process.exit(1);
}

console.log(`🔍 Mencari   : "${SEARCH}"`);
console.log(`✏️  Mengganti : "${REPLACE}"`);
console.log(`📂 Folder    : ${TARGET}`);
console.log(`📄 Ekstensi  : ${EXTS.length ? EXTS.join(", ") : "semua file"}`);
console.log("─".repeat(50));

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".")) return [];
    if (EXCLUDED_DIRS.has(entry.name)) return [];

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);

    const matchExt = EXTS.length === 0 || EXTS.includes(extname(entry.name));
    return matchExt ? [fullPath] : [];
  });
}

let changedCount = 0;
let checkedCount = 0;
const changedFiles: string[] = [];

for (const file of walk(TARGET)) {
  checkedCount++;
  try {
    const original = readFileSync(file, "utf-8");
    const updated  = original.replaceAll(SEARCH, REPLACE);
    if (original !== updated) {
      writeFileSync(file, updated, "utf-8");
      console.log(`✅ ${file}`);
      changedFiles.push(file);
      changedCount++;
    }
  } catch (err) {
    console.error(`❌ Gagal proses ${file}:`, err);
  }
}

console.log("─".repeat(50));
console.log(`📊 Diperiksa : ${checkedCount} file`);
console.log(`📝 Diubah    : ${changedCount} file`);

// Tulis daftar file yang berubah ke file output agar bisa dibaca workflow
if (changedFiles.length > 0) {
  const outputPath = join(TARGET, "../sementara/changed_files.txt");
  try {
    writeFileSync(outputPath, changedFiles.join(","), "utf-8");
  } catch {
    // Folder sementara mungkin tidak ada, tidak masalah
  }
}

process.exit(changedCount > 0 ? 0 : 0);
