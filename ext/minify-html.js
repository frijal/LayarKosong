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

    // Hindari file non-HTML dan index.html (sesuai permintaanmu)
    if (!file.endsWith('.html') || file === 'index.html') continue;

    try {
      const originalHTML = fs.readFileSync(filePath, 'utf8');
      if (!originalHTML.trim()) continue;

      // Cek signature biar nggak kerja dua kali
      if (originalHTML.includes('udah_dijepit_oleh_Fakhrul_Rijal')) {
        stats.skipped++;
        continue;
      }

      const d = new Date();
      const tgl = d.toISOString().slice(0, 10);
      const minifySignature = `\n<noscript>udah_dijepit_oleh_Fakhrul_Rijal_${tgl}</noscript>`;

      // Konfigurasi Minify-Html (Rust Binding)
      // Catatan: Properti yang tidak disebutkan di sini defaultnya adalah 'false'
      const input = Buffer.from(originalHTML);
      const output = minifyHtml.minify(input, {
        // --- OPSI EKSTREM (Sangat Disarankan untuk Performa) ---
        allow_optimal_entities: true, // Menggunakan karakter terpendek (UTF-8 vs Entity)
        allow_noncompliant_unquoted_attribute_values: true, // Hapus tanda kutip attribute jika aman
        allow_removing_spaces_between_attributes: true, // Hapus spasi antar attribute (misal: class="a"id="b")
        minify_doctype: true, // Ubah doctype jadi versi paling pendek
        
        // --- OPTIMASI CONTENT ---
        minify_css: true, // Pakai lightningcss (Rust) - Super cepat!
        minify_js: true,  // Pakai oxc (Rust) - Super cepat!
        collapse_whitespaces: true, // Sebenarnya otomatis di Rust, tapi baik untuk kejelasan
        
        // --- PEMBERSIHAN TOTAL ---
        keep_comments: false,
        keep_html_and_head_opening_tags: false, // Hapus tag <html> dan <head> (browser bakal auto-generate)
        remove_bangs: true,
        remove_processing_instructions: true,
        
        // --- KEAMANAN STANDAR ---
        ensure_spec_compliant_unquoted_attribute_values: false, // Set false karena kita pakai versi noncompliant di atas
        keep_spaces_between_attributes: false,
      });

      const minifiedHTML = output.toString();

      // Tulis hasil akhir + signature di baris baru
      fs.writeFileSync(filePath, minifiedHTML.trimEnd() + minifySignature, 'utf8');
      
      stats.success++;
      console.log(`✅ Minified (Rust Engine): ${filePath}`);

    } catch (err) {
      stats.failed++;
      stats.errorList.push({ path: filePath, error: err.message });
      console.error(`❌ Gagal: ${filePath}`);
    }
  }
}

async function run() {
  console.log('🧼 Memulai Minify Ultra (Rust Engine Integration)...');
  console.log('📂 Lokasi: Balikpapan (Layar Kosong Project)');
  
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
