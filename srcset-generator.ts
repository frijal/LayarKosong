import { glob } from 'glob';
import { load } from 'cheerio';
import path from 'node:path';
import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
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

    // Mencari gambar yang berasal dari domain eksternal (Blogger/Medium) yang sudah di-mirror ke /img/
    const imageCandidates = $('body img').toArray().filter(el => {
      const src = $(el).attr('src');
      return src && (src.startsWith('/img/') || src.startsWith('img/') || src.includes('/img/'));
    });

    if (imageCandidates.length === 0) {
      stats.skipped++;
      return;
    }

    let fileHasChanged = false;

    for (const el of imageCandidates) {
      const $img = $(el);
      const originalSrc = $img.attr('src')!;

      // Normalisasi path agar bisa dibaca filesystem
      const cleanPath = originalSrc
      .replace(BASE_URL, '')
      .replace(/^https?:\/\/dalam\.web\.id/, '')
      .replace(/^\/+/, '');

      const fullPathSource = path.resolve(cleanPath);

      // Cek apakah file asli ada
      if (!fs.existsSync(fullPathSource)) continue;

      try {
        const imageInstance = sharp(fullPathSource);
        const meta = await imageInstance.metadata();
        if (!meta || !meta.width || !meta.height) continue;

        // Sanitisasi nama file untuk menghindari karakter terlarang
        const dirName = path.dirname(cleanPath);
        const baseNameOriginal = path.basename(cleanPath, '.webp');
        const baseNameSafe = baseNameOriginal.replace(FORBIDDEN_CHARS, '-');

        const desktopPath = path.join(dirName, `${baseNameSafe}.webp`);
        const mobilePath = path.join(dirName, `${baseNameSafe}-sm.webp`);

        const desktopAbs = path.resolve(desktopPath);
        const mobileAbs = path.resolve(mobilePath);

        // 1. Generate Versi Desktop (Max width 1000px)
        const targetWidth = meta.width > 1000 ? 1000 : meta.width;
        await imageInstance
        .rotate()
        .resize(targetWidth, null, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(desktopAbs + '.tmp');

        // Swap file temp ke asli
        if (fs.existsSync(desktopAbs + '.tmp')) {
          if (fs.existsSync(desktopAbs)) fs.unlinkSync(desktopAbs);
          fs.renameSync(desktopAbs + '.tmp', desktopAbs);
        }

        // 2. Generate Versi Mobile (Width 480px) jika gambar cukup besar
        if (meta.width > 480) {
          await sharp(fullPathSource)
          .rotate()
          .resize(480, null, { withoutEnlargement: true })
          .webp({ quality: 75 })
          .toFile(mobileAbs);
        }

        // 3. Update HTML dengan format <picture>
        const webDesktopUrl = `${BASE_URL}/${desktopPath.replace(/\\/g, '/')}`;
        const webMobileUrl = `${BASE_URL}/${mobilePath.replace(/\\/g, '/')}`;

        const pictureHtml = `
        <picture style="display: block; text-align: center;">
        ${meta.width > 480 ? `<source media="(max-width: 500px)" srcset="${webMobileUrl}">` : ''}
        <img src="${webDesktopUrl}"
        alt="${($img.attr('alt') || 'Layar Kosong').replace(/\s+/g, ' ').trim()}"
        width="${targetWidth}"
        height="${Math.round(targetWidth * (meta.height / meta.width))}"
        style="max-width: 100%; height: auto; width: ${targetWidth}px; border-radius: 16px; display: inline-block;"
        loading="lazy"
        decoding="async">
        </picture>`.trim();

        $img.replaceWith(pictureHtml);
        fileHasChanged = true;

      } catch (e: any) {
        console.error(`   ❌ Error Sharp (${path.basename(cleanPath)}): ${e.message}`);
        continue;
      }
    }

    if (fileHasChanged) {
      // LANGSUNG TIMPA FILE ASLI
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
console.log(`🚀 Memproses ${files.length} file secara langsung ke folder ${SOURCE_DIR}/ dan img/...\n`);

for (const f of files) {
  await processHtmlFile(f);
}

console.log(`\n📊 RINGKASAN:\n------------------\nBerhasil diupdate: ${stats.processed}\nTetap (Skip)     : ${stats.skipped}\nTotal File       : ${stats.total}\n`);