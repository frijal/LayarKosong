import { join } from "node:path";
import { readdir, stat } from "node:fs/promises";

const targetParam = Bun.argv[2];

if (!targetParam) {
  console.error("❌ Tolong masukkan target direktori!");
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

        // PENJELASAN REGEX AMAN:
        // <meta\s+ -> Cari tag meta
        // (?=[^>]*\bproperty=["']?twitter:image\b) -> Lookahead: Pastikan di dalam tag ini ADA 'property=twitter:image'
        // [^>]* -> Ambil semua karakter di dalam tag tersebut
        // >\s* -> Sampai penutup tag dan hapus baris baru
        // Ini TIDAK akan menyentuh tag yang menggunakan 'name=twitter:image'
        const safeRegex = /<meta\s+(?=[^>]*\bproperty=["']?twitter:image\b)[^>]*>\s*/g;

        if (safeRegex.test(content)) {
          const updatedContent = content.replace(safeRegex, "");
          await Bun.write(fullPath, updatedContent);
          console.log(`✅ Cleaned (property only): ${fullPath}`);
        }
      }
    }
  } catch (err) {
    console.error(`❌ Gagal:`, err.message);
  }
}

console.log(`🚀 Membersihkan 'property=twitter:image', menjaga 'name=twitter:image'...`);
cleanTwitterImageMeta(targetParam);
