import { watch, existsSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

// --- PENGATURAN KURASI ---
const menuAndalan = [
"iposbrowser.js",
"style.css",
"tools.py"
];

const sourceDir = import.meta.dir;
const targetDir = join(sourceDir, "../ext");

// --- FUNGSI SAPU JAGAT (Auto Purge) ---
function sapuJagat() {
  console.log("🧹 Memulai inspeksi etalase (Auto Purge)...");
  const filesInEtalase = readdirSync(targetDir);

  // Daftar nama file yang BOLEH ada di etalase (hasil transformasi .ts ke .js)
  const allowedInEtalase = menuAndalan.map(name => name.replace(/\.ts$/, ".js"));

  filesInEtalase.forEach(file => {
    // Kita biarkan file .gitkeep atau file sistem lainnya jika ada
    if (file.startsWith(".")) return;

    if (!allowedInEtalase.includes(file)) {
      console.log(`🚫 [Purge] File '${file}' tidak ada di menu. Menghapus...`);
      unlinkSync(join(targetDir, file));
    }
  });
  console.log("✨ Etalase sekarang bersih dan sesuai menu!");
}

async function masak(fileName: string) {
  if (!menuAndalan.includes(fileName)) return;

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
      console.log(`🐍 [Python] Geser: ${fileName}`);
      await $`cp ${sourcePath} ${join(targetDir, fileName)}`;
    }
  } catch (err) {
    console.error(`❌ Gagal masak ${fileName}:`, err);
  }
}

// 1. Jalankan Sapu Jagat saat pertama kali koki bangun
sapuJagat();

// 2. Masak semua yang ada di menu saat startup (biar fresh)
console.log("🍳 Menyiapkan menu andalan...");
menuAndalan.forEach(file => {
  if (existsSync(join(sourceDir, file))) masak(file);
});

console.log("\n👨‍🍳 Koki Selektif siap jaga dapur!");
console.log("------------------------------------------");

// 3. Pantau perubahan secara real-time
watch(sourceDir, async (event, filename) => {
  if (!filename || filename.startsWith(".") || filename === "koki.ts") return;

  if (menuAndalan.includes(filename)) {
    const sourcePath = join(sourceDir, filename);

    if (!existsSync(sourcePath)) {
      // Jika file dihapus dari dapur secara fisik
      let targetFileName = filename.replace(/\.ts$/, ".js");
      const targetPath = join(targetDir, targetFileName);
      if (existsSync(targetPath)) {
        console.log(`🗑️  [Cleanup] Menghapus: ${targetFileName}`);
        unlinkSync(targetPath);
      }
    } else {
      masak(filename);
    }
  }
});