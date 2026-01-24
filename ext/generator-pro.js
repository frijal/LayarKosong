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
  kategoriDir: path.join(__dirname, '..', 'artikel', '-'),
  templateKategori: path.join(__dirname, '..', 'artikel', '-', 'template-kategori.html'),
  masterJson: path.join(__dirname, '..', 'artikel', 'artikel.json'),
  jsonOut: path.join(__dirname, '..', 'artikel.json'),
  
  // Output Sitemaps
  xmlIndexOut: path.join(__dirname, '..', 'sitemap.xml'),      // Induk
  xmlPostsOut: path.join(__dirname, '..', 'sitemap-1.xml'),    // Artikel
  xmlImagesOut: path.join(__dirname, '..', 'image-sitemap.xml'),
  xmlVideosOut: path.join(__dirname, '..', 'video-sitemap.xml'),
  
  xslLink: 'sitemap-style.xsl',
  rssOut: path.join(__dirname, '..', 'rss.xml'),
  baseUrl: 'https://dalam.web.id',
  rssLimit: 30
};

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
  return d.toISOString();
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
  const videoTags = [...content.matchAll(/<video[^>]+src=["']([^"']+)["']/gi)];
  
  [...iframes, ...videoTags].forEach(m => {
    const src = m[1];
    videos.push({
      loc: src,
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
// CORE PROCESSOR
// ===================================================================
const generate = async () => {
  console.log('🚀 Memulai Generator Pro V3 (Full Sitemaps & RSS)...');

  try {
    const filesOnDisk = (await fs.readdir(CONFIG.artikelDir)).filter(f => f.endsWith('.html'));
    const masterContent = await fs.readFile(CONFIG.masterJson, 'utf8').catch(() => '{}');
    let grouped = JSON.parse(masterContent);
    const existingFilesMap = new Map(Object.values(grouped).flat().map(item => [item[1], true]));

    // 1. Proses Artikel Baru
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

    // 2. Sorting & Cleaning
    const diskSet = new Set(filesOnDisk);
    let allItemsFlat = [];
    for (const cat in grouped) {
      grouped[cat] = grouped[cat].filter(item => diskSet.has(item[1]));
      grouped[cat].sort((a, b) => new Date(b[3]) - new Date(a[3]));
      grouped[cat].forEach(item => {
        allItemsFlat.push({ title: item[0], file: item[1], img: item[2], lastmod: item[3], desc: item[4], category: cat });
      });
    }
    allItemsFlat.sort((a, b) => new Date(b.lastmod) - new Date(a.lastmod));

    // 3. Build XML Content
    let xmlPosts = '';
    let xmlImages = '';
    let xmlVideos = '';

    for (const item of allItemsFlat) {
      const prettyUrl = `${CONFIG.baseUrl}/artikel/${item.file.replace('.html', '')}`;
      
      // Artikel Sitemap
      xmlPosts += `  <url>\n    <loc>${prettyUrl}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n  </url>\n`;
      
      // Image Sitemap
      xmlImages += `  <url>\n    <loc>${prettyUrl}</loc>\n    <image:image>\n      <image:loc>${item.img}</image:loc>\n      <image:caption><![CDATA[${item.title}]]></image:caption>\n    <lastmod>${item.lastmod}</lastmod>\n     </image:image>\n  </url>\n`;

      // Video Sitemap
      const content = await fs.readFile(path.join(CONFIG.artikelDir, item.file), 'utf8');
      const videos = extractVideos(content, item.title, item.desc);
      if (videos.length > 0) {
        xmlVideos += `  <url>\n    <loc>${prettyUrl}</loc>\n`;
        videos.forEach(v => {
          xmlVideos += `    <video:video>\n      <video:thumbnail_loc>${v.thumbnail}</video:thumbnail_loc>\n      <video:title><![CDATA[${v.title}]]></video:title>\n      <video:description><![CDATA[${v.description}]]></video:description>\n      <video:player_loc>${v.loc}</video:player_loc>\n    </video:video>\n`;
        });
        xmlVideos += `  </url>\n`;
      }
    }

    // 4. Penulisan File
    const xslHeaderMain = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/${CONFIG.xslLink}"?>\n`;

    const writePromises = [
      fs.writeFile(CONFIG.jsonOut, JSON.stringify(grouped, null, 2)),

      // Sitemap Index
      fs.writeFile(CONFIG.xmlIndexOut, `${xslHeaderMain}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${CONFIG.baseUrl}/sitemap-1.xml</loc><lastmod>${allItemsFlat[0].lastmod}</lastmod></sitemap>\n  <sitemap><loc>${CONFIG.baseUrl}/image-sitemap.xml</loc><lastmod>${allItemsFlat[0].lastmod}</lastmod></sitemap>\n  <sitemap><loc>${CONFIG.baseUrl}/video-sitemap.xml</loc><lastmod>${allItemsFlat[0].lastmod}</lastmod></sitemap>\n</sitemapindex>`),

      // Sub-Sitemaps (Sekarang juga pakai xslHeaderMain)
      fs.writeFile(CONFIG.xmlPostsOut, `${xslHeaderMain}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlPosts}</urlset>`),
      fs.writeFile(CONFIG.xmlImagesOut, `${xslHeaderMain}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${xmlImages}</urlset>`),
      fs.writeFile(CONFIG.xmlVideosOut, `${xslHeaderMain}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${xmlVideos}</urlset>`),

      // RSS Utama
      fs.writeFile(CONFIG.rssOut, buildRss('Layar Kosong', allItemsFlat.slice(0, CONFIG.rssLimit), `${CONFIG.baseUrl}/rss.xml`, `Feed ${CONFIG.rssLimit} artikel terbaru`))
    ];

    // RSS & HTML Kategori
    const templateHTML = await fs.readFile(CONFIG.templateKategori, 'utf8').catch(() => null);

    for (const [cat, articles] of Object.entries(grouped)) {
      const slug = slugify(cat);
      const catItems = allItemsFlat.filter(f => f.category === cat);
      const cleanTitle = cat.replace(/^\p{Emoji_Presentation}\s*/u, '').trim();
      
      writePromises.push(fs.writeFile(path.join(CONFIG.rootDir, `feed-${slug}.xml`), buildRss(`${cat} - Layar Kosong`, catItems, `${CONFIG.baseUrl}/feed-${slug}.xml`, `Feed artikel terbaru untuk kategori ${cat}`)));

      if (templateHTML) {
        const icon = cat.match(/(\p{Emoji})/u)?.[0] || '📁';
        const pageContent = templateHTML
          .replace(/%%TITLE%%/g, cat.replace(/^\p{Emoji_Presentation}\s*/u, ''))
          .replace(/%%DESCRIPTION%%/g, `Topik ${cleanTitle} - Kumpulan artikel terbaru di Layar Kosong`)
          .replace(/%%CATEGORY_NAME%%/g, cat)
          .replace(/%%RSS_URL%%/g, `${CONFIG.baseUrl}/feed-${slug}.xml`)
          .replace(/%%CANONICAL_URL%%/g, `${CONFIG.baseUrl}/artikel/-/${slug}`)
          .replace(/%%ICON%%/g, icon);
        writePromises.push(fs.writeFile(path.join(CONFIG.kategoriDir, `${slug}.html`), pageContent));
      }
    }

    await Promise.all(writePromises);
    console.log('✅ Selesai! Sitemap Index, Image, Video, RSS, dan Kategori telah diperbarui.');
  } catch (err) {
    console.error('❌ Error:', err);
  }
};

generate();
