import fs from 'fs';
import path from 'path';
import { Buffer } from 'node:buffer';
import minifyHtml from '@minify-html/node';

const folders = [
  './gaya-hidup', './jejak-sejarah', './lainnya',
  './olah-media', './opini-sosial', './sistem-terbuka', './warta-tekno'
];

let stats = { success: 0, skipped: 0, failed: 0, errorList: [] };

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

    // Hanya sikat file HTML, lewati index.html agar aman
    if (!file.endsWith('.html') || file === 'index.html') continue;

    try {
      const originalHTML = fs.readFileSync(filePath, 'utf8');
      if (!originalHTML.trim()) continue;

      // Cek segel biar gak kerja rodi dua kali
      if (originalHTML.includes('udah_dijepit_oleh_Fakhrul_Rijal')) {
        stats.skipped++;
        continue;
      }

      const d = new Date();
      const tgl = d.toISOString().slice(0, 10);
      const minifySignature = `<noscript>udah_dijepit_oleh_Fakhrul_Rijal_${tgl}</noscript>`;

      const input = Buffer.from(originalHTML);
      const output = minifyHtml.minify(input, {
        // --- OPSI EKSTREM (Gacor Mode) ---
        allow_optimal_entities: true,
        allow_noncompliant_unquoted_attribute_values: true,
        allow_removing_spaces_between_attributes: true,
        minify_doctype: true,
        
        // --- OPTIMASI CONTENT (Rust Engine) ---
        minify_css: true,
        minify_js: true,
        collapse_whitespaces: true,
        
        // --- PEMBERSIHAN TOTAL ---
        keep_comments: false,
        keep_html_and_head_opening_tags: false, // Menghilangkan tag opsional demi byte terakhir
        remove_bangs: true,
        remove_processing_instructions: true,
        
        // --- OVERRIDE STANDAR ---
        ensure_spec_compliant_unquoted_attribute_values: false,
        keep_spaces_between_attributes: false,
      });

      const minifiedHTML = output.toString();

      // Gabungkan hasil tanpa spasi/baris baru sedikitpun
      fs.writeFileSync(filePath, minifiedHTML.trimEnd() + minifySignature, 'utf8');
      
      stats.success++;
      console.log(`✅ Terjepit Sempurna (Rust): ${filePath}`);

    } catch (err) {
      stats.failed++;
      stats.errorList.push({ path: filePath, error: err.message });
      console.error(`❌ Gagal jepit: ${filePath}`);
    }
  }
}

async function run() {
  console.log('🧼 Memulai Minify Ultra (Mode Paralel)...');
  console.log('📂 Lokasi: Balikpapan | Status: Turbo On 🚀');
  
  const startTime = Date.now();

  try {
    // Memulai semua proses minify folder secara bersamaan
    await Promise.all(folders.map(f => minifyFiles(f)));
    
    const duration = (Date.now() - startTime) / 1000;

    console.log('\n' + '='.repeat(50));
    console.log('📊 REKAP PROSES LAYAR KOSONG (PARALEL)');
    console.log('='.repeat(50));
    console.log(`⏱️  Waktu Tempuh     : ${duration.toFixed(2)} detik`);
    console.log(`✅ Berhasil Dijepit : ${stats.success}`);
    console.log(`⏭️  Sudah Dijepit    : ${stats.skipped}`);
    console.log(`❌ Gagal Proses     : ${stats.failed}`);
    
    if (stats.failed > 0) {
      console.log('\n⚠️  DETAIL ERROR:');
      stats.errorList.forEach((item, i) => console.log(`${i+1}. ${item.path} -> ${item.error}`));
    }
    console.log('='.repeat(50) + '\n');
  } catch (err) {
    console.error('💥 Terjadi kesalahan saat eksekusi paralel:', err);
  }
}

run().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
