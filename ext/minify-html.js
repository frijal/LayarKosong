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

// === SIGNATURE STATIS ===
const now = new Date();
const datePart = now.toISOString().slice(0, 10);
const timePart = now.toTimeString().slice(0, 5); 

// Pastikan string ini tertutup sempurna
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

    // Lewati index.html dan hanya proses .html
    if (!file.endsWith('.html') || file === 'index.html') continue;

    try {
      const originalHTML = fs.readFileSync(filePath, 'utf8');

      // 1. Skip kalau file kosong
      if (!originalHTML || !originalHTML.trim()) continue;

      // 2. Cek Signature pakai Regex agar tidak double minify
      const signatureRegex = new RegExp(SIGNATURE_PREFIX);
      if (signatureRegex.test(originalHTML)) {
        stats.skipped++;
        // console.log(`⏭️  Skip: ${filePath}`);
        continue;
      }

      // 3. Proses Minify
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

      // 4. Tempel Signature di baris terakhir
      // trimEnd() memastikan tidak ada baris kosong sisa di bawah sebelum ditempel
      minifiedHTML = minifiedHTML.trimEnd() + `\n${SIGNATURE}`;
      
      fs.writeFileSync(filePath, minifiedHTML, 'utf8');
      stats.success++;
      console.log(`✅ Success: ${filePath}`);

    } catch (err) {
      stats.failed++;
      stats.errorFiles.push({ path: filePath, msg: err.message });
      console.error(`❌ Error pada ${filePath}: ${err.message}`);
    }
  }
}

// --- JALANKAN PROSES ---
console.log('🧼 Memulai Minify HTML untuk Layar Kosong...');

async function run() {
  for (const folder of folders) {
    await minifyFiles(folder);
  }

  console.log('\n' + '='.repeat(40));
  console.log('📊 REKAPITULASI PROSES:');
  console.log(`✅ Berhasil di-minify : ${stats.success}`);
  console.log(`⏭️  Sudah pernah (Skip) : ${stats.skipped}`);
  console.log(`❌ Gagal proses       : ${stats.failed}`);
  console.log('='.repeat(40));
}

run().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
