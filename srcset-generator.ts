import { glob } from 'glob';
import { load } from 'cheerio';
import path from 'node:path';
import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import fs from 'node:fs';

const BASE_URL = 'https://dalam.web.id';
const SOURCE_DIR = 'artikel';
const OUTPUT_DIR = 'output';

// Karakter yang dilarang oleh sistem file (NTFS/GitHub Artifacts)
const INVALID_CHARS = /[<>:"/\\|?*\r\n]/;

async function processHtmlFile(filePath: string) {
  const fileName = path.basename(filePath);
  const htmlContent = await readFile(filePath, 'utf-8');
  const $ = load(htmlContent, { decodeEntities: false });

  const rawTitle = $('title').text().trim() || 'Layar Kosong';
  const articleTitle = rawTitle.replace(/\s*-\s*Layar Kosong$/i, '').trim();

  const imgElements = $('img').toArray();
  let hasError = false;

  for (const el of imgElements) {
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
      // --- LOGIKA SKIP ---
      // Cek apakah nama file mengandung karakter terlarang seperti *
      if (INVALID_CHARS.test(path.basename(localInputPath))) {
        console.warn(`⚠️ SKIP: File "${fileName}" dilewati karena nama gambar tidak valid: ${localInputPath}`);
        hasError = true;
        break; // Keluar dari loop gambar untuk file HTML ini
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

        // Proses Gambar
        const image = sharp(localInputPath);
        const meta = await image.metadata();

        const originalWidth = meta.width || 1000;
        const ratio = (meta.height || 600) / originalWidth;
        const targetWidth = originalWidth > 1000 ? 1000 : originalWidth;

        await image.rotate()
          .resize(targetWidth, null, { withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(desktopPath + '.tmp');
        fs.renameSync(desktopPath + '.tmp', desktopPath);

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
       style="max-width: 100%; height: auto; width: ${targetWidth}px; border-radius: 24px; display: inline-block;" 
       loading="lazy" 
       decoding="async">
</picture>`.trim();

        $img.replaceWith(pictureHtml);
      } catch (err) {
        console.error(`❌ Gagal proses gambar di ${fileName}:`, err);
        hasError = true;
        break;
      }
    }
  }

  // Hanya tulis ke folder output jika tidak ada error/skip pada file ini
  if (!hasError) {
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(path.join(OUTPUT_DIR, fileName), $.html());
    console.log(`✅ BERHASIL: ${fileName}`);
  }
}

const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`🔍 Memproses ${files.length} file...`);

for (const file of files) {
  await processHtmlFile(file);
}
