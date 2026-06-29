// untuk membuat tanggal modifi = tanggal publish.
// cara pakai: lakukan semuanya secara lokal, kosongkan isi sitemap.txt, lalu jalankan bun fix-tanggal.ts + generator-pro.ts

import { file, write } from "bun";
import { utimes } from "node:fs/promises";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Targetkan langsung ke dapur file mentah
const TARGET_FOLDER = join(process.cwd(), "artikel");

const PUB_REGEX = /<meta\s+property="article:published_time"\s+content="([^"]+)"\s*\/?>/i;
const MOD_REGEX = /<meta\s+property="article:modified_time"\s+content="([^"]+)"\s*\/?>/i;

// Fungsi untuk mendapatkan tanggal acak di antara dua tanggal
function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function fixRawModifiedDates() {
  console.log(`🚀 Memulai Mesin Waktu di dapur utama: ${TARGET_FOLDER}...`);

  if (!existsSync(TARGET_FOLDER)) {
    console.error("❌ Folder 'artikel' tidak ditemukan di root directory!");
    return;
  }

  // Ambil semua file .html, ABAIKAN yang depannya pakai '-' (seperti -template-feed.html)
  const allFiles = readdirSync(TARGET_FOLDER)
    .filter(f => f.endsWith(".html") && !f.startsWith("-"))
    .map(f => join(TARGET_FOLDER, f));

  const now = new Date(); // Waktu saat script dijalankan (hari ini)
  let countFixed = 0;
  let countUnchanged = 0; // Artikel yang modif = publish (biar natural)

  for (const filePath of allFiles) {
    let content = await file(filePath).text();

    // 1. Cari Tanggal Publish-nya
    const pubMatch = content.match(PUB_REGEX);
    if (!pubMatch) {
      console.warn(`⚠️ Skip (Tidak ada meta article:published_time): ${filePath}`);
      continue;
    }

    const pubDate = new Date(pubMatch[1]);
    if (isNaN(pubDate.getTime())) continue;

    // 2. Logic Naturalitas (60% diedit, 40% tetap original)
    const isEdited = Math.random() > 0.4; 
    const newModDate = isEdited ? getRandomDate(pubDate, now) : pubDate;
    const newModStr = newModDate.toISOString();

    if (isEdited) countFixed++; else countUnchanged++;

    // 3. Update tag HTML <meta property="article:modified_time">
    if (content.match(MOD_REGEX)) {
      content = content.replace(MOD_REGEX, `<meta property="article:modified_time" content="${newModStr}">`);
    } else {
      // Jika tidak ada meta modif, sisipkan tepat di bawah meta publish
      content = content.replace(PUB_REGEX, `$& \n    <meta property="article:modified_time" content="${newModStr}">`);
    }

    // 4. Tulis ulang file HTML mentah-nya
    await write(filePath, content);

    // 5. Trik Sulap OS: Ubah mtime file fisik agar sesuai dengan tanggal di HTML
    await utimes(filePath, newModDate, newModDate);
  }

  console.log(`
✅ SELESAI! Dapur File Mentah Berhasil Diperbaiki.
--------------------------------------------------
🔧 Artikel dengan Modif Random : ${countFixed}
✨ Artikel Original (Modif=Pub)  : ${countUnchanged}
--------------------------------------------------
Sekarang tinggal jalankan script Komposisi Blog / Builder kamu.
Nanti dia akan mendistribusikan tanggal yang sudah sehat ini ke semua folder etalase! 😎
`);
}

fixRawModifiedDates();
