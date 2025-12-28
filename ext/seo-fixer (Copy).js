import fs from 'fs';
import { load } from 'cheerio';
import { glob } from 'glob';
import path from 'path';

async function fixSEO() {
// Ambil folder dari argument terminal (misal: node seo-fixer.js artikelx)
  // Jika tidak ada argument, default ke 'artikel'
  const targetFolder = process.argv[2] || 'artikel';
  console.log(`📂 Memproses folder: ${targetFolder}`);
  // Sekarang glob hanya akan mencari di folder yang ditentukan
  const files = await glob(`${targetFolder}/*.html`);
if (files.length === 0) {
    console.log(`ℹ️ Tidak ada file HTML ditemukan di folder: ${targetFolder}`);
    return;
  }

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
      const openMatches = [...rawContent.matchAll(new RegExp(`<${tag}(\\s|>|$)`, 'gi'))];
      const closeMatches = [...rawContent.matchAll(new RegExp(`</${tag}>`, 'gi'))];
      const openCount = openMatches.length;
      const closeCount = closeMatches.length;

      if (openCount !== closeCount) {
        const lines = rawContent.split('\n');
        let lineTarget = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(`<${tag}`) || lines[i].toLowerCase().includes(`</${tag}>`)) {
            lineTarget = i + 1;
            break;
          }
        }
        const selisih = Math.abs(openCount - closeCount);
        fileErrors.push(`Tag <${tag}> tidak seimbang! (${openCount} vs ${closeCount}). Kurang ${selisih} tag ${openCount > closeCount ? 'penutup' : 'pembuka'}. Cek sekitar baris ${lineTarget}.`);
      }
    });

    if (fileErrors.length > 0) {
      console.error(`\x1b[31m❌ STRUKTUR RUSAK: ${file}\x1b[0m`);
      isiLaporan += `❌ ERROR: ${file}\n` + fileErrors.map(e => `    - ${e}`).join('\n') + '\n\n';
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

    // --- 4. INJEKSI JSON-LD (Sapu Bersih) ---
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

    const scriptTag = `\n<script type="application/ld+json">\n${JSON.stringify(jsonLD, null, 2)}\n</script>\n`;
    if ($('head').length) $('head').prepend(scriptTag);
    else $('html').prepend(`<head>${scriptTag}</head>`);

    // --- 5. LOGIKA ANTI-LINK-BERSARANG (Pencegahan Duplikat H1) ---
    $('h1').each((i, el) => {
  // Cek dulu, apakah di dalam H1 sudah ada link (tag <a>)?
  if ($(el).find('a').length === 0) {
    const textOnly = $(el).text().trim();
    $(el).html(`<a href="/" style="text-decoration:none; color:inherit;">${textOnly}</a>`);
  }
});

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
    console.log(`✅ Selesai: ${file}`);
    isiLaporan += `✅ FIXED: ${file}\n`;
  }

  fs.writeFileSync(laporanPath, isiLaporan, 'utf8');
  if (totalErrors > 0) {
    console.error(`\n❌ Ada ${totalErrors} file rusak. Workflow dihentikan.`);
    process.exit(1);
  }
}

fixSEO().catch(err => { console.error("❌ Fatal Error:", err); process.exit(1); });
