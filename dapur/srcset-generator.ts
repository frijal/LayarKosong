import { glob } from 'glob';
import { load } from 'cheerio';
import path from 'node:path';
import sharp from 'sharp';
import { writeFile, readFile, appendFile } from 'node:fs/promises';
import fs from 'node:fs';

const BASE_URL = 'https://dalam.web.id';
const SOURCE_DIR = 'artikel'; // Folder ini yang akan di-update di dalam runner
const CACHE_FILE = 'mini/srcset-gambar.txt';
const FORBIDDEN_CHARS = /[*:"<>|?]/g;

let stats = { total: 0, processed: 0, skipped: 0 };
let optimizedCache = new Set<string>();

// 1. Muat Cache (Jika ada)
if (fs.existsSync(CACHE_FILE)) {
  const content = fs.readFileSync(CACHE_FILE, 'utf-8');
  optimizedCache = new Set(content.split('\n').map(line => line.trim()).filter(Boolean));
}

async function processHtmlFile(filePath: string) {
  stats.total++;

  try {
    const htmlContent = await readFile(filePath, 'utf-8');
    const $ = load(htmlContent, { decodeEntities: false });
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

        // --- OPTIMASI GAMBAR (Hanya jika belum ada di cache) ---
        if (!optimizedCache.has(cleanPath)) {
          const targetWidth = meta.width > 1000 ? 1000 : meta.width;
          
          await imageInstance
            .rotate()
            .resize(targetWidth, null, { withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(path.resolve(desktopPath) + '.tmp');

          if (fs.existsSync(path.resolve(desktopPath) + '.tmp')) {
            if (fs.existsSync(path.resolve(desktopPath))) fs.unlinkSync(path.resolve(desktopPath));
            fs.renameSync(path.resolve(desktopPath) + '.tmp', path.resolve(desktopPath));
          }

          if (meta.width > 480) {
            await sharp(fullPathSource)
              .rotate()
              .resize(480, null, { withoutEnlargement: true })
              .webp({ quality: 75 })
              .toFile(path.resolve(mobileAbsPath(mobilePath)));
          }

          await appendFile(CACHE_FILE, `${cleanPath}\n`);
          optimizedCache.add(cleanPath);
          console.log(` ✨ Sharp Optimized: ${cleanPath}`);
        }

        // --- TRANSFORMASI HTML (In-Memory Runner) ---
        imageCounter++;
        const originalAlt = $img.attr('alt')?.trim();
        let finalAlt = originalAlt || pageTitle;
        if (!originalAlt && imageCounter > 1) finalAlt = `${pageTitle} - ${imageCounter}`;

        const loadingAttr = isFirstImage ? 'eager' : 'lazy';
        const priorityAttr = isFirstImage ? 'fetchpriority="high"' : '';
        const targetWidth = meta.width > 1000 ? 1000 : meta.width;
        
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
        console.error(`❌ Skip ${cleanPath}: ${e.message}`);
      }
    }

    if (fileHasChanged) {
      // Menulis ulang file di folder artikel/ milik runner
      await writeFile(filePath, $.html());
      stats.processed++;
      console.log(`✅ File Updated for next step: ${path.basename(filePath)}`);
    }

  } catch (err) {
    console.error(`❌ Gagal: ${filePath}`);
  }
}

// Helper untuk path absolut mobile
function mobileAbsPath(p: string) { return path.resolve(p); }

// EKSEKUSI
const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`🚀 Runner Step: Mengolah ${files.length} file HTML & Gambar...\n`);

for (const f of files) {
  await processHtmlFile(f);
}

console.log(`\n📊 RINGKASAN RUNNER:\n------------------\nUpdate HTML : ${stats.processed}\nTotal File  : ${stats.total}\n`);
