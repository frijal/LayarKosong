import { glob } from 'glob';
import { load } from 'cheerio';
import path from 'node:path';
import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import fs from 'node:fs';

const BASE_URL = 'https://dalam.web.id';
const SOURCE_DIR = 'artikel';
const OUTPUT_DIR = 'output';
const INVALID_CHARS = /[<>:"/\\|?*\r\n]/;

// Counter untuk log akhir
let stats = {
  total: 0,
  processed: 0,
  skippedNoImages: 0,
  skippedInvalidName: 0,
  errors: 0
};

async function processHtmlFile(filePath: string) {
  stats.total++;
  const fileName = path.basename(filePath);
  const htmlContent = await readFile(filePath, 'utf-8');
  const $ = load(htmlContent, { decodeEntities: false });

  // 1. CEK GAMBAR HANYA DI DALAM BODY
  const bodyImages = $('body img').toArray();
  
  if (bodyImages.length === 0) {
    stats.skippedNoImages++;
    // Opsional: aktifkan log di bawah jika ingin melihat file mana yang diskip
    // console.log(`ℹ️  SKIP (No Images): ${fileName}`);
    return;
  }

  const rawTitle = $('title').text().trim() || 'Layar Kosong';
  const articleTitle = rawTitle.replace(/\s*-\s*Layar Kosong$/i, '').trim();

  let hasError = false;

  for (const el of bodyImages) {
    const $img = $(el);
    const src = $img.attr('src');
    if (!src) continue;

    let localInputPath = "";
    if (src.startsWith(BASE_URL + '/img/')) {
      localInputPath = `.${src.replace(BASE_URL, '')}`;
    } else if (src.startsWith('/img/')) {
      localInputPath = `.${src}`;
    }

    if (localInputPath && fs.existsSync(localInputPath)) {
      // 2. CEK NAMA FILE RANCU (*)
      if (INVALID_CHARS.test(path.basename(localInputPath))) {
        console.warn(`⚠️  SKIP (Invalid Name): ${fileName} -> ${path.basename(localInputPath)}`);
        stats.skippedInvalidName++;
        hasError = true;
        break; 
      }

      try {
        let captionText = "";
        const parentFigure = $img.closest('figure');
        const parentFeatured = $img.closest('.featured-image');
        
        if (parentFigure.length) {
          captionText = parentFigure.find('figcaption').text();
        } else if (parentFeatured.length) {
          captionText = parentFeatured.find('.image-caption').text();
        }

        const finalAlt = ($img.attr('alt') || captionText || articleTitle)
          .replace(/\s+/g, ' ')
          .trim();

        const dirName = path.dirname(localInputPath);
        const baseName = path.basename(localInputPath, '.webp');
        const desktopPath = path.join(dirName, `${baseName}.webp`);
        const mobilePath = path.join(dirName, `${baseName}-sm.webp`);

        const image = sharp(localInputPath);
        const meta = await image.metadata();
        const originalWidth = meta.width || 1000;
        const ratio = (meta.height || 600) / originalWidth;
        const targetWidth = originalWidth > 1000 ? 1000 : originalWidth;

        // Proses Desktop (Overwrite original dengan optimasi)
        await image.rotate()
          .resize(targetWidth, null, { withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(desktopPath + '.tmp');
        fs.renameSync(desktopPath + '.tmp', desktopPath);

        // Proses Mobile
        if (originalWidth > 480) {
          await sharp(localInputPath)
            .rotate()
            .resize(480, null, { withoutEnlargement: true })
            .webp({ quality: 75 })
            .toFile(mobilePath);
        }

        const webDesktopUrl = `${BASE_URL}/${desktopPath.replace(/\\/g, '/')}`;
        const webMobileUrl = `${BASE_URL}/${mobilePath.replace(/\\/g, '/')}`;
        
        const pictureHtml = `
<picture style="display: block; text-align: center;">
  ${originalWidth > 480 ? `<source media="(max-width: 500px)" srcset="${webMobileUrl}">` : ''}
  <img src="${webDesktopUrl}" 
       alt="${finalAlt}" 
       width="${targetWidth}" 
       height="${Math.round(targetWidth * ratio)}" 
       style="max-width: 100%; height: auto; width: ${targetWidth}px; border-radius: 16px; display: inline-block;" 
       loading="lazy" 
       decoding="async">
</picture>`.trim();

        $img.replaceWith(pictureHtml);
      } catch (err) {
        console.error(`❌ ERROR: Gagal proses ${fileName}:`, err);
        stats.errors++;
        hasError = true;
        break;
      }
    }
  }

  if (!hasError) {
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(path.join(OUTPUT_DIR, fileName), $.html());
    stats.processed++;
    // console.log(`✅ PROCESSED: ${fileName}`);
  }
}

// EKSEKUSI UTAMA
const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`\n🔍 Memulai pemindaian ${files.length} file di folder /${SOURCE_DIR}...\n`);

for (const file of files) {
  await processHtmlFile(file);
}

// LOG RINGKASAN AKHIR
console.log(`---`);
console.log(`📊 RINGKASAN PROSES:`);
console.log(`   - Total File Ditemukan   : ${stats.total}`);
console.log(`   - Berhasil Diproses      : ${stats.processed}`);
console.log(`   - Dilewati (Tanpa Gambar): ${stats.skippedNoImages}`);
console.log(`   - Dilewati (Nama Invalid): ${stats.skippedInvalidName}`);
console.log(`   - Gagal/Error            : ${stats.errors}`);
console.log(`---\n✨ Selesai! Silakan cek folder /${OUTPUT_DIR}\n`);
