import fs from 'fs';
import { load } from 'cheerio';
import { glob } from 'glob';
import path from 'path';

async function fixSEO() {
  const files = await glob('artikel/*.html');
  let totalErrors = 0;
  
  const today = new Date().toISOString().split('T')[0];
  const laporanPath = `mini/laporan-validasi-${today.replace(/-/g, '')}.txt`;
  const baseUrl = 'https://dalam.web.id';

  if (!fs.existsSync('mini')) fs.mkdirSync('mini');
  let isiLaporan = `📋 LAPORAN AUDIT & OTOMASI (${new Date().toLocaleString()})\n`;
  isiLaporan += `============================================================\n\n`;

  const isDiscoverFriendly = (url) => 
    typeof url === 'string' && 
    /maxresdefault|1200|1280|1600|1920|w1200|w1280/i.test(url) && 
    !/favicon|icon|logo/i.test(url);

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    
    // --- 1. VALIDASI STRUKTUR ---
    const tagsToWatch = ['section', 'div', 'article', 'main', 'header', 'footer'];
    let fileErrors = [];
    tagsToWatch.forEach(tag => {
      const openCount = (rawContent.match(new RegExp(`<${tag}(\\s|>|$)`, 'gi')) || []).length;
      const closeCount = (rawContent.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
      if (openCount !== closeCount) fileErrors.push(`Tag <${tag}> pincang! (${openCount} vs ${closeCount})`);
    });

    if (fileErrors.length > 0) {
      console.error(`❌ STRUKTUR RUSAK: ${file}`);
      isiLaporan += `❌ ERROR: ${file}\n` + fileErrors.map(e => `   - ${e}`).join('\n') + '\n\n';
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

    // --- 3. LOGIKA GAMBAR ---
    let metaImage = $('meta[property="og:image"]').attr('content');
    let firstImg = $('img').first().attr('src');
    let finalImage = isDiscoverFriendly(metaImage) ? metaImage : 
                     (isDiscoverFriendly(firstImg) ? firstImg : fallbackImage);

    if (finalImage && !finalImage.startsWith('http')) {
        finalImage = `${baseUrl}${finalImage.startsWith('/') ? '' : '/'}${finalImage}`;
    }

    // --- 4. INJEKSI JSON-LD ---
    $('script[type="application/ld+json"]').remove();
    const jsonLD = {
      "@context": "https://schema.org/",
      "@type": "Article",
      "mainEntityOfPage": { "@type": "WebPage", "@id": finalArticleUrl },
      "headline": title,
      "description": $('meta[name="description"]').attr('content') || `Baca di Layar Kosong: ${title}`,
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
    $('head').append(`\n<script type="application/ld+json">\n${JSON.stringify(jsonLD, null, 2)}\n</script>\n`);

    // --- 5. SOCIAL MEDIA SHARE BUTTONS (Otomatis) ---
    // Hapus share lama jika ada agar tidak duplikat
    $('.share-buttons-auto').remove();

  //  const shareHtml = `
//    <div class="share-buttons-auto" style="margin: 2rem 0; padding: 1rem; border-top: 1px solid #eee;">
//      <p style="font-weight: bold; margin-bottom: 10px;">Bagikan artikel ini:</p>
//      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
//        <a href="https://wa.me/?text=${encodeURIComponent(title + ' ' + finalArticleUrl)}" target="_blank" style="background:#25d366; color:white; padding:8px 15px; border-radius:5px; text-decoration:none; font-size:14px;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
//        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(finalArticleUrl)}" target="_blank" style="background:#1877f2; color:white; padding:8px 15px; border-radius:5px; text-decoration:none; font-size:14px;"><i class="fa-brands fa-facebook"></i> Facebook</a>
//        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(finalArticleUrl)}" target="_blank" style="background:#1da1f2; color:white; padding:8px 15px; border-radius:5px; text-decoration:none; font-size:14px;"><i class="fa-brands fa-x-twitter"></i> X-Twitter</a>
//        <a href="https://t.me/share/url?url=${encodeURIComponent(finalArticleUrl)}&text=${encodeURIComponent(title)}" target="_blank" style="background:#0088cc; color:white; padding:8px 15px; border-radius:5px; text-decoration:none; font-size:14px;"><i class="fa-brands fa-telegram"></i> Telegram</a>
//      </div>
//    </div>`;

    // Letakkan di akhir elemen <article>, <main>, atau sebelum <footer>
//    if ($('article').length) $('article').append(shareHtml);
//    else if ($('main').length) $('main').append(shareHtml);
//    else $('body').append(shareHtml);

    // --- 6. UPDATE META TAG & SEO ---
    const updateOrCreateMeta = (selector, attr, val, tagHTML) => {
      if ($(selector).length) $(selector).attr(attr, val);
      else $('head').append(tagHTML);
    };

    updateOrCreateMeta('link[rel="canonical"]', 'href', finalArticleUrl, `<link rel="canonical" href="${finalArticleUrl}">`);
    updateOrCreateMeta('meta[property="og:image"]', 'content', finalImage, `<meta property="og:image" content="${finalImage}">`);
    updateOrCreateMeta('meta[name="twitter:card"]', 'content', 'summary_large_image', `<meta name="twitter:card" content="summary_large_image">`);

    // --- 7. SIMPAN FILE ---
    fs.writeFileSync(file, $.html(), 'utf8');
    console.log(`✅ Selesai: ${baseName}`);
    isiLaporan += `✅ FIXED: ${file} (Share Buttons & JSON-LD ditambahkan)\n`;
  }

  fs.writeFileSync(laporanPath, isiLaporan, 'utf8');
  if (totalErrors > 0) process.exit(1);
}

fixSEO().catch(err => { console.error("❌ Fatal Error:", err); process.exit(1); });
