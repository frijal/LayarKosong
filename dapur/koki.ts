import { watch, existsSync, readdirSync, cpSync, statSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

// --- PENGATURAN KURASI ---
// File yang perlu diproses/build oleh Bun
const menuAndalan = [
  "dashboard.html", "dashboard.ts", "github.css", "github-dark.css", "github-dark-dimmed.css", "halaman-pencarian.css", "halaman-pencarian.ts", "header.css", "header.ts", "header-logo-atas.html", "homepage.css", "iposbrowser.ts", "json-xml.html", "leaflet.css", "lightbox.ts", "markdown.ts", "marquee-url.css", "marquee-url.ts", "response.ts", "sitemap.css", "ujihalaman.html", "homepage.ts", "sitemap.ts", "titleToCategory.ts", "data-provider.ts"
];

// File/Folder yang hanya perlu di-copy mentah
const menuAsli = [
  "bookmark.json", "icons", "fontawesome-webfonts", "fontawesome.css", "atom-one-dark.min.css", "atom-one-light.min.css", "default.min.css", "github-dark-dimmed.min.css", "github-dark.min.css", "github.min.css", "highlight.js", "monokai.min.css", "prism.min.css", "prism-okaidia.min.css", "prism-tomorrow.min.css", "prism-toolbar.min.css", "vs-dark.min.css", "vs.min.css", "html2canvas.min.js", "html2pdf.bundle.min.js"
];

const sourceDir = import.meta.dir;
const targetDir = join(sourceDir, "../ext");
const semuaMenu = [...new Set([...menuAndalan, ...menuAsli])]; // Pakai Set untuk cegah duplikasi

async function masak(name: string) {
  const sourcePath = join(sourceDir, name);
  if (!existsSync(sourcePath)) return;

  const isFolder = statSync(sourcePath).isDirectory();
  const targetPath = join(targetDir, name);

  try {
    // 1. Jika folder atau menuAsli, copy langsung
    if (menuAsli.includes(name) || isFolder) {
      cpSync(sourcePath, targetPath, { recursive: true });
      return;
    }

    // 2. Jika menuAndalan, lakukan build/minify
    if (menuAndalan.includes(name)) {
      const ext = name.split('.').pop();

      if (ext === 'ts' || ext === 'js') {
        const outName = name.replace(/\.ts$/, '.js');
        const finalOutPath = join(targetDir, outName);
        try {
          // Bundling murni browser-friendly
          await $`bun build ${sourcePath} --outfile ${finalOutPath} --minify --format iife --target browser --no-external`.quiet();
        } catch (err) {
          cpSync(sourcePath, finalOutPath);
        }
      }
      else if (ext === 'css') {
        try {
          // CSS Minification via Bun Build
          await $`bun build ${sourcePath} --outfile ${targetPath} --minify`.quiet();
        } catch {
          cpSync(sourcePath, targetPath);
        }
      }
      else {
        // Untuk .html atau file lainnya di menuAndalan yang bukan TS/CSS
        cpSync(sourcePath, targetPath);
      }
    }
  } catch (e) {
    console.error(`❌ Gagal memasak ${name}:`, e);
  }
}

// ... sisanya (sapuJagat & watcher) sudah mantap ...
