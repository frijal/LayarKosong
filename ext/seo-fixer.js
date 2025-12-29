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
    // URL Blogger generasi baru sering tidak punya ekstensi, kita paksa ke .webp
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
  // Catch all blogger images (img/a/ or img/b/)
  const bloggerRegex = /https:\/\/blogger\.googleusercontent\.com\/img\/[ab]\/[A-Za-z0-9\-_.]+/gi;

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const $ = load(rawContent, { decodeEntities: false });
    const baseName = path.basename(file, '.html');
    const articleTitle = $('title').text().replace(' - Layar Kosong', '').trim() || 'Layar Kosong';

    console.log(`\n🔍 Memproses: ${baseName}.html`);

    // --- 1. ATRIBUT HTML (img, a, data-*) ---
    const potentialAttrs = ['src', 'href', 'data-src', 'data-fullsrc', 'data-thumb'];
    const elements = $('img, a, div, span, figure').get();

    for (const el of elements) {
      const $el = $(el);
      for (const attr of potentialAttrs) {
        const val = $el.attr(attr);
        // SKIP: Jika diawali / atau sudah ada baseUrl atau bukan http
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
          if (!extUrl.startsWith('/') && !extUrl.startsWith(baseUrl)) {
            const local = await mirrorAndConvert(extUrl, baseUrl);
            const finalLocalUrl = `${baseUrl}${local}`;
            content = content.split(extUrl).join(finalLocalUrl);
          }
        }
        $(tag).text(content);
      }
    }

    // --- 3. META TAGS (OG & Twitter) ---
    const metaSelectors = ['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[itemprop="image"]'];
    let finalImageForSchema = "";

    for (const selector of metaSelectors) {
      const $meta = $(selector);
      let content = $meta.attr('content');

      if (content && content.startsWith('http') && !content.startsWith(baseUrl) && !content.startsWith('/')) {
        const local = await mirrorAndConvert(content, baseUrl);
        content = `${baseUrl}${local}`;
        $meta.attr('content', content);
        if (!finalImageForSchema) finalImageForSchema = content;
      } else if (content) {
        // Jika sudah lokal atau domain sendiri, simpan untuk referensi Schema
        const sanitized = (content.startsWith('/') && !content.startsWith('http')) ? `${baseUrl}${content}` : content;
        if (!finalImageForSchema) finalImageForSchema = sanitized;
      }
    }

    // --- 4. LD-JSON (SCHEMA) SINKRONISASI ---
    const ldScript = $('script[type="application/ld+json"]');
    if (ldScript.length) {
      try {
        let ldData = JSON.parse(ldScript.text());
        const makeAbsolute = (url) => (url && url.startsWith('/') && !url.startsWith('http')) ? `${baseUrl}${url}` : url;

        // Jika Meta kosong, cari dari img pertama atau fallback file name
        if (!finalImageForSchema) {
          const firstImg = $('img').first();
          const imgUrl = firstImg.attr('src') || firstImg.attr('data-src');
          finalImageForSchema = imgUrl ? makeAbsolute(imgUrl) : `${baseUrl}/img/${baseName}.webp`;
        }

        // Pastikan tidak ada double domain akibat bug lama
        finalImageForSchema = finalImageForSchema.replace(`${baseUrl}${baseUrl}`, baseUrl);

        // Update bagian image di Schema agar sama dengan Meta
        if (ldData.image) {
          if (typeof ldData.image === 'object' && !Array.isArray(ldData.image)) {
            ldData.image.url = finalImageForSchema;
          } else {
            ldData.image = finalImageForSchema;
          }
        } else {
          ldData.image = { "@type": "ImageObject", "url": finalImageForSchema };
        }

        // Fungsi pembersih rekursif untuk seluruh isi JSON
        const fixDeep = (obj) => {
          if (typeof obj === 'string') {
            if (obj.includes('blogger.googleusercontent.com')) {
              // Di sini kita asumsikan link blogger di dalam teks JSON sudah pernah di-mirror di tahap sebelumnya
              return obj.startsWith(baseUrl) ? obj : makeAbsolute(obj.replace(/.*\/img\//, '/img/'));
            }
            if (obj.startsWith('/')) return makeAbsolute(obj);
          }
          if (obj !== null && typeof obj === 'object') {
            for (let key in obj) obj[key] = fixDeep(obj[key]);
          }
          return obj;
        };

        ldData = fixDeep(ldData);
        ldScript.text(JSON.stringify(ldData, null, 2));
        console.log(`   💎 Image Synchronized: ${finalImageForSchema}`);
      } catch (e) {
        console.error("   ❌ Gagal sinkronisasi Schema");
      }
    }

    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer: Selesai! Meta, Schema, dan Assets kini selaras dan lokal.');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
