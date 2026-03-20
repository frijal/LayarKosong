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

let stats = {
  total: 0,
  processed: 0,
  skipped: 0
};

async function processHtmlFile(filePath: string) {
  stats.total++;
  const fileName = path.basename(filePath);

  try {
    const htmlContent = await readFile(filePath, 'utf-8');
    const $ = load(htmlContent, { decodeEntities: false });

    // Cek gambar hanya di body
    const bodyImages = $('body img').toArray();
    if (bodyImages.length === 0) {
      stats.skipped++;
      return;
    }

    const rawTitle = $('title').text().trim() || 'Layar Kosong';
    const articleTitle = rawTitle.replace(/\s*-\s*Layar Kosong$/i, '').trim();

    let fileHasIssue = false;

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

      // Validasi: File harus ada dan nama harus bersih dari karakter aneh (*)
      if (!localInputPath || !fs.existsSync(localInputPath) || INVALID_CHARS.test(path.basename(localInputPath))) {
        fileHasIssue = true;
        break;
      }

      try {
        const imageInstance = sharp(localInputPath);
        const meta = await imageInstance.metadata().catch(() => null);

        // Jika metadata gagal dibaca (format tak didukung/korup), skip file ini
        if (!meta || !meta.width || !meta.height) {
          fileHasIssue = true;
          break;
        }

        const dirName = path.dirname(localInputPath);
        const baseName = path.basename(localInputPath, '.webp');
        const desktopPath = path.join(dirName, `${baseName}.webp`);
        const mobilePath = path.join(dirName, `${baseName}-sm.webp`);

        const originalWidth = meta.width;
        const ratio = meta.height / originalWidth;
        const targetWidth = originalWidth > 1000 ? 1000 : originalWidth;

        // Gunakan buffer agar tidak konflik baca-tulis pada file yang sama
        const desktopBuffer = await imageInstance
        .rotate()
        .resize(targetWidth, null, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

        await writeFile(desktopPath, desktopBuffer);

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
        alt="${($img.attr('alt') || articleTitle).replace(/\s+/g, ' ').trim()}"
        width="${targetWidth}"
        height="${Math.round(targetWidth * ratio)}"
        style="max-width: 100%; height: auto; width: ${targetWidth}px; border-radius: 16px; display: inline-block;"
        loading="lazy"
        decoding="async">
        </picture>`.trim();

        $img.replaceWith(pictureHtml);

      } catch (e) {
        fileHasIssue = true;
        break;
      }
    }

    if (!fileHasIssue) {
      await mkdir(OUTPUT_DIR, { recursive: true });
      await writeFile(path.join(OUTPUT_DIR, fileName), $.html());
      stats.processed++;
    } else {
      stats.skipped++;
    }

  } catch (err) {
    stats.skipped++;
  }
}

// EKSEKUSI
const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`🔍 Memproses ${files.length} file...`);

for (const file of files) {
  await processHtmlFile(file);
}

console.log(`\n✅ Selesai!`);
console.log(`📊 Berhasil : ${stats.processed}`);
console.log(`📊 Dilewati : ${stats.skipped}`);