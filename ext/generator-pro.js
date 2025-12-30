import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { titleToCategory } from './titleToCategory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  return `${CONFIG.baseUrl}/img/${filename.replace('.html', '')}.webp`;
};

const buildLdJson = (item, categoryName) => {
  const [title, file, img, lastmod, desc] = item;
  const fullUrl = `${CONFIG.baseUrl}/artikel/${file}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "mainEntityOfPage": { "@type": "WebPage", "@id": fullUrl },
        "headline": title,
        "description": desc || sanitizeTitle(title),
        "image": { "@type": "ImageObject", "url": img, "width": 1200, "height": 675 },
        "author": { "@type": "Person", "name": CONFIG.authorName },
        "publisher": {
          "@type": "Organization",
          "name": "Layar Kosong",
          "url": `${CONFIG.baseUrl}/`,
          "logo": { "@type": "ImageObject", "url": CONFIG.publisherLogo, "width": 48, "height": 48 }
        },
        "datePublished": lastmod.split('T')[0],
        "dateModified": new Date().toISOString().split('T')[0]
      }
    ]
  };
  return `\n<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>\n`;
};

async function updateHtmlFilesWithSchema(groupedData) {
  console.log('💉 Injecting LD+JSON...');
  for (const cat in groupedData) {
    for (const article of groupedData[cat]) {
      const fileName = article[1];
      const filePath = path.join(CONFIG.artikelDir, fileName);
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        if (!raw || raw.length < 10) continue;
        const ld = buildLdJson(article, cat);
        let c = raw.replace(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/gi, '');
        c = c.replace(//gi, '');
        const mStyle = c.match(/<style[^>]*>/i);
        const mHead = c.match(/<\/head>/i);
        let out = '';
        if (mStyle) {
          out = c.replace(mStyle[0], `\n${ld}\n${mStyle[0]}`);
        } else if (mHead) {
          out = c.replace(mHead[0], `\n${ld}\n${mHead[0]}`);
        } else {
          out = ld + "\n" + c;
        }
        if (out && out.length > 50) {
          await fs.writeFile(filePath, out, 'utf8');
          console.log(`✅ Updated: ${fileName}`);
        }
      } catch (e) {
        console.error(`❌ Error ${fileName}: ${e.message}`);
      }
    }
  }
}

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

const generate = async () => {
  console.log('🚀 Running Generator...');
  try {
    const filesOnDisk = (await fs.readdir(CONFIG.artikelDir)).filter(f => f.endsWith('.html'));
    const masterContent = await fs.readFile(CONFIG.masterJson, 'utf8').catch(() => '{}');
    let grouped = JSON.parse(masterContent);
    const existingFilesMap = new Map(Object.values(grouped).flat().map(item => [item[1], true]));
    const results = await Promise.all(filesOnDisk.filter(f => !existingFilesMap.has(f)).map(f => processArticleFile(f, existingFilesMap)));
    results.filter(r => r !== null).forEach(r => {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push(r.data);
    });
    const diskSet = new Set(filesOnDisk);
    for (const cat in grouped) {
      grouped[cat] = grouped[cat].filter(item => diskSet.has(item[1]));
      grouped[cat].sort((a, b) => new Date(b[3]) - new Date(a[3]));
    }
    await fs.writeFile(CONFIG.jsonOut, JSON.stringify(grouped, null, 2));
    await updateHtmlFilesWithSchema(grouped);
    console.log('✅ Done!');
  } catch (err) {
    console.error('❌ Fatal:', err);
    process.exit(1);
  }
};

generate();
