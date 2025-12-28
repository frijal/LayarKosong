import fs from 'fs';
import { load } from 'cheerio';
import { glob } from 'glob';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

// --- FUNGSI BARU: MIRROR & CONVERT ---
async function mirrorAndConvert(externalUrl) {
  try {
    const url = new URL(externalUrl);

    // Tentukan path: img/hostname/path-asli.webp
    const originalPath = url.pathname;
    const ext = path.extname(originalPath);
    // Jika tidak ada ekstensi (misal dari API), kita asumsikan .webp nanti
    const webpPathName = ext ? originalPath.replace(ext, '.webp') : `${originalPath}.webp`;

    const localPath = path.join('img', url.hostname, webpPathName);
    const dirPath = path.dirname(localPath);

    // Kalau sudah ada, kembalikan path lokal
    if (fs.existsSync(localPath)) {
      return `/${localPath.replace(/\\/g, '/')}`;
    }

    // Buat folder
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    console.log(`📥 Mirroring & Converting: ${url.hostname}...`);

    const response = await axios({
      url: externalUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000 // 10 detik limit
    });

    // Konversi buffer langsung ke WebP tanpa simpan file asli
    await sharp(response.data)
    .webp({ quality: 80 })
    .toFile(localPath);

    return `/${localPath.replace(/\\/g, '/')}`;
  } catch (err) {
    console.error(`❌ Gagal Mirror ${externalUrl}:`, err.message);
    return externalUrl; // Balikkan aslinya kalau gagal biar link nggak mati
  }
}

async function fixSEO() {
  const targetFolder = process.argv[2] || 'artikel';
  console.log(`📂 Memproses folder: ${targetFolder}`);

  const files = await glob(`${targetFolder}/*.html`);
  if (files.length === 0) {
    console.log(`ℹ️ Tidak ada file HTML ditemukan.`);
    return;
  }

  let totalErrors = 0;
  const today = new Date().toISOString().split('T')[0];
  const laporanPath = `mini/laporan-validasi-${today.replace(/-/g, '')}.txt`;
  const baseUrl = 'https://dalam.web.id';

  if (!fs.existsSync('mini')) fs.mkdirSync('mini');
  if (!fs.existsSync('img')) fs.mkdirSync('img'); // Pastikan folder img ada

  let isiLaporan = `📋 LAPORAN AUDIT & OTOMASI (${new Date().toLocaleString()})\n`;
  isiLaporan += `============================================================\n\n`;

  const isDiscoverFriendly = (url) =>
  typeof url === 'string' &&
  /maxresdefault|1200|1280|1600|1920|w1200|w1280/i.test(url) &&
  !/favicon|icon|logo/i.test(url);

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');

    // --- 1. VALIDASI STRUKTUR (Tetap sama) ---
    const tagsToWatch = ['section', 'div', 'article', 'main', 'header', 'footer'];
    let fileErrors = [];
    tagsToWatch.forEach(tag => {
      const openCount = (rawContent.match(new RegExp(`<${tag}(\\s|>|$)`, 'gi')) || []).length;
      const closeCount = (rawContent.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
      if (openCount !== closeCount) {
        fileErrors.push(`Tag <${tag}> tidak seimbang! (${openCount} vs ${closeCount})`);
      }
    });

    if (fileErrors.length > 0) {
      console.error(`\x1b[31m❌ STRUKTUR RUSAK: ${file}\x1b[0m`);
      isiLaporan += `❌ ERROR: ${file}\n` + fileErrors.join('\n') + '\n\n';
      totalErrors++;
      continue;
    }

    const $ = load(rawContent, { decodeEntities: false });
    const title = $('title').text() || 'Layar Kosong';
    const baseName = path.basename(file, '.html');
    const finalArticleUrl = `${baseUrl}/artikel/${baseName}.html`;
    const fallbackImage = `${baseUrl}/img/${baseName}.webp`;

    // --- 2. DETEKSI TANGGAL ---
    let detectedDate = $('meta[property="article:published_time"]').attr('content') ||
    $('time').attr('datetime') ||
    $('body').text().match(/(\d{4}-\d{2}-\d{2})/)?.[0] || "2025-12-26";
    let finalDate = detectedDate.split('T')[0];

    // Ambil judul artikel untuk fallback Alt Text
    const articleTitle = $('title').text().replace(' - Layar Kosong', '').trim();

    // --- 3. LOGIKA GAMBAR + MIRRORING + AUTO ALT ---
    const allImages = $('img');
    let finalImage = fallbackImage;
    let featuredImageSet = false;

    for (let i = 0; i < allImages.length; i++) {
      let imgTag = $(allImages[i]);
      let oldSrc = imgTag.attr('src');
      let oldAlt = imgTag.attr('alt');

      if (!oldSrc) continue;

      // LOGIKA AUTO ALT TEXT
      // Jika alt tidak ada, kosong, atau cuma spasi
      if (!oldAlt || oldAlt.trim() === "") {
        imgTag.attr('alt', articleTitle);
        console.log(`  🏷️  Auto Alt Added: "${articleTitle}"`);
      }

      const isExternal = oldSrc.startsWith('http') &&
      !oldSrc.includes('dalam.web.id') &&
      !oldSrc.startsWith('/img/');

      if (isExternal) {
        const newLocalSrc = await mirrorAndConvert(oldSrc);
        imgTag.attr('src', newLocalSrc);
        console.log(`  📸 External Image Mirrored: ${oldSrc} -> ${newLocalSrc}`);

        if (!featuredImageSet) {
          finalImage = `${baseUrl}${newLocalSrc}`;
          featuredImageSet = true;
        }
      } else {
        if (!featuredImageSet) {
          finalImage = oldSrc.startsWith('http') ? oldSrc : `${baseUrl}${oldSrc.startsWith('/') ? '' : '/'}${oldSrc}`;
          featuredImageSet = true;
        }
      }
    }

    // Pastikan fallbackImage juga absolut jika digunakan
    if (!featuredImageSet && !finalImage.startsWith('http')) {
      finalImage = `${baseUrl}${finalImage.startsWith('/') ? '' : '/'}${finalImage}`;
    }

    // --- 4. INJEKSI JSON-LD ---
    $('script[type="application/ld+json"]').remove();
    const jsonLD = {
      "@context": "https://schema.org/",
      "@type": "Article",
      "mainEntityOfPage": { "@type": "WebPage", "@id": finalArticleUrl },
      "headline": title,
      "description": $('meta[name="description"]').attr('content') || `kunjungi juga: ${title}`,
      "image": { "@type": "ImageObject", "url": finalImage, "width": "1200", "height": "675" },
      "author": { "@type": "Person", "name": "Fakhrul Rijal" },
      "publisher": {
        "@type": "Organization",
        "name": "Layar Kosong",
        "logo": { "@type": "ImageObject", "url": `${baseUrl}/logo.png`, "width": "48", "height": "48" }
      },
      "datePublished": finalDate,
      "dateModified": today
    };

    $('head').prepend(`\n<script type="application/ld+json">\n${JSON.stringify(jsonLD, null, 2)}\n</script>\n`);

    // --- 5. LOGIKA ANTI-LINK-BERSARANG ---
    $('h1').each((i, el) => {
      if ($(el).find('a').length === 0) {
        const textOnly = $(el).text().trim();
        $(el).html(`<a href="/" style="text-decoration:none; color:inherit;">${textOnly}</a>`);
      }
    });

    // --- 6. UPDATE META TAG ---
    const updateOrCreateMeta = (selector, attr, val, tagHTML) => {
      if ($(selector).length) $(selector).attr(attr, val);
      else $('head').append(tagHTML);
    };

      updateOrCreateMeta('link[rel="canonical"]', 'href', finalArticleUrl, `<link rel="canonical" href="${finalArticleUrl}">`);
      updateOrCreateMeta('meta[property="og:image"]', 'content', finalImage, `<meta property="og:image" content="${finalImage}">`);
      updateOrCreateMeta('meta[name="twitter:image"]', 'content', finalImage, `<meta name="twitter:image" content="${finalImage}">`);
      updateOrCreateMeta('meta[name="twitter:card"]', 'content', 'summary_large_image', `<meta name="twitter:card" content="summary_large_image">`);

      // HAPUS bagian "if (firstImg === rawImage)" yang lama, karena update src sudah dilakukan di dalam loop di atas.

      // --- 7. SIMPAN FILE ---
      fs.writeFileSync(file, $.html(), 'utf8');
      console.log(`✅ Selesai: ${file}`);
      isiLaporan += `✅ FIXED: ${file}\n`;
  }

  fs.writeFileSync(laporanPath, isiLaporan, 'utf8');
  if (totalErrors > 0) process.exit(1);
}

fixSEO().catch(err => { console.error("❌ Fatal Error:", err); process.exit(1); });
