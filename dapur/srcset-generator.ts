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

// 1. Muat Cache Gambar
if (fs.existsSync(CACHE_FILE)) {
  const content = fs.readFileSync(CACHE_FILE, 'utf-8');
  optimizedCache = new Set(content.split('\n').map(line => line.trim()).filter(Boolean));
}

async function processHtmlFile(filePath: string) {
  try {
    const htmlContent = await readFile(filePath, 'utf-8');
    const $ = load(htmlContent, { decodeEntities: false });
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
      const cleanPath = originalSrc.replace(BASE_URL, '').replace(/^https?:\/\/dalam\.web\.id/, '').replace(/^\/+/, '');
      const fullPathSource = path.resolve(cleanPath);

      if (!fs.existsSync(fullPathSource)) continue;

      try {
        const imageInstance = sharp(fullPathSource);
        const meta = await imageInstance.metadata();
        if (!meta || !meta.width || !meta.height) continue;

        const dirName = path.dirname(cleanPath);
        const baseNameSafe = path.basename(cleanPath, '.webp').replace(FORBIDDEN_CHARS, '-');
        const desktopPath = path.join(dirName, `${baseNameSafe}.webp`);
        const mobilePath = path.join(dirName, `${baseNameSafe}-sm.webp`);

        // --- LOGIKA CERDAS: CEK CACHE & KELENGKAPAN FISIK ---
        const absDesktopPath = path.resolve(desktopPath);
        const absMobilePath = path.resolve(mobilePath);
        const needsMobile = meta.width > 480;

        // Cek apakah file fisik benar-benar lengkap di folder
        const physicalComplete = fs.existsSync(absDesktopPath) && (!needsMobile || fs.existsSync(absMobilePath));

        // Jalankan Sharp JIKA: Belum ada di cache ATAU file fisik tidak lengkap
        if (!optimizedCache.has(cleanPath) || !physicalComplete) {

          if (physicalComplete) {
            // Kasus: Fisik ada tapi cache belum mencatat (Update cache saja)
            if (!optimizedCache.has(cleanPath)) {
              optimizedCache.add(cleanPath);
              await appendFile(CACHE_FILE, `${cleanPath}\n`);
              console.log(` ⚡ Cache Updated: ${cleanPath}`);
            }
          } else {
            // Kasus: Salah satu file fisik hilang/belum dibuat (Jalankan Sharp)
            stats.optimized++;
            const targetWidth = meta.width > 1000 ? 1000 : meta.width;

            // 1. Generate Desktop
            await imageInstance
            .rotate()
            .resize(targetWidth, null, { withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(absDesktopPath);

            // 2. Generate Mobile
            if (needsMobile) {
              await sharp(fullPathSource)
              .rotate()
              .resize(480, null, { withoutEnlargement: true })
              .webp({ quality: 75 })
              .toFile(absMobilePath);
            }

            // Update Cache setelah Sharp berhasil
            if (!optimizedCache.has(cleanPath)) {
              optimizedCache.add(cleanPath);
              await appendFile(CACHE_FILE, `${cleanPath}\n`);
            }
            console.log(` ✨ Sharp Optimized (Fix/New): ${cleanPath}`);
          }
        }

        // --- TRANSFORMASI HTML ---
        imageCounter++;
        const originalAlt = $img.attr('alt')?.trim();
        let finalAlt = originalAlt || pageTitle;
        if (!originalAlt && imageCounter > 1) finalAlt = `${pageTitle} - ${imageCounter}`;

        const webDesktopUrl = `${BASE_URL}/${desktopPath.replace(/\\/g, '/')}`;
        const webMobileUrl = `${BASE_URL}/${mobilePath.replace(/\\/g, '/')}`;

        const pictureHtml = `
        <picture style="display: block; text-align: center;">
        ${meta.width > 480 ? `<source media="(max-width: 500px)" srcset="${webMobileUrl}">` : ''}
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

      } catch (e: any) {
        // Silent error for images
      }
    }

    if (fileHasChanged) {
      // Menulis ke folder artikel/ di dalam Runner saja
      await writeFile(filePath, $.html());
      stats.processed++;
    }

  } catch (err) {
    console.error(`❌ Gagal: ${filePath}`);
  }
}

(async () => {
  console.log('🚀 RUNNER MODE: Memproses file di memori runner...');

  const sitemapTxt = fs.existsSync(SITEMAP_FILE) ? await readFile(SITEMAP_FILE, 'utf-8') : '';
  const urls = new Set(sitemapTxt.split('\n').filter(Boolean).map(line => line.trim()));

  const allFiles = await glob(`${SOURCE_DIR}/*.html`);
  stats.total = allFiles.length;

  for (const f of allFiles) {
    const fileSlug = path.basename(f, '.html');
    const isNew = ![...urls].some(url => url.endsWith(`/${fileSlug}`));

    if (isNew) {
      await processHtmlFile(f);
    } else {
      stats.skipped++;
    }
  }

  console.log(`\n📊 RINGKASAN RUNNER:\n------------------\nFile Update (Runner) : ${stats.processed}\nSharp Executed       : ${stats.optimized}\nTotal Gudang         : ${stats.total}\n`);
})();