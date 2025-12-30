import fs from 'fs';
import { load } from 'cheerio';
import { glob } from 'glob';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

async function mirrorAndConvert(externalUrl, baseUrl) {
  try {
    const url = new URL(externalUrl);
    const baseHostname = new URL(baseUrl).hostname;

    // --- 1. JANGAN DOWNLOAD JIKA SUDAH DOMAIN SENDIRI ---
    if (url.hostname === baseHostname || url.hostname === 'localhost') {
      return externalUrl.replace(baseUrl, '');
    }

    const originalPath = url.pathname;
    const ext = path.extname(originalPath);
    const webpPathName = ext ? originalPath.replace(ext, '.webp') : `${originalPath}.webp`;

    const localPath = path.join('img', url.hostname, webpPathName);
    const dirPath = path.dirname(localPath);

    // --- 2. PROTEKSI: JANGAN DOWNLOAD ULANG JIKA FILE SUDAH ADA ---
    if (fs.existsSync(localPath)) {
      return `/${localPath.replace(/\\/g, '/')}`;
    }

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    console.log(`📥 Mirroring baru: ${url.hostname}${originalPath}...`);

    const response = await axios({
      url: externalUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    await sharp(response.data).webp({ quality: 85 }).toFile(localPath);
    return `/${localPath.replace(/\\/g, '/')}`;
  } catch (err) {
    return externalUrl;
  }
}

async function fixSEO() {
  const targetFolder = process.argv[2] || 'artikel';
  const files = await glob(`${targetFolder}/*.html`);
  const baseUrl = 'https://dalam.web.id';

  // Regex: Cari URL gambar luar, abaikan domain sendiri & schema.org
  const imgUrlRegex = /https?:\/\/(?!dalam\.web\.id|schema\.org)[^\s"']+\.(?:jpg|jpeg|png|webp|gif|JPG)/gi;

  for (const file of files) {
    let rawContent = fs.readFileSync(file, 'utf8');
    const baseName = path.basename(file);
    console.log(`\n🔍 Memproses: ${baseName}`);

    // --- STRATEGI SCAN & SWAP (Ganti semua URL luar ke lokal) ---
    const matches = rawContent.match(imgUrlRegex);
    if (matches) {
      const uniqueUrls = [...new Set(matches)];
      for (const extUrl of uniqueUrls) {
        const localPath = await mirrorAndConvert(extUrl, baseUrl);

        if (localPath.startsWith('/')) {
          const newLocalUrl = `${baseUrl}${localPath}`;
          rawContent = rawContent.split(extUrl).join(newLocalUrl);
        }
      }
    }

    // --- PERAPIHAN STRUKTURAL DENGAN CHEERIO ---
    const $ = load(rawContent, { decodeEntities: false });
    const articleTitle = $('title').text().replace(' - Layar Kosong', '').trim() || 'Layar Kosong';

    // 1. Tambahkan alt pada img jika kosong
    $('img').each((_, el) => {
      if (!$(el).attr('alt')) $(el).attr('alt', articleTitle);
    });

      // 2. Sinkronisasi Meta Image (OG dan Itemprop mengikuti Twitter Image yang sudah ter-swap linknya)
      const twitterImg = $('meta[name="twitter:image"]').attr('content');
      if (twitterImg) {
        $('meta[property="og:image"]').attr('content', twitterImg);
        $('meta[itemprop="image"]').attr('content', twitterImg);
      }

      fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer: Mirroring dan perbaikan Meta selesai!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
