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
  masterJson: path.join(__dirname, '..', 'artikel', 'artikel.json'),
  jsonOut: path.join(__dirname, '..', 'artikel.json'),
  sitemapTxt: path.join(__dirname, '..', 'sitemap.txt'),

  xmlIndexOut: path.join(__dirname, '..', 'sitemap.xml'),
  xmlPostsOut: path.join(__dirname, '..', 'sitemap-1.xml'),
  xmlImagesOut: path.join(__dirname, '..', 'image-sitemap-1.xml'),
  xmlVideosOut: path.join(__dirname, '..', 'video-sitemap-1.xml'),

  xslLink: 'sitemap-style.xsl',
  rssOut: path.join(__dirname, '..', 'rss.xml'),
  baseUrl: 'https://dalam.web.id',
  rssLimit: 30
};

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
  const iframes = [...content.matchAll(/<iframe[^+]+src=["']([^"']+)["']/gi)];
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
// CORE PROCESSOR V8.6 (TIERED GATEWAY MODE)
// ===================================================================
const generate = async () => {
  console.log('🚀 Memulai Generator V8.6 (Tiered Gateway: Ultra Efisien)...');

  try {
    // PREPARASI DATA
    const etalaseRaw = await fs.readFile(CONFIG.jsonOut, 'utf8').catch(() => '{}');
    const etalaseData = JSON.parse(etalaseRaw);

    const sitemapContent = await fs.readFile(CONFIG.sitemapTxt, 'utf8').catch(() => '');
    const processedUrls = new Set(sitemapContent.split('\n').map(l => l.trim()).filter(l => l));

    const masterRaw = await fs.readFile(CONFIG.masterJson, 'utf8').catch(() => '{}');
    const masterData = JSON.parse(masterRaw);

    const filesOnDisk = (await fs.readdir(CONFIG.artikelDir)).filter(f => f.endsWith('.html'));

    let finalRootData = {};
    let allItemsFlat = [];
    let globalProcessedFiles = new Set();
    let validFilesForCleaning = new Set();

    // PEKERJAAN BERTINGKAT
    for (const file of filesOnDisk) {
      let articleData = null;
      let category = null;

      // --- GATE 1: CEK ETALASE (artikel.json Root) ---
      for (const [cat, items] of Object.entries(etalaseData)) {
        const found = items.find(it => it[1] === file);
        if (found) {
          articleData = found;
          category = cat;
          break;
        }
      }

      if (articleData) {
        const catSlug = slugify(category);
        const finalUrl = `${CONFIG.baseUrl}/${catSlug}/${file.replace('.html', '')}`;

        // --- GATE 2: CEK CACHE (sitemap.txt) ---
        // Jika data ada di etalase DAN url ada di sitemap, kita anggap SELESAI.
        if (processedUrls.has(finalUrl)) {
          if (!finalRootData[category]) finalRootData[category] = [];
          finalRootData[category].push(articleData);
          allItemsFlat.push({ title: articleData[0], file, img: articleData[2], lastmod: articleData[3], desc: articleData[4], category, loc: finalUrl });
          validFilesForCleaning.add(`${catSlug}/${file}`);
          globalProcessedFiles.add(file);
          continue; // << Lolos Gerbang 1 & 2, langsung skip ke file berikutnya.
        }
      }

      // --- GATE 3: CEK MASTER (artikel/artikel.json) ---
      // Hanya dijalankan jika Gate 1/2 gagal (file baru atau belum terdaftar di cache)
      let foundInMaster = false;
      for (const [cat, items] of Object.entries(masterData)) {
        const found = items.find(it => it[1] === file);
        if (found) {
          const catSlug = slugify(cat);
          const finalUrl = `${CONFIG.baseUrl}/${catSlug}/${file.replace('.html', '')}`;

          console.log(`♻️  Gate 3 (Master): Mendistribusikan ${file}`);
          await processAndDistribute(file, cat, finalUrl);

          if (!finalRootData[cat]) finalRootData[cat] = [];
          finalRootData[cat].push(found);
          allItemsFlat.push({ title: found[0], file, img: found[2], lastmod: found[3], desc: found[4], category: cat, loc: finalUrl });
          processedUrls.add(finalUrl);
          validFilesForCleaning.add(`${catSlug}/${file}`);
          globalProcessedFiles.add(file);
          foundInMaster = true;
          break;
        }
      }
      if (foundInMaster) continue;

      // --- GATE 4: AUTO-DISCOVERY (Bongkar File) ---
      // Upaya terakhir jika benar-benar file asing.
      console.log(`✨ Gate 4 (Discovery): Memproses file baru ${file}`);
      const content = await fs.readFile(path.join(CONFIG.artikelDir, file), 'utf8');
      const title = extractTitle(content);
      const cat = titleToCategory(title);
      const catSlug = slugify(cat);
      const finalUrl = `${CONFIG.baseUrl}/${catSlug}/${file.replace('.html', '')}`;

      const pubDate = extractPubDate(content) || (await fs.stat(path.join(CONFIG.artikelDir, file))).mtime;
      const newData = [title, file, extractImage(content, file), formatISO8601(pubDate), extractDesc(content)];

      await processAndDistribute(file, cat, finalUrl, content);

      if (!finalRootData[cat]) finalRootData[cat] = [];
      finalRootData[cat].push(newData);
      allItemsFlat.push({ title, file, img: newData[2], lastmod: newData[3], desc: newData[4], category: cat, loc: finalUrl });
      processedUrls.add(finalUrl);
      validFilesForCleaning.add(`${catSlug}/${file}`);
      globalProcessedFiles.add(file);
    }

    // SMART CLEANING
    for (const catSlug of VALID_CATEGORIES) {
      const folderPath = path.join(CONFIG.rootDir, catSlug);
      await fs.mkdir(folderPath, { recursive: true });
      const diskFiles = await fs.readdir(folderPath).catch(() => []);
      for (const file of diskFiles) {
        if (file.endsWith('.html') && file !== 'index.html' && !validFilesForCleaning.has(`${catSlug}/${file}`)) {
          console.log(`🗑️  Menghapus file usang: ${catSlug}/${file}`);
          await fs.unlink(path.join(folderPath, file));
          const urlToRemove = `${CONFIG.baseUrl}/${catSlug}/${file.replace('.html', '')}`;
          processedUrls.delete(urlToRemove);
        }
      }
    }

    // SORTING & SAVING
    allItemsFlat.sort((a, b) => new Date(b.lastmod) - new Date(a.lastmod));
    for (const cat in finalRootData) finalRootData[cat].sort((a, b) => new Date(b[3]) - new Date(a[3]));
    await fs.writeFile(CONFIG.sitemapTxt, Array.from(processedUrls).sort().join('\n'));
    await fs.writeFile(CONFIG.jsonOut, JSON.stringify(finalRootData, null, 2));

    // GENERATE XML SITEMAPS & RSS
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

    // LANDING PAGE KATEGORI
    const templateHTML = await fs.readFile(CONFIG.templateKategori, 'utf8').catch(() => null);
    if (templateHTML) {
      for (const [cat, articles] of Object.entries(finalRootData)) {
        const slug = slugify(cat);
        const rssUrl = `${CONFIG.baseUrl}/feed-${slug}.xml`;
        await fs.writeFile(path.join(CONFIG.rootDir, `feed-${slug}.xml`), buildRss(`${cat} - Layar Kosong`, allItemsFlat.filter(f => f.category === cat), rssUrl, `Feed kategori ${cat}`));
        const icon = cat.match(/(\p{Emoji})/u)?.[0] || '📁';
        const pageContent = templateHTML.replace(/%%TITLE%%/g, sanitizeTitle(cat)).replace(/%%DESCRIPTION%%/g, `Kumpulan lengkap artikel tentang ${cat}.`).replace(/%%CATEGORY_NAME%%/g, cat).replace(/%%RSS_URL%%/g, rssUrl).replace(/%%CANONICAL_URL%%/g, `${CONFIG.baseUrl}/${slug}`).replace(/%%ICON%%/g, icon);
        await fs.writeFile(path.join(CONFIG.rootDir, slug, 'index.html'), pageContent);
      }
    }

    console.log(`✅ SELESAI! Semua Gate terlampaui, landing page aman, performa optimal.`);
  } catch (err) { console.error('❌ Error Fatal:', err); }
};

async function processAndDistribute(file, category, finalUrl, preloadedContent = null) {
  const catSlug = slugify(category);
  const destFolder = path.join(CONFIG.rootDir, catSlug);
  await fs.mkdir(destFolder, { recursive: true });
  let content = preloadedContent || await fs.readFile(path.join(CONFIG.artikelDir, file), 'utf8');
  content = content.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']+["']\s*\/?>/i, `<link rel="canonical" href="${finalUrl}">`).replace(/<meta\s+property=["']og:url["']\s+content=["'][^"']+["']\s*\/?>/i, `<meta property="og:url" content="${finalUrl}">`);
  content = content.replace(new RegExp(`${CONFIG.baseUrl}/artikel/${file.replace('.html', '')}`, 'g'), finalUrl);
  content = content.replace(/\/artikel\/-\/([a-z-]+)(\.html)?\/?/g, '/$1');
  await fs.writeFile(path.join(destFolder, file), content);
}

generate();
