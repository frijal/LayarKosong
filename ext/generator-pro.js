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
  // Folder template tetap di artikel/-/, tapi outputnya nanti pindah
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
// CORE PROCESSOR (V6.9 - CLEAN URL LANDING PAGE)
// ===================================================================
const generate = async () => {
  console.log('🚀 Memulai Generator V6.9 (Landing Page di Folder Kategori)...');

  try {
    const filesOnDisk = (await fs.readdir(CONFIG.artikelDir)).filter(f => f.endsWith('.html'));
    const masterContent = await fs.readFile(CONFIG.masterJson, 'utf8').catch(() => '{}');
    let grouped = JSON.parse(masterContent);
    const existingFilesMap = new Map(Object.values(grouped).flat().map(item => [item[1], true]));

    // 1. Scan Artikel Baru (Deteksi & Update JSON)
    const newResults = await Promise.all(
      filesOnDisk.filter(f => !existingFilesMap.has(f)).map(async (file) => {
        const content = await fs.readFile(path.join(CONFIG.artikelDir, file), 'utf8');
        const title = extractTitle(content);
        const pubDate = extractPubDate(content) || (await fs.stat(path.join(CONFIG.artikelDir, file))).mtime;
        const category = titleToCategory(title);

        return {
          category: category,
          data: [title, file, extractImage(content, file), formatISO8601(pubDate), extractDesc(content)]
        };
      })
    );

    newResults.forEach(r => {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push(r.data);
    });

    // 2. SMART CLEANING
    // Pastikan kita tidak menghapus 'index.html' di folder kategori nanti (karena itu landing page)
    const validFilesSet = new Set();
    for (const [catName, articles] of Object.entries(grouped)) {
      const catSlug = slugify(catName);
      articles.forEach(art => validFilesSet.add(`${catSlug}/${art[1]}`));
    }

    for (const catSlug of VALID_CATEGORIES) {
      const folderPath = path.join(CONFIG.rootDir, catSlug);
      await fs.mkdir(folderPath, { recursive: true });
      const diskFiles = await fs.readdir(folderPath).catch(() => []);
      for (const file of diskFiles) {
        // Hapus file .html JIKA: bukan index.html DAN tidak terdaftar di JSON
        if (file.endsWith('.html') && file !== 'index.html' && !validFilesSet.has(`${catSlug}/${file}`)) {
          console.log(`🗑️  Menghapus file usang: ${catSlug}/${file}`);
          await fs.unlink(path.join(folderPath, file));
        }
      }
    }

    // 3. DISTRIBUSI ARTIKEL & AUTO-REPAIR HTML
    let allItemsFlat = [];
    const diskSet = new Set(filesOnDisk);

    for (const cat in grouped) {
      const catSlug = slugify(cat);
      grouped[cat] = grouped[cat].filter(item => diskSet.has(item[1]));
      grouped[cat].sort((a, b) => new Date(b[3]) - new Date(a[3]));

      for (const item of grouped[cat]) {
        const fileName = item[1];
        const sourcePath = path.join(CONFIG.artikelDir, fileName);
        const destPath = path.join(CONFIG.rootDir, catSlug, fileName);

        const prettyUrl = `${CONFIG.baseUrl}/${catSlug}/${fileName.replace('.html', '')}/`;
        const canonicalUrl = prettyUrl;

        let content = await fs.readFile(sourcePath, 'utf8');

        // AUTO-FIX CANONICAL & LINKS
        content = content.replace(
          /<link\s+rel=["']canonical["']\s+href=["'][^"']+["']\s*\/?>/i,
          `<link rel="canonical" href="${canonicalUrl}">`
        );
        content = content.replace(
          /<meta\s+property=["']og:url["']\s+content=["'][^"']+["']\s*\/?>/i,
          `<meta property="og:url" content="${canonicalUrl}">`
        );

        // Ganti rujukan /artikel/ ke /kategori/
        const oldUrlPattern = new RegExp(`${CONFIG.baseUrl}/artikel/${fileName.replace('.html','')}`, 'g');
        content = content.replace(oldUrlPattern, canonicalUrl);

        // Hapus link ke landing page lama (/artikel/-/kategori.html) ganti ke (/kategori/)
        content = content.replace(/\/artikel\/-\/([a-z-]+)(\.html)?\/?/g, '/$1/');

        await fs.writeFile(destPath, content);

        allItemsFlat.push({
          title: item[0], file: item[1], img: item[2], lastmod: item[3], desc: item[4], category: cat, loc: canonicalUrl
        });
      }
    }

    allItemsFlat.sort((a, b) => new Date(b.lastmod) - new Date(a.lastmod));

    // 4. GENERATE SITEMAPS (XML)
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

    const xslHeader = `<?xml version="1.0" encoding="UTF-8"?>\n\n<?xml-stylesheet type="text/xsl" href="/${CONFIG.xslLink}"?>\n`;

    const writePromises = [
      fs.writeFile(CONFIG.jsonOut, JSON.stringify(grouped, null, 2)),
      fs.writeFile(CONFIG.xmlIndexOut, `${xslHeader}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${CONFIG.baseUrl}/sitemap-1.xml</loc><lastmod>${allItemsFlat[0].lastmod}</lastmod></sitemap>\n  <sitemap><loc>${CONFIG.baseUrl}/image-sitemap-1.xml</loc><lastmod>${allItemsFlat[0].lastmod}</lastmod></sitemap>\n  <sitemap><loc>${CONFIG.baseUrl}/video-sitemap-1.xml</loc><lastmod>${allItemsFlat[0].lastmod}</lastmod></sitemap>\n</sitemapindex>`),
      fs.writeFile(CONFIG.xmlPostsOut, `${xslHeader}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlPosts}</urlset>`),
      fs.writeFile(CONFIG.xmlImagesOut, `${xslHeader}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${xmlImages}</urlset>`),
      fs.writeFile(CONFIG.xmlVideosOut, `${xslHeader}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${xmlVideos}</urlset>`),
      fs.writeFile(CONFIG.rssOut, buildRss('Layar Kosong', allItemsFlat.slice(0, CONFIG.rssLimit), `${CONFIG.baseUrl}/rss.xml`, `Feed artikel terbaru`))
    ];

    // 5. LANDING PAGE KATEGORI (INDEX.HTML DI FOLDER MASING-MASING)
    const templateHTML = await fs.readFile(CONFIG.templateKategori, 'utf8').catch((err) => {
      console.warn("⚠️ Template kategori tidak ditemukan:", err.message);
      return null;
    });

    if (templateHTML) {
      for (const [cat, articles] of Object.entries(grouped)) {
        const slug = slugify(cat);
        const catItems = allItemsFlat.filter(f => f.category === cat);

        // A. Tulis RSS Kategori (Tetap di root untuk kemudahan akses)
        const rssFilename = `feed-${slug}.xml`;
        const rssUrl = `${CONFIG.baseUrl}/${rssFilename}`;
        writePromises.push(fs.writeFile(path.join(CONFIG.rootDir, rssFilename), buildRss(`${cat} - Layar Kosong`, catItems, rssUrl, `Feed kategori ${cat}`)));

        // B. Tulis HTML Kategori -> /nama-kategori/index.html
        // Ini kuncinya! Kita taruh index.html di dalam folder kategorinya
        const icon = cat.match(/(\p{Emoji})/u)?.[0] || '📁';
        const description = `Kumpulan lengkap artikel, tutorial, dan catatan tentang ${cat}.`;

        // Canonical URL untuk landing page kategori: https://dalam.web.id/gaya-hidup/
        const canonicalCat = `${CONFIG.baseUrl}/${slug}/`;

        let pageContent = templateHTML
        .replace(/%%TITLE%%/g, sanitizeTitle(cat))
        .replace(/%%DESCRIPTION%%/g, description)
        .replace(/%%CATEGORY_NAME%%/g, cat)
        .replace(/%%RSS_URL%%/g, rssUrl)
        .replace(/%%CANONICAL_URL%%/g, canonicalCat)
        .replace(/%%ICON%%/g, icon);

        // Tulis ke: rootDir/gaya-hidup/index.html
        const landingPagePath = path.join(CONFIG.rootDir, slug, 'index.html');
        writePromises.push(fs.writeFile(landingPagePath, pageContent));
      }
    }

    await Promise.all(writePromises);
    console.log('✅ SELESAI! Landing page kategori ada di /folder/index.html (Clean URL).');
  } catch (err) {
    console.error('❌ Error:', err);
  }
};

generate();
