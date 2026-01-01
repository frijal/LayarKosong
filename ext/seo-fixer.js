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

    if (url.hostname === baseHostname || url.hostname === 'localhost') {
      return externalUrl.replace(baseUrl, '');
    }

    const originalPath = url.pathname;
    const ext = path.extname(originalPath);
    const webpPathName = ext ? originalPath.replace(ext, '.webp') : `${originalPath}.webp`;

    const localPath = path.join('img', url.hostname, webpPathName);
    const dirPath = path.dirname(localPath);

    if (fs.existsSync(localPath)) {
      return `/${localPath.replace(/\\/g, '/')}`;
    }

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    console.log(`📥 Mirroring baru: ${url.hostname}${originalPath}...`);

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
    return externalUrl;
  }
}

async function fixSEO() {
  // Folder input bisa apa saja (artikelx, draft, dll)
  const targetFolder = process.argv[2] || 'artikel';
  const files = await glob(`${targetFolder}/*.html`);
  const baseUrl = 'https://dalam.web.id';

  const imgUrlRegex = /https?:\/\/(?!dalam\.web\.id|schema\.org)[^\s"']+\.(?:jpg|jpeg|png|webp|gif|JPG)/gi;

  for (const file of files) {
    let rawContent = fs.readFileSync(file, 'utf8');
    const baseName = path.basename(file);
    console.log(`\n🔍 Memproses: ${baseName}`);

    // --- 1. SCAN & SWAP URL GAMBAR ---
    const matches = rawContent.match(imgUrlRegex);
    if (matches) {
      const uniqueUrls = [...new Set(matches)];
      for (const extUrl of uniqueUrls) {
        const localPath = await mirrorAndConvert(extUrl, baseUrl);
        if (localPath.startsWith('/')) {
          const newLocalUrl = `${baseUrl}${localPath}`;
          rawContent = rawContent.split(extUrl).join(newLocalUrl);
        }
      }
    }

    // --- 2. LOAD KE CHEERIO ---
    const $ = load(rawContent, { decodeEntities: false });
    const head = $('head');

    // Ambil data dasar
    const articleTitle = $('title').text().replace(' - Layar Kosong', '').trim() || 'Layar Kosong';
    const fileName = path.basename(file);

    // FIX: Canonical & OG:URL diarahkan ke folder 'artikel' (folder publik akhir)
    const canonicalUrl = `${baseUrl}/artikel/${fileName}`;

    let siteDescription = $('meta[name="description"]').attr('content') ||
    $('p').first().text().substring(0, 160).trim() ||
    "Artikel terbaru dari Layar Kosong.";

    const twitterImg = $('meta[name="twitter:image"]').attr('content') || '';

    // --- 3. BERSIHKAN SEMUA META LAMA ---
    $('meta[property^="og:"], meta[name^="twitter:"], meta[name="fb:app_id"], meta[property="fb:app_id"], link[rel="canonical"], meta[itemprop="image"]').remove();

    // --- 4. SUNTIK ULANG DENGAN URUTAN RAPI ---
    head.append(`\n    `);
    head.append(`\n    <link rel="canonical" href="${canonicalUrl}" />`);
    head.append(`\n    <meta property="og:type" content="article" />`);
    head.append(`\n    <meta property="og:url" content="${canonicalUrl}" />`);
    head.append(`\n    <meta property="og:title" content="${articleTitle}" />`);
    head.append(`\n    <meta property="og:description" content="${siteDescription}" />`);
    head.append(`\n    <meta property="og:site_name" content="Layar Kosong" />`);
    head.append(`\n    <meta property="fb:app_id" content="175216696195384" />`);

    if (twitterImg) {
      head.append(`\n    <meta property="og:image" content="${twitterImg}" />`);
      head.append(`\n    <meta name="twitter:image" content="${twitterImg}" />`);
      head.append(`\n    <meta itemprop="image" content="${twitterImg}" />`);
    }

    head.append(`\n    <meta name="twitter:card" content="summary_large_image" />`);
    head.append(`\n    <meta name="twitter:title" content="${articleTitle}" />`);
    head.append(`\n    <meta name="twitter:description" content="${siteDescription}" />`);
    head.append(`\n    <meta name="twitter:site" content="@frijal" />`);
    head.append(`\n`);

    // --- 5. FIX ALT TEXT GAMBAR ---
    $('img').each((_, el) => {
      if (!$(el).attr('alt')) $(el).attr('alt', articleTitle);
    });

      // --- 6. SIMPAN HASIL ---
      fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer: Mirroring, Canonical (Hardcoded /artikel/), FB App ID, dan Meta Selesai!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
