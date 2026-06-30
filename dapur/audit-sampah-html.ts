import * as cheerio from 'cheerio';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// --- KONFIGURASI FOLDER FISIK ---
// Script ini akan mencari folder-folder ini di direktori yang sama saat dijalankan
const KATEGORI = [
  'gaya-hidup',
  'jejak-sejarah',
  'lainnya',
  'olah-media',
  'opini-sosial',
  'sistem-terbuka',
  'warta-tekno'
];

const OUTPUT_FILE = 'audit-sampah.txt';
const SAMPLE_PER_CATEGORY = 30; // Ambil lebih banyak sampel biar makin akurat

async function auditFolderFisik() {
  console.log("🚀 Memulai audit folder fisik di laptop...");
  
  let reportContent = `📊 LAPORAN AUDIT SAMPAH HTML (LOKAL) - LAYAR KOSONG\n`;
  reportContent += `Tanggal: ${new Date().toLocaleString('id-ID')}\n`;
  reportContent += `--------------------------------------------------\n\n`;

  let totalFilesChecked = 0;
  let totalCharsSaved = 0;
  const faClasses = new Set<string>();

  for (const kat of KATEGORI) {
    const fullPath = join(process.cwd(), kat);
    
    if (!existsSync(fullPath) || !statSync(fullPath).isDirectory()) {
      reportContent += `📁 KATEGORI: ${kat.toUpperCase()} (Folder tidak ditemukan/Skip)\n\n`;
      continue;
    }

    const files = readdirSync(fullPath).filter(f => f.endsWith('.html'));
    const samples = files.slice(0, SAMPLE_PER_CATEGORY);
    
    reportContent += `📁 KATEGORI: ${kat.toUpperCase()} (${files.length} file ditemukan)\n`;
    
    let catCharsRemoved = 0;

    for (const file of samples) {
      const filePath = join(fullPath, file);
      const html = readFileSync(filePath, 'utf8');
      const $ = cheerio.load(html);
      const initialSize = html.length;

      // 1. Deteksi Ikon FontAwesome
      $('i[class*="fa-"]').each((_, el) => {
        const cls = $(el).attr('class');
        if (cls) faClasses.add(cls);
      });

      // 2. Simulasi Pembersihan "Lemak"
      // Tambahkan selektor lain jika kamu rasa ada tag aneh di HTML-mu
      $('script, style, meta, link, noscript, i, #header-placeholder, #loading-indicator').remove();
      
      const cleanSize = $.html().length;
      catCharsRemoved += (initialSize - cleanSize);
    }

    if (samples.length > 0) {
      const avgSaved = Math.round(catCharsRemoved / samples.length);
      reportContent += `   - Rata-rata sampah dibuang: ${avgSaved.toLocaleString()} karakter per file\n\n`;
      totalFilesChecked += samples.length;
      totalCharsSaved += catCharsRemoved;
    }
  }

  // RINGKASAN AKHIR
  reportContent += `--------------------------------------------------\n`;
  reportContent += `[ RINGKASAN DIET MODE ]\n`;
  reportContent += `- Total Sampel File: ${totalFilesChecked}\n`;
  reportContent += `- Total Karakter "Sampah" Ditemukan: ${totalCharsSaved.toLocaleString()}\n`;
  reportContent += `- Estimasi Penghematan Per File: ~${Math.round((totalCharsSaved / totalFilesChecked) / 1024)} KB\n`;
  
  if (faClasses.size > 0) {
    reportContent += `\n[ DAFTAR CLASS FONTAWESOME ]\n`;
    Array.from(faClasses).sort().forEach(cls => reportContent += `- ${cls}\n`);
  }

  reportContent += `\n[ REKOMENDASI UNTUK BUILD-D1.TS ]\n`;
  reportContent += `$('script, style, meta, link, noscript, i, #header-placeholder').remove();\n`;

  writeFileSync(OUTPUT_FILE, reportContent);
  console.log(`\n✅ Selesai! Hasil audit tersimpan di: ${OUTPUT_FILE}`);
}

auditFolderFisik().catch(err => {
  console.error("❌ Terjadi kesalahan:", err.message);
});
