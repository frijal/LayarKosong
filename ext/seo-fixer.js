import fs from 'fs';
import { load } from 'cheerio';
import { glob } from 'glob';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

// --- FUNGSI MIRROR & CONVERT ---
async function mirrorAndConvert(externalUrl) {
  try {
    const url = new URL(externalUrl);
    const originalPath = url.pathname;
    const ext = path.extname(originalPath);
    const webpPathName = ext ? originalPath.replace(ext, '.webp') : `${originalPath}.webp`;

    // Simpan dengan struktur folder berdasarkan hostname agar rapi
    const localPath = path.join('img', url.hostname, webpPathName);
    const dirPath = path.dirname(localPath);

    if (fs.existsSync(localPath)) {
      return `/${localPath.replace(/\\/g, '/')}`;
    }

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    console.log(`📥 Mirroring & Converting: ${url.hostname}...`);

    const response = await axios({
      url: externalUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });

    await sharp(response.data).webp({ quality: 80 }).toFile(localPath);
    return `/${localPath.replace(/\\/g, '/')}`;
  } catch (err) {
    console.error(`❌ Gagal Mirror ${externalUrl}:`, err.message);
    return externalUrl; // Balikin URL asli kalau gagal
  }
}

async function fixSEO() {
  const targetFolder = process.argv[2] || 'artikel';
  const files = await glob(`${targetFolder}/*.html`);
  const baseUrl = 'https://dalam.web.id';

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const $ = load(rawContent, { decodeEntities: false });
    const title = $('title').text() || 'Layar Kosong';
    const articleTitle = title.replace(' - Layar Kosong', '').trim();
    const baseName = path.basename(file, '.html');

    console.log(`\n🔍 Memproses: ${baseName}.html`);

    // --- 1. PROSES SEMUA IMG DI BODY ---
    // Kita perbaiki dulu gambarnya satu-satu
    const allImages = $('img');
    for (let i = 0; i < allImages.length; i++) {
      let imgTag = $(allImages[i]);
      let src = imgTag.attr('src');
      if (!imgTag.attr('alt')) imgTag.attr('alt', articleTitle);

      if (src && src.startsWith('http') && !src.includes(baseUrl)) {
        const localSrc = await mirrorAndConvert(src);
        imgTag.attr('src', localSrc);
      }
    }

    // --- 2. PROSES META TAGS (OG & TWITTER) ---
    // Kita HANYA mirror jika isinya masih link luar.
    // Jika isinya sudah benar (URL Blogger yang Mas mau atau URL lokal), jangan dipaksa ganti ke fallback!

    const metaSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[itemprop="image"]'
    ];

    let currentBestImage = "";

    for (const selector of metaSelectors) {
      let content = $(selector).attr('content');
      if (content) {
        if (content.startsWith('http') && !content.includes(baseUrl)) {
          // Jika URL eksternal, kita mirror dan update tag-nya
          const localMedia = await mirrorAndConvert(content);
          const finalUrl = `${baseUrl}${localMedia}`;
          $(selector).attr('content', finalUrl);
          if (!currentBestImage) currentBestImage = finalUrl;
        } else {
          // Jika sudah lokal atau sudah benar, simpan sebagai referensi untuk LD-JSON
          if (!currentBestImage) currentBestImage = content;
        }
      }
    }

    // --- 3. PROSES LD-JSON (SCHEMA) ---
    // Kita update LD-JSON agar sinkron dengan meta tag di atas
    const ldScript = $('script[type="application/ld+json"]');
    if (ldScript.length) {
      try {
        let ldData = JSON.parse(ldScript.text());

        // Cari gambar terbaik untuk headline schema
        // 1. Dari Meta yang sudah kita proses tadi
        // 2. Dari gambar pertama di artikel jika meta kosong
        if (!currentBestImage) {
          const firstImg = $('img').first().attr('src');
          if (firstImg) {
            currentBestImage = firstImg.startsWith('http') ? firstImg : `${baseUrl}${firstImg}`;
          }
        }

        // 3. Fallback terakhir jika benar-benar botak
        if (!currentBestImage) {
          currentBestImage = `${baseUrl}/img/${baseName}.webp`;
        }

        // Update bagian image di JSON-LD
        if (typeof ldData.image === 'object') {
          ldData.image.url = currentBestImage;
        } else {
          ldData.image = currentBestImage;
        }

        ldScript.text(JSON.stringify(ldData, null, 2));
      } catch (e) {
        console.error("❌ Gagal update LD-JSON");
      }
    }

    // Simpan perubahan
    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer selesai. Meta tags eksternal telah dimirror tanpa merusak hirarki.');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
