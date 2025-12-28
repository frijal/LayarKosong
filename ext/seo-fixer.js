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
    return externalUrl;
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

    // --- 1. PROSES SEMUA IMG & A (TAG BODY) ---
    // Menangkap <img> src, <img> data-src, dan <a> data-src
    const bodySelectors = [
      { tag: 'img', attr: 'src' },
      { tag: 'img', attr: 'data-src' },
      { tag: 'a.thumb', attr: 'data-src' }
    ];

    for (const item of bodySelectors) {
      const elements = $(item.tag);
      for (let i = 0; i < elements.length; i++) {
        let el = $(elements[i]);
        let val = el.attr(item.attr);

        // Tambah alt kalau img belum ada
        if (item.tag === 'img' && !el.attr('alt')) el.attr('alt', articleTitle);

        if (val && val.startsWith('http') && !val.includes(baseUrl)) {
          const localMedia = await mirrorAndConvert(val);
          el.attr(item.attr, localMedia);
        }
      }
    }

    // --- 2. PROSES META TAGS (OG, TWITTER, ITEMPROP) ---
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
          const localMedia = await mirrorAndConvert(content);
          const finalUrl = `${baseUrl}${localMedia}`;
          $(selector).attr('content', finalUrl);
          if (!currentBestImage) currentBestImage = finalUrl;
        } else {
          if (!currentBestImage) currentBestImage = content;
        }
      }
    }

    // --- 3. SINKRONISASI LD-JSON (SCHEMA) ---
    const ldScript = $('script[type="application/ld+json"]');
    if (ldScript.length) {
      try {
        let ldData = JSON.parse(ldScript.text());

        // Cari gambar terbaik: Meta > <img> src > <img> data-src > Fallback
        if (!currentBestImage) {
          const firstImg = $('img').first();
          const imgUrl = firstImg.attr('src') || firstImg.attr('data-src');
          if (imgUrl) {
            currentBestImage = imgUrl.startsWith('http') ? imgUrl : `${baseUrl}${imgUrl}`;
          }
        }

        if (!currentBestImage) {
          currentBestImage = `${baseUrl}/img/${baseName}.webp`;
        }

        if (Array.isArray(ldData.image)) {
          ldData.image = [currentBestImage];
        } else if (typeof ldData.image === 'object') {
          ldData.image.url = currentBestImage;
        } else {
          ldData.image = currentBestImage;
        }

        ldScript.text(JSON.stringify(ldData, null, 2));
      } catch (e) {
        console.error("❌ Gagal update LD-JSON");
      }
    }

    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer selesai. Semua atribut data-src dan itemprop telah diamankan!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
