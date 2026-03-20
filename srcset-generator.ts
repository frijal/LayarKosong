import { glob } from 'glob';
import { load } from 'cheerio';
import path from 'node:path';
import sharp from 'sharp';
import { mkdir, writeFile, readFile, rename } from 'node:fs/promises';
import fs from 'node:fs';

const BASE_URL = 'https://dalam.web.id';
const SOURCE_DIR = 'artikel';
const OUTPUT_DIR = 'output';

// Karakter yang dilarang oleh GitHub Actions & NTFS
const FORBIDDEN_CHARS = /[*:"<>|?]/g;

let stats = { total: 0, processed: 0, skipped: 0 };

async function discoverContainers(files: string[]) {
  const containers = new Set<string>(['figure', 'picture']);
  for (const file of files) {
    try {
      const html = await readFile(file, 'utf-8');
      const $ = load(html);
      $('body img').each((_, el) => {
        const $parent = $(el).parent();
        const tagName = $parent.prop('tagName')?.toLowerCase();
        const className = $parent.attr('class')?.split(' ').join('.');
        if (tagName) containers.add(className ? `${tagName}.${className}` : tagName);
      });
    } catch { /* skip */ }
  }
  return Array.from(containers).join(', ');
}

async function processHtmlFile(filePath: string, containerSelectors: string) {
  stats.total++;
  const fileName = path.basename(filePath);

  try {
    const htmlContent = await readFile(filePath, 'utf-8');
    const $ = load(htmlContent, { decodeEntities: false });

    const imageCandidates = $('body img').toArray().filter(el => {
      const src = $(el).attr('src');
      return src && (src.startsWith('/img/') || src.startsWith('img/') || src.includes(BASE_URL + '/img/'));
    });

    if (imageCandidates.length === 0) {
      stats.skipped++;
      return;
    }

    const articleTitle = ($('title').text().split(' - ')[0] || 'Layar Kosong').trim();
    let fileHasChanged = false;

    for (const el of imageCandidates) {
      const $img = $(el);
      let originalSrc = $img.attr('src')!;

      // 1. PATH MURNI (Hapus BASE_URL & slash awal)
      let cleanPath = originalSrc.replace(BASE_URL, '').replace(/^\/+/, '');
      const fullPathSource = path.join(process.cwd(), cleanPath);

      if (!fs.existsSync(fullPathSource)) continue;

      try {
        const imageInstance = sharp(fullPathSource);
        const meta = await imageInstance.metadata();
        if (!meta || !meta.width) continue;

        // 2. SANITISASI NAMA FILE (Penting!)
        const dirName = path.dirname(cleanPath);
        const baseNameOriginal = path.basename(cleanPath, '.webp');
        const baseNameSafe = baseNameOriginal.replace(FORBIDDEN_CHARS, '-');

        const desktopRelative = path.join(dirName, `${baseNameSafe}.webp`);
        const mobileRelative = path.join(dirName, `${baseNameSafe}-sm.webp`);

        // Path Fisik Absolut
        const desktopAbs = path.join(process.cwd(), desktopRelative);
        const mobileAbs = path.join(process.cwd(), mobileRelative);

        // Pastikan folder tujuan ada (terutama untuk path dalam)
        await mkdir(path.dirname(desktopAbs), { recursive: true });

        // Jika nama file berubah karena sanitisasi, rename file aslinya dulu
        if (baseNameSafe !== baseNameOriginal) {
          // Kami biarkan file asli, tapi simpan hasil optimasi ke nama yang aman
        }

        const targetWidth = meta.width > 1000 ? 1000 : meta.width;

        // Proses Sharp
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

        // 3. GENERATE URL AMAN (Web friendly)
        const webDesktopUrl = `${BASE_URL}/${desktopRelative.replace(/\\/g, '/')}`;
        const webMobileUrl = `${BASE_URL}/${mobileRelative.replace(/\\/g, '/')}`;

        const parent = $img.closest(containerSelectors);
        const caption = parent.length ? parent.find('figcaption, .image-caption, .caption').text().trim() : "";
        const finalAlt = ($img.attr('alt') || caption || articleTitle).replace(/\s+/g, ' ').trim();

        const pictureHtml = `
        <picture style="display: block; text-align: center;">
        ${originalWidth > 480 ? `<source media="(max-width: 500px)" srcset="${webMobileUrl}">` : ''}
        <img src="${webDesktopUrl}"
        alt="${finalAlt}"
        width="${targetWidth}"
        height="${Math.round(targetWidth * (meta.height / originalWidth))}"
        style="max-width: 100%; height: auto; width: ${targetWidth}px; border-radius: 16px; display: inline-block;"
        loading="lazy"
        decoding="async">
        </picture>`.trim();

        $img.replaceWith(pictureHtml);
        fileHasChanged = true;

      } catch (e) { continue; }
    }

    if (fileHasChanged) {
      const outputFilePath = path.join(OUTPUT_DIR, fileName);
      await mkdir(path.dirname(outputFilePath), { recursive: true });
      await writeFile(outputFilePath, $.html());
      stats.processed++;
    } else {
      stats.skipped++;
    }

  } catch (err) { stats.skipped++; }
}

const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`🔍 Discovery...`);
const selectors = await discoverContainers(files);

console.log(`🚀 Memproses ${files.length} file...`);
for (const f of files) await processHtmlFile(f, selectors);

console.log(`\n✅ Selesai!\n📊 Berhasil: ${stats.processed}\n📊 Skip: ${stats.skipped}\n`);