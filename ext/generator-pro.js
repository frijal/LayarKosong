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
  xmlOut: path.join(__dirname, '..', 'sitemap.xml'),
  rssOut: path.join(__dirname, '..', 'rss.xml'),
  baseUrl: 'https://dalam.web.id',
  rssLimit: 30
};

// ===================================================================
// HELPER FUNCTIONS (Warisan Script Lama & Baru)
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
  .replace(/^[^\w\s]*/u, '') // Hapus emoji awal (dari script lama)
  .replace(/ & /g, '-and-')
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');
};

const formatISO8601 = (date) => {
  const d = new Date(date);
  const tzOffset = -d.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  return d.toISOString().replace('Z', `${diff}${pad(tzOffset / 60)}:${pad(tzOffset % 60)}`);
};

// Extractors
const extractTitle = (c) => (c.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Tanpa Judul').trim();
const extractDesc = (c) => (c.match(/<meta\s+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').trim();
const extractPubDate = (c) => c.match(/<meta\s+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i)?.[1];

const extractImage = (content, filename) => {
  const socialImg = content.match(/<meta\s+[^>]*(?:name|property)=["'](?:og|twitter):image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  if (socialImg) return socialImg;
  return `${CONFIG.baseUrl}/img/${filename.replace('.html', '')}.webp`;
};

// ===================================================================
// RSS BUILDER (Sesuai Standar Mas Rijal)
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
  console.log('🚀 Memulai Generator Pro V3 (RSS Legacy Compatible)...');

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
    for (const cat in grouped) {
      grouped[cat] = grouped[cat].filter(item => diskSet.has(item[1]));
      grouped[cat].sort((a, b) => new Date(b[3]) - new Date(a[3]));
    }

    // 3. Persiapan Data (Pretty URLs)
    let allItemsFlat = [];
    const sitemapUrls = Object.values(grouped).flat().map(item => {
      const [title, file, img, lastmod, desc] = item;
      const category = Object.keys(grouped).find(k => grouped[k].includes(item));
      const prettyUrl = `${CONFIG.baseUrl}/artikel/${file.replace('.html', '')}`;

      allItemsFlat.push({ title, loc: prettyUrl, img, lastmod, desc, category });
      return `  <url>\n    <loc>${prettyUrl}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <image:image><image:loc>${img}</image:loc></image:image>\n  </url>`;
    });

    allItemsFlat.sort((a, b) => new Date(b.lastmod) - new Date(a.lastmod));

    // 4. Penulisan File
    const writePromises = [
      fs.writeFile(CONFIG.jsonOut, JSON.stringify(grouped, null, 2)),
      fs.writeFile(CONFIG.xmlOut, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${sitemapUrls.join('')}</urlset>`),
      fs.writeFile(CONFIG.rssOut, buildRss('Layar Kosong', allItemsFlat.slice(0, CONFIG.rssLimit), `${CONFIG.baseUrl}/rss.xml`, `Feed ${CONFIG.rssLimit} artikel terbaru`))
    ];

    // RSS & HTML Kategori
    const templateHTML = await fs.readFile(CONFIG.templateKategori, 'utf8').catch(() => null);

    for (const [cat, articles] of Object.entries(grouped)) {
      const slug = slugify(cat);
      const catItems = allItemsFlat.filter(f => f.category === cat);
      const cleanTitle = cat.replace(/^\p{Emoji_Presentation}\s*/u, '').trim();
      // RSS Kategori
      writePromises.push(fs.writeFile(path.join(CONFIG.rootDir, `feed-${slug}.xml`), buildRss(`${cat} - Layar Kosong`, catItems, `${CONFIG.baseUrl}/feed-${slug}.xml`, `Feed artikel terbaru untuk kategori ${cat}`)));

      // HTML Kategori
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
    console.log('✅ Berhasil! Menggabungkan memori lama dan fitur baru.');
  } catch (err) {
    console.error('❌ Error:', err);
  }
};

generate();
