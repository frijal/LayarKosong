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

// 1. Muat Cache Gambar (Kunci agar tidak resize ulang)
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

        // --- LOGIKA CERDAS: CEK CACHE & FISIK ---
        if (!optimizedCache.has(cleanPath)) {
          const absDesktopPath = path.resolve(desktopPath);
          const absMobilePath = path.resolve(mobilePath);

          // Cek apakah file fisik desktop sebenarnya sudah ada di folder img/
          if (fs.existsSync(absDesktopPath)) {
            // Jika sudah ada, cukup masukkan ke cache agar tidak dicek lagi nanti
            optimizedCache.add(cleanPath);
            await appendFile(CACHE_FILE, `${cleanPath}\n`);
            console.log(` ⚡ Cache Updated (Existing): ${cleanPath}`);
          } else {
            // Jika benar-benar belum ada di cache DAN belum ada di folder fisik, baru SHARP bekerja
            stats.optimized++;
            const targetWidth = meta.width > 1000 ? 1000 : meta.width;

            // 1. Buat versi Desktop
            await imageInstance
            .rotate()
            .resize(targetWidth, null, { withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(absDesktopPath);

            // 2. Buat versi Mobile (khusus jika lebar > 480px)
            if (meta.width > 480) {
              await sharp(fullPathSource)
              .rotate()
              .resize(480, null, { withoutEnlargement: true })
              .webp({ quality: 75 })
              .toFile(absMobilePath);
            }

            // Catat ke cache log
            optimizedCache.add(cleanPath);
            await appendFile(CACHE_FILE, `${cleanPath}\n`);
            console.log(` ✨ Sharp Optimized (New): ${cleanPath}`);
          }
        }

        // --- TRANSFORMASI HTML (Selalu dijalankan untuk file baru di sitemap) ---
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
        console.error(`❌ Skip Img ${cleanPath}`);
      }
    }

    if (fileHasChanged) {
      // Inilah penulisan ke folder fisik di dalam Runner GitHub.
      // Karena GitHub Actions bersifat "disposable", file ini hanya ada sementara
      // untuk dibaca oleh DO_GENERATOR sebelum semua musnah saat job selesai.
      await writeFile(filePath, $.html());
      stats.processed++;
    }

  } catch (err) {
    console.error(`❌ Gagal: ${filePath}`);
  }
}

(async () => {
  console.log('🧪 PENGUJIAN: Mode Cerdas (Sitemap Kosong, Image Cache Ada)');

  const sitemapTxt = fs.existsSync(SITEMAP_FILE) ? await readFile(SITEMAP_FILE, 'utf-8') : '';
  const urls = new Set(sitemapTxt.split('\n').filter(Boolean).map(line => line.trim()));

  const allFiles = await glob(`${SOURCE_DIR}/*.html`);
  stats.total = allFiles.length;

  for (const f of allFiles) {
    const fileSlug = path.basename(f, '.html');
    const isAlreadyInSitemap = [...urls].some(url => url.endsWith(`/${fileSlug}`));

    if (!isAlreadyInSitemap) {
      await processHtmlFile(f);
    } else {
      stats.skipped++;
    }
  }

  console.log(`\n📊 HASIL UJI:\n------------------\nFile Baru Diolah : ${stats.processed}\nSharp Dijalankan : ${stats.optimized} (Harus 0 jika sukses)\nTotal Gudang     : ${stats.total}\n`);
})();