import { file, write } from "bun";
import { existsSync } from "node:fs";
import path from "node:path";

// Daftar file yang akan disikat habis whitespace-nya
const filesToMinify: string[] = [
'./artikel-lite.json',
'./artikel.json',
'./atom.atom',
'./rss.rss',
'./sitemap.xml',
'./gaya-hidup.atom',
'./gaya-hidup.rss',
'./gaya-hidup.xml',
'./jejak-sejarah.atom',
'./jejak-sejarah.rss',
'./jejak-sejarah.xml',
'./lainnya.atom',
'./lainnya.rss',
'./lainnya.xml',
'./olah-media.atom',
'./olah-media.rss',
'./olah-media.xml',
'./opini-sosial.atom',
'./opini-sosial.rss',
'./opini-sosial.xml',
'./sistem-terbuka.atom',
'./sistem-terbuka.rss',
'./sistem-terbuka.xml',
'./warta-tekno.atom',
'./warta-tekno.rss',
'./warta-tekno.xml',
'./img/galeri-data.json',
'./dapur/tool-layarkosong.json'
];

console.log("🧹 Memulai operasi Sapu Jagat (Minify Data)...");
console.log("🚀 Status: Bun Native Mode | Lokasi: Balikpapan");

/**
 * Fungsi utama untuk eksekusi secara async agar lebih efisien di Bun
 */
async function sapuJagat() {
  const tasks = filesToMinify.map(async (filePath) => {
    if (!existsSync(filePath)) return;

    try {
      const ext = path.extname(filePath).toLowerCase();
      const bunFile = file(filePath);
      let content = await bunFile.text();

      const originalSize = Buffer.byteLength(content, 'utf8');

      if (ext === '.json') {
        const data = JSON.parse(content);
        content = JSON.stringify(data);
      } else if (ext === '.xml' || ext === '.rss' || ext === '.atom') {
  // Sapu bersih spasi di XML, RSS, dan ATOM
        content = content.replace(/>\s+</g, '><').trim();
      }

      // Tulis kembali menggunakan Bun.write
      await write(filePath, content);

      const newSize = Buffer.byteLength(content, 'utf8');
      const saving = originalSize > 0
        ? (((originalSize - newSize) / originalSize) * 100).toFixed(2)
        : "0.00";

      console.log(`Hemat ${saving.padStart(6)}% | Size: ${(newSize / 1024).toFixed(2)} KB  : ✅ ${filePath.padEnd(25)}`);
    } catch (err: any) {
      console.error(`❌ Gagal di file ${filePath}:`, err.message);
    }
  });

  await Promise.all(tasks);
  console.log("\n✨ Semua file metadata telah dijepit! Layar Kosong siap meluncur.");
}

sapuJagat();
