import { watch, existsSync, readdirSync, cpSync, statSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

// --- PENGATURAN KURASI ---
const menuAndalan = [
  "dashboard.html", "dashboard.js", "github.css", "github-dark.css", "github-dark-dimmed.css", "halaman-pencarian.css", "halaman-pencarian.js", "header.css", "header.js", "header-logo-atas.html", "highlight.js", "homepage.css", "iposbrowser.js", "json-xml.html", "lightbox.ts", "markdown.js", "marquee-url.css", "marquee-url.js", "pesbukdiskus.js", "pesbuk.js", "response.js", "sitemap.css", "ujihalaman.html"
];

const menuAsli = [
  "bookmark.json", "icons", "fontawesome-webfonts", "fontawesome.css", "atom-one-dark.min.css", "atom-one-light.min.css", "default.min.css", "github-dark-dimmed.min.css", "github-dark.min.css", "github.min.css", "homepage.js", "lightbox.css", "monokai.min.css", "prism.min.css", "prism-okaidia.min.css", "prism-tomorrow.min.css", "prism-toolbar.min.css", "sitemap.js", "vs-dark.min.css", "vs.min.css"
];

const sourceDir = import.meta.dir;
const targetDir = join(sourceDir, "../ext");
const semuaMenu = [...menuAndalan, ...menuAsli];

async function masak(name: string) {
  const sourcePath = join(sourceDir, name);
  if (!existsSync(sourcePath)) return;

  const isFolder = statSync(sourcePath).isDirectory();
  const targetPath = join(targetDir, name);

  try {
    if (menuAsli.includes(name) || isFolder) {
      cpSync(sourcePath, targetPath, { recursive: true });
      return;
    }

    if (menuAndalan.includes(name)) {
      const ext = name.split('.').pop();

      if (ext === 'ts' || ext === 'js') {
        const outName = name.replace(/\.ts$/, '.js');
        const finalOutPath = join(targetDir, outName);
        try {
          await $`bun build ${sourcePath} --outfile ${finalOutPath} --minify`.quiet();
        } catch {
          cpSync(sourcePath, finalOutPath);
        }
      }
      else if (ext === 'css') {
        try {
          await $`bun build ${sourcePath} --outfile ${targetPath} --minify`.quiet();
        } catch {
          cpSync(sourcePath, targetPath);
        }
      }
    }
  } catch {
    // Silent error
  }
}

function sapuJagat() {
  if (!existsSync(targetDir)) return;
  const filesInEtalase = readdirSync(targetDir);
  const allowedInEtalase = semuaMenu.map(name => name.replace(/\.ts$/, ".js"));

  filesInEtalase.forEach(file => {
    if (file.startsWith(".")) return;
    if (!allowedInEtalase.includes(file)) {
      const pathToRemove = join(targetDir, file);
      if (existsSync(pathToRemove)) {
        $`rm -rf ${pathToRemove}`.quiet();
      }
    }
  });
}

// --- EKSEKUSI UTAMA ---
sapuJagat();
await Promise.all(semuaMenu.map(name => masak(name)));

const isCI = process.env.CI === "true" || process.argv.includes("--once");

if (isCI) {
  process.exit(0);
} else {
  watch(sourceDir, (event, filename) => {
    if (!filename || filename.startsWith(".") || filename === "koki.ts") return;
    const isInMenu = semuaMenu.some(item => filename === item || filename.startsWith(item + "/"));
    if (isInMenu) {
      const rootName = semuaMenu.find(item => filename.startsWith(item)) || filename;
      masak(rootName);
    }
  });
}
