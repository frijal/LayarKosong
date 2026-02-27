import { Glob } from "bun";
import { load } from 'cheerio';
import path from 'path';
import sharp from 'sharp';

// --- HELPER UTILS ---
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

// --- CORE FUNCTIONS ---

async function mirrorAndConvert(externalUrl, baseUrl) {
  try {
    const url = new URL(externalUrl);
    const baseHostname = new URL(baseUrl).hostname;

    // Filter Internal atau URL Skema
    if (url.hostname === baseHostname || url.hostname === 'localhost' || url.hostname === 'schema.org') {
      return externalUrl.replace(baseUrl, '');
    }

    const ext = path.extname(url.pathname).toLowerCase();
    const isSvg = ext === '.svg';
    const finalExt = isSvg ? '.svg' : '.webp';

    // Path Management Lokal
    const localPathName = ext ? url.pathname.replace(ext, finalExt) : `${url.pathname}${finalExt}`;
    const localPath = path.join('img', url.hostname, localPathName);

    // Bun.file check jauh lebih cepat
    const fileTarget = Bun.file(localPath);
    if (await fileTarget.exists()) return `/${localPath.replace(/\\/g, '/')}`;

    // Download pakai Fetch Native Bun (Ganti Axios)
    const response = await fetch(externalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) throw new Error('Download Gagal');

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isSvg) {
      await Bun.write(localPath, buffer);
    } else {
      // Pastikan folder ada (Bun.write otomatis bikin folder, tapi Sharp butuh foldernya ada)
      const dirPath = path.dirname(localPath);
      await $`mkdir -p ${dirPath}`; // Gunakan Shell Bun buat kilat
      await sharp(buffer).webp({ quality: 85 }).toFile(localPath);
    }

    return `/${localPath.replace(/\\/g, '/')}`;
  } catch (err) {
    return externalUrl;
  }
}

async function processFile(file, baseUrl) {
  const rawContent = await Bun.file(file).text();
  const baseName = path.basename(file);
  console.log(`🚀 SEO Turbo: ${baseName}`);

  const $ = load(rawContent, { decodeEntities: false });
  const head = $('head');

  // 1. MIRRORING GAMBAR DALAM BODY (Paralel di dalam file)
  const imgPromises = $('img').toArray().map(async (el) => {
    const src = $(el).attr('src');
    if (src && src.startsWith('http')) {
      const localPath = await mirrorAndConvert(src, baseUrl);
      if (localPath.startsWith('/')) $(el).attr('src', `${baseUrl}${localPath}`);
    }
  });
  await Promise.all(imgPromises);

  // 2. LOGIKA DATA SEO
  const articleTitle = $('title').text().split(' - ')[0].trim() || 'Layar Kosong';
  const escapedTitle = escapeHtmlAttr(articleTitle);

  // Ambil deskripsi yang ada (jika ada)
  let rawMetaDesc = $('meta[name="description"], meta[property="description"]').attr('content') || '';
  let rawOgDesc = $('meta[property="og:description"]').attr('content') || '';
  let rawTwitterDesc = $('meta[name="twitter:description"]').attr('content') || '';

  // Cadangan dari paragraf pertama
  const firstP = $('p').first().text().trim();
  const fallback = firstP ? prepareDesc(firstP.substring(0, 160)) : 'Layar Kosong - Catatan dan Opini.';

  // Tentukan deskripsi terbaik (pilih yang tidak kosong, atau gunakan fallback)
  const bestMeta = rawMetaDesc || rawOgDesc || rawTwitterDesc || fallback;

  // Definisikan variabel yang dibutuhkan oleh metaTags
  const finalMetaDesc = prepareDesc(rawMetaDesc || bestMeta);
  const finalOgDesc = prepareDesc(rawOgDesc || bestMeta);
  const finalTwitterDesc = prepareDesc(rawTwitterDesc || bestMeta);



  const cleanFileName = baseName.replace('.html', '');
  const canonicalUrl = `${baseUrl}/artikel/${cleanFileName}`.replace(/\/$/, '');

  const firstP = $('p').first().text().trim();
  const fallback = firstP ? prepareDesc(firstP.substring(0, 160)) : 'Layar Kosong - Catatan dan Opini.';

  const rawMetaDesc = $('meta[name="description"]').attr('content') || '';
  const finalMetaDesc = prepareDesc(rawMetaDesc || fallback);

  let metaImgUrl = $('meta[property="og:image"]').attr('content') || $('img').first().attr('src') || '';
  if (metaImgUrl && metaImgUrl.startsWith('http')) {
    const mirroredPath = await mirrorAndConvert(metaImgUrl, baseUrl);
    if (mirroredPath.startsWith('/')) metaImgUrl = `${baseUrl}${mirroredPath}`;
  }

  // 3. BERSIHKAN & SUNTIK ULANG (Gaya Ringan)
  $('html').attr('lang', 'id').attr('prefix', 'og: https://ogp.me/ns# article: https://ogp.me/ns/article#');

  // Hapus tag lama
  $('link[rel="canonical"], link[rel="icon"], meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]').remove();

  // --- 4. SUNTIK ULANG (Metode Array Join - Lebih Cepat) ---
  const metaTags = [
    `<meta property="og:locale" content="id_ID">`,
    `<meta property="og:site_name" content="Layar Kosong">`,
    `<link rel="icon" href="/favicon.ico">`,
    `<link rel="manifest" href="/site.webmanifest">`,
    `<link rel="canonical" href="${canonicalUrl}">`,
    `<meta property="og:url" content="${canonicalUrl}">`,
    `<meta property="twitter:url" content="${canonicalUrl}">`,
    `<meta property="twitter:domain" content="https://dalam.web.id">`,
    `<meta property="og:title" content="${escapedTitle}">`,
    `<meta name="twitter:title" content="${escapedTitle}">`,
    `<meta property="og:type" content="article">`,
    `<meta name="theme-color" content="#00b0ed">`,
    `<meta name="robots" content="index, follow, max-image-preview:large">`,
    `<meta name="author" content="Fakhrul Rijal">`,
    `<meta name="description" content="${finalMetaDesc}">`,
    `<meta property="og:description" content="${finalOgDesc}">`,
    `<meta name="twitter:description" content="${finalTwitterDesc}">`,
    `<link rel="license" href="https://creativecommons.org/publicdomain/zero/1.0/">`,
    `<meta name="twitter:creator" content="@responaja">`,
    `<meta name="bluesky:creator" content="@dalam.web.id">`,
    `<meta name="fediverse:creator" content="@frijal@mastodon.social">`,
    `<meta name="googlebot" content="max-image-preview:large">`,
    `<meta name="twitter:site" content="@responaja">`,
    `<meta property="article:author" content="https://facebook.com/frijal">`,
    `<meta property="article:publisher" content="https://facebook.com/frijalpage">`,
    `<meta property="fb:app_id" content="175216696195384">`
  ];

  // Tambahkan Meta Gambar jika ada
  if (metaImgUrl) {
    metaTags.push(
      `<meta itemprop="image" content="${metaImgUrl}">`,
      `<meta name="twitter:image" content="${metaImgUrl}">`,
      `<meta property="twitter:image" content="${metaImgUrl}">`,
      `<meta property="og:image" content="${metaImgUrl}">`,
      `<meta property="og:image:alt" content="${escapedTitle}">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="675">`,
      `<meta name="twitter:card" content="summary_large_image">`
    );
  }

  // Tambahkan Tags artikel
  existingTags.forEach(tag => {
    metaTags.push(`<meta property="article:tag" content="${tag}">`);
  });

  // Tambahkan Time Metadata
  if (publishedTime) metaTags.push(`<meta property="article:published_time" content="${publishedTime}">`);
  if (modifiedTime) metaTags.push(`<meta property="article:modified_time" content="${modifiedTime}">`);

  // SUNTIK SEKALI JALAN! 🚀
  head.append('\n    ' + metaTags.join('\n    ') + '\n');

  // 4. BODY FIXES
  $('img').each((_, el) => {
    if (!$(el).attr('alt')) $(el).attr('alt', articleTitle);
  });

  // Simpan pakai Bun.write
  await Bun.write(file, $.html());
}

async function fixSEO() {
  const targetFolder = process.argv[2] || 'artikel';
  const baseUrl = 'https://dalam.web.id';

  console.log('🧼 Memulai SEO Fixer (Bun Paralel Mode)...');
  const startTime = Bun.nanoseconds();

  const glob = new Glob(`${targetFolder}/*.html`);
  const files = [];
  for await (const file of glob.scan(".")) {
    files.push(file);
  }

  // Proses semua file secara paralel (Batasi kalau ribuan file agar tidak OOM)
  await Promise.all(files.map(file => processFile(file, baseUrl)));

  const duration = (Bun.nanoseconds() - startTime) / 1e9;
  console.log(`\n✅ Selesai dalam ${duration.toFixed(2)} detik!`);
}

fixSEO().catch(err => console.error(err));
