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

      // === LOGIKA SIGNATURE YANG DIPERBAIKI ===
      // Jangan skip kalau cuma ada 'schema_oleh'.
      // HANYA skip kalau sudah ada 'udah_dijepit' (tanda minify sudah selesai).
      if (originalHTML.includes('udah_dijepit_oleh_Fakhrul_Rijal')) {
        stats.skipped++;
        // console.log(`⏭️  Skipped: ${file} (Sudah diminify)`);
        continue;
      }

      // 1. Siapkan signature minify dengan tanggal hari ini
      const d = new Date();
      const tgl = d.toISOString().slice(0, 10);
      const minifySignature = `<noscript>udah_dijepit_oleh_Fakhrul_Rijal_${tgl}</noscript>`;

      // 2. Proses Minify murni
      // Opsi 'processScripts' akan ikut mengecilkan JSON-LD yang dibuat script Python!
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

      // 3. Tulis hasil akhir:
      // Kita tempel signature baru di akhir.
      // Signature schema dari Python akan tetap ada di dalam 'minifiedHTML' (tapi versi compress).
      fs.writeFileSync(filePath, minifiedHTML.trimEnd() + '\n' + minifySignature, 'utf8');
      stats.success++;
      console.log(`✅ Minified: ${filePath}`);

    } catch (err) {
      stats.failed++;
      stats.errorList.push({ path: filePath, error: err.message });
      console.error(`❌ Gagal: ${filePath}`);
    }
  }
}

async function run() {
  console.log('🧼 Memulai Minify Ultra (Mode Integrasi Schema)...');

  for (const f of folders) {
    await minifyFiles(f);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 REKAP PROSES LAYAR KOSONG');
  console.log('='.repeat(50));
  console.log(`✅ Berhasil Minify : ${stats.success}`);
  console.log(`⏭️  Skip (Sudah)     : ${stats.skipped}`);
  console.log(`❌ Gagal           : ${stats.failed}`);

  if (stats.failed > 0) {
    console.log('\n⚠️  DETAIL ERROR:');
    stats.errorList.forEach((item, i) => console.log(`${i+1}. ${item.path} -> ${item.error}`));
  }
  console.log('='.repeat(50) + '\n');
}

run().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
