import fs from 'fs';
import { glob } from 'node:fs/promises';
import { load } from 'cheerio';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

const escapeHtmlAttr = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '’')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

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
      url: externalUrl, method: 'GET', responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000
    });

    if (isSvg) { fs.writeFileSync(localPath, response.data); }
    else { await sharp(response.data).webp({ quality: 85 }).toFile(localPath); }
    return `/${localPath.replace(/\\/g, '/')}`;
  } catch (err) { return externalUrl; }
}

async function fixSEO() {
  const targetFolder = process.argv[2] || 'artikel';
  const files = [];
  for await (const entry of glob(`${targetFolder}/*.html`)) { files.push(entry); }

  const baseUrl = 'https://dalam.web.id'.replace(/\/$/, '');

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const baseName = path.basename(file);
    console.log(`\n🔍 Memproses SEO & Meta Images: ${baseName}`);

    const $ = load(rawContent, { decodeEntities: false });
    const head = $('head');

    // --- 1. MIRRORING GAMBAR DALAM BODY ---
    const images = $('img').toArray();
    for (const el of images) {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) {
        const localPath = await mirrorAndConvert(src, baseUrl);
        if (localPath.startsWith('/')) $(el).attr('src', `${baseUrl}${localPath}`);
      }
    }

    // --- 2. LOGIKA DATA SEO ---
    const articleTitle = $('title').text().split(' - ')[0].trim() || 'Layar Kosong';
    const escapedTitle = escapeHtmlAttr(articleTitle);
    const cleanFileName = baseName.replace('.html', '');
    const canonicalUrl = `${baseUrl}/artikel/${cleanFileName}`.replace(/\/$/, '');

    // A. Ambil data mentah (Selektor fleksibel name/property)
    let rawMetaDesc = $('meta[name="description"], meta[property="description"]').attr('content') || '';
    let rawOgDesc = $('meta[property="og:description"], meta[name="og:description"]').attr('content') || '';
    let rawTwitterDesc = $('meta[property="twitter:description"], meta[name="twitter:description"]').attr('content') || '';

    // B. Siapkan cadangan dari paragraf pertama
    const firstP = $('p').first().text().trim();
    const fallback = firstP ? prepareDesc(firstP.substring(0, 160)) : 'Layar Kosong - Catatan dan Opini.';

    // C. Tentukan "Best Description" (Jaring pengaman)
    const bestMeta = rawMetaDesc || rawOgDesc || rawTwitterDesc || fallback;

    // D. Hasil akhir untuk suntik ulang
    let finalMetaDesc = prepareDesc(rawMetaDesc || bestMeta);
    let finalOgDesc = prepareDesc(rawOgDesc || bestMeta);
    let finalTwitterDesc = prepareDesc(rawTwitterDesc || bestMeta);

    // GAMBAR UNTUK META SOSMED
    let metaImgUrl = $('meta[property="twitter:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('meta[property="og:image"]').attr('content') ||
    $('img').first().attr('src') || '';

    if (metaImgUrl && metaImgUrl.startsWith('http')) {
      const mirroredPath = await mirrorAndConvert(metaImgUrl, baseUrl);
      if (mirroredPath.startsWith('/')) metaImgUrl = `${baseUrl}${mirroredPath}`;
    }

    const publishedTime = $('meta[property="article:published_time"]').attr('content');
    const modifiedTime = $('meta[property="article:modified_time"]').attr('content');
    const existingTags = [];
    $('meta[property="article:tag"]').each((_, el) => {
      existingTags.push($(el).attr('content'));
    });

    // --- 3. BERSIHKAN TAG LAMA ---
    $('html').attr('lang', 'id').attr('prefix', 'og: https://ogp.me/ns# article: https://ogp.me/ns/article#');
    // Hapus link lama
    $('link[rel="canonical"], link[rel="icon"], link[rel="shortcut icon"], link[rel="license"]').remove();
    // Hapus deskripsi (semua variasi)
    $('meta[name="description"], meta[property="description"], meta[property="og:description"], meta[name="og:description"], meta[name="twitter:description"], meta[property="twitter:description"]').remove();
    // Hapus semua meta sosmed & meta khusus lainnya (menggunakan wildcard ^=)
    // Kita hapus twitter: baik yang 'name' maupun 'property'
    $('meta[property^="og:"], meta[name^="twitter:"], meta[property^="twitter:"], meta[property^="article:"], meta[itemprop="image"]').remove();
    // Hapus meta author, robot, dan brandings
    $('meta[name="author"], meta[name="robots"], meta[name="googlebot"], meta[name="theme-color"], meta[name^="bluesky:"], meta[name^="fediverse:"]').remove();

        // --- 4. SUNTIK ULANG ---
    head.append(`\n    <link rel="icon" href="/favicon.ico">`);
    head.append(`\n    <meta property="og:locale" content="id_ID">`);
    head.append(`\n    <meta property="og:site_name" content="Layar Kosong">`);
    head.append(`\n    <link rel="canonical" href="${canonicalUrl}">`);
    head.append(`\n    <meta property="og:url" content="${canonicalUrl}">`);
    head.append(`\n    <meta property="og:title" content="${escapedTitle}">`);
    head.append(`\n    <meta property="og:type" content="article">`);

    head.append(`\n    <meta name="theme-color" content="#00b0ed">`);
    head.append(`\n    <meta name="robots" content="index, follow, max-image-preview:large">`);
    head.append(`\n    <meta name="author" content="Fakhrul Rijal">`);

    head.append(`\n    <meta name="description" content="${finalMetaDesc}">`);
    head.append(`\n    <meta property="og:description" content="${finalOgDesc}">`);
    head.append(`\n    <meta name="twitter:description" content="${finalTwitterDesc}">`);


    head.append(`\n    <link rel="license" href="https://creativecommons.org/publicdomain/zero/1.0/">`);
    head.append(`\n    <meta name="twitter:creator" content="@responaja">`);
    head.append(`\n    <meta name="bluesky:creator" content="@dalam.web.id">`);
    head.append(`\n    <meta name="fediverse:creator" content="@frijal@mastodon.social">`);
    head.append(`\n    <meta name="googlebot" content="max-image-preview:large">`);
    head.append(`\n    <meta name="twitter:site" content="@responaja">`);
    head.append(`\n    <meta property="article:author" content="https://facebook.com/frijal">`);
    head.append(`\n    <meta property="article:publisher" content="https://facebook.com/frijalpage">`);
    head.append(`\n    <meta property="fb:app_id" content="175216696195384">`);

    if (metaImgUrl) {
      head.append(`\n    <meta itemprop="image" content="${metaImgUrl}">`);
      head.append(`\n    <meta name="twitter:image" content="${metaImgUrl}">`);
      head.append(`\n    <meta property="twitter:image" content="${metaImgUrl}">`);
      head.append(`\n    <meta property="og:image" content="${metaImgUrl}">`);
      head.append(`\n    <meta property="og:image:alt" content="${escapedTitle}">`);
      head.append(`\n    <meta property="og:image:height" content="675">`);
      head.append(`\n    <meta property="og:image:width" content="1200">`);
      head.append(`\n    <meta name="twitter:card" content="summary_large_image">`);
       }

    existingTags.forEach(tag => {
      head.append(`\n    <meta property="article:tag" content="${tag}">`);
    });

    if (publishedTime) head.append(`\n    <meta property="article:published_time" content="${publishedTime}">`);
    if (modifiedTime) head.append(`\n    <meta property="article:modified_time" content="${modifiedTime}">`);

    // --- 5. BODY FIXES ---
    $('img').each((_, el) => {
      if (!$(el).attr('alt')) $(el).attr('alt', articleTitle);
    });

    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer: Selesai! Deskripsi & Gambar Sosmed aman.');
}

fixSEO().catch(err => console.error(err));
