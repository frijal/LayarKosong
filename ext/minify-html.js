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

// Inisialisasi statistik dan daftar error
let stats = { 
  success: 0, 
  skipped: 0, 
  failed: 0,
  errorList: [] // Tempat curhat file yang gagal
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

      // Cek apakah sudah ada signature (Anti-Double Process)
      if (originalHTML.includes('jepitan_oleh_Fakhrul_Rijal')) {
        stats.skipped++;
        continue;
      }

      let minifiedHTML = await minify(originalHTML, {
        collapseWhitespace: true,
        removeComments: true,
        minifyJS: true,
        minifyCSS: true,
        processScripts: ['application/ld+json'],
        decodeEntities: true
      });

      // Buat Signature Jam & Tanggal
      const d = new Date();
      const tgl = d.toISOString().slice(0, 10);
      const jam = d.toTimeString().slice(0, 5);
      const signature = ``;

      fs.writeFileSync(filePath, minifiedHTML.trimEnd() + '\n' + signature, 'utf8');
      stats.success++;
      console.log(`✅ ${filePath}`);

    } catch (err) {
      stats.failed++;
      // Catat path file dan pesan error-nya
      stats.errorList.push({
        path: filePath,
        error: err.message
      });
      console.error(`❌ Gagal: ${filePath}`);
    }
  }
}

async function run() {
  console.log('🧼 Memulai Minify HTML untuk Layar Kosong...');
  
  for (const f of folders) {
    await minifyFiles(f);
  }

  // --- LAPORAN AKHIR DETAIL ---
  console.log('\n' + '='.repeat(50));
  console.log('📊 REKAPITULASI PROSES');
  console.log('='.repeat(50));
  console.log(`✅ Berhasil di-minify : ${stats.success}`);
  console.log(`⏭️  Sudah pernah (Skip) : ${stats.skipped}`);
  console.log(`❌ Gagal total         : ${stats.failed}`);
  
  if (stats.failed > 0) {
    console.log('\n⚠️  DAFTAR FILE ERROR:');
    stats.errorList.forEach((item, index) => {
      console.log(`${index + 1}. [${item.path}]`);
      console.log(`   Pesan: ${item.error}`);
    });
    console.log('\n💡 Tips: Biasanya karena ada tag HTML yang nggak nutup atau script JS rusak.');
  }
  
  console.log('='.repeat(50) + '\n');
}

run().catch(err => {
  console.error('💥 Fatal System Error:', err);
  process.exit(1);
});
