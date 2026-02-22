import fs from 'fs';
import path from 'path';
import * as minifyHtml from '@minify-html/node'; // Import library baru

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

    if (!file.endsWith('.html') || file === 'index.html') continue;

    try {
      const originalHTML = fs.readFileSync(filePath, 'utf8');
      if (!originalHTML.trim()) continue;

      // Logika signature tetap sama
      if (originalHTML.includes('udah_dijepit_oleh_Fakhrul_Rijal')) {
        stats.skipped++;
        continue;
      }

      const d = new Date();
      const tgl = d.toISOString().slice(0, 10);
      const minifySignature = `<noscript>udah_dijepit_oleh_Fakhrul_Rijal_${tgl}</noscript>`;

      // Konfigurasi minify-html (Rust-based)
      // minify-html memproses CSS/JS di dalam HTML secara otomatis
      const input = Buffer.from(originalHTML);
      const output = minifyHtml.minify(input, {
        do_not_minify_doctype: false,
        ensure_spec_compliant_unquoted_attribute_values: true,
        keep_comments: false,
        minify_css: true,
        minify_js: true,
        remove_bangs: true,
        remove_processing_instructions: true,
        collapse_whitespaces: true,
      });

      const minifiedHTML = output.toString();

      // Tulis hasil akhir
      fs.writeFileSync(filePath, minifiedHTML.trimEnd() + '\n' + minifySignature, 'utf8');
      stats.success++;
      console.log(`✅ Minified (Rust): ${filePath}`);

    } catch (err) {
      stats.failed++;
      stats.errorList.push({ path: filePath, error: err.message });
      console.error(`❌ Gagal: ${filePath}`);
    }
  }
}

// Fungsi run() tetap sama seperti sebelumnya...
async function run() {
  console.log('🧼 Memulai Minify Ultra (Rust Engine Integration)...');
  for (const f of folders) { await minifyFiles(f); }
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
