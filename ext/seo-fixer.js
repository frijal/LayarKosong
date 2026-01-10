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

    // Abaikan jika sudah host sendiri atau localhost
    if (url.hostname === baseHostname || url.hostname === 'localhost' || url.hostname === 'schema.org') {
      return externalUrl.replace(baseUrl, '');
    }

    const originalPath = url.pathname;
    const ext = path.extname(originalPath);
    // Selalu konversi ke .webp
    const webpPathName = ext ? originalPath.replace(ext, '.webp') : `${originalPath}.webp`;

    const localPath = path.join('img', url.hostname, webpPathName);
    const dirPath = path.dirname(localPath);

    // Jika file sudah ada, tidak perlu download lagi
    if (fs.existsSync(localPath)) {
      return `/${localPath.replace(/\\/g, '/')}`;
    }

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    console.log(`📥 Mirroring & WebP: ${url.hostname}${originalPath}...`);

    const response = await axios({
      url: externalUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    // Proses konversi Sharp
    await sharp(response.data).webp({ quality: 85 }).toFile(localPath);
    return `/${localPath.replace(/\\/g, '/')}`;
  } catch (err) {
    // Jika gagal (404 atau timeout), biarkan URL aslinya
    return externalUrl;
  }
}

async function fixSEO() {
  const targetFolder = process.argv[2] || 'artikel';
  const files = await glob(`${targetFolder}/*.html`);
  const baseUrl = 'https://dalam.web.id';

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const baseName = path.basename(file);
    console.log(`\n🔍 Memproses SEO & Images: ${baseName}`);

    // --- 1. LOAD KE CHEERIO (DOM Parser) ---
    const $ = load(rawContent, { decodeEntities: false });
    const head = $('head');

    // --- 2. MIRRORING GAMBAR DI DALAM ARTIKEL (IMG TAG) ---
    const images = $('img').toArray();
    for (const el of images) {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) {
        const localPath = await mirrorAndConvert(src, baseUrl);
        if (localPath.startsWith('/')) {
          $(el).attr('src', `${baseUrl}${localPath}`);
        }
      }
    }

    // --- 3. LOGIKA DATA SEO ---
    const fileName = path.basename(file);
    const cleanFileName = fileName.replace('.html', '');
    const canonicalUrl = `${baseUrl}/artikel/${cleanFileName}`;

    const articleTitle = $('title').text().replace(' - Layar Kosong', '').trim() || 'Layar Kosong';
    let siteDescription = $('meta[name="description"]').attr('content') ||
    $('p').first().text().substring(0, 160).trim() ||
    "Artikel terbaru dari Layar Kosong.";

    // Ambil gambar untuk meta (OG/Twitter) - Cek meta lama atau gambar pertama di body
    let metaImgUrl = $('meta[name="twitter:image"]').attr('content') ||
    $('meta[property="og:image"]').attr('content') ||
    $('img').first().attr('src') || '';

    // Mirroring gambar untuk Meta Tag jika dari luar
    if (metaImgUrl && metaImgUrl.startsWith('http')) {
      const mirroredMetaPath = await mirrorAndConvert(metaImgUrl, baseUrl);
      if (mirroredMetaPath.startsWith('/')) {
        metaImgUrl = `${baseUrl}${mirroredMetaPath}`;
      }
    }

    // --- 4. BERSIHKAN SEMUA TAG LAMA ---
    // Update atribut HTML sekaligus
    $('html')
    .attr('lang', 'id')
    .attr('prefix', 'og: https://ogp.me/ns# article: https://ogp.me/ns/article#');
   // Hapus tag lama secara menyeluruh, TAPI selamatkan description
    $('link[rel="canonical"]').remove();
    $('link[rel="icon"], link[rel="shortcut icon"]').remove(); // 🔥 Hapus favicon lama
    $('meta[itemprop="image"]').remove();
    $('meta[name="author"]').remove();
    $('meta[name="robots"], meta[name="googlebot"]').remove(); // Bersihkan robots lama
    $('meta[name="fb:app_id"], meta[property="fb:app_id"]').remove();
    // 👇 INI BAGIAN YANG DIUBAH
    // Hapus semua meta twitter, KECUALI yang namanya twitter:description
    $('meta[name^="twitter:"]').not('[name="twitter:description"]').remove();
    // Hapus semua meta og, KECUALI yang propertinya og:description
    $('meta[property^="og:"]').not('[property="og:description"]').remove();
    $('meta[property^="article:"]').remove(); // Penting: hapus namespace article lama
    $('meta[name="theme-color"]').remove(); // Hapus warna tema lama
    $('meta[name="fediverse:creator"]').remove(); // Hapus atribusi Mastodon
    $('meta[name="bluesky:creator"]').remove(); // Hapus atribusi Bluesky

    // --- 5. SUNTIK ULANG DENGAN URUTAN RAPI ---

    // SEO & Crawler (Ditaruh paling atas)
    head.append(`\n    <link rel="canonical" href="${canonicalUrl}">`);
    head.append(`\n    <link rel="icon" href="/favicon.ico">`);
    head.append(`\n    <meta name="author" content="Fakhrul Rijal">`);
    head.append(`\n    <meta name="robots" content="index, follow, max-image-preview:large">`);
    head.append(`\n    <meta name="googlebot" content="max-image-preview:large">`);
    head.append(`\n    <meta name="theme-color" content="#00b0ed">`); // Warna khas Layar Kosong

    // Social Presence & Creators
    head.append(`\n    <meta name="fediverse:creator" content="@frijal@mastodon.social">`);
    head.append(`\n    <meta name="twitter:creator" content="@responaja">`);
    head.append(`\n    <meta name="bluesky:creator" content="@dalam.web.id">`);

    // Open Graph (Core)
    head.append(`\n    <meta property="og:site_name" content="Layar Kosong">`);
    head.append(`\n    <meta property="og:locale" content="id_ID">`);
    head.append(`\n    <meta property="og:type" content="article">`);
    head.append(`\n    <meta property="og:url" content="${canonicalUrl}">`);
    head.append(`\n    <meta property="og:title" content="${articleTitle}">`);

    // Twitter Card (Hanya yang esensial karena Twitter fallback ke OG)
    head.append(`\n    <meta name="twitter:card" content="summary_large_image">`);
    head.append(`\n    <meta name="twitter:site" content="@responaja">`);

    // Facebook & Article Specific (Sesuai namespace di <html> prefix)
    head.append(`\n    <meta property="fb:app_id" content="175216696195384">`);
    head.append(`\n    <meta property="article:author" content="https://facebook.com/frijal">`);
    head.append(`\n    <meta property="article:publisher" content="https://facebook.com/frijalpage">`);

    // Logic Gambar (Itemprop ditaruh di sini agar sinkron)
    if (metaImgUrl) {
      head.append(`\n    <meta property="og:image" content="${metaImgUrl}">`);
      head.append(`\n    <meta property="og:image:alt" content="${articleTitle}">`);
      head.append(`\n    <meta property="og:image:width" content="1200">`);
      head.append(`\n    <meta property="og:image:height" content="675">`);
      head.append(`\n    <meta name="twitter:image" content="${metaImgUrl}">`);
      head.append(`\n    <meta itemprop="image" content="${metaImgUrl}">`);
    }

    head.append(`\n`);

    // --- 6. FIX ALT TEXT GAMBAR DI BODY ---
    $('img').each((_, el) => {
      if (!$(el).attr('alt')) $(el).attr('alt', articleTitle);
    });

      // --- 7. SIMPAN HASIL ---
      fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer & Mirroring: Selesai! Gambar dikonversi ke WebP dan Meta Tag rapi.');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
