import { watch, existsSync, unlinkSync, readdirSync, cpSync, statSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

// --- PENGATURAN KURASI ---
const menuAndalan = [
"icons", "fontawesome-webfonts", "atom-one-dark.min.css", "atom-one-light.min.css",  "bookmark.json", "darkmode.js", "dashboard.html", "dashboard.js", "default.min.css", "fontawesome.css", "github.css", "github-dark.css", "github-dark-dimmed.css", "github-dark-dimmed.min.css", "github-dark.min.css", "github.min.css", "halaman-pencarian.css", "halaman-pencarian.js", "header.css", "header.js", "header-logo-atas.html", "highlight.js", "homepage.css", "homepage.js", "indexhtml.css", "indexhtml.js", "indexhtml-main.js", "indexhtml-render.js", "indexhtml-util.js", "index.js", "iposbrowser.js", "json-xml.html", "leaflet.css", "lightbox.css", "lightbox.js", "markdown.js", "marquee.js", "marquee-url.css", "marquee-url.js", "monokai.min.css", "pesbukdiskus.js", "pesbuk.js", "prism.min.css", "prism-okaidia.min.css", "prism-tomorrow.min.css", "prism-toolbar.min.css", "related-articles.css", "related-articles.js", "related-by-topic.js", "response.js", "rss.js", "sitemap.css", "sitemap-init.js", "sitemap.js", "terjemah.js", "titleToCategory.js", "toc.js", "ujihalaman.html", "visited.js", "vs-dark.min.css", "vs.min.css"
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