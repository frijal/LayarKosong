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

// Inisialisasi statistik
let stats = { success: 0, skipped: 0, failed: 0 };

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

      if (!originalHTML.trim()) continue;

      // === CEK SIGNATURE LANGSUNG PAKAI STRING STATIS ===
      if (originalHTML.includes('jepitan_oleh_Fakhrul_Rijal')) {
        stats.skipped++;
        continue;
      }

      let minifiedHTML = await minify(originalHTML, {
        collapseWhitespace: true,
        removeComments: true,
        minifyJS: true,
        minifyCSS: true,
        processScripts: ['application/ld+json']
      });

      // === PASANG SIGNATURE STATIS (TGL & JAM) ===
      const d = new Date();
      const tgl = d.toISOString().slice(0, 10);
      const jam = d.toTimeString().slice(0, 5);
      const signature = ``;

      fs.writeFileSync(filePath, minifiedHTML.trimEnd() + '\n' + signature, 'utf8');
      stats.success++;
      console.log(`✅ ${filePath}`);

    } catch (err) {
      stats.failed++;
      console.error(`❌ ${filePath}: ${err.message}`);
    }
  }
}

console.log('🧼 Minifying Layar Kosong...');

async function run() {
  for (const f of folders) await minifyFiles(f);
  console.log(`\nSelesai! Berhasil: ${stats.success}, Skip: ${stats.skipped}, Gagal: ${stats.failed}`);
}

run();
