import { minify } from '@minify-html/node';
import { Glob } from "bun";

// Konfigurasi Folder
const folders = [
  'gaya-hidup', 'jejak-sejarah', 'lainnya',
  'olah-media', 'opini-sosial', 'sistem-terbuka', 'warta-tekno'
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

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

async function processFile(filePath) {
  try {
    const file = Bun.file(filePath);
    let originalHTML = await file.text();

    if (!originalHTML.trim()) return;

    // Skip jika sudah diproses atau ini index.html utama
    if (originalHTML.includes('udah_dijepit_oleh_Fakhrul_Rijal') || filePath.endsWith('index.html')) {
      stats.skipped++;
      return;
    }

    const sizeBefore = Buffer.byteLength(originalHTML, 'utf8');

    // --- PERBAIKAN KOMENTAR JS (Optimized Regex) ---
    originalHTML = originalHTML.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
      return match.replace(/^[ \t]*\/\/(?!#).*/gm, ''); 
    });

    const tgl = new Date().toISOString().slice(0, 10);
    const minifySignature = `<noscript>udah_dijepit_oleh_Fakhrul_Rijal_${tgl}</noscript>`;

    // Minify menggunakan Bun Buffer yang lebih efisien
    const output = minify(Buffer.from(originalHTML), {
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

    const minifiedHTML = output.toString() + minifySignature;
    const sizeAfter = Buffer.byteLength(minifiedHTML, 'utf8');
    const saved = sizeBefore - sizeAfter;

    // Bun.write jauh lebih cepat daripada fs.writeFileSync
    await Bun.write(filePath, minifiedHTML);
    
    stats.success++;
    stats.totalBefore += sizeBefore;
    stats.totalAfter += sizeAfter;
    stats.totalSaved += saved;

    const savingPercent = ((saved / sizeBefore) * 100).toFixed(1);
    console.log(`✅ [${savingPercent}%] : ${filePath} (${formatBytes(sizeBefore)} ➡️  ${formatBytes(sizeAfter)})`);

  } catch (err) {
    stats.failed++;
    stats.errorList.push({ path: filePath, error: err.message });
    console.error(`❌ Gagal jepit: ${filePath} -> ${err.message}`);
  }
}

async function run() {
  console.log('🧼 Memulai Minify Ultra (Bun Native Mode)...');
  console.log('📂 Lokasi: Balikpapan | Status: Turbo Bun 🚀');
  
  const startTime = Bun.nanoseconds();

  // Gunakan Glob untuk mencari file secara super cepat
  const tasks = [];
  for (const folder of folders) {
    const glob = new Glob(`${folder}/**/*.html`);
    for await (const file of glob.scan(".")) {
      tasks.push(processFile(file));
    }
  }

  // Jalankan semua task secara paralel
  await Promise.all(tasks);
  
  const endTime = Bun.nanoseconds();
  const duration = (endTime - startTime) / 1e9; // Convert nanoseconds to seconds

  const totalSavingPercent = stats.totalBefore > 0 
    ? ((stats.totalSaved / stats.totalBefore) * 100).toFixed(2) 
    : 0;

  console.log('\n' + '='.repeat(60));
  console.log('📊 REKAP PROSES LAYAR KOSONG (BUN NATIVE)');
  console.log('='.repeat(60));
  console.log(`⏱️  Waktu Tempuh      : ${duration.toFixed(4)} detik`);
  console.log(`✅ Berhasil Dijepit  : ${stats.success} file`);
  console.log(`⏭️  Sudah Dijepit      : ${stats.skipped} file`);
  console.log(`❌ Gagal Proses       : ${stats.failed} file`);
  console.log('-'.repeat(60));
  console.log(`📉 Total Sebelum      : ${formatBytes(stats.totalBefore)}`);
  console.log(`📉 Total Sesudah      : ${formatBytes(stats.totalAfter)}`);
  console.log(`🚀 Ruang Dihemat      : ${formatBytes(stats.totalSaved)} (${totalSavingPercent}%)`);
  
  if (stats.failed > 0) {
    console.log('\n⚠️  DETAIL ERROR:');
    stats.errorList.forEach((item, i) => console.log(`${i+1}. ${item.path} -> ${item.error}`));
  }
  console.log('='.repeat(60) + '\n');
}

run();
