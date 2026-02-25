import fs from "node:fs";
import path from "node:path";

// Daftar file CSS yang ingin kita "lokalkan"
const cssFiles = [
  "atom-one-dark.min.css", "atom-one-light.min.css", "default.min.css", "highlight.js",
  "fontawesome.css", "github-dark-dimmed.css", "github-dark-dimmed.min.css",
  "github-dark.css", "github-dark.min.css", "github.css", "github.min.css",
  "halaman-pencarian.css", "header.css", "homepage.css", "indexhtml.css",
  "leaflet.css", "lightbox.css", "marquee-url.css", "monokai.min.css",
  "prism-okaidia.min.css", "prism-tomorrow.min.css", "prism-toolbar.min.css",
  "prism.min.css", "related-articles.css", "sitemap.css", "vs-dark.min.css", "vs.min.css"
];

// Membuat Regex dinamis untuk mencari https://.../nama-file.css
// Pola: https:\/\/[^\s"'<>]+?\/(nama-file\.css)
const pattern = new RegExp(`https:\\/\\/[^\\s"'<>]+?\\/(${cssFiles.join("|").replace(/\./g, "\\.")})`, "g");

async function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Kecualikan folder node_modules atau .git agar tidak lemot
      if (entry.name !== "node_modules" && entry.name !== ".git") {
        await processDirectory(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      await fixCssInFile(fullPath);
    }
  }
}

async function fixCssInFile(filePath) {
  const content = await Bun.file(filePath).text();
  
  // Cek apakah ada pola yang cocok
  if (pattern.test(content)) {
    // Reset regex index karena pakai flag 'g'
    pattern.lastIndex = 0;
    
    // Ganti https://domain.com/path/file.css menjadi /ext/file.css
    const newContent = content.replace(pattern, "/ext/$1");
    
    await Bun.write(filePath, newContent);
    console.log(`✅ Fixed CSS paths in: ${filePath}`);
  }
}

// Jalankan dari root (asumsi script di /ext/ tapi dijalankan dari root repo)
console.log("🔍 Mencari link CSS eksternal di seluruh file HTML...");
processDirectory("./").then(() => {
  console.log("✨ Semua path CSS telah dilokalkan ke /ext/!");
});
