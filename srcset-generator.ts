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

let stats = { total: 0, processed: 0, skipped: 0 };

/**
 * FUNGSI DYNAMIC DISCOVERY
 * Mencari semua jenis pembungkus gambar agar bisa menangkap caption/alt dengan akurat.
 */
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
      const $img = $(el);
      const src = $img.attr('src');
      const isInternal = src && (src.startsWith('/img/') || src.startsWith('img/') || src.startsWith(BASE_URL));
      const hasPicture = $img.closest('picture').length > 0;
      return isInternal && !hasPicture;
    });

    if (imageCandidates.length === 0) {
      stats.skipped++;
      return;
    }

    const articleTitle = ($('title').text().split(' - ')[0] || 'Layar Kosong').trim();
    let fileHasProcessedAnyImage = false;

    for (const el of imageCandidates) {
      const $img = $(el);
      let src = $img.attr('src')!;
      
      // 1. NORMALISASI PATH FISIK
      let cleanPath = src.replace(BASE_URL, '');
      if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
      
      const localInputPath = path.resolve(process.cwd(), cleanPath);

      if (!fs.existsSync(localInputPath) || INVALID_CHARS.test(path.basename(localInputPath))) continue;

      try {
        const imageInstance = sharp(localInputPath);
        const meta = await imageInstance.metadata().catch(() => null);
        if (!meta || !meta.width || !meta.height) continue;

        // 2. LOGIKA FOLDER RECURSIVE
        const dirName = path.dirname(cleanPath); // Misal: img/blogger.../b/
        const baseName = path.basename(cleanPath, '.webp');
        
        // Path fisik untuk simpan file
        const desktopFilePath = path.resolve(process.cwd(), dirName, `${baseName}.webp`);
        const mobileFilePath = path.resolve(process.cwd(), dirName, `${baseName}-sm.webp`);

        const originalWidth = meta.width;
        const targetWidth = originalWidth > 1000 ? 1000 : originalWidth;

        // Proses Sharp
        const desktopBuffer = await imageInstance.rotate().resize(targetWidth, null, { withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
        await writeFile(desktopFilePath, desktopBuffer);

        if (originalWidth > 480) {
          await sharp(localInputPath).rotate().resize(480, null, { withoutEnlargement: true }).webp({ quality: 75 }).toFile(mobileFilePath);
        }

        // 3. NORMALISASI URL WEB (Menjaga struktur folder asli)
        const webDesktopUrl = `${BASE_URL}/${dirName.replace(/\\/g, '/')}/${baseName}.webp`;
        const webMobileUrl = `${BASE_URL}/${dirName.replace(/\\/g, '/')}/${baseName}-sm.webp`;
        
        // Cari Caption dari container terdekat hasil discovery
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
        fileHasProcessedAnyImage = true;

      } catch (e) { continue; }
    }

    if (fileHasProcessedAnyImage) {
      await mkdir(OUTPUT_DIR, { recursive: true });
      await writeFile(path.join(OUTPUT_DIR, fileName), $.html());
      stats.processed++;
    } else {
      stats.skipped++;
    }

  } catch (err) { stats.skipped++; }
}

// MAIN EXECUTION
const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`\n🔍 Fase 1: Discovery (Mendeteksi struktur blok unik)...`);
const dynamicSelectors = await discoverContainers(files);

console.log(`\n🔍 Fase 2: Transformasi (Memproses ${files.length} file)...`);
for (const file of files) {
  await processHtmlFile(file, dynamicSelectors);
}

console.log(`\n✅ Selesai!\n📊 Berhasil: ${stats.processed}\n📊 Skip: ${stats.skipped}\n`);
