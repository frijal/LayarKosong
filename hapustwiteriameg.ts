import { join } from "node:path";
import { readdir, stat } from "node:fs/promises";

// Mengambil argumen ketiga (index 2) dari command line
// Contoh: bun clean-meta.ts ./src -> targetParam adalah "./src"
const targetParam = Bun.argv[2];

if (!targetParam) {
  console.error("❌ Tolong masukkan target direktori!");
  console.log("Contoh: bun clean-meta.ts ./folder-html");
  process.exit(1);
}

async function cleanTwitterImageMeta(directory: string) {
  try {
    const files = await readdir(directory);

    for (const file of files) {
      const fullPath = join(directory, file);
      const fileStat = await stat(fullPath);

      if (fileStat.isDirectory()) {
        await cleanTwitterImageMeta(fullPath);
      } else if (file.endsWith(".html")) {
        const htmlFile = Bun.file(fullPath);
        const content = await htmlFile.text();

        // Regex untuk menghapus tag property="twitter:image" secara bersih
        const twitterImageRegex = /<meta\s+property="twitter:image"\s+content=".*?">\s*/g;

        if (twitterImageRegex.test(content)) {
          const updatedContent = content.replace(twitterImageRegex, "");
          await Bun.write(fullPath, updatedContent);
          console.log(`✅ Cleaned: ${fullPath}`);
        }
      }
    }
  } catch (err) {
    console.error(`❌ Gagal memproses ${directory}:`, err.message);
  }
}

console.log(`🚀 Memulai pembersihan di: ${targetParam}`);
cleanTwitterImageMeta(targetParam).then(() => {
  console.log("✨ Selesai!");
});
