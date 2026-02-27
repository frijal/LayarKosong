import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';
// import minifyHtml from '@minify-html/node';
import { minify } from '@minify-html/wasm';

const folders = [
  './gaya-hidup', './jejak-sejarah', './lainnya',
  './olah-media', './opini-sosial', './sistem-terbuka', './warta-tekno'
];

let stats = { 
  success: 0, 
  skipped: 0, 
  failed: 0, 
  errorList: [], 
  totalSaved: 0,
  totalBefore: 0,
  totalAfter: 0
};

// Helper untuk format ukuran byte agar manusiawi
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      let originalHTML = fs.readFileSync(filePath, 'utf8');
      if (!originalHTML.trim()) continue;

      if (originalHTML.includes('udah_dijepit_oleh_Fakhrul_Rijal')) {
        stats.skipped++;
        continue;
      }

      // Ukuran Sebelum
      const sizeBefore = Buffer.byteLength(originalHTML, 'utf8');

      // --- PERBAIKAN KOMENTAR JS ---
      originalHTML = originalHTML.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
        return match.replace(/^[ \t]*\/\/(?!#).*/gm, ''); 
      });

      const d = new Date();
      const tgl = d.toISOString().slice(0, 10);
      const minifySignature = `<noscript>udah_dijepit_oleh_Fakhrul_Rijal_${tgl}</noscript>`;

      const input = Buffer.from(originalHTML);
const output = minify(input, {
  allow_noncompliant_unquoted_attribute_values: true,
  allow_optimal_entities: true,
  allow_removing_spaces_between_attributes: true,
  collapse_whitespaces: true,
  ensure_spec_compliant_unquoted_attribute_values: false,
  keep_comments: false,
  keep_html_and_head_opening_tags: false,
  keep_spaces_between_attributes: false,
  minify_css: true,
  minify_doctype: true,
  minify_js: true, 
  remove_bangs: true,
  remove_processing_instructions: true,
});

// WASM return Uint8Array → convert ke string
const minifiedHTML = Buffer.from(output).toString('utf8') + minifySignature;
      const sizeAfter = Buffer.byteLength(minifiedHTML, 'utf8');
      const saved = sizeBefore - sizeAfter;

      fs.writeFileSync(filePath, minifiedHTML, 'utf8');
      
      stats.success++;
      stats.totalBefore += sizeBefore;
      stats.totalAfter += sizeAfter;
      stats.totalSaved += saved;

      const savingPercent = ((saved / sizeBefore) * 100).toFixed(1);
      console.log(`✅ [${savingPercent}%] : ${filePath} (${formatBytes(sizeBefore)} ➡️  ${formatBytes(sizeAfter)})`);

} catch (err) {
  stats.failed++;
  stats.errorList.push({ 
    path: filePath, 
    error: err?.message || String(err) 
  });
  console.error(`❌ Gagal jepit: ${filePath}`);
}
  }
}

async function run() {
  console.log('🧼 Memulai Minify Ultra (Mode Paralel)...');
  console.log('📂 Lokasi: Balikpapan | Status: Turbo On 🚀');
  
  const startTime = Date.now();

  try {
    await Promise.all(folders.map(f => minifyFiles(f)));
    
    const duration = (Date.now() - startTime) / 1000;
    const totalSavingPercent = stats.totalBefore > 0 
      ? ((stats.totalSaved / stats.totalBefore) * 100).toFixed(2) 
      : 0;

    console.log('\n' + '='.repeat(60));
    console.log('📊 REKAP PROSES LAYAR KOSONG (PARALEL)');
    console.log('='.repeat(60));
    console.log(`⏱️  Waktu Tempuh      : ${duration.toFixed(2)} detik`);
    console.log(`✅ Berhasil Dijepit  : ${stats.success} file`);
    console.log(`⏭️  Sudah Dijepit     : ${stats.skipped} file`);
    console.log(`❌ Gagal Proses      : ${stats.failed} file`);
    console.log('-'.repeat(60));
    console.log(`📉 Total Sebelum     : ${formatBytes(stats.totalBefore)}`);
    console.log(`📉 Total Sesudah     : ${formatBytes(stats.totalAfter)}`);
    console.log(`🚀 Ruang Dihemat     : ${formatBytes(stats.totalSaved)} (${totalSavingPercent}%)`);
    
    if (stats.failed > 0) {
      console.log('\n⚠️  DETAIL ERROR:');
      stats.errorList.forEach((item, i) => console.log(`${i+1}. ${item.path} -> ${item.error}`));
    }
    console.log('='.repeat(60) + '\n');
  } catch (err) {
    console.error('💥 Terjadi kesalahan saat eksekusi paralel:', err);
  }
}

run().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
