import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { titleToCategory } from './titleToCategory.js';

// ==================================================================
// KONFIGURASI TERPUSAT
// ===================================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  artikelDir: path.join(__dirname, '..', 'artikel'),
  masterJson: path.join(__dirname, '..', 'artikel', 'artikel.json'),
  jsonOut: path.join(__dirname, '..', 'artikel.json'),
  xmlOut: path.join(__dirname, '..', 'sitemap.xml'),
  baseUrl: 'https://frijal.pages.dev',
  defaultThumbnail: 'https://frijal.pages.dev/thumbnail.webp',
  xmlPriority: '0.6',
  xmlChangeFreq: 'monthly',
};

// ===================================================================
// FUNGSI-FUNGSI BANTUAN (HELPER FUNCTIONS)
// ===================================================================

function formatISO8601(date) {
  const d = new Date(date);
  if (isNaN(d)) {
    console.warn(`⚠️ Tanggal tidak valid, fallback ke sekarang.`);
    return new Date().toISOString();
  }
  const tzOffset = -d.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const hours = pad(tzOffset / 60);
  const minutes = pad(tzOffset % 60);
  return d.toISOString().replace('Z', `${diff}${hours}:${minutes}`);
}

function extractPubDate(content) {
  const match = content.match(
    /<meta\s+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
  );
  return match ? match[1].trim() : null;
}

function extractTitle(content) {
  const match = content.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : 'Tanpa Judul';
}

function extractDescription(content) {
  const match = content.match(
    /<meta\s+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  );
  return match ? match[1].trim() : '';
}

function fixTitleOneLine(content) {
  return content.replace(
    /<title>([\s\S]*?)<\/title>/gi,
    (m, p1) => `<title>${p1.trim()}</title>`,
  );
}

function extractImage(content) {
  const ogMatch = content.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["'](.*?)["']/i,
  );
  if (ogMatch && ogMatch[1]) {
    const src = ogMatch[1].trim();
    const validExt = /\.(jpe?g|png|gif|webp|avif|svg)$/i;
    if (validExt.test(src.split('?')[0])) return src;
  }

  const imgMatch = content.match(/<img[^>]+src=["'](.*?)["']/i);
  if (imgMatch && imgMatch[1]) {
    const src = imgMatch[1].trim();
    const validExt = /\.(jpe?g|png|gif|webp|avif|svg)$/i;
    if (validExt.test(src.split('?')[0])) return src;
  }

  return CONFIG.defaultThumbnail;
}

function formatJsonOutput(obj) {
  return JSON.stringify(obj, null, 2)
    .replace(/\[\s*\[/g, '[\n      [')
    .replace(/\]\s*\]/g, ']\n    ]')
    .replace(/(\],)\s*\[/g, '$1\n      [');
}

async function generateCategoryPages(groupedData) {
  console.log('🔄 Memulai pembuatan halaman kategori...');
  const kategoriDir = path.join(CONFIG.artikelDir, '-');
  const templatePath = path.join(kategoriDir, 'template-kategori.html');

  try {
    await fs.access(templatePath);
    const templateContent = await fs.readFile(templatePath, 'utf8');

    for (const categoryName in groupedData) {
      // Hilangkan emoji & ubah ke slug
      const noEmoji = categoryName.replace(/^[^\w\s]*/, '').trim();
      const slug = noEmoji
        .toLowerCase()
        .replace(/ & /g, '-and-')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      // RSS URL untuk kategori
      const rssUrl = `${CONFIG.baseUrl}/feed-${slug}.xml`;

      // URL halaman kategori
      const fileName = `${slug}.html`;
      const canonicalUrl = `${CONFIG.baseUrl}/artikel/-/${fileName}`;

      // Ambil emoji pertama (atau fallback)
      const icon = categoryName.match(/(\p{Emoji})/u)?.[0] || '📁';

      // Ganti placeholder di template
      let pageContent = templateContent
        .replace(/%%TITLE%%/g, noEmoji)
        .replace(/%%DESCRIPTION%%/g, `topik ${noEmoji}`)
        .replace(/%%CANONICAL_URL%%/g, canonicalUrl)
        .replace(/%%CATEGORY_NAME%%/g, categoryName)
        .replace(/%%ICON%%/g, icon)
        .replace(/%%RSS_URL%%/g, rssUrl);

      // Tulis file HTML hasil render
      await fs.writeFile(path.join(kategoriDir, fileName), pageContent, 'utf8');
      console.log(`✅ Halaman kategori dibuat: ${fileName}`);
    }

    console.log('👍 Semua halaman kategori berhasil dibuat.');
  } catch (error) {
    console.error(
      "❌ Gagal membuat halaman kategori. Pastikan 'template-kategori.html' ada di dalam folder 'artikel/-'.",
      error.message,
    );
  }
}

// ===================================================================
// FUNGSI UTAMA (MAIN GENERATOR)
// ===================================================================
const generate = async () => {
  console.log('🚀 Memulai proses generator...');
  try {
    await fs.access(CONFIG.artikelDir);
  } catch {
    console.error("❌ Folder 'artikel' tidak ditemukan. Proses dibatalkan.");
    return;
  }

  const filesOnDisk = (await fs.readdir(CONFIG.artikelDir)).filter((f) =>
    f.endsWith('.html'),
  );
  const existingFilesOnDisk = new Set(filesOnDisk);
  let grouped = {};

  try {
    const masterContent = await fs.readFile(CONFIG.masterJson, 'utf8');
    grouped = JSON.parse(masterContent);
    console.log('📂 Master JSON berhasil dimuat.');
  } catch {
    console.warn(
      '⚠️ Master JSON (artikel/artikel.json) tidak ditemukan, memulai dari awal.',
    );
  }

  const cleanedGrouped = {};
  let deletedCount = 0;
  for (const category in grouped) {
    const survivingArticles = grouped[category].filter((item) => {
      if (!existingFilesOnDisk.has(item[1])) {
        console.log(
          `🗑️ File terhapus terdeteksi, menghapus dari data: ${item[1]}`,
        );
        deletedCount++;
        return false;
      }
      return true;
    });
    if (survivingArticles.length > 0) {
      cleanedGrouped[category] = survivingArticles;
    }
  }
  grouped = cleanedGrouped;

  const existingFiles = new Set(
    Object.values(grouped)
      .flat()
      .map((item) => item[1]),
  );
  let newArticlesCount = 0;

  for (const file of filesOnDisk) {
    try {
      if (existingFiles.has(file)) continue;

      const fullPath = path.join(CONFIG.artikelDir, file);
      let content = await fs.readFile(fullPath, 'utf8');
      let needsSave = false;

      const fixedTitleContent = fixTitleOneLine(content);
      if (fixedTitleContent !== content) {
        content = fixedTitleContent;
        needsSave = true;
        console.log(`🔧 Merapikan <title> di ${file}`);
      }

      const title = extractTitle(content);
      const category = titleToCategory(title);
      const image = extractImage(content);
      const description = extractDescription(content);

      let pubDate = extractPubDate(content);
      if (!pubDate) {
        const stats = await fs.stat(fullPath);
        pubDate = stats.mtime;
        const newMetaTag = `    <meta property="article:published_time" content="${formatISO8601(pubDate)}">`;
        if (content.includes('</head>')) {
          content = content.replace('</head>', `${newMetaTag}\n</head>`);
          needsSave = true;
          console.log(`➕ Menambahkan meta tanggal ke '${file}'`);
        }
      }

      if (needsSave) {
        await fs.writeFile(fullPath, content, 'utf8');
      }

      const lastmod = formatISO8601(pubDate);
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push([title, file, image, lastmod, description]);
      newArticlesCount++;
      console.log(`➕ Memproses artikel baru: ${file}`);
    } catch (error) {
      console.error(`❌ Gagal memproses file ${file}:`, error.message);
    }
  }

  // --- PERBAIKAN SARAN DIMASUKKAN DI SINI ---
  
  // Cek apakah file output (artikel.json di root) sudah ada
  let isJsonOutMissing = false;
  try {
    await fs.access(CONFIG.jsonOut);
  } catch {
    isJsonOutMissing = true;
    console.log('🟡 File output artikel.json tidak ditemukan, akan dibuat ulang.');
  }

  // Tambahkan 'isJsonOutMissing' sebagai kondisi untuk menulis file
  if (newArticlesCount > 0 || deletedCount > 0 || isJsonOutMissing) {
    for (const category in grouped) {
      grouped[category].sort((a, b) => new Date(b[3]) - new Date(a[3]));
    }

    const xmlUrls = [];
    Object.values(grouped)
      .flat()
      .forEach((item) => {
        const [, file, image, lastmod] = item;
        xmlUrls.push(
          `  <url>\n    <loc>${CONFIG.baseUrl}/artikel/${file}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${CONFIG.xmlPriority}</priority>\n    <changefreq>${CONFIG.xmlChangeFreq}</changefreq>\n    <image:image>\n      <image:loc>${image}</image:loc>\n    </image:image>\n  </url>`,
        );
      });

    const jsonString = formatJsonOutput(grouped);
    await fs.writeFile(CONFIG.jsonOut, jsonString, 'utf8');

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap/image/1.1 http://www.google.com/schemas/sitemap/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlUrls.join('\n')}\n</urlset>`;
    await fs.writeFile(CONFIG.xmlOut, xmlContent, 'utf8');

    await generateCategoryPages(grouped);

    console.log(
      `\n✅ Ringkasan: ${newArticlesCount} artikel baru ditambahkan, ${deletedCount} artikel lama dihapus.`,
    );
    if (isJsonOutMissing && newArticlesCount === 0 && deletedCount === 0) {
        console.log('✅ File artikel.json di root dibuat ulang karena tidak ada.');
    }
    console.log(
      '✅ artikel.json, sitemap.xml, dan halaman kategori berhasil diperbarui.',
    );
  } else {
    console.log('\n✅ Tidak ada perubahan. File tidak diubah.');
  }
};

// Menjalankan fungsi utama
generate();
