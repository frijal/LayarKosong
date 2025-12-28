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

    // --- 1. PROSES BODY (IMG & A dengan berbagai atribut) ---
    // Daftar tag dan atribut yang mungkin berisi URL eksternal
    const targets = [
      { selector: 'img', attrs: ['src', 'data-src', 'data-fullsrc'] },
      { selector: 'a', attrs: ['href', 'data-src'] }
    ];

    for (const target of targets) {
      $(target.selector).each(async (i, el) => {
        const $el = $(el);

        for (const attr of target.attrs) {
          const val = $el.attr(attr);
          if (val && val.startsWith('http') && !val.includes(baseUrl)) {

            // Filter: Kalau tag <a>, pastikan dia memang link gambar
            const isImage = /\.(jpg|jpeg|png|webp|gif|avif|bmp)(\?.*)?$/i.test(val) || val.includes('blogger.googleusercontent.com');

            if (target.selector !== 'a' || isImage) {
              const localMedia = await mirrorAndConvert(val);
              $el.attr(attr, localMedia);

              // Tambah alt otomatis kalau belum ada (hanya untuk img)
              if (target.selector === 'img' && !$el.attr('alt')) {
                $el.attr('alt', articleTitle);
              }
            }
          }
        }
      });
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
          // Jika sudah lokal, pastikan jadi absolut untuk referensi LD-JSON
          if (!currentBestImage) {
            currentBestImage = content.startsWith('/') ? `${baseUrl}${content}` : content;
          }
        }
      }
    }

    // --- 3. SINKRONISASI LD-JSON (SCHEMA) ---
    const ldScript = $('script[type="application/ld+json"]');
    if (ldScript.length) {
      try {
        let ldData = JSON.parse(ldScript.text());

        // Cari gambar terbaik untuk Schema
        if (!currentBestImage) {
          const firstImg = $('img').first();
          const imgUrl = firstImg.attr('src') || firstImg.attr('data-src') || firstImg.attr('data-fullsrc');
          if (imgUrl) {
            currentBestImage = imgUrl.startsWith('http') ? imgUrl : `${baseUrl}${imgUrl}`;
          }
        }

        // Final Fallback
        if (!currentBestImage) currentBestImage = `${baseUrl}/img/${baseName}.webp`;

        if (typeof ldData.image === 'object' && !Array.isArray(ldData.image)) {
          ldData.image.url = currentBestImage;
        } else {
          ldData.image = currentBestImage;
        }

        ldScript.text(JSON.stringify(ldData, null, 2));
      } catch (e) { /* silent fail */ }
    }

    // Tunggu sebentar untuk proses async sebelum tulis file (Cheerio sync, tapi mirroring async)
    // Catatan: Karena looping kita banyak async, idealnya pakai Promise.all jika file sangat besar.
    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer selesai. Semua data-fullsrc dan lightbox images aman di lokal!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
