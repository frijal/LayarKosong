import { watch, existsSync, unlinkSync, readdirSync, cpSync, statSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

// --- PENGATURAN KURASI ---
const menuAndalan = [
"icons" ,
"fontawesome-webfonts",
"iposbrowser.ts",
"style.css",
"tools.py"

];

const sourceDir = import.meta.dir;
const targetDir = join(sourceDir, "../ext");

// --- FUNGSI MASAK (Ditingkatkan) ---
async function masak(name: string) {
  if (!menuAndalan.includes(name)) return;

  const sourcePath = join(sourceDir, name);
  if (!existsSync(sourcePath)) return;

  const isFolder = statSync(sourcePath).isDirectory();

  try {
    if (isFolder) {
      // 📂 JIKA FOLDER: Copy seluruh isinya ke etalase
      console.log(`📁 [Folder] Mengirim folder '${name}' ke etalase...`);
      cpSync(sourcePath, join(targetDir, name), { recursive: true });
    } else {
      // 📄 JIKA FILE: Masak sesuai ekstensinya
      const ext = name.split('.').pop();
      if (ext === 'ts' || ext === 'js') {
        const outName = name.replace(/\.ts$/, '.js');
        console.log(`⚡ [JS/TS] Masak: ${name} -> ${outName}`);
        await $`bun build ${sourcePath} --outfile ${join(targetDir, outName)} --minify`;
      }
      else if (ext === 'css') {
        console.log(`🎨 [CSS] Masak: ${name}`);
        await $`bun build ${sourcePath} --outfile ${join(targetDir, name)} --minify`;
      }
      else {
        // Untuk .py atau file lainnya, copy langsung
        console.log(`📄 [Copy] Memindahkan: ${name}`);
        cpSync(sourcePath, join(targetDir, name));
      }
    }
  } catch (err) {
    console.error(`❌ Gagal memproses ${name}:`, err);
  }
}

// --- FUNGSI SAPU JAGAT (Ditingkatkan untuk Folder) ---
function sapuJagat() {
  console.log("🧹 Memulai inspeksi etalase (Auto Purge)...");
  if (!existsSync(targetDir)) return;

  const filesInEtalase = readdirSync(targetDir);
  const allowedInEtalase = menuAndalan.map(name => name.replace(/\.ts$/, ".js"));

  filesInEtalase.forEach(file => {
    if (file.startsWith(".")) return;
    if (!allowedInEtalase.includes(file)) {
      console.log(`🚫 [Purge] Menghapus '${file}' dari etalase (tidak ada di menu).`);
      const pathToRemove = join(targetDir, file);
      // Hapus file atau folder
      $ `rm -rf ${pathToRemove}`;
    }
  });
}

// 1. Bersihkan & Siapkan awal
sapuJagat();
console.log("🍳 Menyiapkan menu andalan...");
menuAndalan.forEach(name => masak(name));

console.log("\n👨‍🍳 Koki Selektif siap (Support Folder & File)!");
console.log("------------------------------------------");

// 2. Pantau dapur
watch(sourceDir, (event, filename) => {
  if (!filename || filename.startsWith(".") || filename === "koki.ts") return;

  // Jika file yang berubah ada di menu atau merupakan bagian dari folder di menu
  const isInMenu = menuAndalan.some(item => filename === item || filename.startsWith(item + "/"));

  if (isInMenu) {
    // Kalau ada perubahan di dalam folder icons, kita masak ulang foldernya
    const rootName = menuAndalan.find(item => filename.startsWith(item)) || filename;
    masak(rootName);
  }
});