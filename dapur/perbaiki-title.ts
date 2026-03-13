import { glob } from "glob";
import { readFile, writeFile } from "node:fs/promises";

async function fixTitles() {
  console.log("🛠 Memulai proses normalisasi judul...");

  const htmlFiles = await glob("**/*.html", {
    ignore: ["node_modules/**", "dist/**", ".git/**", "mini/**"]
  });

  for (const filePath of htmlFiles) {
    let content = await readFile(filePath, "utf-8");
    
    // Regex untuk mencari tag <title>...</title>
    // Kita ganti |, em dash (—), dan en dash (–) dengan hyphen (-)
    const titleRegex = /(<title>)(.*?)(<\/title>)/is;
    
    if (titleRegex.test(content)) {
      const match = content.match(titleRegex);
      if (match) {
        let titleContent = match[2];
        
        // Ganti berbagai jenis pemisah menjadi hyphen standar
        const cleanedTitle = titleContent
          .replace(/[|—–]/g, "-")
          .replace(/\s+/g, " ") // Rapikan spasi ganda
          .trim();
        
        // Pastikan formatnya rapi: "Judul - Brand"
        // Hanya ganti jika judul memang perlu diperbaiki
        if (titleContent !== cleanedTitle) {
          content = content.replace(titleRegex, `$1${cleanedTitle}$3`);
          await writeFile(filePath, content);
          console.log(`✅ Diperbaiki: ${filePath}`);
        }
      }
    }
  }
  console.log("✨ Semua judul telah dinormalisasi menggunakan hyphen (-).");
}

fixTitles();
