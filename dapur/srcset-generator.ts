import { glob } from 'glob';
import { load } from 'cheerio';
import path from 'node:path';
import sharp from 'sharp';
import { writeFile, readFile, appendFile } from 'node:fs/promises';
import fs from 'node:fs';

const BASE_URL = 'https://dalam.web.id';
const SOURCE_DIR = 'artikel';
const CACHE_FILE = 'mini/srcset-gambar.txt';
const SITEMAP_FILE = 'sitemap.txt';
const FORBIDDEN_CHARS = /[*:"<>|?]/g;

let stats = { total: 0, processed: 0, skipped: 0, optimized: 0 };
let optimizedCache = new Set<string>();

if (fs.existsSync(CACHE_FILE)) {
  const content = fs.readFileSync(CACHE_FILE, 'utf-8');
  optimizedCache = new Set(content.split('\n').map(line => line.trim()).filter(Boolean));
}

async function processHtmlFile(filePath: string) {
  try {
    const htmlContent = await readFile(filePath, 'utf-8');
    const $ = load(htmlContent, { decodeEntities: false });

    // Cek apakah file ini sudah diproses sebelumnya (sudah punya tag picture)
    // Jika Mas ingin "paksa" update semua, hapus baris pengecekan ini
    if ($('picture').length > 0 && $('picture img').length > 0) {
      return;
    }

    const pageTitle = $('title').first().text().split(' - ')[0].trim() || 'Layar Kosong';
    const imageCandidates = $('body img').toArray().filter(el => {
      const src = $(el).attr('src');
      return src && (src.startsWith('/img/') || src.startsWith('img/') || src.includes('/img/'));
    });

    if (imageCandidates.length === 0) return;

    let fileHasChanged = false;
    let isFirstImage = true;
    let imageCounter = 0;

    for (const el of imageCandidates) {
      const $img = $(el);
      const originalSrc = $img.attr('src')!;

      // Bersihkan URL agar menjadi path lokal
      const cleanPath = originalSrc
      .replace(BASE_URL, '')
      .replace(/^https?:\/\/dalam\.web\.id/, '')
      .replace(/^\/+/, '');

      // PERBAIKAN: Gunakan process.cwd() agar path selalu tepat dari root project
      const fullPathSource = path.join(process.cwd(), cleanPath);

      if (!fs.existsSync(fullPathSource)) {
        console.log(`⚠️ Skip: Gambar asli tidak ditemukan di ${fullPathSource}`);
        continue;
      }

      try {
        const imageInstance = sharp(fullPathSource);
        const meta = await imageInstance.metadata();
        if (!meta || !meta.width || !meta.height) continue;

        const dirName = path.dirname(cleanPath);
        const baseNameSafe = path.basename(cleanPath, path.extname(cleanPath)).replace(FORBIDDEN_CHARS, '-');

        const desktopPath = path.join(dirName, `${baseNameSafe}.webp`);
        const mobilePath = path.join(dirName, `${baseNameSafe}-sm.webp`);
        const absDesktopPath = path.join(process.cwd(), desktopPath);
        const absMobilePath = path.join(process.cwd(), mobilePath);

        const needsMobile = meta.width > 480;

        // LOGIKA BARU: Cek apakah fisik file lengkap
        const physicalComplete = fs.existsSync(absDesktopPath) && (!needsMobile || fs.existsSync(absMobilePath));

        // Jalankan Sharp jika belum di cache ATAU fisik tidak lengkap
        if (!optimizedCache.has(cleanPath) || !physicalComplete) {
          if (!physicalComplete) {
            stats.optimized++;
            const targetWidth = meta.width > 1000 ? 1000 : meta.width;

            // 1. Desktop
            await imageInstance
            .rotate()
            .resize(targetWidth, null, { withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(absDesktopPath);

            // 2. Mobile
            if (needsMobile) {
              await sharp(fullPathSource)
              .rotate()
              .resize(480, null, { withoutEnlargement: true })
              .webp({ quality: 75 })
              .toFile(absMobilePath);
            }
            console.log(` ✨ Sharp: ${cleanPath} (Sm Created)`);
          }

          if (!optimizedCache.has(cleanPath)) {
            optimizedCache.add(cleanPath);
            await appendFile(CACHE_FILE, `${cleanPath}\n`);
          }
        }

        // TRANSFORMASI HTML
        imageCounter++;
        const originalAlt = $img.attr('alt')?.trim();
        let finalAlt = originalAlt || pageTitle;
        if (!originalAlt && imageCounter > 1) finalAlt = `${pageTitle} - ${imageCounter}`;

        const webDesktopUrl = `${BASE_URL}/${desktopPath.replace(/\\/g, '/')}`;
        const webMobileUrl = `${BASE_URL}/${mobilePath.replace(/\\/g, '/')}`;

        const pictureHtml = `
        <picture style="display: block; text-align: center;">
        ${needsMobile ? `<source media="(max-width: 500px)" srcset="${webMobileUrl}">` : ''}
        <img src="${webDesktopUrl}"
        ${isFirstImage ? 'fetchpriority="high"' : ''}
        alt="${finalAlt.replace(/"/g, '&quot;')}"
        width="${meta.width > 1000 ? 1000 : meta.width}"
        height="${Math.round((meta.width > 1000 ? 1000 : meta.width) * (meta.height / meta.width))}"
        style="max-width: 100%; height: auto; border-radius: 16px; display: inline-block;"
        loading="${isFirstImage ? 'eager' : 'lazy'}"
        decoding="async">
        </picture>`.trim();

        $img.replaceWith(pictureHtml);
        fileHasChanged = true;
        isFirstImage = false;

      } catch (e) {
        // console.error(e);
      }
    }

    if (fileHasChanged) {
      await writeFile(filePath, $.html());
      stats.processed++;
    }

  } catch (err) {
    console.error(`❌ Gagal: ${filePath}`);
  }
}

(async () => {
  console.log('🚀 Memulai Proses Srcset...');

  const sitemapTxt = fs.existsSync(SITEMAP_FILE) ? await readFile(SITEMAP_FILE, 'utf-8') : '';
  const urls = new Set(sitemapTxt.split('\n').filter(Boolean).map(line => line.trim()));

  const allFiles = await glob(`${SOURCE_DIR}/*.html`);
  stats.total = allFiles.length;

  for (const f of allFiles) {
    const fileSlug = path.basename(f, '.html');
    // Jika Mas ingin memproses SEMUA file tanpa peduli sitemap, ganti jadi true
    const isNew = ![...urls].some(url => url.endsWith(`/${fileSlug}`));

    if (isNew) {
      await processHtmlFile(f);
    } else {
      stats.skipped++;
    }
  }

  console.log(`\n📊 RINGKASAN:\n------------------\nHTML Diubah      : ${stats.processed}\nGambar Dibuat    : ${stats.optimized}\nTotal HTML       : ${stats.total}\n`);
})();