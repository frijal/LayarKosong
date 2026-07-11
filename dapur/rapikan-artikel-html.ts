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
      isModified = true;
    }

    // 2. Bersihkan spasi kosong aneh (&nbsp; / \xA0)
    // PROTEKSI: Abaikan teks di dalam <pre>, <code>, dan <script>
    $('head, body').find(':not(pre, code, script)').contents().each((_, el) => {
      if (el.type === 'text' && el.data.includes('\xA0')) {
        const cleanedData = el.data.replace(/\xA0/g, ' ');
        if (el.data !== cleanedData) {
          el.data = cleanedData;
          isModified = true;
        }
      }
    });

    // 3. SAPU BERSIH Baris Kosong Berlebih
    // PROTEKSI: Kita hanya menyisir elemen yang BUKAN script/pre/code
    $('head, body').contents().each((_, el) => {
      if (el.type === 'text') {
        // Cek apakah teks ini berada di dalam tag terlarang (script/pre/code)
        const parentTag = $(el).parent()[0]?.name;
        if (['script', 'pre', 'code'].includes(parentTag)) return;

        // Jika teks hanya berisi newline/spasi (baris kosong melar)
        if (/^\s*[\r\n]+\s*$/.test(el.data)) {
          if (el.data.length > 1) {
            el.data = '\n';
            isModified = true;
          }
        }
      }
    });

    // 4. Simpan hasil (Overwrite) hanya jika ada perubahan
    if (isModified) {
      // Buang trailing spaces (spasi di ujung baris) tapi tetap jaga integritas tag
      let finalHtml = $.html().replace(/[ \t]+$/gm, '');

      await writeFile(filePath, finalHtml);
      console.log(`✅ ${fileName}: Bersih & Aman (Script Protected)!`);
    }

  } catch (err) {
    console.error(`❌ Gagal: ${fileName} ->`, err);
  }
}

// Eksekusi Paralel (Cepat!)
const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`🚀 Membersihkan ${files.length} file di folder ${SOURCE_DIR}...`);

await Promise.all(files.map(f => cleanHtmlFile(f)));

console.log(`\n✨ Selesai! Struktur HTML rapi tanpa merusak script & kode.`);
