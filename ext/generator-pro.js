import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { titleToCategory } from './titleToCategory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================================================================
// KONFIGURASI TERPUSAT - FIXED BASEURL & XSL
// ===================================================================
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  artikelDir: path.join(__dirname, '..', 'artikel'),
  kategoriDir: path.join(__dirname, '..', 'artikel', '-'),
  templateKategori: path.join(__dirname, '..', 'artikel', '-', 'template-kategori.html'),
  masterJson: path.join(__dirname, '..', 'artikel', 'artikel.json'),
  jsonOut: path.join(__dirname, '..', 'artikel.json'),

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
// HELPER FUNCTIONS (ORIGINAL RESTORED)
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
// EXTRACTORS (ORIGINAL RESTORED)
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
// RSS BUILDER (ORIGINAL RESTORED)
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
// CORE PROCESSOR (ENHANCED WITH SMART SYNC)
// ===================================================================
const generate = async () => {
  console.log('🚀 Memulai Generator Pro V6.5 (The Master Script)...');

  try {
    const filesOnDisk = (await fs.readdir(CONFIG.artikelDir)).filter(f => f.endsWith('.html'));
    const masterContent = await fs.readFile(CONFIG.masterJson, 'utf8').catch(() => '{}');
    let grouped = JSON.parse(masterContent);
    const existingFilesMap = new Map(Object.values(grouped).flat().map(item => [item[1], true]));

    // 1. Scan Artikel Baru (Menggunakan titleToCategory)
    const newResults = await Promise.all(
      filesOnDisk.filter(f => !existingFilesMap.has(f)).map(async (file) => {
        const content = await fs.readFile(path.join(CONFIG.artikelDir, file), 'utf8');
        const title = extractTitle(content);
        const pubDate = extractPubDate(content) || (await fs.stat(path.join(CONFIG.artikelDir, file))).mtime;
        return {
          category: titleToCategory(title),
          data: [title, file, extractImage(content, file), formatISO8601(pubDate), extractDesc(content)]
        };
      })
    );

    newResults.forEach(r => {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push(r.data);
    });

    // 2. Smart Cleaning & Physical Mirroring
    const validFilesSet = new Set();
    for (const [catName, articles] of Object.entries(grouped)) {
      const catSlug = slugify(catName);
      articles.forEach(art => validFilesSet.add(`${catSlug}/${art[1]}`));
    }

    // Cleaning file sampah di folder kategori
    for (const catSlug of VALID_CATEGORIES) {
      const folderPath = path.join(CONFIG.rootDir, catSlug);
      await fs.mkdir(folderPath, { recursive: true });
      const diskFiles = await fs.readdir(folderPath);
      for (const file of diskFiles) {
        if (file.endsWith('.html') && !validFilesSet.has(`${catSlug}/${file}`)) {
          console.log(`🗑️ Menghapus file usang: ${catSlug}/${file}`);
          await fs.unlink(path.join(folderPath, file));
        }
      }
    }

    // 3. Sorting, URL Formatting & Physical Copy
    let allItemsFlat = [];
    const diskSet = new Set(filesOnDisk);

    for (const cat in grouped) {
      const catSlug = slugify(cat);
      grouped[cat] = grouped[cat].filter(item => diskSet.has(item[1]));
      grouped[cat].sort((a, b) => new Date(b[3]) - new Date(a[3]));

      for (const item of grouped[cat]) {
        // Pindah file fisik ke folder kategori
        const sourcePath = path.join(CONFIG.artikelDir, item[1]);
        const destPath = path.join(CONFIG.rootDir, catSlug, item[1]);

        const content = await fs.readFile(sourcePath, 'utf8');
        await fs.writeFile(destPath, content);

        // URL Baru (Pretty URL tanpa /artikel/)
        const loc = `${CONFIG.baseUrl}/${catSlug}/${item[1].replace('.html', '')}/`;
        allItemsFlat.push({ title: item[0], file: item[1], img: item[2], lastmod: item[3], desc: item[4], category: cat, loc: loc });
      }
    }
    allItemsFlat.sort((a, b) => new Date(b.lastmod) - new Date(a.lastmod));

    // 4. Build XML Content (Including Video)
    let xmlPosts = '';
    let xmlImages = '';
    let xmlVideos = '';

    for (const item of allItemsFlat) {
      xmlPosts += `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n  </url>\n`;
      xmlImages += `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n    <image:image>\n      <image:loc>${item.img}</image:loc>\n      <image:caption><![CDATA[${item.title}]]></image:caption>\n    </image:image>\n  </url>\n`;

      const content = await fs.readFile(path.join(CONFIG.artikelDir, item.file), 'utf8');
      const vids = extractVideos(content, item.title, item.desc).filter(v => v.loc && !v.loc.includes('${'));
      vids.forEach(v => {
        xmlVideos += `  <url>\n    <loc>${item.loc}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n    <video:video>\n      <video:thumbnail_loc>${v.thumbnail}</video:thumbnail_loc>\n      <video:title><![CDATA[${v.title}]]></video:title>\n      <video:description><![CDATA[${v.description}]]></video:description>\n      <video:player_loc>${v.loc.replace(/&/g, '&amp;')}</video:player_loc>\n    </video:video>\n  </url>\n`;
      });
    }

    // 5. Penulisan Akhir (XSL & RSS Terjaga)
    const xslHeader = `<?xml version="1.0" encoding="UTF-8"?>\n\n<?xml-stylesheet type="text/xsl" href="/${CONFIG.xslLink}"?>\n`;

    const writePromises = [
      fs.writeFile(CONFIG.jsonOut, JSON.stringify(grouped, null, 2)),
      fs.writeFile(CONFIG.xmlIndexOut, `${xslHeader}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${CONFIG.baseUrl}/sitemap-1.xml</loc><lastmod>${allItemsFlat[0].lastmod}</lastmod></sitemap>\n  <sitemap><loc>${CONFIG.baseUrl}/image-sitemap-1.xml</loc><lastmod>${allItemsFlat[0].lastmod}</lastmod></sitemap>\n  <sitemap><loc>${CONFIG.baseUrl}/video-sitemap-1.xml</loc><lastmod>${allItemsFlat[0].lastmod}</lastmod></sitemap>\n</sitemapindex>`),
      fs.writeFile(CONFIG.xmlPostsOut, `${xslHeader}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlPosts}</urlset>`),
      fs.writeFile(CONFIG.xmlImagesOut, `${xslHeader}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${xmlImages}</urlset>`),
      fs.writeFile(CONFIG.xmlVideosOut, `${xslHeader}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${xmlVideos}</urlset>`),
      fs.writeFile(CONFIG.rssOut, buildRss('Layar Kosong', allItemsFlat.slice(0, CONFIG.rssLimit), `${CONFIG.baseUrl}/rss.xml`, `Feed artikel terbaru`))
    ];

    // RSS Per Kategori & Template HTML Kategori (Fitur V5)
    const templateHTML = await fs.readFile(CONFIG.templateKategori, 'utf8').catch(() => null);
    for (const [cat, articles] of Object.entries(grouped)) {
      const slug = slugify(cat);
      const catItems = allItemsFlat.filter(f => f.category === cat);
      writePromises.push(fs.writeFile(path.join(CONFIG.rootDir, `feed-${slug}.xml`), buildRss(`${cat} - Layar Kosong`, catItems, `${CONFIG.baseUrl}/feed-${slug}.xml`, `Feed kategori ${cat}`)));

      if (templateHTML) {
        const icon = cat.match(/(\p{Emoji})/u)?.[0] || '📁';
        const pageContent = templateHTML
        .replace(/%%TITLE%%/g, sanitizeTitle(cat))
        .replace(/%%CATEGORY_NAME%%/g, cat)
        .replace(/%%RSS_URL%%/g, `${CONFIG.baseUrl}/feed-${slug}.xml`)
        .replace(/%%CANONICAL_URL%%/g, `${CONFIG.baseUrl}/artikel/-/${slug}`)
        .replace(/%%ICON%%/g, icon);
        writePromises.push(fs.writeFile(path.join(CONFIG.kategoriDir, `${slug}.html`), pageContent));
      }
    }

    await Promise.all(writePromises);
    console.log('✅ SELESAI! Folder kategori sinkron fisik, Video Sitemap OK, RSS OK. Joss!');
  } catch (err) {
    console.error('❌ Error:', err);
  }
};

generate();
