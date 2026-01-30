import fs from 'fs';
import path from 'path';
import { minify } from 'html-minifier-terser';

const folders = [
  './gaya-hidup',
  './jejak-sejarah',
  './lainnya',
  './olah-media',
  './opini-sosial',
  './sistem-terbuka',
  './warta-tekno'
];

// === SIGNATURE DENGAN TANGGAL ===
// Format: YYYY-MM-DD (stabil, gampang di-audit)
const TODAY = new Date().toISOString().slice(0, 10);
const SIGNATURE_PREFIX = '<!-- jepitan_oleh_Fakhrul_Rijal ';
const SIGNATURE = `${SIGNATURE_PREFIX}${TODAY} -->`;

// Inisialisasi penghitung
let stats = {
  success: 0,
  skipped: 0,
  failed: 0,
  errorFiles: []
};

async function minifyFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await minifyFiles(filePath);
      continue;
    }

    if (!file.endsWith('.html') || file === 'index.html') continue;

    const originalHTML = fs.readFileSync(filePath, 'utf8');

    // === CEK: SUDAH PERNAH DI-MINIFY (SIGNATURE DI AKHIR FILE) ===
    const trimmed = originalHTML.trimEnd();
    if (trimmed.endsWith('-->') && trimmed.includes(SIGNATURE_PREFIX)) {
      stats.skipped++;
      console.log(`⏭️  Skipped: ${filePath}`);
      continue;
    }

    try {
      let minifiedHTML = await minify(originalHTML, {
        collapseWhitespace: true,
        removeComments: true,
        minifyJS: true,
        minifyCSS: true,
        processScripts: ['application/ld+json'],
        ignoreCustomFragments: [
          /<%[\s\S]*?%>/,
          /<\?[\s\S]*?\?>/
        ]
      });

      // Pastikan rapi + signature selalu di baris terakhir
      minifiedHTML = minifiedHTML.trimEnd() + `\n${SIGNATURE}\n`;
      fs.writeFileSync(filePath, minifiedHTML, 'utf8');

      stats.success++;
      console.log(`✅ Success: ${filePath}`);
    } catch (err) {
      stats.failed++;
      stats.errorFiles.push({ path: filePath, msg: err.message });
      console.error(`❌ Parse Error pada ${filePath}`);
    }
  }
}

// --- EKSEKUSI UTAMA ---
console.log('🧼 Memulai Minify Cerdas untuk Layar Kosong...');

for (const folder of folders) {
  await minifyFiles(folder);
}

// --- LAPORAN REKAPITULASI ---
console.log('\n' + '='.repeat(40));
console.log('📊 REKAPITULASI PROSES MINIFY');
console.log('='.repeat(40));
console.log(`✅ Berhasil di-minify : ${stats.success}`);
console.log(`⏭️  Sudah pernah (Skip) : ${stats.skipped}`);
console.log(`❌ Gagal (Parse Error): ${stats.failed}`);

if (stats.failed > 0) {
  console.log('\n⚠️ DAFTAR FILE BERMASALAH:');
  stats.errorFiles.forEach((item, index) => {
    console.log(`${index + 1}. ${item.path} -> ${item.msg}`);
  });
  console.log('\n💡 Tips: Cek tag HTML yang tidak tertutup atau script JS yang rusak.');
}

console.log('='.repeat(40) + '\n');
