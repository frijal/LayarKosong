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

    await sharp(response.data)
    .webp({ quality: 80 })
    .toFile(localPath);

    return `/${localPath.replace(/\\/g, '/')}`;
  } catch (err) {
    console.error(`❌ Gagal Mirror ${externalUrl}:`, err.message);
    return externalUrl;
  }
}

async function fixSEO() {
  const targetFolder = process.argv[2] || 'artikel';
  console.log(`📂 Memproses folder: ${targetFolder}`);

  const files = await glob(`${targetFolder}/*.html`);
  if (files.length === 0) return;

  let totalErrors = 0;
  const today = new Date().toISOString().split('T')[0];
  const laporanPath = `mini/laporan-validasi-${today.replace(/-/g, '')}.txt`;
  const baseUrl = 'https://dalam.web.id';

  if (!fs.existsSync('mini')) fs.mkdirSync('mini');
  if (!fs.existsSync('img')) fs.mkdirSync('img');

  let isiLaporan = `📋 LAPORAN AUDIT & OTOMASI (${new Date().toLocaleString()})\n`;

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const $ = load(rawContent, { decodeEntities: false });
    const title = $('title').text() || 'Layar Kosong';
    const articleTitle = title.replace(' - Layar Kosong', '').trim();
    const baseName = path.basename(file, '.html');
    const finalArticleUrl = `${baseUrl}/artikel/${baseName}.html`;

    let featuredImageSet = false;
    let finalImage = ""; // Akan diisi sesuai hirarki

    // --- A. PRIORITAS 1: META SOSIAL (OG / TWITTER) ---
    const socialImg = $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content');

    if (socialImg && socialImg.startsWith('http') && !socialImg.includes(baseUrl)) {
      const newLocal = await mirrorAndConvert(socialImg);
      finalImage = `${baseUrl}${newLocal}`;
      featuredImageSet = true;
      console.log(`  💎 Hirarki 1 (Social) digunakan.`);
    }

    // --- B. PROSES SEMUA IMG ( Hirarki 2 ) ---
    const allImages = $('img');
    for (let i = 0; i < allImages.length; i++) {
      let imgTag = $(allImages[i]);
      let src = imgTag.attr('src');
      let dataSrc = imgTag.attr('data-src');

      if (!imgTag.attr('alt')) imgTag.attr('alt', articleTitle);

      if (src && src.startsWith('http') && !src.includes(baseUrl)) {
        const newLocal = await mirrorAndConvert(src);
        imgTag.attr('src', newLocal);
        // Hirarki 2: Ambil gambar pertama di artikel jika sosial kosong
        if (!featuredImageSet) {
          finalImage = `${baseUrl}${newLocal}`;
          featuredImageSet = true;
          console.log(`  📸 Hirarki 2 (IMG Artikel) digunakan.`);
        }
      }

      if (dataSrc && dataSrc.startsWith('http') && !dataSrc.includes(baseUrl)) {
        const newLocal = await mirrorAndConvert(dataSrc);
        imgTag.attr('data-src', newLocal);
      }
    }

    // --- C. PROSES ITEMPROP & THUMB ( Hirarki 3 ) ---
    const metaItemprop = $('meta[itemprop="image"]');
    if (metaItemprop.length) {
      let content = metaItemprop.attr('content');
      if (content && content.startsWith('http') && !content.includes(baseUrl)) {
        const newLocal = await mirrorAndConvert(content);
        metaItemprop.attr('content', `${baseUrl}${newLocal}`);
        // Hirarki 3: Hanya jadi finalImage jika Sosial & IMG Artikel kosong
        if (!featuredImageSet) {
          finalImage = `${baseUrl}${newLocal}`;
          featuredImageSet = true;
          console.log(`  🏷️ Hirarki 3 (Itemprop) digunakan.`);
        }
      }
    }

    // Thumbnails a.thumb (hanya mirror, tidak masuk hirarki finalImage)
    const thumbs = $('a.thumb');
    for (let i = 0; i < thumbs.length; i++) {
      let dataSrc = $(thumbs[i]).attr('data-src');
      if (dataSrc && dataSrc.startsWith('http') && !dataSrc.includes(baseUrl)) {
        const newLocal = await mirrorAndConvert(dataSrc);
        $(thumbs[i]).attr('data-src', newLocal).attr('href', newLocal);
      }
    }

    // --- D. HIRARKI 4: FALLBACK TERAKHIR ---
    if (!featuredImageSet || !finalImage) {
      finalImage = `${baseUrl}/img/${baseName}.webp`;
      console.log(`  ⚠️ Hirarki 4 (Fallback File) digunakan.`);
    }

    // --- UPDATE SEMUA META ---
    const updateOrCreateMeta = (selector, attr, val, tagHTML) => {
      if ($(selector).length) $(selector).attr(attr, val);
      else $('head').append(tagHTML);
    };

      updateOrCreateMeta('link[rel="canonical"]', 'href', finalArticleUrl, `<link rel="canonical" href="${finalArticleUrl}">`);
      updateOrCreateMeta('meta[property="og:image"]', 'content', finalImage, `<meta property="og:image" content="${finalImage}">`);
      updateOrCreateMeta('meta[name="twitter:image"]', 'content', finalImage, `<meta name="twitter:image" content="${finalImage}">`);

      // Schema LD-JSON
      $('script[type="application/ld+json"]').remove();
      const jsonLD = {
        "@context": "https://schema.org/",
        "@type": "Article",
        "headline": title,
        "image": finalImage,
        "datePublished": $('time').attr('datetime') || today,
        "author": { "@type": "Person", "name": "Fakhrul Rijal" }
      };
      $('head').prepend(`\n<script type="application/ld+json">\n${JSON.stringify(jsonLD, null, 2)}\n</script>\n`);

      fs.writeFileSync(file, $.html(), 'utf8');
      console.log(`✅ FIXED: ${file} -> Image: ${finalImage}`);
  }
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
