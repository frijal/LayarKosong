import { glob } from 'glob';
import { load } from 'cheerio';
import path from 'node:path';
import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import fs from 'node:fs';

const BASE_URL = 'https://dalam.web.id';
const SOURCE_DIR = 'artikel';
const OUTPUT_DIR = 'output';
const FORBIDDEN_CHARS = /[*:"<>|?]/g;

let stats = { total: 0, processed: 0, skipped: 0 };
let globalDebugCount = 0;

async function processHtmlFile(filePath: string) {
  stats.total++;
  const fileName = path.basename(filePath);

  try {
    const htmlContent = await readFile(filePath, 'utf-8');
    const $ = load(htmlContent, { decodeEntities: false });

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
      let originalSrc = $img.attr('src')!;

      // LOGIC PATH: Mencoba membersihkan URL menjadi path lokal
      let cleanPath = originalSrc
      .replace(BASE_URL, '')
      .replace(/^https?:\/\/dalam\.web\.id/, '')
      .replace(/^\/+/, ''); // Menghilangkan / di awal agar jadi 'img/...'

      const fullPathSource = path.join(process.cwd(), cleanPath);

      // DEBUG LOG: Kita cetak 20 sampel pertama untuk analisa
      if (globalDebugCount < 20) {
        console.log(`--- DEBUG INFO #${globalDebugCount} ---`);
        console.log(`HTML File    : ${fileName}`);
        console.log(`Original SRC : ${originalSrc}`);
        console.log(`Clean Path   : ${cleanPath}`);
        console.log(`Full Path    : ${fullPathSource}`);
        console.log(`File Exists? : ${fs.existsSync(fullPathSource)}`);
        globalDebugCount++;
      }

      if (!fs.existsSync(fullPathSource)) continue;

      try {
        const imageInstance = sharp(fullPathSource);
        const meta = await imageInstance.metadata();
        if (!meta || !meta.width || !meta.height) continue;

        // Sanitisasi Nama File
        const dirName = path.dirname(cleanPath);
        const baseNameOriginal = path.basename(cleanPath, '.webp');
        const baseNameSafe = baseNameOriginal.replace(FORBIDDEN_CHARS, '-');

        const desktopRelative = path.join(dirName, `${baseNameSafe}.webp`);
        const mobileRelative = path.join(dirName, `${baseNameSafe}-sm.webp`);

        const desktopAbs = path.join(process.cwd(), desktopRelative);
        const mobileAbs = path.join(process.cwd(), mobileRelative);

        // Pastikan folder tujuan ada
        await mkdir(path.dirname(desktopAbs), { recursive: true });

        const targetWidth = meta.width > 1000 ? 1000 : meta.width;

        // Optimasi Gambar
        await imageInstance
        .rotate()
        .resize(targetWidth, null, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(desktopAbs + '.tmp');

        if (fs.existsSync(desktopAbs + '.tmp')) {
          if (fs.existsSync(desktopAbs)) fs.unlinkSync(desktopAbs);
          fs.renameSync(desktopAbs + '.tmp', desktopAbs);
        }

        if (meta.width > 480) {
          await sharp(fullPathSource)
          .rotate()
          .resize(480, null, { withoutEnlargement: true })
          .webp({ quality: 75 })
          .toFile(mobileAbs);
        }

        // Update HTML
        const webDesktopUrl = `${BASE_URL}/${desktopRelative.replace(/\\/g, '/')}`;
        const webMobileUrl = `${BASE_URL}/${mobileRelative.replace(/\\/g, '/')}`;

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
        console.log(`❌ Sharp Error pada ${cleanPath}: ${e.message}`);
        continue;
      }
    }

    if (fileHasChanged) {
      const outputFilePath = path.join(OUTPUT_DIR, fileName);
      await mkdir(path.dirname(outputFilePath), { recursive: true });
      await writeFile(outputFilePath, $.html());
      stats.processed++;
    } else {
      stats.skipped++;
    }

  } catch (err) {
    stats.skipped++;
  }
}

// EXECUTION
const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`🚀 Memulai Diagnostik pada ${files.length} file...`);
console.log(`CWD saat ini: ${process.cwd()}`);

for (const f of files) {
  await processHtmlFile(f);
}

console.log(`\n✅ Selesai!\n📊 Berhasil: ${stats.processed}\n📊 Skip: ${stats.skipped}\n`);