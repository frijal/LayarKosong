const INPUT_FILE = "./artikel.json";
const MAPPING_FILE = "./shorturl.json";

/**
 * Base62 Encoding untuk ID yang unik (0-9, a-z, A-Z)
 */
function toBase62(buffer: Uint8Array, length = 6): string {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[buffer[i] % 62];
  }
  return result;
}

async function generateUniqueId(slug: string, existingIds: Set<string>): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(slug);
  let hashBuffer = hasher.digest();
  
  let id = toBase62(hashBuffer);
  let salt = 0;

  // Jika terjadi duplikasi ID (collision), tambahkan salt dan hash ulang
  while (existingIds.has(id)) {
    const retryHasher = new Bun.CryptoHasher("sha256");
    retryHasher.update(slug + salt);
    hashBuffer = retryHasher.digest();
    id = toBase62(hashBuffer);
    salt++;
  }
  
  return id;
}

async function syncShortlinks() {
  try {
    // 1. Load data lama agar ID tidak berubah
    let shortMap: Record<string, string> = {};
    const mappingFile = Bun.file(MAPPING_FILE);
    if (await mappingFile.exists()) {
      shortMap = await mappingFile.json();
    }

    // 2. Load data artikel terbaru
    const inputFile = Bun.file(INPUT_FILE);
    if (!(await inputFile.exists())) return;
    const data = await inputFile.json();

    // Buat kebalikan mapping (URL -> ID) untuk cek apakah artikel sudah punya ID
    const urlToId: Record<string, string> = {};
    const usedIds = new Set<string>();
    
    for (const [id, url] of Object.entries(shortMap)) {
      urlToId[url] = id;
      usedIds.add(id);
    }

    // 3. Proses artikel dari artikel.json
    for (const category in data) {
      const catSlug = category.toLowerCase().trim().replace(/\s+/g, '-');

      for (const post of data[category]) {
        const cleanSlug = post[1].replace(/\.html$/, '').replace(/\//g, '').trim();
        const fullUrl = `https://dalam.web.id/${catSlug}/${cleanSlug}`;

        // Jika URL ini belum ada di mapping lama, buatkan ID baru
        if (!urlToId[fullUrl]) {
          const newId = await generateUniqueId(cleanSlug, usedIds);
          shortMap[newId] = fullUrl;
          usedIds.add(newId);
          urlToId[fullUrl] = newId;
          console.log(`✨ ID Baru: ${newId} -> ${cleanSlug}`);
        }
      }
    }

    // 4. Sortir berdasarkan ID agar file JSON rapi
    const sortedMap = Object.keys(shortMap).sort().reduce((acc, key) => {
      acc[key] = shortMap[key];
      return acc;
    }, {} as Record<string, string>);

    // 5. Simpan kembali ke shortlinks.json
    await Bun.write(MAPPING_FILE, JSON.stringify(sortedMap));
    console.log(`✅ Sinkronisasi selesai. Total ${Object.keys(sortedMap).length} shortlinks.`);

  } catch (error) {
    console.error("Gagal sinkronisasi shortlinks:", error);
  }
}

syncShortlinks();
