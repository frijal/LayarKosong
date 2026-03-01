import { file, write } from "bun";
import { existsSync } from "node:fs";
import path from "node:path";

// Daftar file yang akan disikat habis whitespace-nya
const filesToMinify: string[] = [
  './artikel.json',
  './rss.xml',
  './sitemap.xml',
  './sitemap-1.xml',
  './image-sitemap-1.xml',
  './video-sitemap-1.xml',
  './feed-gaya-hidup.xml',
  './feed-jejak-sejarah.xml',
  './feed-lainnya.xml',
  './feed-olah-media.xml',
  './feed-opini-sosial.xml',
  './feed-sistem-terbuka.xml',
  './feed-warta-tekno.xml'
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
        // Strategi JSON: Parse lalu stringify tanpa space
        const data = JSON.parse(content);
        content = JSON.stringify(data);
      } else if (ext === '.xml') {
        // Strategi XML: Hapus spasi antar tag (Rakus tapi aman untuk XML sitemap)
        content = content.replace(/>\s+</g, '><').trim();
      }

      // Tulis kembali menggunakan Bun.write
      await write(filePath, content);

      const newSize = Buffer.byteLength(content, 'utf8');
      const saving = originalSize > 0
        ? (((originalSize - newSize) / originalSize) * 100).toFixed(2)
        : "0.00";

      console.log(`✅ ${filePath.padEnd(25)} : Hemat ${saving.padStart(6)}% | Size: ${(newSize / 1024).toFixed(2)} KB`);
    } catch (err: any) {
      console.error(`❌ Gagal di file ${filePath}:`, err.message);
    }
  });

  await Promise.all(tasks);
  console.log("\n✨ Semua file metadata telah dijepit! Layar Kosong siap meluncur.");
}

sapuJagat();
