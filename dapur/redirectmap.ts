const INPUT_FILE = "./artikel.json";
const OUTPUT_FILE = "./redirectmap.json";

async function simplifyJson() {
  try {
    const file = Bun.file(INPUT_FILE);
    if (!(await file.exists())) return;

    const data = await file.json();
    const simplified: Record<string, string> = {};

    for (const category in data) {
      // Kategori tetap dinormalisasi (lowercase + dash) agar URL tujuan rapi
      const catSlug = category.toLowerCase().trim().replace(/\s+/g, '-');

      data[category].forEach((post: any[]) => {
        // Slug dibersihkan persis sama dengan cara Cloudflare menangani path
        // 1. Hapus .html (jika ada di akhir)
        // 2. Hapus semua slash
        // 3. Trim spasi
        const cleanSlug = post[1]
          .replace(/\.html$/, '') 
          .replace(/\//g, '')
          .trim();
        
        simplified[cleanSlug] = catSlug;
      });
    }

    await Bun.write(OUTPUT_FILE, JSON.stringify(simplified));
    console.log(`✅ RedirectMap Berhasil diproses dengan Preserving Case.`);
  } catch (error) {
    console.error(error);
  }
}
simplifyJson();
