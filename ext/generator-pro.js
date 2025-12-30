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
  rssLimit: 30,
  authorName: "Fakhrul Rijal",
  publisherLogo: "https://dalam.web.id/logo.png"
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

  const allImgs = content.match(/<img[^>]+src=["']([^"']+)["']/gi);
  if (allImgs) {
    for (const tag of allImgs) {
      const src = tag.match(/src=["']([^"']+)["']/i)?.[1];
      if (src && !/favicon|icon|logo|loading|spacer/i.test(src)) {
        return src.startsWith('/') ? `${CONFIG.baseUrl}${src}` : src;
      }
    }
  }
  return `${CONFIG.baseUrl}/img/${filename.replace('.html', '')}.webp`;
};

// ===================================================================
// SCHEMA GENERATOR (LD+JSON)
// ===================================================================
const buildLdJson = (item, categoryName) => {
  const [title, file, img, lastmod, desc] = item;
  const fullUrl = `${CONFIG.baseUrl}/artikel/${file}`;
  const categorySlug = slugify(categoryName);
  
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "mainEntityOfPage": { "@type": "WebPage", "@id": fullUrl },
        "headline": title,
        "description": desc || sanitizeTitle(title),
        "image": {
          "@type": "ImageObject",
          "url": img,
          "width": 1200,
          "height": 675
        },
        "author": { "@type": "Person", "name": CONFIG.authorName },
        "publisher": {
          "@type": "Organization",
          "name": "Layar Kosong",
          "url": `${CONFIG.baseUrl}/`,
          "logo": {
            "@type": "ImageObject",
            "url": CONFIG.publisherLogo,
            "width": 48,
            "height": 48
          }
        },
        "datePublished": lastmod.split('T')[0],
        "dateModified": new Date().toISOString().split('T')[0]
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Beranda", "item": `${CONFIG.baseUrl}/` },
          { 
            "@type": "ListItem", 
            "position": 2, 
            "name": categoryName, 
            "item": `${CONFIG.baseUrl}/artikel/-/${categorySlug}/` 
          },
          { "@type": "ListItem", "position": 3, "name": sanitizeTitle(title) }
        ]
      }
    ]
  };

  return `<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>
`;
};

// ===================================================================
// HTML UPDATER (INJECTOR) - ANTI DUPLIKASI
// ===================================================================
async function updateHtmlFilesWithSchema(groupedData) {
  console.log('💉 Membersihkan dan menyuntikkan LD+JSON baru...');

  for (const [category, articles] of Object.entries(groupedData)) {
    for (const article of articles) {
      const fileName = article[1];
      const filePath = path.join(CONFIG.artikelDir, fileName);

      try {
        const rawContent = await fs.readFile(filePath, 'utf8');
        if (!rawContent) continue;

        const ldJson = buildLdJson(article, category);

        // 1. REGEX PEMBERSIH
        const regexLdJson = /<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/gi;
        const regexComments = //gi;

        // Ganti nama variabel dari 'newContent' ke 'updatedHtml' untuk hindari reserved word issue
        let updatedHtml = rawContent.replace(regexLdJson, '');
        updatedHtml = updatedHtml.replace(regexComments, '');

        // 2. STRATEGI PENYUNTIKAN
        const regexStyle = /<style[^>]*>/i;
        const regexHeadEnd = /<\/head>/i;

        if (regexStyle.test(updatedHtml)) {
          updatedHtml = updatedHtml.replace(regexStyle, (match) => `\n${ldJson}\n${match}`);
        } else if (regexHeadEnd.test(updatedHtml)) {
          updatedHtml = updatedHtml.replace(regexHeadEnd, (match) => `\n${ldJson}\n${match}`);
        } else {
          updatedHtml = `${ldJson}\n${updatedHtml}`;
        }

        // Simpan hanya jika konten tidak rusak (tetap ada isinya)
        if (updatedHtml && updatedHtml.trim().length > 0) {
          await fs.writeFile(filePath, updatedHtml, 'utf8');
          console.log(`✅ Updated: ${fileName}`);
        }
      } catch (err) {
        console.error(`❌ Gagal proses ${fileName}:`, err.message);
      }
    }
  }
}

// ===================================================================
// CORE PROCESSOR (READ ONLY)
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
      data: [title, file, extractImage(content, file), formatISO8601(pubDate), extractDesc(content)]
    };
  } catch (e) { return null; }
}

// ===================================================================
// MAIN GENERATOR
// ===================================================================
const generate = async () => {
  console.log('🚀 Memulai Generator Pro + Schema Injector...');
  
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

  // 2. Sorting & Cleaning
  const diskSet = new Set(filesOnDisk);
  for (const cat in grouped) {
    grouped[cat] = grouped[cat].filter(item => diskSet.has(item[1]));
    grouped[cat].sort((a, b) => new Date(b[3]) - new Date(a[3]));
  }

  // 3. Bangun XML Sitemap & RSS
  let allItemsFlat = [];
  const sitemapUrls = Object.values(grouped).flat().map(item => {
    const [title, file, img, lastmod, desc] = item;
    const prettyUrl = `${CONFIG.baseUrl}/artikel/${file.replace('.html', '')}`;
    allItemsFlat.push({ title, loc: prettyUrl, img, lastmod, desc, category: Object.keys(grouped).find(k => grouped[k].includes(item)) });
    return `  <url>\n    <loc>${prettyUrl}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <image:image><image:loc>${img}</image:loc></image:image>\n  </url>`;
  });

  // 4. Generate RSS
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
    return `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title><![CDATA[${title}]]></title>\n    <link><![CDATA[${CONFIG.baseUrl}]]></link>\n    <atom:link href="${rssLink}" rel="self" type="application/rss+xml" />\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n    ${itemsXml}\n  </channel>\n</rss>`;
  };

  // 5. Penulisan File Data (JSON, Sitemap, RSS)
  const writePromises = [
    fs.writeFile(CONFIG.jsonOut, JSON.stringify(grouped, null, 2)),
    fs.writeFile(CONFIG.xmlOut, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${sitemapUrls.join('')}</urlset>`),
    fs.writeFile(CONFIG.rssOut, buildRss('Layar Kosong', allItemsFlat.slice(0, CONFIG.rssLimit), `${CONFIG.baseUrl}/rss.xml`))
  ];

  for (const [cat, articles] of Object.entries(grouped)) {
    const slug = slugify(cat);
    const catItems = articles.map(a => allItemsFlat.find(f => f.loc.includes(a[1].replace('.html',''))));
    writePromises.push(fs.writeFile(path.join(CONFIG.rootDir, `feed-${slug}.xml`), buildRss(`${cat} - Layar Kosong`, catItems, `${CONFIG.baseUrl}/feed-${slug}.xml`)));
  }
  await Promise.all(writePromises);

  // 6. JALANKAN INJECTOR SCHEMA KE HTML
  await updateHtmlFilesWithSchema(grouped);

  console.log('✅ Selesai! Semua data dan file HTML telah diperbarui dengan aman.');
};

generate();
