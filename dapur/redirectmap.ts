import { writeFileSync } from "node:fs";

// Nama file input dan output
const INPUT_FILE = "./artikel.json";
const OUTPUT_FILE = "./redirectmap.json";

async function simplifyJson() {
  try {
    const file = Bun.file(INPUT_FILE);
    
    // Cek apakah file ada
    if (!(await file.exists())) {
      console.error(`❌ File ${INPUT_FILE} tidak ditemukan!`);
      return;
    }

    const data = await file.json();
    const simplified: Record<string, string> = {};

    console.log("⏳ Memproses data...");

    for (const category in data) {
      // Normalisasi nama kategori (sama seperti logika di Cloudflare Function)
      const catSlug = category.toLowerCase().trim().replace(/\s+/g, '-');

      data[category].forEach((post: any[]) => {
        // post[1] adalah slug asli (misal: "judul-artikel.html")
        // Kita simpan tanpa .html agar pencocokan di Edge lebih ringan
        const cleanSlug = post[1]
        .replace('.html', '')
        .replace(/\//g, '')
        .toLowerCase() // TAMBAHKAN INI
        .trim();       // TAMBAHKAN INI

        simplified[cleanSlug] = catSlug.toLowerCase();
      });
    }

    // Tulis hasil ke file baru (minified untuk menghemat ukuran)
    await Bun.write(OUTPUT_FILE, JSON.stringify(simplified));

    const oldSize = (file.size / 1024).toFixed(2);
    const newSize = (Bun.file(OUTPUT_FILE).size / 1024).toFixed(2);

    console.log(`✅ Berhasil!`);
    console.log(`📊 Ukuran Lama: ${oldSize} KB`);
    console.log(`📊 Ukuran Baru: ${newSize} KB`);
    console.log(`🚀 File disimpan sebagai: ${OUTPUT_FILE}`);

  } catch (error) {
    console.error("❌ Terjadi kesalahan:", error);
  }
}

simplifyJson();
