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

let stats = { 
  success: 0, 
  skipped: 0, 
  failed: 0,
  errorList: [] 
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
      if (!originalHTML.trim()) continue;

      // === CEK SIGNATURE (SKIP JIKA ADA TEKS INI) ===
      if (originalHTML.includes('udah_dijepit_oleh_Fakhrul_Rijal')) {
        stats.skipped++;
        continue;
      }

      let minifiedHTML = await minify(originalHTML, {
        collapseWhitespace: true,
        removeComments: true,
        minifyJS: true,
        minifyCSS: true,
        processScripts: ['application/ld+json'],
        decodeEntities: true,
        removeAttributeQuotes: true,
        removeRedundantAttributes: true,
        removeOptionalTags: true, // Tetap ON untuk diet maksimal
        sortAttributes: true,
        sortClassName: true,
        useShortDoctype: true,
        // KUNCI: Kecualikan signature agar tidak ikut terhapus
        ignoreCustomComments: [
          /udah_dijepit_oleh_Fakhrul_Rijal/
        ]
      });

      // === BUAT SIGNATURE (FORMAT UNDERSCORE) ===
      const d = new Date();
      const tgl = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const jam = d.toTimeString().slice(0, 5).replace(':', '_'); // HH_mm
      const signature = ``;

      // Simpan hasil minify + signature di baris terakhir
      fs.writeFileSync(filePath, minifiedHTML.trimEnd() + '\n' + signature, 'utf8');
      stats.success++;

    } catch (err) {
      stats.failed++;
      stats.errorList.push({
        path: filePath,
        error: err.message
      });
      console.error(`❌ Gagal: ${filePath}`);
    }
  }
}

async function run() {
  console.log('🧼 Memulai Minify Ultra (Mode Jepit Fakhrul Rijal)...');
  
  for (const f of folders) {
    await minifyFiles(f);
  }

  // --- REKAPITULASI RINGKAS ---
  console.log('\n' + '='.repeat(50));
  console.log('📊 REKAP PROSES');
  console.log('='.repeat(50));
  console.log(`✅ Sukses : ${stats.success}`);
  console.log(`⏭️  Skip   : ${stats.skipped}`);
  console.log(`❌ Gagal  : ${stats.failed}`);
  
  if (stats.failed > 0) {
    console.log('\n⚠️  DETAIL FILE BERMASALAH:');
    stats.errorList.forEach((item, index) => {
      console.log(`${index + 1}. [${item.path}]`);
      console.log(`   Pesan Error: ${item.error}`);
    });
    console.log('\n💡 Tips: Cek tag yang tidak tertutup atau script JS yang rusak.');
  } else {
    console.log('\n✨ Mantap! Semua file berhasil diproses tanpa error.');
  }
  
  console.log('='.repeat(50) + '\n');
}

run().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
