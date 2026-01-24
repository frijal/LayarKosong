import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { titleToCategory } from './titleToCategory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================================================================
// KONFIGURASI TERPUSAT (Update: Tambah file sitemap baru)
// ===================================================================
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  artikelDir: path.join(__dirname, '..', 'artikel'),
  kategoriDir: path.join(__dirname, '..', 'artikel', '-'),
  templateKategori: path.join(__dirname, '..', 'artikel', '-', 'template-kategori.html'),
  masterJson: path.join(__dirname, '..', 'artikel', 'artikel.json'),
  jsonOut: path.join(__dirname, '..', 'artikel.json'),
  
  // Perubahan nama file sitemap
  xmlIndexOut: path.join(__dirname, '..', 'sitemap.xml'),      // Master Index
  xmlPostsOut: path.join(__dirname, '..', 'sitemap-1.xml'),    // Daftar Artikel
  xmlImagesOut: path.join(__dirname, '..', 'image-sitemap.xml'), 
  xmlVideosOut: path.join(__dirname, '..', 'video-sitemap.xml'),
  
  xslLink: 'sitemap-index.xsl',
  rssOut: path.join(__dirname, '..', 'rss.xml'),
  baseUrl: 'https://dalam.web.id',
  rssLimit: 30
};

// ===================================================================
// HELPER FUNCTIONS (Update: Video Extractor)
// ===================================================================
const getYoutubeThumb = (url) => {
  const match = url.match(/embed\/([^/?]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
};

const extractVideos = (content, title, desc) => {
  const videos = [];
  const iframeMatch = [...content.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)];
  const videoTagMatch = [...content.matchAll(/<video[^>]+src=["']([^"']+)["']/gi)];
  
  [...iframeMatch, ...videoTagMatch].forEach(m => {
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

// Helper standar kamu tetap di sini (getMimeType, sanitizeTitle, slugify, dll)
const getMimeType = (url) => { /* ... (sama seperti punyamu) */ };
const sanitizeTitle = (raw) => raw.replace(/^\p{Emoji_Presentation}\s*/u, '').trimStart();
const formatISO8601 = (date) => new Date(date).toISOString(); // Lebih simpel untuk sitemap
const extractTitle = (c) => (c.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Tanpa Judul').trim();
const extractDesc = (c) => (c.match(/<meta\s+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').trim();
const extractPubDate = (c) => c.match(/<meta\s+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i)?.[1];
const extractImage = (content, filename) => {
  const socialImg = content.match(/<meta\s+[^>]*(?:name|property)=["'](?:og|twitter):image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  return socialImg || `${CONFIG.baseUrl}/img/${filename.replace('.html', '')}.webp`;
};

// ===================================================================
// CORE PROCESSOR
// ===================================================================
const generate = async () => {
  console.log('🚀 Memulai Generator Pro V3 (Sitemap Index & Video Support)...');

  try {
    const filesOnDisk = (await fs.readdir(CONFIG.artikelDir)).filter(f => f.endsWith('.html'));
    const masterContent = await fs.readFile(CONFIG.masterJson, 'utf8').catch(() => '{}');
    let grouped = JSON.parse(masterContent);
    const existingFilesMap = new Map(Object.values(grouped).flat().map(item => [item[1], true]));

    // 1. Proses Artikel & Ekstrak Video
    const newResults = await Promise.all(
      filesOnDisk.filter(f => !existingFilesMap.has(f)).map(async (file) => {
        const content = await fs.readFile(path.join(CONFIG.artikelDir, file), 'utf8');
        const title = extractTitle(content);
        const desc = extractDesc(content);
        const pubDate = extractPubDate(content) || (await fs.stat(path.join(CONFIG.artikelDir, file))).mtime;
        
        return {
          category: titleToCategory(title),
          data: [title, file, extractImage(content, file), formatISO8601(pubDate), desc]
        };
      })
    );

    newResults.forEach(r => {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push(r.data);
    });

    // Cleaning & Sorting
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

    // 2. Build Content for Each Sitemap
    let xmlPosts = '';
    let xmlImages = '';
    let xmlVideos = '';

    for (const item of allItemsFlat) {
      const prettyUrl = `${CONFIG.baseUrl}/artikel/${item.file.replace('.html', '')}`;
      
      // Post & Image Sitemap
      xmlPosts += `  <url>\n    <loc>${prettyUrl}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n  </url>\n`;
      xmlImages += `  <url>\n    <loc>${prettyUrl}</loc>\n    <image:image>\n      <image:loc>${item.img}</image:loc>\n      <image:caption><![CDATA[${item.title}]]></image:caption>\n    </image:image>\n  </url>\n`;

      // Video Sitemap (Perlu baca ulang file untuk deteksi video tag)
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

    // 3. Write Files with XSL Styling
    const xslHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/${CONFIG.xslLink}"?>\n`;
    
    const writePromises = [
      // Sitemap Index (Master)
      fs.writeFile(CONFIG.xmlIndexOut, `${xslHeader}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap><loc>${CONFIG.baseUrl}/sitemap-1.xml</loc><lastmod>${allItemsFlat[0].lastmod}</lastmod></sitemap>
        <sitemap><loc>${CONFIG.baseUrl}/image-sitemap.xml</loc><lastmod>${allItemsFlat[0].lastmod}</lastmod></sitemap>
        <sitemap><loc>${CONFIG.baseUrl}/video-sitemap.xml</loc><lastmod>${allItemsFlat[0].lastmod}</lastmod></sitemap>
      </sitemapindex>`),

      // Sub-Sitemaps
      fs.writeFile(CONFIG.xmlPostsOut, `${xslHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlPosts}</urlset>`),
      fs.writeFile(CONFIG.xmlImagesOut, `${xslHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${xmlImages}</urlset>`),
      fs.writeFile(CONFIG.xmlVideosOut, `${xslHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${xmlVideos}</urlset>`),

      // Data & RSS tetap sama
      fs.writeFile(CONFIG.jsonOut, JSON.stringify(grouped, null, 2)),
      // ... tambahkan buildRss dan kategori loop kamu di sini ...
    ];

    await Promise.all(writePromises);
    console.log('✅ Gahar Bosku! Sitemap Index, Gambar, dan Video sudah siap.');
  } catch (err) {
    console.error('❌ Error:', err);
  }
};

generate();
