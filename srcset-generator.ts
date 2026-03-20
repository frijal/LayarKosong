import { glob } from 'glob';
import { load } from 'cheerio';
import path from 'node:path';
import sharp from 'sharp';
import { writeFile, readFile } from 'node:fs/promises';
import fs from 'node:fs';

const BASE_URL = 'https://dalam.web.id';
const SOURCE_DIR = 'artikel';
const FORBIDDEN_CHARS = /[*:"<>|?]/g;

let stats = { total: 0, processed: 0, skipped: 0 };

async function processHtmlFile(filePath: string) {
  stats.total++;

  try {
    const htmlContent = await readFile(filePath, 'utf-8');
    const $ = load(htmlContent, { decodeEntities: false });

    // Mengambil judul dari tag <title> dan membersihkan brand suffix
    const pageTitle = $('title').first().text().split(' - ')[0].trim() || 'Layar Kosong';

    const imageCandidates = $('body img').toArray().filter(el => {
      const src = $(el).attr('src');
      return src && (src.startsWith('/img/') || src.startsWith('img/') || src.includes('/img/'));
    });

    if (imageCandidates.length === 0) {
      stats.skipped++;
      return;
    }

    let fileHasChanged = false;
    let isFirstImage = true;

    // --- [UPDATE: COUNTER UNTUK ALT UNIQUE] ---
    let imageCounter = 0;

    for (const el of imageCandidates) {
      const $img = $(el);
      const originalSrc = $img.attr('src')!;

      const cleanPath = originalSrc
      .replace(BASE_URL, '')
      .replace(/^https?:\/\/dalam\.web\.id/, '')
      .replace(/^\/+/, '');

      const fullPathSource = path.resolve(cleanPath);

      if (!fs.existsSync(fullPathSource)) continue;

      try {
        const imageInstance = sharp(fullPathSource);
        const meta = await imageInstance.metadata();
        if (!meta || !meta.width || !meta.height) continue;

        const dirName = path.dirname(cleanPath);
        const baseNameOriginal = path.basename(cleanPath, '.webp');
        const baseNameSafe = baseNameOriginal.replace(FORBIDDEN_CHARS, '-');

        const desktopPath = path.join(dirName, `${baseNameSafe}.webp`);
        const mobilePath = path.join(dirName, `${baseNameSafe}-sm.webp`);

        const desktopAbs = path.resolve(desktopPath);
        const mobileAbs = path.resolve(mobilePath);

        // 1. Generate Versi Desktop
        const targetWidth = meta.width > 1000 ? 1000 : meta.width;
        await imageInstance
        .rotate()
        .resize(targetWidth, null, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(desktopAbs + '.tmp');

        if (fs.existsSync(desktopAbs + '.tmp')) {
          if (fs.existsSync(desktopAbs)) fs.unlinkSync(desktopAbs);
          fs.renameSync(desktopAbs + '.tmp', desktopAbs);
        }

        // 2. Generate Versi Mobile
        if (meta.width > 480) {
          await sharp(fullPathSource)
          .rotate()
          .resize(480, null, { withoutEnlargement: true })
          .webp({ quality: 75 })
          .toFile(mobileAbs);
        }

        // --- [LOGIKA ALT TEXT UNIQUE] ---
        imageCounter++;
        const originalAlt = $img.attr('alt')?.trim();

        let finalAlt = originalAlt && originalAlt !== '' ? originalAlt : pageTitle;

        // Jika menggunakan fallback (pageTitle) dan ini bukan gambar pertama, tambahkan nomor
        if ((!originalAlt || originalAlt === '') && imageCounter > 1) {
          finalAlt = `${pageTitle} - ${imageCounter}`;
        }

        // Optimasi LCP
        const loadingAttr = isFirstImage ? 'eager' : 'lazy';
        const priorityAttr = isFirstImage ? 'fetchpriority="high"' : '';

        const webDesktopUrl = `${BASE_URL}/${desktopPath.replace(/\\/g, '/')}`;
        const webMobileUrl = `${BASE_URL}/${mobilePath.replace(/\\/g, '/')}`;

        const pictureHtml = `
        <picture style="display: block; text-align: center;">
        ${meta.width > 480 ? `<source media="(max-width: 500px)" srcset="${webMobileUrl}">` : ''}
        <img src="${webDesktopUrl}"
        ${priorityAttr}
        alt="${finalAlt.replace(/"/g, '&quot;')}"
        width="${targetWidth}"
        height="${Math.round(targetWidth * (meta.height / meta.width))}"
        style="max-width: 100%; height: auto; width: ${targetWidth}px; border-radius: 16px; display: inline-block;"
        loading="${loadingAttr}"
        decoding="async">
        </picture>`.trim();

        $img.replaceWith(pictureHtml);
        fileHasChanged = true;
        isFirstImage = false;

      } catch (e: any) {
        console.error(`   ❌ Error Sharp (${path.basename(cleanPath)}): ${e.message}`);
        continue;
      }
    }

    if (fileHasChanged) {
      await writeFile(filePath, $.html());
      stats.processed++;
      console.log(`✅ Updated: ${path.basename(filePath)}`);
    } else {
      stats.skipped++;
    }

  } catch (err) {
    console.error(`❌ Gagal memproses ${filePath}`);
    stats.skipped++;
  }
}

// JALANKAN PROSES
const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`🚀 Memproses ${files.length} file dengan Alt-Unique numbering...\n`);

for (const f of files) {
  await processHtmlFile(f);
}

console.log(`\n📊 RINGKASAN:\n------------------\nBerhasil diupdate: ${stats.processed}\nTetap (Skip)     : ${stats.skipped}\nTotal File       : ${stats.total}\n`);