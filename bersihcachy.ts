import { glob } from 'glob';
import { load } from 'cheerio';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_DIR = 'artikel';
const OUTPUT_DIR = 'output'; // Hasil bersih masuk ke sini dulu untuk keamanan

async function cleanHtmlFile(filePath: string) {
  const fileName = path.basename(filePath);
  
  try {
    const htmlContent = await readFile(filePath, 'utf-8');
    const $ = load(htmlContent, { decodeEntities: false });

    console.log(`🧹 Membersihkan: ${fileName}`);

    // 1. Hapus Duplikat script data-provider.js
    const dataProviders = $('script[src="/ext/data-provider.js"]');
    if (dataProviders.length > 1) {
      dataProviders.slice(1).remove(); // Sisakan yang pertama, hapus sisanya
      console.log(`   - Menghapus ${dataProviders.length - 1} duplikat data-provider.js`);
    }

    // 2. Bersihkan spasi kosong aneh (&nbsp; / \xA0) yang berlebihan
    // Sering muncul di bagian <head> atau antar tag meta
    $('head, body').contents().each((_, el) => {
      if (el.type === 'text' && el.data.includes('\xA0')) {
        // Jika teks hanya berisi spasi non-breaking, hapus saja
        if (el.data.trim() === '') {
          $(el).remove();
        } else {
          // Jika ada teksnya, ganti &nbsp; menjadi spasi biasa
          el.data = el.data.replace(/\xA0/g, ' ');
        }
      }
    });

    // 3. Hapus baris kosong (newline) berlebih agar file lebih compact
    // Menjaga agar head tidak melar sampai ratusan baris kosong
    $('head').contents().each((_, el) => {
      if (el.type === 'text' && /^\s*[\r\n]+\s*[\r\n]+\s*$/.test(el.data)) {
        el.data = '\n';
      }
    });

    // 4. Simpan hasil
    const outputFilePath = path.join(OUTPUT_DIR, fileName);
    await mkdir(path.dirname(outputFilePath), { recursive: true });
    
    // Gunakan $.html() untuk menjaga entitas karakter tetap aman
    await writeFile(outputFilePath, $.html());

  } catch (err) {
    console.error(`❌ Gagal memproses ${fileName}:`, err);
  }
}

// Eksekusi Utama
const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`🚀 Memulai pembersihan pada ${files.length} file...`);

for (const f of files) {
  await cleanHtmlFile(f);
}

console.log(`\n✅ Selesai! File bersih ada di folder: ${OUTPUT_DIR}`);
