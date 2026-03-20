import { glob } from 'glob';
import { load } from 'cheerio';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_DIR = 'artikel';

async function cleanHtmlFile(filePath: string) {
  const fileName = path.basename(filePath);

  try {
    const htmlContent = await readFile(filePath, 'utf-8');
    const $ = load(htmlContent, { decodeEntities: false });

    let isModified = false;

    // 1. Hapus Duplikat script data-provider.js
    const dataProviders = $('script[src="/ext/data-provider.js"]');
    if (dataProviders.length > 1) {
      dataProviders.slice(1).remove();
      console.log(`🧹 ${fileName}: Menghapus ${dataProviders.length - 1} duplikat data-provider.js`);
      isModified = true;
    }

    // 2. Bersihkan spasi kosong aneh (&nbsp; / \xA0)
    $('head, body').contents().each((_, el) => {
      if (el.type === 'text' && el.data.includes('\xA0')) {
        if (el.data.trim() === '') {
          $(el).remove();
          isModified = true;
        } else {
          el.data = el.data.replace(/\xA0/g, ' ');
          isModified = true;
        }
      }
    });

    // 3. Hapus baris kosong (newline) berlebih di <head>
    $('head').contents().each((_, el) => {
      if (el.type === 'text' && /^\s*[\r\n]+\s*[\r\n]+\s*$/.test(el.data)) {
        el.data = '\n';
        isModified = true;
      }
    });

    // 4. Simpan hasil (Overwrite) hanya jika ada perubahan
    if (isModified) {
      await writeFile(filePath, $.html());
      console.log(`✅ ${fileName}: Berhasil dibersihkan dan disimpan.`);
    }

  } catch (err) {
    console.error(`❌ Gagal memproses ${fileName}:`, err);
  }
}

// Eksekusi Utama
const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`🚀 Memulai pembersihan langsung pada ${files.length} file di folder ${SOURCE_DIR}...`);

for (const f of files) {
  await cleanHtmlFile(f);
}

console.log(`\n✨ Semua file di folder ${SOURCE_DIR} kini sudah rapi!`);