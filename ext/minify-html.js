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

    // Skip file yang bukan HTML atau index.html (sesuai request)
    if (!file.endsWith('.html') || file === 'index.html') continue;

    try {
      const originalHTML = fs.readFileSync(filePath, 'utf8');

      if (!originalHTML.trim()) continue;

      // Cek Signature Statis
      if (originalHTML.includes('jepitan_oleh_Fakhrul_Rijal')) {
        stats.skipped++;
        continue;
      }

      // === PROSES MINIFY DENGAN OPTIMASI DOKUMENTASI ===
      let minifiedHTML = await minify(originalHTML, {
        collapseWhitespace: true,
        removeComments: true,
        minifyJS: true,
        minifyCSS: true,
        processScripts: ['application/ld+json'],
        decodeEntities: true,
        // Tambahan optimasi agresif:
        removeAttributeQuotes: true,     // Hapus kutip jika aman
        removeRedundantAttributes: true, // Hapus atribut default
        removeOptionalTags: true,        // Hapus penutup html/body (agresif)
        sortAttributes: true,            // Optimasi GZIP
        sortClassName: true,             // Optimasi GZIP
        useShortDoctype: true            // <!DOCTYPE html>
      });

      // Buat Signature Jam & Tanggal (Fixed syntax)
      const d = new Date();
      const tgl = d.toISOString().slice(0, 10);
      const jam = d.toTimeString().slice(0, 5);
      const signature = ``;

      // Gabungkan hasil minify dengan signature di baris terakhir
      fs.writeFileSync(filePath, minifiedHTML.trimEnd() + '\n' + signature, 'utf8');
      
      stats.success++;
      console.log(`✅ Success: ${filePath}`);

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
  console.log('🧼 Memulai Minify Ultra (Layar Kosong Mode)...');
  
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
    console.log('\n💡 Tips: Cek tag HTML yang tidak tertutup atau script JS yang rusak.');
  }
  
  console.log('='.repeat(50) + '\n');
}

run().catch(err => {
  console.error('💥 Fatal System Error:', err);
  process.exit(1);
});
