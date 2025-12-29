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

  // Regex sakti: Cari URL gambar luar, abaikan domain sendiri & schema.org
  const imgUrlRegex = /https?:\/\/(?!dalam\.web\.id|schema\.org)[^\s"']+\.(?:jpg|jpeg|png|webp|gif|JPG)/gi;

  for (const file of files) {
    let rawContent = fs.readFileSync(file, 'utf8');
    const baseName = path.basename(file);
    console.log(`\n🔍 Memproses: ${baseName}`);

    // --- STRATEGI SCAN & SWAP (HTML + SCRIPTS + JSON) ---
    const matches = rawContent.match(imgUrlRegex);
    if (matches) {
      const uniqueUrls = [...new Set(matches)];
      for (const extUrl of uniqueUrls) {
        // Cek lokal/download
        const localPath = await mirrorAndConvert(extUrl, baseUrl);

        // Jika berhasil dimirror (balikan diawali /), ganti semua teksnya
        if (localPath.startsWith('/')) {
          const newLocalUrl = `${baseUrl}${localPath}`;
          rawContent = rawContent.split(extUrl).join(newLocalUrl);
        }
      }
    }

    // --- SYNC STRUKTURAL DENGAN CHEERIO ---
    const $ = load(rawContent, { decodeEntities: false });
    const articleTitle = $('title').text().replace(' - Layar Kosong', '').trim() || 'Layar Kosong';

    // Tambahkan alt pada img yang bocor
    $('img').each((_, el) => {
      if (!$(el).attr('alt')) $(el).attr('alt', articleTitle);
    });

      const twitterImg = $('meta[name="twitter:image"]').attr('content');
      if (twitterImg) {
        $('meta[property="og:image"]').attr('content', twitterImg);
        $('meta[itemprop="image"]').attr('content', twitterImg);

        const ldScript = $('script[type="application/ld+json"]');
        if (ldScript.length) {
          try {
            let ldData = JSON.parse(ldScript.text());
            const makeAbsolute = (url) => (url && url.startsWith('/') && !url.startsWith('http')) ? `${baseUrl}${url}` : url;

            if (ldData.image) {
              if (typeof ldData.image === 'object' && !Array.isArray(ldData.image)) {
                ldData.image.url = twitterImg;
              } else {
                ldData.image = twitterImg;
              }
            }

            if (ldData.publisher && ldData.publisher.name === "Layar Kosong") {
              ldData.publisher.url = `${baseUrl}/`;
            }

            const fixDeep = (obj, keyName = "") => {
              if (keyName === "@context") return obj;
              if (typeof obj === 'string') {
                if (obj.startsWith('http') && !obj.startsWith(baseUrl) && !obj.includes('schema.org')) {
                  return twitterImg;
                }
                if (obj.startsWith('/')) return makeAbsolute(obj);
              }
              if (obj !== null && typeof obj === 'object') {
                for (let key in obj) obj[key] = fixDeep(obj[key], key);
              }
              return obj;
            };

            ldData = fixDeep(ldData);
            ldScript.text(JSON.stringify(ldData, null, 2));
          } catch (e) { }
        }
      }

      fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer: Scan massal selesai. Gallery JS & Meta aman!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
