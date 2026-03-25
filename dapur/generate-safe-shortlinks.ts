import { readdir } from "node:fs/promises";

/**
 * Sync Shortlinks ke shorturl.json
 * Menghasilkan mapping permanen, unik, dan terproteksi dari nama folder sistem.
 */
export async function syncShorturls(inputPath: string, outputPath: string) {
  try {
    // 1. Scan folder/file di root untuk daftar terlarang (Restricted ID)
    const restricted = new Set(["_headers", "_redirects", "functions", "node_modules", "public"]);
    try {
      const entries = await readdir("./", { withFileTypes: true });
      for (const entry of entries) {
        // Ambil nama tanpa ekstensi (misal: 'index.html' -> 'index')
        const name = entry.name.toLowerCase().split('.')[0];
        restricted.add(name);
      }
    } catch (e) {
      console.warn("⚠️ Gagal scan direktori root.");
    }

    // 2. Baca mapping lama dari shorturl.json
    let shortMap: Record<string, string> = {};
    const mappingFile = Bun.file(outputPath);
    if (await mappingFile.exists()) {
      shortMap = await mappingFile.json();
    }

    // 3. Baca data artikel.json
    const inputFile = Bun.file(inputPath);
    if (!(await inputFile.exists())) throw new Error("Input artikel.json tidak ditemukan!");
    const data = await inputFile.json();

    const urlToId: Record<string, string> = {};
    const usedIds = new Set<string>(restricted); 
    
    // Daftarkan ID yang sudah terpakai agar tidak duplikat
    for (const [id, url] of Object.entries(shortMap)) {
      urlToId[url] = id;
      usedIds.add(id);
    }

    // 4. Loop kategori dan artikel
    for (const category in data) {
      const catSlug = category.toLowerCase().trim().replace(/\s+/g, '-');

      for (const post of data[category]) {
        const cleanSlug = post[1].replace(/\.html$/, '').replace(/\//g, '').trim();
        const fullUrl = `https://dalam.web.id/${catSlug}/${cleanSlug}`;

        // Hanya buatkan ID jika URL belum ada di database
        if (!urlToId[fullUrl]) {
          let salt = 0;
          let id = "";
          
          while (true) {
            const hasher = new Bun.CryptoHasher("sha256");
            // Tambahkan salt jika terjadi bentrokan ID (Collision)
            hasher.update(cleanSlug + (salt > 0 ? salt : ""));
            const hashBuffer = hasher.digest();
            
            // Base62 Encoding (6 Karakter)
            const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            id = "";
            for (let i = 0; i < 6; i++) {
              id += chars[hashBuffer[i] % 62];
            }

            // Jika ID tidak bentrok dengan folder atau ID lain, gunakan
            if (!usedIds.has(id)) break;
            salt++;
          }

          shortMap[id] = fullUrl;
          usedIds.add(id);
          urlToId[fullUrl] = id;
        }
      }
    }

    // 5. Simpan secara MINIFIED ke shorturl.json
    await Bun.write(outputPath, JSON.stringify(shortMap));
    console.log(`✅ Update Berhasil: ${outputPath} siap digunakan.`);

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Eksekusi fungsi
syncShorturls("./artikel.json", "./shorturl.json");
