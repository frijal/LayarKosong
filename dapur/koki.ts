import { watch, existsSync, unlinkSync, readdirSync, cpSync, statSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

// --- PENGATURAN KURASI ---
const menuAndalan = [
  "icons", "fontawesome-webfonts", "atom-one-dark.min.css", "atom-one-light.min.css",  "bookmark.json", "dashboard.html", "dashboard.js", "default.min.css", "fontawesome.css", "github.css", "github-dark.css", "github-dark-dimmed.css", "github-dark-dimmed.min.css", "github-dark.min.css", "github.min.css", "halaman-pencarian.css", "halaman-pencarian.js", "header.css", "header.js", "header-logo-atas.html", "highlight.js", "homepage.css", "homepage.js", "iposbrowser.js", "json-xml.html", "lightbox.css", "lightbox.js", "markdown.js", "marquee-url.css", "marquee-url.js", "monokai.min.css", "pesbukdiskus.js", "pesbuk.js", "prism.min.css", "prism-okaidia.min.css", "prism-tomorrow.min.css", "prism-toolbar.min.css", "response.js", "sitemap.css", "sitemap.js", "ujihalaman.html", "vs-dark.min.css", "vs.min.css"
];

const sourceDir = import.meta.dir;
const targetDir = join(sourceDir, "../ext");

async function masak(name: string) {
  if (!menuAndalan.includes(name)) return;

  const sourcePath = join(sourceDir, name);
  if (!existsSync(sourcePath)) return;

  const isFolder = statSync(sourcePath).isDirectory();
  const targetPath = join(targetDir, name);

  try {
    if (isFolder) {
      console.log(`📁 [Folder] Mengirim: ${name}`);
      cpSync(sourcePath, targetPath, { recursive: true });
    } else {
      const ext = name.split('.').pop();

      if (ext === 'ts' || ext === 'js') {
        const outName = name.replace(/\.ts$/, '.js');
        const finalOutPath = join(targetDir, outName);

        try {
          console.log(`⚡ [JS/TS] Mencoba Minify: ${name}`);
          // Gunakan --no-bundle jika hanya ingin transpile+minify satu file
          await $`bun build ${sourcePath} --outfile ${finalOutPath} --minify`.quiet();
        } catch (err) {
          console.warn(`⚠️  [Skip] Bun gagal minify ${name}, kirim apa adanya...`);
          // Kalau gagal minify, copy file asli tapi ganti ekstensinya jadi .js (biar HTML tetap jalan)
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
      else {
        // File lain (.py, .jpg, dll) langsung copy
        console.log(`📄 [Copy] Memindahkan: ${name}`);
        cpSync(sourcePath, targetPath);
      }
    }
  } catch (err) {
    console.error(`❌ Gagal total memproses ${name}:`, err);
  }
}

// --- FUNGSI SAPU JAGAT (Tetap Sama) ---
function sapuJagat() {
  console.log("🧹 Memulai inspeksi etalase (Auto Purge)...");
  if (!existsSync(targetDir)) return;
  const filesInEtalase = readdirSync(targetDir);
  const allowedInEtalase = menuAndalan.map(name => name.replace(/\.ts$/, ".js"));

  filesInEtalase.forEach(file => {
    if (file.startsWith(".")) return;
    if (!allowedInEtalase.includes(file)) {
      console.log(`🚫 [Purge] Menghapus '${file}'`);
      const pathToRemove = join(targetDir, file);
      if (statSync(pathToRemove).isDirectory()) {
        unlinkSync(pathToRemove); // Atau pakai rm -rf via Bun shell
      } else {
        unlinkSync(pathToRemove);
      }
    }
  });
}

// Menjalankan Sapu Jagat & Masak Awal
sapuJagat();
menuAndalan.forEach(name => masak(name));

console.log("\n👨‍🍳 Koki Toleran Siap! (Gagal masak = Kirim Mentah)");
console.log("------------------------------------------");

watch(sourceDir, (event, filename) => {
  if (!filename || filename.startsWith(".") || filename === "koki.ts") return;
  const isInMenu = menuAndalan.some(item => filename === item || filename.startsWith(item + "/"));
  if (isInMenu) {
    const rootName = menuAndalan.find(item => filename.startsWith(item)) || filename;
    masak(rootName);
  }
});