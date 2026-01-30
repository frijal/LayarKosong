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

    try {
      const originalHTML = fs.readFileSync(filePath, 'utf8');

      // 1. Skip kalau file kosong
      if (!originalHTML || !originalHTML.trim()) continue;

      // 2. Cek Signature pakai Regex (Biar gak double minify)
      const signatureRegex = new RegExp(SIGNATURE_PREFIX);
      if (signatureRegex.test(originalHTML)) {
        stats.skipped++;
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

      // 4. Tempel Signature di baris terakhir dengan rapi
      minifiedHTML = minifiedHTML.trimEnd() + `\n${SIGNATURE}`;
      
      fs.writeFileSync(filePath, minifiedHTML, 'utf8');
      stats.success++;
      console.log(`✅ Berhasil: ${filePath}`);

    } catch (err) {
      stats.failed++;
      stats.errorFiles.push({ path: filePath, msg: err.message });
      console.error(`❌ Gagal: ${filePath}`);
    }
  }
}

// --- JALANKAN PROSES ---
console.log('🧼 Memulai Minify HTML (Layar Kosong Mode)...');

async function run() {
  for (const folder of folders) {
    await minifyFiles(folder);
  }

  console.log('\n' + '='.repeat(40));
  console.log('📊 REKAPITULASI AKHIR:');
  console.log(`✅ Berhasil di-minify : ${stats.success}`);
  console.log(`⏭️  Sudah pernah (Skip) : ${stats.skipped}`);
  console.log(`❌ Gagal proses       : ${stats.failed}`);
  console.log('='.repeat(40));
}

run().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
