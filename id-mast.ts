import { readFileSync, writeFileSync, copyFileSync } from "fs";

// Ambil kredensial dari environment variable (sama seperti script autopost kamu)
const INSTANCE = Bun.env.MASTODON_INSTANCE || "mastodon.social"; // Ganti jika pakai instance lain
const TOKEN = Bun.env.MASTODON_TOKEN;

if (!TOKEN) {
  console.error("❌ ERROR: MASTODON_TOKEN tidak ditemukan di .env");
  process.exit(1);
}

const FILE_PATH = "./mini/posted-mastodon.txt";
const BACKUP_PATH = "./mini/posted-mastodon.backup.txt";

// 1. BUAT BACKUP DULU (Jaga-jaga kalau script ngamuk)
try {
  copyFileSync(FILE_PATH, BACKUP_PATH);
  console.log(`🛡️ Backup aman dibuat di: ${BACKUP_PATH}`);
} catch (e) {
  console.error("❌ Gagal membuat backup. Script dihentikan.");
  process.exit(1);
}

// 2. BACA FILE LAMA
const lines = readFileSync(FILE_PATH, "utf-8").split("\n");
const newLines: string[] = [];

console.log(`\n🕵️ Memulai Operasi Pencurian ID untuk ${lines.length} baris...\n`);

async function runThief() {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip baris kosong
    if (!line) continue;

    // Skip kalau sudah ada format TOOT_ID (biar script ini aman dijalanin berkali-kali)
    if (line.includes("TOOT_ID:")) {
      console.log(`⏭️ [SKIP] Sudah punya ID: ${line}`);
      newLines.push(line);
      continue;
    }

    const url = line;
    console.log(`🔍 [${i + 1}/${lines.length}] Mencari: ${url}`);

    try {
      // Tembak Mastodon API Search (Cari berdasarkan URL persis)
      const res = await fetch(
        `https://${INSTANCE}/api/v2/search?q="${encodeURIComponent(url)}"&type=statuses&resolve=true`,
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
          },
        }
      );

      if (!res.ok) {
        console.error(`   ⚠️ Gagal fetch (Status ${res.status}). Lewati dulu.`);
        newLines.push(url);
        continue;
      }

      const data = await res.json() as { statuses: any[] };

      // Cek apakah pencarian membuahkan hasil
      if (data.statuses && data.statuses.length > 0) {
        // Asumsi hasil pertama adalah postingan bot kamu
        const tootId = data.statuses[0].id;
        console.log(`   ✅ KETEMU! ID: ${tootId}`);
        newLines.push(`${url} | TOOT_ID:${tootId}`);
      } else {
        console.log(`   ❌ Tidak ditemukan di server Mastodon.`);
        newLines.push(url); // Biarkan ke format asli tanpa ID
      }
    } catch (e: any) {
      console.error(`   💥 Error koneksi: ${e.message}`);
      newLines.push(url);
    }

    // ⏳ REM TANGAN: Jeda 1.5 detik per request agar tidak diblokir (Rate Limit Mastodon)
    await Bun.sleep(1500);
  }

  // 3. TULIS ULANG FILE DENGAN HASIL CURIAN
  writeFileSync(FILE_PATH, newLines.join("\n") + "\n");
  console.log(`\n🎉 Operasi Selesai! File ${FILE_PATH} telah di-upgrade.`);
}

runThief();
