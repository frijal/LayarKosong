// Nama file input dan output
const INPUT_FILE = "./artikel.json";
const OUTPUT_FILE = "./redirectmap.json";

async function simplifyJson() {
  try {
    const file = Bun.file(INPUT_FILE);

    if (!(await file.exists())) {
      console.error(`❌ File ${INPUT_FILE} tidak ditemukan!`);
      return;
    }

    const data = await file.json();
    const simplified = {};

    console.log("⏳ Memproses data (preserve original case)...");

    const normalizeSlug = (raw) => {
      if (raw == null) return "";
      let s = String(raw);
      try { s = decodeURIComponent(s); } catch (e) {}
      s = s.trim();
      s = s.split(/[?#]/)[0];        // hapus query/hash
      s = s.replace(/^\/+/, "");     // hapus leading slash
      s = s.replace(/\/+$/, "");     // hapus trailing slash
      s = s.replace(/\.html$/i, ""); // hapus ekstensi .html atau .HTML (tidak mengubah case slug)
      return s;
    };

    for (const category in data) {
      const posts = data[category];
      if (!Array.isArray(posts)) {
        console.warn(`⚠️  Skipping category ${category} because it is not an array`);
        continue;
      }

      for (const post of posts) {
        let rawSlug = "";
        if (Array.isArray(post)) {
          rawSlug = post.find((p) => typeof p === "string" && p.length > 0) ?? post[1] ?? post[0] ?? "";
        } else if (typeof post === "string") {
          rawSlug = post;
        } else if (post && typeof post === "object") {
          rawSlug = post.slug ?? post.url ?? post.path ?? "";
        }

        const cleanSlug = normalizeSlug(rawSlug);
        if (!cleanSlug) continue;

        // Simpan slug persis sebagai key dan category persis sebagai value
        if (!simplified.hasOwnProperty(cleanSlug)) {
          simplified[cleanSlug] = String(category);
        }
      }
    }

    await Bun.write(OUTPUT_FILE, JSON.stringify(simplified, null, 2), { encoding: "utf8" });

    const oldSize = (file.size / 1024).toFixed(2);
    const newSize = (Bun.file(OUTPUT_FILE).size / 1024).toFixed(2);

    console.log(`✅ Berhasil membuat ${OUTPUT_FILE}`);
    console.log(`📊 Ukuran Lama: ${oldSize} KB`);
    console.log(`📊 Ukuran Baru: ${newSize} KB`);
    console.log(`🚀 File disimpan sebagai: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error("❌ Terjadi kesalahan:", error);
  }
}

simplifyJson();
