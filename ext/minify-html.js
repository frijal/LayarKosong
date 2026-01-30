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

      // 2. Cek Signature pakai Regex (Anti-Gagal)
      const signatureRegex = new RegExp(SIGNATURE_PREFIX);
      if (signatureRegex.test(originalHTML)) {
        stats.skipped++;
        // console.log(`⏭️  Skipped: ${filePath}`);
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
      minifiedHTML = minifiedHTML.trimEnd() + `\n${SIGNATURE}`;
      
      fs.writeFileSync(filePath, minifiedHTML, 'utf8');
      stats.success++;
      console.log(`✅ Sukses: ${filePath}`);

    } catch (err) {
      stats.failed++;
      stats.errorFiles.push({ path: filePath, msg: err.message });
      console.error(`❌ Gagal: ${filePath}`);
    }
  }
}

// --- JALANKAN ---
console.log('🧼 Memulai Minify HTML untuk Layar Kosong...');

async function run() {
  for (const folder of folders) {
    await minifyFiles(folder);
  }

  console.log('\n' + '='.repeat(40));
  console.log(`✅ Berhasil : ${stats.success}`);
  console.log(`⏭️  Diskip   : ${stats.skipped}`);
  console.log(`❌ Gagal    : ${stats.failed}`);
  console.log('='.repeat(40));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
