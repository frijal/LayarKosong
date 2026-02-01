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
// CORE PROCESSOR V7.1 (HYBRID - EFFICIENT & COMPLETE)
// ===================================================================
const generate = async () => {
  console.log('🚀 Memulai Generator V7.1 (Hybrid Mode)...');

  try {
    // 1. BACA SITEMAP.TX SEBAGAI CACHE
    const sitemapContent = await fs.readFile(CONFIG.sitemapTxt, 'utf8').catch(() => '');
    const processedUrls = new Set(sitemapContent.split('\n').map(line => line.trim()).filter(line => line !== ''));

    // 2. SCAN ARTIKEL DI DISK
    const filesOnDisk = (await fs.readdir(CONFIG.artikelDir)).filter(f => f.endsWith('.html'));

    // 3. MUAT/INISIALISASI JSON
    const masterContent = await fs.readFile(CONFIG.masterJson, 'utf8').catch(() => '{}');
    let grouped = JSON.parse(masterContent);

    let newArticlesCount = 0;
    let skipArticlesCount = 0;
    let allItemsFlat = [];
    const diskSet = new Set(filesOnDisk);
    const validFilesSet = new Set();

    // 4. PROSES FILE BARU ATAU YANG BELUM ADA DI CACHE
    for (const file of filesOnDisk) {
      const fileNameOnly = file.replace('.html', '');
      const tempContent = await fs.readFile(path.join(CONFIG.artikelDir, file), 'utf8');
      const title = extractTitle(tempContent);
      const category = titleToCategory(title);
      const catSlug = slugify(category);

      // Konstruksi URL Final
      const finalUrl = `${CONFIG.baseUrl}/${catSlug}/${fileNameOnly}/`;

      // CEK CACHE: Skip jika sudah diproses sebelumnya
      if (processedUrls.has(finalUrl)) {
        skipArticlesCount++;

        // Tetap tambahkan ke struktur untuk konsistensi
        if (grouped[category]) {
          const existingArticle = grouped[category].find(a => a[1] === file);
          if (existingArticle) {
            validFilesSet.add(`${catSlug}/${file}`);
            allItemsFlat.push({
              title: existingArticle[0],
              file: existingArticle[1],
              img: existingArticle[2],
              lastmod: existingArticle[3],
              desc: existingArticle[4],
              category: category,
              loc: finalUrl
            });
          }
        }
        continue;
      }

      // PROSES ARTIKEL BARU/UPDATE
      console.log(`✨ Memproses artikel baru: [${category}] ${title}`);

      const pubDate = extractPubDate(tempContent) || (await fs.stat(path.join(CONFIG.artikelDir, file))).mtime;
      const desc = extractDesc(tempContent);
      const img = extractImage(tempContent, file);
      const dataArt = [title, file, img, formatISO8601(pubDate), desc];

      // Update JSON struktur
      if (!grouped[category]) grouped[category] = [];
      const existingIdx = grouped[category].findIndex(a => a[1] === file);
      if (existingIdx > -1) grouped[category][existingIdx] = dataArt;
      else grouped[category].push(dataArt);

      // DISTRIBUSI & AUTO-FIX HTML
      const destFolder = path.join(CONFIG.rootDir, catSlug);
      await fs.mkdir(destFolder, { recursive: true });

      let content = tempContent;
      content = content.replace(
        /<link\s+rel=["']canonical["']\s+href=["'][^"']+["']\s*\/?>/i,
        `<link rel="canonical" href="${finalUrl}">`
      );
      content = content.replace(
        /<meta\s+property=["']og:url["']\s+content=["'][^"']+["']\s*\/?>/i,
        `<meta property="og:url" content="${finalUrl}">`
      );

      // Fix URL internal
      const oldUrlPattern = new RegExp(`${CONFIG.baseUrl}/artikel/${fileNameOnly}`, 'g');
      content = content.replace(oldUrlPattern, finalUrl);
      content = content.replace(/\/artikel\/-\/([a-z-]+)(\.html)?\/?/g, '/$1/');

      await fs.writeFile(path.join(destFolder, file), content);

      // Tambahkan ke set dan cache
      validFilesSet.add(`${catSlug}/${file}`);
      processedUrls.add(finalUrl);
      newArticlesCount++;

      allItemsFlat.push({
        title: title,
        file: file,
        img: img,
        lastmod: dataArt[3],
        desc: desc,
        category: category,
        loc: finalUrl
      });
    }

    console.log(`📊 Statistik: ${newArticlesCount} Baru/Update, ${skipArticlesCount} Lewati (Cached).`);

    // 5. SMART CLEANING (Hapus file usang di folder kategori)
    for (const catSlug of VALID_CATEGORIES) {
      const folderPath = path.join(CONFIG.rootDir, catSlug);
      await fs.mkdir(folderPath, { recursive: true });
      const diskFiles = await fs.readdir(folderPath).catch(() => []);

      for (const file of diskFiles) {
        // Hapus file .html jika: bukan index.html DAN tidak terdaftar di validFilesSet
        if (file.endsWith('.html') && file !== 'index.html' && !validFilesSet.has(`${catSlug}/${file}`)) {
          console.log(`🗑️  Menghapus file usang: ${catSlug}/${file}`);
          await fs.unlink(path.join(folderPath, file));

          // Hapus juga dari cache jika ada
          const urlToRemove = `${CONFIG.baseUrl}/${catSlug}/${file.replace('.html', '')}/`;
          processedUrls.delete(urlToRemove);
        }
      }
    }

    // 6. URUTKAN & SORTIR DATA
    allItemsFlat.sort((a, b) => new Date(b.lastmod) - new Date(a.lastmod));
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => new Date(b[3]) - new Date(a[3]));
    });

    // 7. UPDATE FILE UTAMA JIKA ADA PERUBAHAN
    if (newArticlesCount > 0 || skipArticlesCount === 0) {
      // Update cache file (sitemap.txt)
      const sortedUrls = Array.from(processedUrls).sort();
      await fs.writeFile(CONFIG.sitemapTxt, sortedUrls.join('\n'));

      // Update JSON files
      await fs.writeFile(CONFIG.masterJson, JSON.stringify(grouped, null, 2));
      await fs.writeFile(CONFIG.jsonOut, JSON.stringify(grouped, null, 2));

      // 8. GENERATE SITEMAP XML
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
      const latestMod = allItemsFlat[0]?.lastmod || formatISO8601(new Date());

      const writePromises = [
        fs.writeFile(CONFIG.xmlIndexOut, `${xslHeader}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${CONFIG.baseUrl}/sitemap-1.xml</loc><lastmod>${latestMod}</lastmod></sitemap>\n  <sitemap><loc>${CONFIG.baseUrl}/image-sitemap-1.xml</loc><lastmod>${latestMod}</lastmod></sitemap>\n  <sitemap><loc>${CONFIG.baseUrl}/video-sitemap-1.xml</loc><lastmod>${latestMod}</lastmod></sitemap>\n</sitemapindex>`),
        fs.writeFile(CONFIG.xmlPostsOut, `${xslHeader}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlPosts}</urlset>`),
        fs.writeFile(CONFIG.xmlImagesOut, `${xslHeader}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${xmlImages}</urlset>`),
        fs.writeFile(CONFIG.xmlVideosOut, `${xslHeader}<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${xmlVideos}</urlset>`),
        fs.writeFile(CONFIG.rssOut, buildRss('Layar Kosong', allItemsFlat.slice(0, CONFIG.rssLimit), `${CONFIG.baseUrl}/rss.xml`, `Feed artikel terbaru`))
      ];

      // 9. LANDING PAGE KATEGORI
      const templateHTML = await fs.readFile(CONFIG.templateKategori, 'utf8').catch((err) => {
        console.warn("⚠️ Template kategori tidak ditemukan:", err.message);
        return null;
      });

      if (templateHTML) {
        for (const [cat, articles] of Object.entries(grouped)) {
          if (articles.length === 0) continue;

          const slug = slugify(cat);
          const catItems = allItemsFlat.filter(f => f.category === cat);

          // Generate RSS Kategori
          const rssFilename = `feed-${slug}.xml`;
          const rssUrl = `${CONFIG.baseUrl}/${rssFilename}`;
          writePromises.push(
            fs.writeFile(
              path.join(CONFIG.rootDir, rssFilename),
                         buildRss(`${cat} - Layar Kosong`, catItems, rssUrl, `Feed kategori ${cat}`)
            )
          );

          // Generate Landing Page Kategori
          const icon = cat.match(/(\p{Emoji})/u)?.[0] || '📁';
          const description = `Kumpulan lengkap artikel, tutorial, dan catatan tentang ${cat}.`;
          const canonicalCat = `${CONFIG.baseUrl}/${slug}/`;

          let pageContent = templateHTML
          .replace(/%%TITLE%%/g, sanitizeTitle(cat))
          .replace(/%%DESCRIPTION%%/g, description)
          .replace(/%%CATEGORY_NAME%%/g, cat)
          .replace(/%%RSS_URL%%/g, rssUrl)
          .replace(/%%CANONICAL_URL%%/g, canonicalCat)
          .replace(/%%ICON%%/g, icon);

          const landingPagePath = path.join(CONFIG.rootDir, slug, 'index.html');
          writePromises.push(fs.writeFile(landingPagePath, pageContent));
        }
      }

      await Promise.all(writePromises);
      console.log(`✅ SELESAI! ${newArticlesCount} artikel baru diproses.`);
    } else {
      console.log('☕ Tidak ada perubahan. Generator dalam mode idle.');
    }

  } catch (err) {
    console.error('❌ Error:', err);
  }
};

generate();
