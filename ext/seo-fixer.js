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
  const bloggerRegex = /https:\/\/blogger\.googleusercontent\.com\/[^"']+\.(?:jpg|jpeg|png|webp|gif|JPG)/gi;

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const $ = load(rawContent, { decodeEntities: false });
    const baseName = path.basename(file, '.html');

    console.log(`\n🔍 Scanning: ${baseName}.html`);

    // --- 1. RADAR ATRIBUT (img, a, figure, dll) ---
    // Kita sikat semua atribut yang berpotensi menyimpan link gambar
    const potentialAttrs = ['src', 'href', 'data-src', 'data-fullsrc', 'data-thumb'];
    const elements = $('img, a, div, span, figure').get();

    for (const el of elements) {
      const $el = $(el);
      for (const attr of potentialAttrs) {
        const val = $el.attr(attr);
        if (val && val.startsWith('http') && !val.includes(baseUrl)) {
          // Cek apakah ini link gambar atau domain Blogger
          if (bloggerRegex.test(val) || /\.(jpg|jpeg|png|webp|gif|JPG)/i.test(val)) {
            const local = await mirrorAndConvert(val);
            $el.attr(attr, local);
            console.log(`   ✅ Tag <${el.name}> attribute [${attr}] updated.`);
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
          content = content.split(extUrl).join(local);
        }
        $(tag).text(content);
        console.log(`   📜 Internal <${tag.name}> cleaned.`);
      }
    }

    // --- 3. RADAR INLINE STYLE ---
    $('[style]').each(async (i, el) => {
      let style = $(el).attr('style');
      if (style.includes('https://blogger.googleusercontent.com')) {
        let matches = style.match(bloggerRegex);
        if (matches) {
          for (const extUrl of matches) {
            const local = await mirrorAndConvert(extUrl);
            style = style.replace(extUrl, local);
          }
          $(el).attr('style', style);
        }
      }
    });

    // --- 4. META & LD-JSON (Schema) ---
    const metaSelectors = ['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[itemprop="image"]'];
    let currentBestImage = "";

    // Kita cari gambar terbaik dari Meta dulu
    for (const selector of metaSelectors) {
      const $meta = $(selector);
      let content = $meta.attr('content');
      if (content && content.startsWith('http') && !content.includes(baseUrl)) {
        const local = await mirrorAndConvert(content);
        const finalUrl = `${baseUrl}${local}`;
        $meta.attr('content', finalUrl);
        if (!currentBestImage) currentBestImage = finalUrl;
      } else if (content) {
        // Jika sudah benar (lokal/absolut), simpan untuk Schema
        currentBestImage = content.startsWith('/') ? `${baseUrl}${content}` : content;
      }
    }

    // --- PERBAIKAN SCHEMA (LD-JSON) ---
    const ldScript = $('script[type="application/ld+json"]');
    if (ldScript.length) {
      try {
        let ldData = JSON.parse(ldScript.text());

        // 1. Jika currentBestImage kosong, coba intip dari tag img
        if (!currentBestImage) {
          const firstImg = $('img').first();
          const imgUrl = firstImg.attr('src') || firstImg.attr('data-src') || firstImg.attr('data-fullsrc');
          if (imgUrl) {
            currentBestImage = imgUrl.startsWith('http') ? imgUrl : (imgUrl.startsWith('/') ? `${baseUrl}${imgUrl}` : `${baseUrl}/${imgUrl}`);
          }
        }

        // 2. Final Fallback kalau masih botak
        if (!currentBestImage) {
          currentBestImage = `${baseUrl}/img/${baseName}.webp`;
        }

        // 3. Pastikan URL di ldData.image SELALU Absolut
        const makeAbsolute = (url) => (url && url.startsWith('/') && !url.startsWith('http')) ? `${baseUrl}${url}` : url;

        if (ldData.image) {
          if (typeof ldData.image === 'string') {
            ldData.image = makeAbsolute(currentBestImage);
          } else if (typeof ldData.image === 'object' && !Array.isArray(ldData.image)) {
            ldData.image.url = makeAbsolute(currentBestImage);
          } else if (Array.isArray(ldData.image)) {
            ldData.image = ldData.image.map(img => typeof img === 'string' ? makeAbsolute(img) : (img.url ? { ...img, url: makeAbsolute(img.url) } : img));
          }
        } else {
          // Kalau field image belum ada di JSON, kita buatkan
          ldData.image = {
            "@type": "ImageObject",
            "url": currentBestImage
          };
        }

        // Update teks LD-JSON dengan rapi
        ldScript.text(JSON.stringify(ldData, null, 2));
        console.log(`   💎 Schema Image fixed: ${currentBestImage}`);

      } catch (e) {
        console.error("❌ Gagal parsing LD-JSON:", e.message);
      }
    }

    fs.writeFileSync(file, $.html(), 'utf8');

  }
  console.log('\n✅ SEO Fixer: Misi selesai. Semua jejak Blogger telah dihapus!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
