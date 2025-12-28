import fs from 'fs';
import { load } from 'cheerio';
import { glob } from 'glob';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

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

    console.log(`📥 Mirroring: ${url.hostname}...`);

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

    // --- FIX: Gunakan for...of agar await bekerja dengan benar ---

    // 1. Proses Gambar (img)
    const imgs = $('img').get(); // Ambil array elemen asli
    for (const el of imgs) {
      const $el = $(el);
      const attrsToFix = ['src', 'data-src', 'data-fullsrc'];

      for (const attr of attrsToFix) {
        const val = $el.attr(attr);
        if (val && val.startsWith('http') && !val.includes(baseUrl)) {
          const local = await mirrorAndConvert(val);
          $el.attr(attr, local);
          console.log(`   ✅ Update ${attr} -> ${local}`);
        }
      }
      if (!$el.attr('alt')) $el.attr('alt', articleTitle);
    }

    // 2. Proses Link (a)
    const links = $('a').get();
    for (const el of links) {
      const $el = $(el);
      const attrsToFix = ['href', 'data-src'];

      for (const attr of attrsToFix) {
        const val = $el.attr(attr);
        if (val && val.startsWith('http') && !val.includes(baseUrl)) {
          const isImg = /\.(jpg|jpeg|png|webp|gif|avif|bmp)(\?.*)?$/i.test(val) || val.includes('blogger.googleusercontent.com');
          if (isImg) {
            const local = await mirrorAndConvert(val);
            $el.attr(attr, local);
          }
        }
      }
    }

    // 3. Proses Meta Tags (tetap sinkron)
    const metaSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[itemprop="image"]'
    ];
    let currentBestImage = "";

    for (const selector of metaSelectors) {
      const $meta = $(selector);
      let content = $meta.attr('content');
      if (content && content.startsWith('http') && !content.includes(baseUrl)) {
        const local = await mirrorAndConvert(content);
        const finalUrl = `${baseUrl}${local}`;
        $meta.attr('content', finalUrl);
        if (!currentBestImage) currentBestImage = finalUrl;
      } else if (content) {
        if (!currentBestImage) currentBestImage = content.startsWith('/') ? `${baseUrl}${content}` : content;
      }
    }

    // 4. Update LD-JSON
    const ldScript = $('script[type="application/ld+json"]');
    if (ldScript.length) {
      try {
        let ldData = JSON.parse(ldScript.text());
        if (!currentBestImage) {
          const fImg = $('img').first();
          const imgUrl = fImg.attr('src') || fImg.attr('data-src') || fImg.attr('data-fullsrc');
          currentBestImage = imgUrl ? (imgUrl.startsWith('http') ? imgUrl : `${baseUrl}${imgUrl}`) : `${baseUrl}/img/${baseName}.webp`;
        }

        if (typeof ldData.image === 'object' && !Array.isArray(ldData.image)) {
          ldData.image.url = currentBestImage;
        } else {
          ldData.image = currentBestImage;
        }
        ldScript.text(JSON.stringify(ldData, null, 2));
      } catch (e) {}
    }

    // Baru simpan SETELAH semua await selesai
    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer selesai. Semua data-fullsrc sudah diamankan!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
