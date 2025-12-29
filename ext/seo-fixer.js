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

    // --- PROTEKSI: Jangan mirror domain sendiri atau localhost ---
    if (url.hostname === baseHostname || url.hostname === 'localhost') {
      return externalUrl.replace(baseUrl, '');
    }

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
    return externalUrl;
  }
}

async function fixSEO() {
  const targetFolder = process.argv[2] || 'artikel';
  const files = await glob(`${targetFolder}/*.html`);
  const baseUrl = 'https://dalam.web.id';
  const bloggerRegex = /https:\/\/blogger\.googleusercontent\.com\/img\/[ab]\/[A-Za-z0-9\-_.]+/gi;

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const $ = load(rawContent, { decodeEntities: false });
    const baseName = path.basename(file, '.html');
    const articleTitle = $('title').text().replace(' - Layar Kosong', '').trim() || 'Layar Kosong';

    console.log(`\n🔍 Memproses: ${baseName}.html`);

    // --- 1. ATRIBUT HTML ---
    const potentialAttrs = ['src', 'href', 'data-src', 'data-fullsrc', 'data-thumb'];
    $('*').each((i, el) => {
      const $el = $(el);
      for (const attr of potentialAttrs) {
        const val = $el.attr(attr);

        // --- FILTER SKIP: Jika diawali / atau sudah ada baseUrl, abaikan ---
        if (val && !val.startsWith('/') && !val.startsWith(baseUrl) && val.startsWith('http')) {
          if (val.includes('blogger.googleusercontent.com') || /\.(jpg|jpeg|png|webp|gif|JPG)/i.test(val)) {
            // Gunakan perulangan for...of di luar .each jika ingin await yang stabil,
            // namun di sini kita proses secara serial per file.
          }
        }
      }
    });

    // Karena .each() cheerio bersifat sinkron, kita gunakan loop manual untuk stabilitas await
    const elements = $('img, a, div, span, figure').get();
    for (const el of elements) {
      const $el = $(el);
      for (const attr of potentialAttrs) {
        const val = $el.attr(attr);

        // SKIP LOGIC: Hanya proses yang diawali http dan BUKAN domain kita
        if (val && val.startsWith('http') && !val.startsWith(baseUrl) && !val.startsWith('/')) {
          if (val.includes('blogger.googleusercontent.com') || /\.(jpg|jpeg|png|webp|gif|JPG)/i.test(val)) {
            const local = await mirrorAndConvert(val, baseUrl);
            $el.attr(attr, local);

            if (el.name === 'img' && !$el.attr('alt')) {
              $el.attr('alt', articleTitle);
            }
          }
        }
      }
    }

    // --- 2. JAVASCRIPT & CSS ---
    const textTags = $('script, style').get();
    for (const tag of textTags) {
      let content = $(tag).text();
      let matches = content.match(bloggerRegex);
      if (matches) {
        for (const extUrl of [...new Set(matches)]) {
          // Skip jika link di dalam script ternyata sudah lokal (relatif /)
          if (!extUrl.startsWith('/') && !extUrl.startsWith(baseUrl)) {
            const local = await mirrorAndConvert(extUrl, baseUrl);
            const finalLocalUrl = `${baseUrl}${local}`;
            content = content.split(extUrl).join(finalLocalUrl);
          }
        }
        $(tag).text(content);
      }
    }

    // --- 3. SCHEMA & META ---
    const metaSelectors = ['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[itemprop="image"]'];
    let currentBestImage = "";

    for (const selector of metaSelectors) {
      const $meta = $(selector);
      let content = $meta.attr('content');

      if (content && content.startsWith('http') && !content.startsWith(baseUrl) && !content.startsWith('/')) {
        const local = await mirrorAndConvert(content, baseUrl);
        const finalUrl = `${baseUrl}${local}`;
        $meta.attr('content', finalUrl);
        currentBestImage = finalUrl;
      } else if (content) {
        currentBestImage = (content.startsWith('/') && !content.startsWith('http')) ? `${baseUrl}${content}` : content;
      }
    }

    // Update LD-JSON
    const ldScript = $('script[type="application/ld+json"]');
    if (ldScript.length) {
      try {
        let ldData = JSON.parse(ldScript.text());
        const makeAbsolute = (url) => (url && url.startsWith('/') && !url.startsWith('http')) ? `${baseUrl}${url}` : url;

        if (!currentBestImage) {
          const firstImg = $('img').first();
          const imgUrl = firstImg.attr('src') || firstImg.attr('data-src');
          currentBestImage = imgUrl ? makeAbsolute(imgUrl) : `${baseUrl}/img/${baseName}.webp`;
        }

        const fixDeep = (obj) => {
          if (typeof obj === 'string' && (obj.startsWith('/') || obj.includes('blogger'))) return makeAbsolute(obj);
          if (obj !== null && typeof obj === 'object') {
            for (let key in obj) obj[key] = fixDeep(obj[key]);
          }
          return obj;
        };

        if (ldData.image) {
          ldData.image = (typeof ldData.image === 'object' && !Array.isArray(ldData.image))
          ? { ...ldData.image, url: makeAbsolute(currentBestImage) }
          : makeAbsolute(currentBestImage);
        }

        ldData = fixDeep(ldData);
        ldScript.text(JSON.stringify(ldData, null, 2));
      } catch (e) {}
    }

    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer: Link lokal (/) aman, link eksternal dimigrasi!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
