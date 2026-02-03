import fs from 'fs';
import { glob } from 'node:fs/promises'; // 🔥 Pakai Native Glob bawaan Node.js
import { load } from 'cheerio';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

// 🔥 FUNGSI BARU: Mencegah tanda kutip merusak atribut HTML
const escapeHtmlAttr = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')   // 1. Simbol & jadi &amp; (HARUS PERTAMA)
    .replace(/"/g, '&quot;')  // 2. Kutip dua jadi &quot;
    .replace(/'/g, '&#39;')   // 3. Kutip satu jadi &#39;
    .replace(/</g, '&lt;')    // 4. Jaga-jaga kalau ada tag <
    .replace(/>/g, '&gt;');   // 5. Jaga-jaga kalau ada tag >
};

async function mirrorAndConvert(externalUrl, baseUrl) {
  try {
    const url = new URL(externalUrl);
    const baseHostname = new URL(baseUrl).hostname;

    if (url.hostname === baseHostname || url.hostname === 'localhost' || url.hostname === 'schema.org') {
      return externalUrl.replace(baseUrl, '');
    }

    const originalPath = url.pathname;
    const ext = path.extname(originalPath).toLowerCase(); // Ambil ekstensi asli

    // Tentukan path lokal (tetap pakai ekstensi asli jika SVG)
    const isSvg = ext === '.svg';
    const finalExt = isSvg ? '.svg' : '.webp';
    const localPathName = ext ? originalPath.replace(ext, finalExt) : `${originalPath}${finalExt}`;

    const localPath = path.join('img', url.hostname, localPathName);
    const dirPath = path.dirname(localPath);

    // Cek apakah file sudah ada di folder lokal
    if (fs.existsSync(localPath)) {
      return `/${localPath.replace(/\\/g, '/')}`;
    }

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    console.log(`📥 Mirroring ${isSvg ? '(Original SVG)' : '& WebP'}: ${url.hostname}${originalPath}...`);

    const response = await axios({
      url: externalUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    if (isSvg) {
      // JIKA SVG: Langsung simpan filenya tanpa diconvert (Curi doang)
      fs.writeFileSync(localPath, response.data);
    } else {
      // JIKA BUKAN SVG: Convert ke WebP pakai Sharp
      await sharp(response.data).webp({ quality: 85 }).toFile(localPath);
    }

    return `/${localPath.replace(/\\/g, '/')}`;
  } catch (err) {
    console.error(`❌ Gagal mirror ${externalUrl}:`, err.message);
    return externalUrl;
  }
}

async function fixSEO() {
  const targetFolder = process.argv[2] || 'artikel';

  // 🔥 Menggunakan native glob. Di Node.js native, return-nya adalah AsyncIterable,
  // kita ubah jadi array agar kompatibel dengan perulangan for...of Mas Bro.
  const files = [];
  for await (const entry of glob(`${targetFolder}/*.html`)) {
    files.push(entry);
  }

  const baseUrl = 'https://dalam.web.id';

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const baseName = path.basename(file);
    console.log(`\n🔍 Memproses SEO & Images: ${baseName}`);

    const $ = load(rawContent, { decodeEntities: false });
    const head = $('head');

    // --- 1. MIRRORING GAMBAR DI DALAM ARTIKEL ---
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

    // --- 2. LOGIKA DATA SEO ---
    const fileName = path.basename(file);
    const cleanFileName = fileName.replace('.html', '');
    const canonicalUrl = `${baseUrl}/artikel/${cleanFileName}`;

    const articleTitle = $('title').text().replace(' - Layar Kosong', '').trim() || 'Layar Kosong';
    const escapedTitle = escapeHtmlAttr(articleTitle);

    let metaImgUrl = $('meta[name="twitter:image"]').attr('content') ||
    $('meta[property="og:image"]').attr('content') ||
    $('img').first().attr('src') || '';

    if (metaImgUrl && metaImgUrl.startsWith('http')) {
      const mirroredMetaPath = await mirrorAndConvert(metaImgUrl, baseUrl);
      if (mirroredMetaPath.startsWith('/')) {
        metaImgUrl = `${baseUrl}${mirroredMetaPath}`;
      }
    }

    // --- 3. BERSIHKAN SEMUA TAG LAMA ---
    $('html').attr('lang', 'id').attr('prefix', 'og: https://ogp.me/ns# article: https://ogp.me/ns/article#');
    $('link[rel="canonical"]').remove();
    $('link[rel="icon"], link[rel="shortcut icon"]').remove();
    $('meta[itemprop="image"]').remove();
    $('meta[name="author"]').remove();
    $('meta[name="robots"], meta[name="googlebot"]').remove();
    $('meta[name="fb:app_id"], meta[property="fb:app_id"]').remove();
    $('meta[name^="twitter:"]').not('[name="twitter:description"]').remove();
    $('meta[property^="og:"]').not('[property="og:description"]').remove();
    $('meta[property^="article:"]').remove();
    $('meta[name="theme-color"]').remove();
    $('meta[name="fediverse:creator"]').remove();
    $('meta[name="bluesky:creator"]').remove();

    // --- 4. SUNTIK ULANG ---
    head.append(`\n    <link rel="canonical" href="${canonicalUrl}">`);
    head.append(`\n    <link rel="icon" href="/favicon.ico">`);
    head.append(`\n    <meta name="author" content="Fakhrul Rijal">`);
    head.append(`\n    <meta name="robots" content="index, follow, max-image-preview:large">`);
    head.append(`\n    <meta name="googlebot" content="max-image-preview:large">`);
    head.append(`\n    <meta name="theme-color" content="#00b0ed">`);
    head.append(`\n    <link rel="license" href="https://creativecommons.org/publicdomain/zero/1.0/">`);
    head.append(`\n    <meta name="fediverse:creator" content="@frijal@mastodon.social">`);
    head.append(`\n    <meta name="twitter:creator" content="@responaja">`);
    head.append(`\n    <meta name="bluesky:creator" content="@dalam.web.id">`);
    head.append(`\n    <meta property="og:site_name" content="Layar Kosong">`);
    head.append(`\n    <meta property="og:locale" content="id_ID">`);
    head.append(`\n    <meta property="og:type" content="article">`);
    head.append(`\n    <meta property="og:url" content="${canonicalUrl}">`);
    head.append(`\n    <meta property="og:title" content="${escapedTitle}">`);
    head.append(`\n    <meta name="twitter:card" content="summary_large_image">`);
    head.append(`\n    <meta name="twitter:site" content="@responaja">`);
    head.append(`\n    <meta property="fb:app_id" content="175216696195384">`);
    head.append(`\n    <meta property="article:author" content="https://facebook.com/frijal">`);
    head.append(`\n    <meta property="article:publisher" content="https://facebook.com/frijalpage">`);

    if (metaImgUrl) {
      head.append(`\n    <meta property="og:image" content="${metaImgUrl}">`);
      head.append(`\n    <meta property="og:image:alt" content="${escapedTitle}">`);
      head.append(`\n    <meta property="og:image:width" content="1200">`);
      head.append(`\n    <meta property="og:image:height" content="675">`);
      head.append(`\n    <meta name="twitter:image" content="${metaImgUrl}">`);
      head.append(`\n    <meta itemprop="image" content="${metaImgUrl}">`);
    }

    head.append(`\n`);

    // --- 5. FIX ALT TEXT GAMBAR DI BODY ---
    $('img').each((_, el) => {
      if (!$(el).attr('alt')) $(el).attr('alt', articleTitle);
    });

    // --- 6. SIMPAN HASIL ---
    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer & Mirroring: Selesai! Menggunakan Native Glob (Node.js 24).');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
