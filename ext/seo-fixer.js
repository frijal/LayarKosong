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
    const finalArticleUrl = `${baseUrl}/artikel/${baseName}.html`;

    let featuredImageSet = false;
    let finalImage = ""; // JANGAN diisi fallback dulu!

    // --- 1. HIRARKI 1: SOSIAL META (FACEBOOK/TWITTER) ---
    let socialMeta = $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content');

    if (socialMeta && socialMeta.startsWith('http') && !socialMeta.includes(baseUrl)) {
      const newLocal = await mirrorAndConvert(socialMeta);
      finalImage = `${baseUrl}${newLocal}`;
      featuredImageSet = true;
      console.log(`  💎 Hirarki 1 (Social Meta) digunakan: ${finalImage}`);
    }

    // --- 2. HIRARKI 2: GAMBAR PERTAMA DI ARTIKEL (IMG) ---
    const allImages = $('img');
    for (let i = 0; i < allImages.length; i++) {
      let imgTag = $(allImages[i]);
      let src = imgTag.attr('src');
      let dataSrc = imgTag.attr('data-src');

      if (!imgTag.attr('alt')) imgTag.attr('alt', articleTitle);

      // Mirror src asli
      if (src && src.startsWith('http') && !src.includes(baseUrl) && !src.startsWith('/img/')) {
        const newLocal = await mirrorAndConvert(src);
        imgTag.attr('src', newLocal);
        // Jika Hirarki 1 kosong, gunakan ini
        if (!featuredImageSet) {
          finalImage = `${baseUrl}${newLocal}`;
          featuredImageSet = true;
          console.log(`  📸 Hirarki 2 (IMG Artikel) digunakan: ${finalImage}`);
        }
      }

      // Mirror data-src (lazy load)
      if (dataSrc && dataSrc.startsWith('http') && !dataSrc.includes(baseUrl)) {
        const newLocal = await mirrorAndConvert(dataSrc);
        imgTag.attr('data-src', newLocal);
      }
    }

    // --- 3. HIRARKI 3: ITEMPROP (Hanya Mirror, Bukan Prioritas Utama) ---
    const metaItemprop = $('meta[itemprop="image"]');
    if (metaItemprop.length) {
      let content = metaItemprop.attr('content');
      if (content && content.startsWith('http') && !content.includes(baseUrl)) {
        const newLocal = await mirrorAndConvert(content);
        metaItemprop.attr('content', `${baseUrl}${newLocal}`);
        // Hanya pakai jika Hirarki 1 & 2 kosong
        if (!featuredImageSet) {
          finalImage = `${baseUrl}${newLocal}`;
          featuredImageSet = true;
          console.log(`  🏷️ Hirarki 3 (Itemprop) digunakan: ${finalImage}`);
        }
      }
    }

    // --- 4. HIRARKI 4 (FINAL FALLBACK): NAMA FILE ---
    if (!featuredImageSet || !finalImage) {
      finalImage = `${baseUrl}/img/${baseName}.webp`;
      console.log(`  ⚠️ Hirarki 4 (Fallback Nama File) digunakan.`);
    }

    // --- UPDATE SEMUA TAG DENGAN FINAL IMAGE HASIL HIRARKI ---
    const updateOrCreateMeta = (selector, attr, val, tagHTML) => {
      if ($(selector).length) $(selector).attr(attr, val);
      else $('head').append(tagHTML);
    };

      updateOrCreateMeta('link[rel="canonical"]', 'href', finalArticleUrl, `<link rel="canonical" href="${finalArticleUrl}">`);
      updateOrCreateMeta('meta[property="og:image"]', 'content', finalImage, `<meta property="og:image" content="${finalImage}">`);
      updateOrCreateMeta('meta[name="twitter:image"]', 'content', finalImage, `<meta name="twitter:image" content="${finalImage}">`);

      // LD-JSON
      $('script[type="application/ld+json"]').remove();
      const jsonLD = {
        "@context": "https://schema.org/",
        "@type": "Article",
        "headline": title,
        "image": finalImage,
        "author": { "@type": "Person", "name": "Fakhrul Rijal" }
      };
      $('head').prepend(`\n<script type="application/ld+json">\n${JSON.stringify(jsonLD, null, 2)}\n</script>\n`);

      fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('✅ SEO Fixer selesai dengan hirarki yang benar.');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
