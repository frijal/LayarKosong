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

      // === CEK SIGNATURE (DALAM TAG NOSCRIPT) ===
      if (originalHTML.includes('udah_dijepit_oleh_Fakhrul_Rijal')) {
        stats.skipped++;
        continue;
      }

      // 1. Siapkan signature duluan
      const d = new Date();
      const tgl = d.toISOString().slice(0, 10);
      const jam = d.toTimeString().slice(0, 5).replace(':', '_');
      const signature = `<noscript>udah_dijepit_oleh_Fakhrul_Rijal_${tgl}_${jam}</noscript>`;

      // 2. Proses Minify murni
      let minifiedHTML = await minify(originalHTML, {
        collapseWhitespace: true,
        removeComments: true,
        minifyJS: true,
        minifyCSS: true,
        processScripts: ['application/ld+json'],
        decodeEntities: true,
        removeAttributeQuotes: true,
        removeRedundantAttributes: true,
        removeOptionalTags: true, 
        sortAttributes: true,
        sortClassName: true,
        useShortDoctype: true
      });

      // 3. Tulis hasil akhir: Gabungkan hasil minify dengan signature noscript
      // Ditempel setelah minify agar tidak terkena trimming dari removeOptionalTags
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
  console.log('🧼 Memulai Minify Ultra (Mode Noscript Jepit)...');
  
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
  } else {
    console.log('\n✨ Mantap! Signature noscript sudah terpatri abadi.');
  }
  
  console.log('='.repeat(50) + '\n');
}

run().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
