import fs from 'fs';
import { glob } from 'node:fs/promises';
import { load } from 'cheerio';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

// 1. Fungsi Sanitisasi HTML
const escapeHtmlAttr = (text) => {
  if (!text) return '';
  return text
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '’')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
};

// 2. Fungsi Helper untuk merapikan deskripsi
const prepareDesc = (text) => escapeHtmlAttr(text.replace(/\s+/g, ' ').trim());

async function mirrorAndConvert(externalUrl, baseUrl) {
  try {
    const url = new URL(externalUrl);
    const baseHostname = new URL(baseUrl).hostname;
    if (url.hostname === baseHostname || url.hostname === 'localhost' || url.hostname === 'schema.org') {
      return externalUrl.replace(baseUrl, '');
    }
    const originalPath = url.pathname;
    const ext = path.extname(originalPath).toLowerCase();
    const isSvg = ext === '.svg';
    const finalExt = isSvg ? '.svg' : '.webp';
    const localPathName = ext ? originalPath.replace(ext, finalExt) : `${originalPath}${finalExt}`;
    const localPath = path.join('img', url.hostname, localPathName);
    const dirPath = path.dirname(localPath);

    if (fs.existsSync(localPath)) return `/${localPath.replace(/\\/g, '/')}`;
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const response = await axios({
      url: externalUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    if (isSvg) {
      fs.writeFileSync(localPath, response.data);
    } else {
      await sharp(response.data).webp({ quality: 85 }).toFile(localPath);
    }
    return `/${localPath.replace(/\\/g, '/')}`;
  } catch (err) {
    return externalUrl;
  }
}

async function fixSEO() {
  const targetFolder = process.argv[2] || 'artikel';
  const files = [];
  for await (const entry of glob(`${targetFolder}/*.html`)) {
    files.push(entry);
  }

  const baseUrl = 'https://dalam.web.id'.replace(/\/$/, '');

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const baseName = path.basename(file);
    console.log(`\n🔍 Memproses SEO (Unique Descriptions): ${baseName}`);

    const $ = load(rawContent, { decodeEntities: false });
    const head = $('head');

    // --- 1. MIRRORING GAMBAR ---
    const images = $('img').toArray();
    for (const el of images) {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) {
        const localPath = await mirrorAndConvert(src, baseUrl);
        if (localPath.startsWith('/')) $(el).attr('src', `${baseUrl}${localPath}`);
      }
    }

    // --- 2. AMBIL DATA SEO SECARA TERPISAH ---
    const articleTitle = $('title').text().split(' - ')[0].trim() || 'Layar Kosong';
    const escapedTitle = escapeHtmlAttr(articleTitle);

    // Ambil mentah-mentah dari masing-masing sumber
    let rawMetaDesc = $('meta[name="description"]').attr('content') || '';
    let rawOgDesc = $('meta[property="og:description"]').attr('content') || '';
    let rawTwitterDesc = $('meta[name="twitter:description"]').attr('content') || '';

    // Fallback: Paragraf pertama jika ada yang kosong
    const fallbackText = $('p').first().text().substring(0, 160).trim();
    const cleanFallback = prepareDesc(fallbackText);

    // Proses satu per satu tanpa menyamakan isinya
    let finalMetaDesc = rawMetaDesc ? prepareDesc(rawMetaDesc) : cleanFallback;
    let finalOgDesc = rawOgDesc ? prepareDesc(rawOgDesc) : cleanFallback;
    let finalTwitterDesc = rawTwitterDesc ? prepareDesc(rawTwitterDesc) : cleanFallback;

    // Ambil waktu asli
    const publishedTime = $('meta[property="article:published_time"]').attr('content');
    const modifiedTime = $('meta[property="article:modified_time"]').attr('content');

    // --- 3. BERSIHKAN SEMUA TAG LAMA ---
    $('html').attr('lang', 'id').attr('prefix', 'og: https://ogp.me/ns# article: https://ogp.me/ns/article#');
    $('link[rel="canonical"], link[rel="icon"], link[rel="shortcut icon"]').remove();
    $('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').remove();
    $('meta[property^="og:"], meta[name^="twitter:"], meta[property^="article:"], meta[itemprop="image"]').remove();
    $('meta[name="author"], meta[name="robots"], meta[name="googlebot"], meta[name="theme-color"]').remove();

    // --- 4. SUNTIK ULANG (DENGAN DATA BERBEDA) ---
    const cleanFileName = baseName.replace('.html', '');
    const canonicalUrl = `${baseUrl}/artikel/${cleanFileName}`.replace(/\/$/, '');

    head.append(`\n    <link rel="canonical" href="${canonicalUrl}">`);
    head.append(`\n    <link rel="icon" href="/favicon.ico">`);
    head.append(`\n    <meta name="description" content="${finalMetaDesc}">`); // Meta Deskripsi Google
    head.append(`\n    <meta property="og:description" content="${finalOgDesc}">`);   // Deskripsi Facebook/WA
    head.append(`\n    <meta name="twitter:description" content="${finalTwitterDesc}">`); // Deskripsi Twitter
    head.append(`\n    <meta name="author" content="Fakhrul Rijal">`);
    head.append(`\n    <meta name="robots" content="index, follow, max-image-preview:large">`);
    head.append(`\n    <meta name="theme-color" content="#00b0ed">`);
    head.append(`\n    <meta property="og:title" content="${escapedTitle}">`);
    head.append(`\n    <meta property="og:url" content="${canonicalUrl}">`);
    head.append(`\n    <meta property="og:type" content="article">`);
    head.append(`\n    <meta name="twitter:card" content="summary_large_image">`);

    // Tambahkan kembali waktu jika ada
    if (publishedTime) head.append(`\n    <meta property="article:published_time" content="${publishedTime}">`);
    if (modifiedTime) head.append(`\n    <meta property="article:modified_time" content="${modifiedTime}">`);

    // --- 5. SIMPAN ---
    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ Selesai! Meta, OG, dan Twitter description sekarang berdiri sendiri.');
}

fixSEO().catch(err => console.error(err));
