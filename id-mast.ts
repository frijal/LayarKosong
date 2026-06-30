import { readFileSync, writeFileSync, copyFileSync } from "fs";

const INSTANCE = Bun.env.MASTODON_INSTANCE || "mastodon.social";
const TOKEN = Bun.env.MASTODON_TOKEN;

if (!TOKEN) {
  console.error("❌ ERROR: MASTODON_TOKEN tidak ditemukan di environment.");
  process.exit(1);
}

const FILE_PATH = "./mini/posted-mastodon.txt";
const BACKUP_PATH = "./mini/posted-mastodon.backup.txt";

// 1. BUAT BACKUP
try {
  copyFileSync(FILE_PATH, BACKUP_PATH);
  console.log(`🛡️ Backup aman dibuat di: ${BACKUP_PATH}`);
} catch (e) {
  console.error(`❌ Gagal membuat backup.`);
  process.exit(1);
}

// 2. BACA FILE LAMA
const lines = readFileSync(FILE_PATH, "utf-8").split("\n");
const cleanLines = lines.map(l => l.trim()).filter(l => l.length > 0);

console.log(`\n🕵️ Memulai Operasi Penarikan Data Kolektif untuk ${cleanLines.length} baris...\n`);

async function runThief() {
  const urlToIdMap = new Map<string, string>();

  try {
    // A. Dapatkan ID Akun sendiri terlebih dahulu
    const credsRes = await fetch(`https://${INSTANCE}/api/v1/accounts/verify_credentials`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    if (!credsRes.ok) throw new Error("Gagal verifikasi token Mastodon.");
    const account = await credsRes.json() as { id: string };
    const accountId = account.id;

    console.log(`👤 Terhubung ke Akun ID: ${accountId}. Mengunduh riwayat postingan...`);

    // B. Paginasi menarik seluruh postingan akun
    let maxId: string | null = null;
    let hasMore = true;
    let page = 1;

    while (hasMore) {
      let fetchUrl = `https://${INSTANCE}/api/v1/accounts/${accountId}/statuses?limit=40`;
      if (maxId) fetchUrl += `&max_id=${maxId}`;

      const res = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });

      if (!res.ok) {
        console.error(`⚠️ Gagal mengambil postingan pada halaman ${page}`);
        break;
      }

      const statuses = await res.json() as any[];
      if (statuses.length === 0) {
        hasMore = false;
        break;
      }

      // Ekstrak URL dari konten HTML postingan
      for (const status of statuses) {
        if (status.reblog) continue; // Abaikan kalau itu hasil share/boost orang lain

        const content = status.content || "";
        // Regex untuk menangkap link dalam.web.id di dalam tag HTML Mastodon
        const matches = content.match(/https:\/\/dalam\.web\.id\/[^\s"<>]+/g);
        
        if (matches) {
          for (const matchedUrl of matches) {
            // Bersihkan sisa tanda baca di ujung URL jika ada
            const cleanUrl = matchedUrl.replace(/[\.,\?]$/, "");
            if (!urlToIdMap.has(cleanUrl)) {
              urlToIdMap.set(cleanUrl, status.id);
            }
          }
        }
      }

      console.log(`   📦 Halaman ${page}: Berhasil memetakan ${urlToIdMap.size} tautan unik...`);
      
      maxId = statuses[statuses.length - 1].id;
      page++;

      // Rem tangan tipis (300ms) karena endpoint internal akun sendiri sangat ringan
      await Bun.sleep(300);
    }

    console.log(`\n✅ Selesai menarik data. Memulai sinkronisasi dengan ${FILE_PATH}...`);

    // C. Cocokkan hasil map dengan file posted-mastodon.txt
    const newLines: string[] = [];
    let successfullyInjected = 0;

    for (const line of cleanLines) {
      if (line.includes("TOOT_ID:")) {
        newLines.push(line);
        continue;
      }

      // Cari apakah URL di baris ini ada di dalam Map hasil kerukan kita
      if (urlToIdMap.has(line)) {
        const tootId = urlToIdMap.get(line);
        newLines.push(`${line} | TOOT_ID:${tootId}`);
        successfullyInjected++;
      } else {
        // Jika tetap tidak ada di riwayat akun, biarkan format aslinya
        newLines.push(line);
      }
    }

    // 3. TULIS ULANG FILE
    writeFileSync(FILE_PATH, newLines.join("\n") + "\n");
    console.log(`\n🎉 OPERASI SELESAI!`);
    console.log(`   Modifikasi Berhasil: ${successfullyInjected} baris telah di-upgrade dengan TOOT_ID.`);

  } catch (error: any) {
    console.error(`💥 Terjadi kendala fatal: ${error.message}`);
    process.exit(1);
  }
}

runThief();
