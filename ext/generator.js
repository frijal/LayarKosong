import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
// Asumsikan titleToCategory.js ada
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
  baseUrl: 'https://dalam.web.id',
  defaultThumbnail: 'https://dalam.web.id/thumbnail.webp',
  xmlPriority: '0.6',
  xmlChangeFreq: 'monthly',
};

// ===================================================================
// FUNGSI-FUNGSI BANTUAN (HELPER FUNCTIONS)
// ===================================================================

/**
 * Menggantikan formatISO8601, tetapi dikembalikan sebagai string
 * untuk mempertahankan perilaku asli (terutama zona waktu)
 */
function formatISO8601(date) {
  const d = new Date(date);
  if (isNaN(d)) {
    // console.warn('⚠️ Tanggal tidak valid, fallback ke sekarang.');
    return new Date().toISOString();
  }
  // Logika zona waktu lokal agar sesuai dengan format asli (non-'Z')
  const tzOffset = -d.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const hours = pad(tzOffset / 60);
  const minutes = pad(tzOffset % 60);
  // Menggunakan toISOString() lalu mengganti 'Z' dengan offset lokal
  return d.toISOString().replace('Z', `${diff}${hours}:${minutes}`);
}

// Fungsi extractors lainnya tetap sama karena sudah cepat (pure function)

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

// ===================================================================
// OPTIMASI: ASYNC PARALLEL (MEMPERCEPAT I/O)
// ===================================================================

/**
 * Memproses satu file artikel secara paralel.
 * @param {string} file Nama file (e.g., 'contoh.html').
 * @param {Map<string, boolean>} existingFiles Map file yang sudah ada di JSON master.
 * @returns {Promise<Object|null>} Objek artikel baru atau null jika sudah diproses.
 */
async function processArticleFile(file, existingFiles) {
  if (existingFiles.has(file)) return null;
  
  const fullPath = path.join(CONFIG.artikelDir, file);
  try {
    let content = await fs.readFile(fullPath, 'utf8');
    let needsSave = false;
    
    // 1. Merapikan Judul
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
    
    // 2. Menambahkan Tanggal Publikasi jika hilang
    if (!pubDate) {
      // Menggunakan Promise.all untuk stat dan meta tag
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
      // I/O: Menulis kembali file jika ada perubahan (merapikan title/menambahkan tanggal)
      await fs.writeFile(fullPath, content, 'utf8');
    }

    const lastmod = formatISO8601(pubDate);

    // [title, file, image, lastmod, description]
    return {
      category,
      data: [title, file, image, lastmod, description]
    };

  } catch (error) {
    console.error(`❌ Gagal memproses file ${file}:`, error.message);
    return null;
  }
}

// ===================================================================
// GENERATOR KATEGORI (DISEDERHANAKAN)
// ===================================================================

async function generateCategoryPages(groupedData) {
  console.log('🔄 Memulai pembuatan halaman kategori...');
  const kategoriDir = path.join(CONFIG.artikelDir, '-');
  const templatePath = path.join(kategoriDir, 'template-kategori.html');

  try {
    await fs.access(templatePath);
    const templateContent = await fs.readFile(templatePath, 'utf8');
    
    const categoryWritePromises = [];
    
    for (const categoryName in groupedData) {
      // Logika slugging (tetap sama)
      const noEmoji = categoryName.replace(/^[^\w\s]*/, '').trim();
      const slug = noEmoji
        .toLowerCase()
        .replace(/ & /g, '-and-')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      
      const fileName = `${slug}.html`;
      const canonicalUrl = `${CONFIG.baseUrl}/artikel/-/${fileName}`;
      const rssUrl = `${CONFIG.baseUrl}/feed-${slug}.xml`;
      const icon = categoryName.match(/(\p{Emoji})/u)?.[0] || '📁';
      
      // Ganti placeholder di template
      let pageContent = templateContent
        .replace(/%%TITLE%%/g, noEmoji)
        .replace(/%%DESCRIPTION%%/g, `topik ${noEmoji}`)
        .replace(/%%CANONICAL_URL%%/g, canonicalUrl)
        .replace(/%%CATEGORY_NAME%%/g, categoryName)
        .replace(/%%ICON%%/g, icon)
        .replace(/%%RSS_URL%%/g, rssUrl);
        
      // Tambahkan Promise ke array
      categoryWritePromises.push(
        fs.writeFile(path.join(kategoriDir, fileName), pageContent, 'utf8')
          .then(() => console.log(`✅ Halaman kategori dibuat: ${fileName}`))
      );
    }

    // Tunggu semua file kategori selesai ditulis secara paralel
    await Promise.all(categoryWritePromises);
    
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

  // OPTIMASI: Membaca file disk dan JSON secara paralel
  const [filesOnDisk, masterContent] = await Promise.all([
    fs.readdir(CONFIG.artikelDir)
      .then(files => files.filter(f => f.endsWith('.html'))),
    fs.readFile(CONFIG.masterJson, 'utf8').catch(() => {
      console.warn('⚠️ Master JSON (artikel/artikel.json) tidak ditemukan, memulai dari awal.');
      return '{}'; // Return string kosong jika gagal
    })
  ]);

  const existingFilesOnDisk = new Set(filesOnDisk);
  let grouped = JSON.parse(masterContent);
  console.log('📂 Master JSON berhasil dimuat atau diinisialisasi.');
  
  // 1. Membersihkan Data Lama (Deleted Articles)
  const cleanedGrouped = {};
  let deletedCount = 0;
  for (const category in grouped) {
    const survivingArticles = grouped[category].filter((item) => {
      // item[1] adalah nama file
      if (!existingFilesOnDisk.has(item[1])) {
        console.log(`🗑️ File terhapus terdeteksi, menghapus dari data: ${item[1]}`);
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
  
  // Map file yang sudah ada di JSON (digunakan untuk check cepat)
  const existingFilesMap = new Map(
    Object.values(grouped).flat().map(item => [item[1], true])
  );
  
  // 2. Memproses Artikel Baru/Update secara Paralel
  console.log(`🔄 Memeriksa ${filesOnDisk.length} file artikel di disk...`);
  
  // Filter file yang belum ada di JSON master
  const newFilesToProcess = filesOnDisk.filter(file => !existingFilesMap.has(file));
  
  let newArticlesCount = 0;
  const processingPromises = newFilesToProcess.map(file => 
    processArticleFile(file, existingFilesMap)
  );
  
  // Tunggu semua file baru selesai diproses secara paralel
  const newArticlesResults = (await Promise.all(processingPromises)).filter(result => result !== null);

  // 3. Menggabungkan Hasil Pemrosesan Paralel
  for (const result of newArticlesResults) {
    if (!grouped[result.category]) grouped[result.category] = [];
    grouped[result.category].push(result.data);
    newArticlesCount++;
    console.log(`➕ Artikel baru berhasil diproses: ${result.data[1]}`);
  }
  
  // --- Penulisan File Output (Hanya jika ada perubahan) ---

  const hasChanges = newArticlesCount > 0 || deletedCount > 0 || Object.keys(grouped).length === 0;

  if (hasChanges) {
    // 4. Sorting, JSON, XML, dan Kategori Generation
    console.log('🔥 Perubahan terdeteksi, menulis ulang file output...');

    // Sorting (Dilakukan setelah semua data baru masuk)
    for (const category in grouped) {
      grouped[category].sort((a, b) => new Date(b[3]) - new Date(a[3]));
    }

    // XML URL Construction
    const xmlUrls = [];
    Object.values(grouped)
      .flat()
      .forEach((item) => {
        const [, file, image, lastmod] = item;
        // Gunakan file.replace('.html', '') untuk Pretty URL di sitemap.xml
        const cleanLoc = `${CONFIG.baseUrl}/artikel/${file.replace('.html', '')}`; 
        
        xmlUrls.push(
          `  <url>\n    <loc>${cleanLoc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${CONFIG.xmlPriority}</priority>\n    <changefreq>${CONFIG.xmlChangeFreq}</changefreq>\n    <image:image>\n      <image:loc>${image}</image:loc>\n    </image:image>\n  </url>`,
        );
      });

    // Menulis semua output secara paralel
    const writePromises = [];

    // JSON
    const jsonString = formatJsonOutput(grouped);
    writePromises.push(fs.writeFile(CONFIG.jsonOut, jsonString, 'utf8'));

    // XML (Sitemap)
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap/image/1.1 http://www.google.com/schemas/sitemap/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlUrls.join('\n')}\n</urlset>`;
    writePromises.push(fs.writeFile(CONFIG.xmlOut, xmlContent, 'utf8'));
    
    // Kategori Pages (sudah mengandung Promise.all di dalamnya)
    await generateCategoryPages(grouped);

    // Tunggu JSON dan XML selesai ditulis
    await Promise.all(writePromises);
    
    console.log(`\n✅ Ringkasan: ${newArticlesCount} artikel baru ditambahkan, ${deletedCount} artikel lama dihapus.`);
    console.log('✅ artikel.json, sitemap.xml, dan halaman kategori berhasil diperbarui.');
  } else {
    console.log('\n✅ Tidak ada perubahan yang substansial. File tidak diubah.');
  }
};

// Menjalankan fungsi utama
generate();
