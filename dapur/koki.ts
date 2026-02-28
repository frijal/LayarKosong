import { watch, existsSync, unlinkSync, readdirSync, cpSync, statSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

// --- PENGATURAN KURASI ---
const menuAndalan = [
"bookmark.json", "dashboard.html", "dashboard.js", "github.css", "github-dark.css", "github-dark-dimmed.css", "halaman-pencarian.css", "halaman-pencarian.js", "header.css", "header.js", "header-logo-atas.html", "highlight.js", "homepage.css", "homepage.js", "iposbrowser.js", "json-xml.html", "lightbox.js", "markdown.js", "marquee-url.css", "marquee-url.js", "pesbukdiskus.js", "pesbuk.js", "response.js", "sitemap.css", "sitemap.js", "ujihalaman.html"
];

// File/Folder yang ingin dikirim APA ADANYA (Tanpa Minify)
const menuAsli = [
"icons", "fontawesome-webfonts", "fontawesome.css", "atom-one-dark.min.css", "atom-one-light.min.css", "default.min.css", "github-dark-dimmed.min.css", "github-dark.min.css", "github.min.css", "lightbox.css", "prism.min.css", "prism-okaidia.min.css", "prism-tomorrow.min.css", "prism-toolbar.min.css", "monokai.min.css", "vs-dark.min.css", "vs.min.css"
];

const sourceDir = import.meta.dir;
const targetDir = join(sourceDir, "../ext");

// Gabungkan keduanya untuk keperluan pengecekan & Sapu Jagat
const semuaMenu = [...menuAndalan, ...menuAsli];

async function masak(name: string) {
  const sourcePath = join(sourceDir, name);
  if (!existsSync(sourcePath)) return;

  const isFolder = statSync(sourcePath).isDirectory();
  const targetPath = join(targetDir, name);

  try {
    // 1. CEK: Apakah masuk menuAsli atau folder? (Kirim Langsung)
    if (menuAsli.includes(name) || isFolder) {
      console.log(`📦 [Asli/Folder] Mengirim tanpa perubahan: ${name}`);
      cpSync(sourcePath, targetPath, { recursive: true });
      return;
    }

    // 2. CEK: Apakah masuk menuAndalan? (Proses Minify)
    if (menuAndalan.includes(name)) {
      const ext = name.split('.').pop();

      if (ext === 'ts' || ext === 'js') {
        const outName = name.replace(/\.ts$/, '.js');
        const finalOutPath = join(targetDir, outName);

        try {
          console.log(`⚡ [JS/TS] Mencoba Minify: ${name}`);
          await $`bun build ${sourcePath} --outfile ${finalOutPath} --minify`.quiet();
        } catch (err) {
          console.warn(`⚠️  [Skip] Bun gagal, kirim original: ${name}`);
          cpSync(sourcePath, finalOutPath);
        }
      }
      else if (ext === 'css') {
        try {
          console.log(`🎨 [CSS] Mencoba Minify: ${name}`);
          await $`bun build ${sourcePath} --outfile ${targetPath} --minify`.quiet();
        } catch (err) {
          console.warn(`⚠️  [Skip] CSS error, kirim original: ${name}`);
          cpSync(sourcePath, targetPath);
        }
      }
    }
  } catch (err) {
    console.error(`❌ Gagal total memproses ${name}:`, err);
  }
}

// --- FUNGSI SAPU JAGAT (Update untuk semuaMenu) ---
function sapuJagat() {
  console.log("🧹 Memulai inspeksi etalase (Auto Purge)...");
  if (!existsSync(targetDir)) return;
  const filesInEtalase = readdirSync(targetDir);

  // File yang diizinkan (termasuk hasil transformasi .ts ke .js)
  const allowedInEtalase = semuaMenu.map(name => name.replace(/\.ts$/, ".js"));

  filesInEtalase.forEach(file => {
    if (file.startsWith(".")) return;
    if (!allowedInEtalase.includes(file)) {
      console.log(`🚫 [Purge] Menghapus '${file}'`);
      const pathToRemove = join(targetDir, file);
      if (existsSync(pathToRemove)) {
        $`rm -rf ${pathToRemove}`.quiet();
      }
    }
  });
}

// Menjalankan Sapu Jagat & Masak Awal
sapuJagat();
semuaMenu.forEach(name => masak(name));

console.log("\n👨‍🍳 Koki Selektif + Menu Asli Siap!");
console.log("------------------------------------------");

watch(sourceDir, (event, filename) => {
  if (!filename || filename.startsWith(".") || filename === "koki.ts") return;

  const isInMenu = semuaMenu.some(item => filename === item || filename.startsWith(item + "/"));

  if (isInMenu) {
    // Cari nama utama di menu (bisa dari menuAndalan atau menuAsli)
    const rootName = semuaMenu.find(item => filename.startsWith(item)) || filename;
    masak(rootName);
  }
});