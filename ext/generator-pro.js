import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { titleToCategory } from './titleToCategory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================================================================
// KONFIGURASI TERPUSAT
// ==================================================================
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  artikelDir: path.join(__dirname, '..', 'artikel'),
  kategoriDir: path.join(__dirname, '..', 'artikel', '-'), // Folder kategori
  templateKategori: path.join(__dirname, '..', 'artikel', '-', 'template-kategori.html'),
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

const slugify = (text) => {
  return text.toString().toLowerCase().trim()
  .replace(/\s+/g, '-')
  .replace(/[^\w\-]+/g, '')
  .replace(/\-\-+/g, '-');
};

const extractTitle = (c) => (c.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Tanpa Judul').trim();
const extractDesc = (c) => (c.match(/<meta\s+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').trim();
const extractPubDate = (c) => c.match(/<meta\s+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i)?.[1];

const extractImage = (content, filename) => {
  const socialImg = content.match(/<meta\s+[^>]*(?:name|property)=["'](?:og|twitter):image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  if (socialImg) return socialImg;
  const baseName = filename.replace('.html', '');
  return `${CONFIG.baseUrl}/img/${baseName}.webp`;
};

// ===================================================================
// GENERATOR HALAMAN KATEGORI (.HTML)
// ===================================================================
async function generateCategoryPages(groupedData) {
  console.log('📂 Generasi halaman kategori HTML...');
  try {
    const templateContent = await fs.readFile(CONFIG.templateKategori, 'utf8');

    for (const categoryName in groupedData) {
      const cleanName = categoryName.replace(/^\p{Emoji_Presentation}\s*/u, '').trim();
      const slug = slugify(cleanName);
      const fileName = `${slug}.html`;
      const icon = categoryName.match(/(\p{Emoji})/u)?.[0] || '📁';

      const pageContent = templateContent
      .replace(/%%TITLE%%/g, cleanName)
      .replace(/%%CATEGORY_NAME%%/g, categoryName)
      .replace(/%%DESCRIPTION%%/g, `Kumpulan artikel seputar ${cleanName}`)
      .replace(/%%CANONICAL_URL%%/g, `${CONFIG.baseUrl}/artikel/-/${fileName}`)
      .replace(/%%ICON%%/g, icon)
      .replace(/%%RSS_URL%%/g, `${CONFIG.baseUrl}/feed-${slug}.xml`);

      await fs.writeFile(path.join(CONFIG.kategoriDir, fileName), pageContent, 'utf8');
      console.log(`   ✅ Kategori: ${fileName}`);
    }
  } catch (err) {
    console.error('   ❌ Gagal membuat halaman kategori:', err.message);
  }
}

// ===================================================================
// MAIN GENERATOR
// ===================================================================
const generate = async () => {
  console.log('🚀 Memulai Generator Pro + Kategori...');

  try {
    const filesOnDisk = (await fs.readdir(CONFIG.artikelDir)).filter(f => f.endsWith('.html'));
    const masterContent = await fs.readFile(CONFIG.masterJson, 'utf8').catch(() => '{}');
    let grouped = JSON.parse(masterContent);
    const existingFilesMap = new Map(Object.values(grouped).flat().map(item => [item[1], true]));

    // 1. Proses Artikel Baru secara Paralel
    const results = await Promise.all(
      filesOnDisk.filter(f => !existingFilesMap.has(f)).map(async (file) => {
        const fullPath = path.join(CONFIG.artikelDir, file);
        const content = await fs.readFile(fullPath, 'utf8');
        const title = extractTitle(content);
        const pubDate = extractPubDate(content) || (await fs.stat(fullPath)).mtime;
        return {
          category: titleToCategory(title),
          data: [title, file, extractImage(content, file), formatISO8601(pubDate), extractDesc(content)]
        };
      })
    );

    results.forEach(r => {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push(r.data);
    });

    // 2. Cleaning & Sorting
    const diskSet = new Set(filesOnDisk);
    for (const cat in grouped) {
      grouped[cat] = grouped[cat].filter(item => diskSet.has(item[1]));
      grouped[cat].sort((a, b) => new Date(b[3]) - new Date(a[3]));
    }

    // 3. Persiapan Data untuk Sitemap & RSS
    let allItemsFlat = [];
    const sitemapUrls = Object.values(grouped).flat().map(item => {
      const [title, file, img, lastmod, desc] = item;
      const prettyUrl = `${CONFIG.baseUrl}/artikel/${file.replace('.html', '')}`;
      allItemsFlat.push({ title, loc: prettyUrl, img, lastmod, desc, category: Object.keys(grouped).find(k => grouped[k].includes(item)) });
      return `  <url>\n    <loc>${prettyUrl}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <image:image><image:loc>${img}</image:loc></image:image>\n  </url>`;
    });

    allItemsFlat.sort((a, b) => new Date(b.lastmod) - new Date(a.lastmod));

    // 4. RSS Builder Function
    const buildRss = (title, items, rssLink) => {
      const itemsXml = items.map(it => `
      <item>
      <title><![CDATA[${it.title}]]></title>
      <link><![CDATA[${it.loc}]]></link>
      <description><![CDATA[${it.desc || sanitizeTitle(it.title)}]]></description>
      <pubDate>${new Date(it.lastmod).toUTCString()}</pubDate>
      <enclosure url="${it.img}" length="0" type="${getMimeType(it.img)}" />
      </item>`).join('');

      return `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title><![CDATA[${title}]]></title>\n    <link><![CDATA[${CONFIG.baseUrl}]]></link>\n    <atom:link href="${rssLink}" rel="self" type="application/rss+xml" />\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n    ${itemsXml}\n  </channel>\n</rss>`;
    };

    // 5. Eksekusi Penulisan File (Paralel)
    const writePromises = [
      fs.writeFile(CONFIG.jsonOut, JSON.stringify(grouped, null, 2)),
      fs.writeFile(CONFIG.xmlOut, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${sitemapUrls.join('')}</urlset>`),
      fs.writeFile(CONFIG.rssOut, buildRss('Layar Kosong', allItemsFlat.slice(0, CONFIG.rssLimit), `${CONFIG.baseUrl}/rss.xml`)),
      generateCategoryPages(grouped) // Bikin HTML kategori
    ];

    // Tambahkan Feed RSS Kategori ke antrean tulis
    for (const [cat, articles] of Object.entries(grouped)) {
      const slug = slugify(cat);
      const catItems = articles.map(a => allItemsFlat.find(f => f.loc.includes(a[1].replace('.html','')))).filter(Boolean);
      writePromises.push(fs.writeFile(path.join(CONFIG.rootDir, `feed-${slug}.xml`), buildRss(`${cat} - Layar Kosong`, catItems, `${CONFIG.baseUrl}/feed-${slug}.xml`)));
    }

    await Promise.all(writePromises);
    console.log('✅ Selesai! JSON, Sitemap, RSS, dan Halaman Kategori HTML telah diperbarui.');

  } catch (err) {
    console.error('❌ Fatal:', err);
    process.exit(1);
  }
};

generate();
