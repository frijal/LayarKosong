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

// === SIGNATURE STATIS (Dihitung sekali saat skrip jalan) ===
const now = new Date();
const datePart = now.toISOString().slice(0, 10);
const timePart = now.toTimeString().slice(0, 5); // Ambil HH:mm

const SIGNATURE_PREFIX = '`;

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

    // === 1. CEK: JANGAN PROSES KALAU FILE KOSONG ===
    if (!originalHTML.trim()) {
      continue;
    }

    // === 2. CEK: SUDAH PERNAH DI-MINIFY? (LOGIKA ANTI-LOLOS) ===
    // Menggunakan regex supaya lebih sakti mendeteksi prefix di mana saja
    const signatureRegex = new RegExp(SIGNATURE_PREFIX);
    if (signatureRegex.test(originalHTML)) {
      stats.skipped++;
      console.log(`⏭️  Skipped (Sudah ada jepitan): ${filePath}`);
      continue;
    }

    try {
      let minifiedHTML = await minify(originalHTML, {
        collapseWhitespace: true,
        removeComments: true, // Menghapus komentar lama agar bersih
        minifyJS: true,
        minifyCSS: true,
        processScripts: ['application/ld+json'],
        ignoreCustomFragments: [
          /<%[\s\S]*?%>/,
          /<\?[\s\S]*?\?>/
        ]
      });

      // === 3. PASANG SIGNATURE (Ditaruh di baris paling akhir) ===
      // trimEnd() memastikan tidak ada spasi/baris kosong sisa di bawah
      minifiedHTML = minifiedHTML.trimEnd() + `\n${SIGNATURE}`;
      
      fs.writeFileSync(filePath, minifiedHTML, 'utf8');

      stats.success++;
      console.log(`✅ Success Minify: ${filePath}`);
    } catch (err) {
      stats.failed++;
      stats.errorFiles.push({ path: filePath, msg: err.message });
      console.error(`❌ Parse Error pada ${filePath}`);
    }
  }
}

// --- EKSEKUSI UTAMA ---
console.log('🧼 Memulai Minify Cerdas (Statis Signature) untuk Layar Kosong...');

for (const folder of folders) {
  await minifyFiles(folder);
}

// --- LAPORAN REKAPITULASI ---
console.log('\n' + '='.repeat(45));
console.log('📊 REKAPITULASI PROSES MINIFY');
console.log('='.repeat(45));
console.log(`✅ Berhasil di-minify : ${stats.success}`);
console.log(`⏭️  Sudah pernah (Skip) : ${stats.skipped}`);
console.log(`❌ Gagal (Parse Error): ${stats.failed}`);

if (stats.failed > 0) {
  console.log('\n⚠️  DAFTAR FILE BERMASALAH:');
  stats.errorFiles.forEach((item, index) => {
    console.log(`${index + 1}. ${item.path} -> ${item.msg}`);
  });
}

console.log('='.repeat(45) + '\n');
