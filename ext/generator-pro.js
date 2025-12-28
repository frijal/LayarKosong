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
  masterJson: path.join(__dirname, '..', 'artikel', 'artikel.json'),
  jsonOut: path.join(__dirname, '..', 'artikel.json'),
  xmlOut: path.join(__dirname, '..', 'sitemap.xml'),
  rssOut: path.join(__dirname, '..', 'rss.xml'),
  baseUrl: 'https://dalam.web.id',
  defaultThumbnail: 'https://dalam.web.id/thumbnail.webp',
  rssLimit: 30
};

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================
const getMimeType = (url) => {
  if (!url) return 'image/jpeg';
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  const map = { 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp', 'avif': 'image/avif' };
  return map[ext] || 'image/jpeg';
};

const formatISO8601 = (date) => {
  const d = new Date(date);
  const tzOffset = -d.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  return d.toISOString().replace('Z', `${diff}${pad(tzOffset / 60)}:${pad(tzOffset % 60)}`);
};

const sanitizeTitle = (raw) => raw.replace(/^\p{Emoji_Presentation}\s*/u, '').trimStart();

// Extractor menggunakan Regex (karena cepat)
const extractTitle = (c) => (c.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Tanpa Judul').trim();
const extractDesc = (c) => (c.match(/<meta\s+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').trim();
const extractPubDate = (c) => c.match(/<meta\s+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i)?.[1];

const extractImage = (content) => {
  const metaImg = content.match(/<meta\s+[^>]*(?:name|property)=["'](?:og|twitter):image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  if (metaImg) return metaImg;
  const imgTag = content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  if (imgTag) return imgTag.startsWith('/') ? `${CONFIG.baseUrl}${imgTag}` : imgTag;
  return CONFIG.defaultThumbnail;
};

// ===================================================================
// CORE PROCESSOR
// ===================================================================
async function processArticleFile(file, existingFiles) {
  if (existingFiles.has(file)) return null;
  const fullPath = path.join(CONFIG.artikelDir, file);
  try {
    const content = await fs.readFile(fullPath, 'utf8');
    const title = extractTitle(content);
    const pubDate = extractPubDate(content) || (await fs.stat(fullPath)).mtime;
    
    return {
      category: titleToCategory(title),
      data: [
        title, 
        file, 
        extractImage(content), 
        formatISO8601(pubDate), 
        extractDesc(content)
      ]
    };
  } catch (e) { return null; }
}

// ===================================================================
// MAIN GENERATOR
// ===================================================================
const generate = async () => {
  console.log('🚀 Memulai Generator Pro (JSON + Sitemap + RSS)...');
  
  const filesOnDisk = (await fs.readdir(CONFIG.artikelDir)).filter(f => f.endsWith('.html'));
  const masterContent = await fs.readFile(CONFIG.masterJson, 'utf8').catch(() => '{}');
  let grouped = JSON.parse(masterContent);
  const existingFilesMap = new Map(Object.values(grouped).flat().map(item => [item[1], true]));

  // 1. Proses Artikel Baru
  const results = await Promise.all(filesOnDisk.filter(f => !existingFilesMap.has(f)).map(f => processArticleFile(f, existingFilesMap)));
  results.filter(r => r !== null).forEach(r => {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r.data);
  });

  // 2. Sorting & Cleaning (Hapus yang filenya sudah tidak ada)
  const diskSet = new Set(filesOnDisk);
  for (const cat in grouped) {
    grouped[cat] = grouped[cat].filter(item => diskSet.has(item[1]));
    grouped[cat].sort((a, b) => new Date(b[3]) - new Date(a[3]));
  }

  // 3. Bangun XML Sitemap & RSS Flat List
  let allItemsFlat = [];
  const sitemapUrls = Object.values(grouped).flat().map(item => {
    const [title, file, img, lastmod, desc] = item;
    const prettyUrl = `${CONFIG.baseUrl}/artikel/${file.replace('.html', '')}`;
    allItemsFlat.push({ title, loc: prettyUrl, img, lastmod, desc, category: Object.keys(grouped).find(k => grouped[k].includes(item)) });
    
    return `  <url>\n    <loc>${prettyUrl}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <image:image><image:loc>${img}</image:loc></image:image>\n  </url>`;
  });

  // 4. Generate RSS (Utama)
  allItemsFlat.sort((a, b) => new Date(b.lastmod) - new Date(a.lastmod));
  const buildRss = (title, items, rssLink) => {
    const itemsXml = items.map(it => `
    <item>
      <title><![CDATA[${it.title}]]></title>
      <link><![CDATA[${it.loc}]]></link>
      <description><![CDATA[${it.desc || sanitizeTitle(it.title)}]]></description>
      <pubDate>${new Date(it.lastmod).toUTCString()}</pubDate>
      <enclosure url="${it.img}" length="0" type="${getMimeType(it.img)}" />
    </item>`).join('');

    return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${title}]]></title>
    <link><![CDATA[${CONFIG.baseUrl}]]></link>
    <atom:link href="${rssLink}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${itemsXml}
  </channel>
</rss>`;
  };

  // 5. Penulisan File Secara Paralel
  const writePromises = [
    fs.writeFile(CONFIG.jsonOut, JSON.stringify(grouped, null, 2)),
    fs.writeFile(CONFIG.xmlOut, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${sitemapUrls.join('')}</urlset>`),
    fs.writeFile(CONFIG.rssOut, buildRss('Layar Kosong', allItemsFlat.slice(0, CONFIG.rssLimit), `${CONFIG.baseUrl}/rss.xml`))
  ];

  // Tambah RSS per Kategori
  for (const [cat, articles] of Object.entries(grouped)) {
    const slug = cat.replace(/[^\w\s]/u, '').trim().toLowerCase().replace(/\s+/g, '-');
    const catItems = articles.map(a => allItemsFlat.find(f => f.loc.includes(a[1].replace('.html',''))));
    writePromises.push(fs.writeFile(path.join(CONFIG.rootDir, `feed-${slug}.xml`), buildRss(`${cat} - Layar Kosong`, catItems, `${CONFIG.baseUrl}/feed-${slug}.xml`)));
  }

  await Promise.all(writePromises);
  console.log('✅ Selesai! JSON, Sitemap, dan Semua Feed RSS diperbarui.');
};

generate();
