import { watch, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

// --- PENGATURAN KURASI ---
// Masukkan nama file yang ada di dapur/ yang BOLEH dikirim ke ext/
const menuAndalan = [
  "iposbrowser.ts", 
  "style.css",
  "tools.py"
];

const sourceDir = import.meta.dir; 
const targetDir = join(sourceDir, "../ext");

console.log("👨‍🍳 Koki Selektif sudah stand-by!");
console.log(`📋 Menu yang akan dimasak: ${menuAndalan.join(", ")}`);
console.log("------------------------------------------");

async function masak(fileName: string) {
  // Cek apakah file ini masuk dalam daftar menuAndalan
  if (!menuAndalan.includes(fileName)) {
    // Kalau tidak ada di daftar, abaikan saja
    return;
  }

  const sourcePath = join(sourceDir, fileName);
  const ext = fileName.split('.').pop();

  try {
    if (ext === 'ts' || ext === 'js') {
      const outName = fileName.replace(/\.ts$/, '.js');
      console.log(`⚡ [JS/TS] Masak: ${fileName} -> ${outName}`);
      await $`bun build ${sourcePath} --outfile ${join(targetDir, outName)} --minify`;
    } 
    else if (ext === 'css') {
      console.log(`🎨 [CSS] Masak: ${fileName}`);
      await $`bun build ${sourcePath} --outfile ${join(targetDir, fileName)} --minify`;
    }
    else if (ext === 'py') {
      console.log(`🐍 [Python] Geser ke etalase: ${fileName}`);
      await $`cp ${sourcePath} ${join(targetDir, fileName)}`;
    }
  } catch (err) {
    console.error(`❌ Masakan gosong di ${fileName}:`, err);
  }
}

// Pantau folder dapur/
watch(sourceDir, async (event, filename) => {
  if (!filename || filename.startsWith(".") || filename === "koki.ts") return;

  // Cek apakah file yang berubah ada di daftar menuAndalan
  if (menuAndalan.includes(filename)) {
    const sourcePath = join(sourceDir, filename);
    
    // Logika Sinkronisasi Hapus
    let targetFileName = filename;
    if (filename.endsWith(".ts")) targetFileName = filename.replace(/\.ts$/, ".js");
    const targetPath = join(targetDir, targetFileName);

    if (!existsSync(sourcePath)) {
      if (existsSync(targetPath)) {
        console.log(`🗑️  [Cleanup] Menghapus dari etalase: ${targetFileName}`);
        unlinkSync(targetPath);
      }
    } else {
      masak(filename);
    }
  }
});
