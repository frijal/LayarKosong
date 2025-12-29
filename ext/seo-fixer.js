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

    // Cek ekstensi asli, kalau tidak ada (seperti di img/a/...), paksa jadi .webp
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

  // Regex Universal: Menangkap domain blogger dengan atau tanpa ekstensi file
  const bloggerRegex = /https:\/\/blogger\.googleusercontent\.com\/img\/[ab]\/[A-Za-z0-9\-_.]+/gi;

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const $ = load(rawContent, { decodeEntities: false });
    const baseName = path.basename(file, '.html');
    const articleTitle = $('title').text().replace(' - Layar Kosong', '').trim() || 'Layar Kosong';

    console.log(`\n🔍 Scanning: ${baseName}.html`);

    // --- 1. RADAR ATRIBUT (img, a, figure, dll) ---
    const potentialAttrs = ['src', 'href', 'data-src', 'data-fullsrc', 'data-thumb'];
    const elements = $('img, a, div, span, figure').get();

    for (const el of elements) {
      const $el = $(el);
      for (const attr of potentialAttrs) {
        const val = $el.attr(attr);
        if (val && val.includes('blogger.googleusercontent.com')) {
          const local = await mirrorAndConvert(val);
          $el.attr(attr, local);

          // Tambah alt otomatis jika belum ada pada tag img
          if (el.name === 'img' && !$el.attr('alt')) {
            $el.attr('alt', articleTitle);
          }
        }
      }
    }

    // --- 2. RADAR INTERNAL TEKS (Script & Style) ---
    const textTags = $('script, style').get();
    for (const tag of textTags) {
      let content = $(tag).text();
      let matches = content.match(bloggerRegex);
      if (matches) {
        const uniqueUrls = [...new Set(matches)];
        for (const extUrl of uniqueUrls) {
          const local = await mirrorAndConvert(extUrl);
          // Gunakan absolute URL untuk JS/CSS agar path tidak pecah
          const finalLocalUrl = `${baseUrl}${local}`;
          content = content.split(extUrl).join(finalLocalUrl);
        }
        $(tag).text(content);
        console.log(`   📜 Internal <${tag.name}> cleaned.`);
      }
    }

    // --- 3. RADAR INLINE STYLE ---
    const styledElements = $('[style]').get();
    for (const el of styledElements) {
      let style = $(el).attr('style');
      if (style.includes('blogger.googleusercontent.com')) {
        let matches = style.match(bloggerRegex);
        if (matches) {
          for (const extUrl of matches) {
            const local = await mirrorAndConvert(extUrl);
            style = style.replace(extUrl, local);
          }
          $(el).attr('style', style);
        }
      }
    }

    // --- 4. META & LD-JSON (Schema) ---
    const metaSelectors = ['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[itemprop="image"]'];
    let currentBestImage = "";

    for (const selector of metaSelectors) {
      const $meta = $(selector);
      let content = $meta.attr('content');
      if (content && content.includes('blogger.googleusercontent.com')) {
        const local = await mirrorAndConvert(content);
        const finalUrl = `${baseUrl}${local}`;
        $meta.attr('content', finalUrl);
        if (!currentBestImage) currentBestImage = finalUrl;
      } else if (content) {
        currentBestImage = content.startsWith('/') ? `${baseUrl}${content}` : content;
      }
    }

    // Update LD-JSON agar selalu absolut
    const ldScript = $('script[type="application/ld+json"]');
    if (ldScript.length) {
      try {
        let ldData = JSON.parse(ldScript.text());
        const makeAbsolute = (url) => (url && url.startsWith('/') && !url.startsWith('http')) ? `${baseUrl}${url}` : url;

        // Cari fallback image jika meta kosong
        if (!currentBestImage) {
          const firstImg = $('img').first();
          const imgUrl = firstImg.attr('src') || firstImg.attr('data-src');
          currentBestImage = imgUrl ? makeAbsolute(imgUrl) : `${baseUrl}/img/${baseName}.webp`;
        }

        if (ldData.image) {
          if (typeof ldData.image === 'string') {
            ldData.image = makeAbsolute(currentBestImage);
          } else if (typeof ldData.image === 'object' && !Array.isArray(ldData.image)) {
            ldData.image.url = makeAbsolute(currentBestImage);
          } else if (Array.isArray(ldData.image)) {
            ldData.image = ldData.image.map(img => typeof img === 'string' ? makeAbsolute(img) : (img.url ? { ...img, url: makeAbsolute(img.url) } : img));
          }
        }

        ldScript.text(JSON.stringify(ldData, null, 2));
      } catch (e) {
        console.error("   ❌ Schema Error");
      }
    }

    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer: Misi selesai. Semua jejak Blogger dan Schema telah diperbaiki!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
