import fs from 'node:fs';
import path from 'node:path';

const filesToMinify = [
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

filesToMinify.forEach(file => {
  if (!fs.existsSync(file)) return;

  const ext = path.extname(file).toLowerCase();
  let content = fs.readFileSync(file, 'utf8');
  const originalSize = Buffer.byteLength(content);

  try {
    if (ext === '.json') {
      // Strategi khusus JSON: hapus semua whitespace
      const data = JSON.parse(content);
      content = JSON.stringify(data);
    } else if (ext === '.xml') {
      // Strategi XML: Hapus spasi antar tag
      content = content.replace(/>\s+</g, '><').trim();
    }

    fs.writeFileSync(file, content);
    const newSize = Buffer.byteLength(content);
    const saving = ((originalSize - newSize) / originalSize * 100).toFixed(2);
    
    console.log(`✅ ${file}: Hemat ${saving}% (Sekarang: ${(newSize/1024).toFixed(2)} KB)`);
  } catch (err) {
    console.error(`❌ Gagal di file ${file}:`, err.message);
  }
});
