import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { titleToCategory } from './titleToCategory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================================================================
// KONFIGURASI TERPUSAT
// ===================================================================
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  artikelDir: path.join(__dirname, '..', 'artikel'),
  templateKategori: path.join(__dirname, '..', 'artikel', '-', 'template-kategori.html'),
  masterJson: path.join(__dirname, '..', 'artikel', 'artikel.json'), // Source (Read-Only)
  jsonOut: path.join(__dirname, '..', 'artikel.json'),               // Output (Etalase)
  sitemapTxt: path.join(__dirname, '..', 'sitemap.txt'),            // Cache System

  // Output Sitemaps
  xmlIndexOut: path.join(__dirname, '..', 'sitemap.xml'),
  xmlPostsOut: path.join(__dirname, '..', 'sitemap-1.xml'),
  xmlImagesOut: path.join(__dirname, '..', 'image-sitemap-1.xml'),
  xmlVideosOut: path.join(__dirname, '..', 'video-sitemap-1.xml'),

  xslLink: 'sitemap-style.xsl',
  rssOut: path.join(__dirname, '..', 'rss.xml'),
  baseUrl: 'https://dalam.web.id',
  rssLimit: 30
};

// Daftar Kategori Fisik
const VALID_CATEGORIES = [
  'gaya-hidup', 'jejak-sejarah', 'lainnya', 'olah-media',
'opini-sosial', 'sistem-terbuka', 'warta-tekno'
];

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================
const getMimeType = (url) => {
  if (!url) return 'image/jpeg';
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  const map = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
    'gif': 'image/gif', 'webp': 'image/webp', 'avif': 'image/avif', 'svg': 'image/svg+xml'
  };
  return map[ext] || 'image/jpeg';
};

const sanitizeTitle = (raw) => raw.replace(/^\p{Emoji_Presentation}\s*/u, '').trimStart();

const slugify = (text) => {
  return text.toString().toLowerCase().trim()
  .replace(/^[^\w\s]*/u, '')
  .replace(/ & /g, '-and-')
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');
};

const formatISO8601 = (date) => {
  const d = new Date(date);
  return d.toISOString().split('.')[0] + 'Z';
};

const getYoutubeThumb = (url) => {
  const match = url.match(/embed\/([^/?]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
};

// ===================================================================
// EXTRACTORS
// ===================================================================
const extractTitle = (c) => (c.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Tanpa Judul').trim();
const extractDesc = (c) => (c.match(/<meta\s+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').trim();
const extractPubDate = (c) => c.match(/<meta\s+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i)?.[1];
const extractImage = (content, filename) => {
  const socialImg = content.match(/<meta\s+[^>]*(?:name|property)=["'](?:og|twitter):image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  return socialImg || `${CONFIG.baseUrl}/img/${filename.replace('.html', '')}.webp`;
};

const extractVideos = (content, title, desc) => {
  const videos = [];
  const iframes = [...content.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)];
  iframes.forEach(m => {
    let src = m[1];
    if (src.startsWith('//')) src = 'https:' + src;
      const cleanSrc = src.split('?')[0];
    videos.push({
      loc: cleanSrc,
      title: title,
      description: desc || `Video dari ${title}`,
      thumbnail: getYoutubeThumb(src) || `${CONFIG.baseUrl}/img/default-video.webp`
    });
  });
  return videos;
};

// ===================================================================
// RSS BUILDER
// ===================================================================
const buildRss = (title, items, rssLink, description) => {
  const itemsXml = items.map(it => {
    const mimeType = getMimeType(it.img);
    return `
    <item>
    <title><![CDATA[${it.title}]]></title>
    <link><![CDATA[${it.loc}]]></link>
    <guid><![CDATA[${it.loc}]]></guid>
    <description><![CDATA[${it.desc || sanitizeTitle(it.title)}]]></description>
    <pubDate>${new Date(it.lastmod).toUTCString()}</pubDate>
    <category><![CDATA[${it.category}]]></category>
    <enclosure url="${it.img}" length="0" type="${mimeType}" />
    </item>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
  <title><![CDATA[${title}]]></title>
  <link><![CDATA[${CONFIG.baseUrl}/]]></link>
  <description><![CDATA[${description}]]></description>
  <language>id-ID</language>
  <atom:link href="${rssLink}" rel="self" type="application/rss+xml" />
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${itemsXml}
  </channel>
  </rss>`;
};

// ===================================================================
// CORE PROCESSOR V8.2 (HYBRID GUARDIAN)
// ===================================================================
const generate = async () => {
  console.log('🚀 Memulai Generator V8.2 (Hybrid Mode: Efisien & Protektif)...');

  try {
    // 1. Baca Cache (Sitemap.txt) & Master JSON
    const sitemapContent = await fs.readFile(CONFIG.sitemapTxt, 'utf8').catch(() => '');
    const processedUrls = new Set(sitemapContent.split('\n').map(l => l.trim()).filter(l => l !== ''));

    const masterRaw = await fs.readFile(CONFIG.masterJson, 'utf8').catch(() => '{}');
    const masterData = JSON.parse(masterRaw);

    // 2. Scan File di Disk
    const filesOnDisk = (await fs.readdir(CONFIG.artikelDir)).filter(f => f.endsWith('.html'));
    const diskSet = new Set(filesOnDisk);

    let finalRootData = {};
    let allItemsFlat = [];
    let processedFilesSet = new Set();
    let validFilesForCleaning = new Set();

    // 3. PROSES DATA DARI MASTER (Read-Only)
    for (const [category, articles] of Object.entries(masterData)) {
      const catSlug = slugify(category);
      for (const art of articles) {
        const fileName = art[1];
        if (diskSet.has(fileName)) {
          const finalUrl = `${CONFIG.baseUrl}/${catSlug}/${fileName.replace('.html', '')}/`;

          if (!finalRootData[category]) finalRootData[category] = [];
          finalRootData[category].push(art);

          processedFilesSet.add(fileName);
          validFilesForCleaning.add(`${catSlug}/${fileName}`);
          allItemsFlat.push({ title: art[0], file: fileName, img: art[2], lastmod: art[3], desc: art[4], category, loc: finalUrl });

          // Cek Cache: Hanya proses HTML jika belum pernah atau ada perubahan
          if (!processedUrls.has(finalUrl)) {
            console.log(`♻️  Mendistribusikan artikel master: ${fileName}`);
            await processAndDistribute(fileName, category, finalUrl);
            processedUrls.add(finalUrl);
          }
        }
      }
    }

    // 4. AUTO-DISCOVERY (File baru yang belum ada di Master)
    for (const file of filesOnDisk) {
      if (!processedFilesSet.has(file)) {
        console.log(`✨ Menemukan file baru: ${file}`);
        const content = await fs.readFile(path.join(CONFIG.artikelDir, file), 'utf8');
        const title = extractTitle(content);
        const category = titleToCategory(title);
        const catSlug = slugify(category);
        const finalUrl = `${CONFIG.baseUrl}/${catSlug}/${file.replace('.html', '')}/`;

        const pubDate = extractPubDate(content) || (await fs.stat(path.join(CONFIG.artikelDir, file))).mtime;
        const newData = [title, file, extractImage(content, file), formatISO8601(pubDate), extractDesc(content)];

        if (!finalRootData[category]) finalRootData[category] = [];
        finalRootData[category].push(newData);

        validFilesForCleaning.add(`${catSlug}/${file}`);
        processedUrls.add(finalUrl);
        await processAndDistribute(file, category, finalUrl, content);

        allItemsFlat.push({ title, file, img: newData[2], lastmod: newData[3], desc: newData[4], category, loc: finalUrl });
      }
    }

    // 5. SMART CLEANING (Proteksi index.html)
    for (const catSlug of VALID_CATEGORIES) {
      const folderPath = path.join(CONFIG.rootDir, catSlug);
      await fs.mkdir(folderPath, { recursive: true });
      const diskFiles = await fs.readdir(folderPath).catch(() => []);

      for (const file of diskFiles) {
        // HANYA hapus file .html yang BUKAN index.html dan tidak ada di data valid
        if (file.endsWith('.html') && file !== 'index.html' && !validFilesForCleaning.has(`${catSlug}/${file}`)) {
          console.log(`🗑️  Menghapus file usang: ${catSlug}/${file}`);
          await fs.unlink(path.join(folderPath, file));
          const urlToRemove = `${CONFIG.baseUrl}/${catSlug}/${file.replace('.html', '')}/`;
          processedUrls.delete(urlToRemove);
        }
      }
    }

    // 6. SORTING & SAVING (Sesuai Logika V7.1)
    allItemsFlat.sort((a, b) => new Date(b.lastmod) - new Date(a.lastmod));
    for (const cat in finalRootData) finalRootData[cat].sort((a, b) => new Date(b[3]) - new Date(a[3]));

    // Update Cache (sitemap.txt) & Root JSON
    await fs.writeFile(CONFIG.sitemapTxt, Array.from(processedUrls).sort().join('\n'));
    await fs.writeFile(CONFIG.jsonOut, JSON.stringify(finalRootData, null, 2));

    // 7. GENERATE XML SITEMAPS & RSS
    let xmlPosts = '', xmlImages = '', xmlVideos = '';
    for (const item of allItemsFlat) {
      xmlPosts += `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n  </url>\n`;
      xmlImages += `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n    <image:image>\n      <image:loc>${item.img}</image:loc>\n      <image:caption><![CDATA[${item.title}]]></image:caption>\n    </image:image>\n  </url>\n`;

      const content = await fs.readFile(path.join(CONFIG.artikelDir, item.file), 'utf8');
      const vids = extractVideos(content, item.title, item.desc).filter(v => v.loc && !v.loc.includes('${'));
      vids.forEach(v => {
        xmlVideos += `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n    <video:video>\n      <video:thumbnail_loc>${v.thumbnail}</video:thumbnail_loc>\n      <video:title><![CDATA[${v.title}]]></video:title>\n      <video:description><![CDATA[${v.description}]]></video:description>\n      <video:player_loc>${v.loc.replace(/&/g, '&amp;')}</video:player_loc>\n    </video:video>\n  </url>\n`;
      });
    }

    const xslHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/${CONFIG.xslLink}"?>\n`;
    const latestMod = allItemsFlat[0]?.lastmod || formatISO8601(new Date());

    await fs.writeFile(CONFIG.xmlIndexOut, `${xslHeader}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${CONFIG.baseUrl}/sitemap-1.xml</loc><lastmod>${latestMod}</lastmod></sitemap>\n  <sitemap><loc>${CONFIG.baseUrl}/image-sitemap-1.xml</loc><lastmod>${latestMod}</lastmod></sitemap>\n  <sitemap><loc>${CONFIG.baseUrl}/video-sitemap-1.xml</loc><lastmod>${latestMod}</lastmod></sitemap>\n</sitemapindex>`);
    await fs.writeFile(CONFIG.xmlPostsOut, `${xslHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlPosts}</urlset>`);
    await fs.writeFile(CONFIG.xmlImagesOut, `${xslHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${xmlImages}</urlset>`);
    await fs.writeFile(CONFIG.xmlVideosOut, `${xslHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${xmlVideos}</urlset>`);
    await fs.writeFile(CONFIG.rssOut, buildRss('Layar Kosong', allItemsFlat.slice(0, CONFIG.rssLimit), `${CONFIG.baseUrl}/rss.xml`, `Feed artikel terbaru`));

    // 8. LANDING PAGE KATEGORI (Clean URL Logic V6.9)
    const templateHTML = await fs.readFile(CONFIG.templateKategori, 'utf8').catch(() => null);
    if (templateHTML) {
      for (const [cat, articles] of Object.entries(finalRootData)) {
        const slug = slugify(cat);
        const catItems = allItemsFlat.filter(f => f.category === cat);
        const rssUrl = `${CONFIG.baseUrl}/feed-${slug}.xml`;

        // RSS Kategori
        await fs.writeFile(path.join(CONFIG.rootDir, `feed-${slug}.xml`), buildRss(`${cat} - Layar Kosong`, catItems, rssUrl, `Feed kategori ${cat}`));

        // index.html Kategori (Landing Page)
        const icon = cat.match(/(\p{Emoji})/u)?.[0] || '📁';
        const pageContent = templateHTML
        .replace(/%%TITLE%%/g, sanitizeTitle(cat))
        .replace(/%%DESCRIPTION%%/g, `Kumpulan lengkap artikel tentang ${cat}.`)
        .replace(/%%CATEGORY_NAME%%/g, cat)
        .replace(/%%RSS_URL%%/g, rssUrl)
        .replace(/%%CANONICAL_URL%%/g, `${CONFIG.baseUrl}/${slug}/`)
        .replace(/%%ICON%%/g, icon);

        await fs.writeFile(path.join(CONFIG.rootDir, slug, 'index.html'), pageContent);
      }
    }

    console.log(`✅ SELESAI! Root JSON terupdate, Landing Page aman, Master tetap Suci.`);

  } catch (err) {
    console.error('❌ Error Fatal:', err);
  }
};

// Helper untuk Distribusi & Perbaikan HTML
async function processAndDistribute(file, category, finalUrl, preloadedContent = null) {
  const catSlug = slugify(category);
  const destFolder = path.join(CONFIG.rootDir, catSlug);
  await fs.mkdir(destFolder, { recursive: true });

  let content = preloadedContent || await fs.readFile(path.join(CONFIG.artikelDir, file), 'utf8');

  // Fix Canonical & OG URL
  content = content.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']+["']\s*\/?>/i, `<link rel="canonical" href="${finalUrl}">`)
  .replace(/<meta\s+property=["']og:url["']\s+content=["'][^"']+["']\s*\/?>/i, `<meta property="og:url" content="${finalUrl}">`);

  // Fix Internal Paths (Logika V6.9)
  const fileNameOnly = file.replace('.html', '');
  const oldUrlPattern = new RegExp(`${CONFIG.baseUrl}/artikel/${fileNameOnly}`, 'g');
  content = content.replace(oldUrlPattern, finalUrl);
  content = content.replace(/\/artikel\/-\/([a-z-]+)(\.html)?\/?/g, '/$1/');

  await fs.writeFile(path.join(destFolder, file), content);
}

generate();
