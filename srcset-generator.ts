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
 * Memindai file untuk mencari semua selector container gambar yang unik
 */
async function discoverContainers(files: string[]) {
  const containers = new Set<string>(['figure', 'picture']); // Default targets

  for (const file of files) {
    try {
      const html = await readFile(file, 'utf-8');
      const $ = load(html);
      $('body img').each((_, el) => {
        const $parent = $(el).parent();
        const tagName = $parent.prop('tagName')?.toLowerCase();
        const className = $parent.attr('class')?.split(' ').join('.');
        if (tagName) {
          containers.add(className ? `${tagName}.${className}` : tagName);
        }
      });
    } catch { /* skip discovery error */ }
  }
  return Array.from(containers).join(', ');
}

// ... (bagian atas tetap sama)

async function processHtmlFile(filePath: string, containerSelectors: string) {
  stats.total++;
  const fileName = path.basename(filePath);

  try {
    const htmlContent = await readFile(filePath, 'utf-8');
    const $ = load(htmlContent, { decodeEntities: false });

    const imageCandidates = $('body img').toArray().filter(el => {
      const $img = $(el);
      const src = $img.attr('src');
      // Kita buat lebih fleksibel: pokoknya yang ada kata 'img' atau mengarah ke internal
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

      // Normalisasi Path: Hilangkan BASE_URL jika ada
      let cleanSrc = src.replace(BASE_URL, '');
      if (cleanSrc.startsWith('/')) cleanSrc = cleanSrc.substring(1);

      // Coba cari file di lokasi relatif
      const localInputPath = path.resolve(process.cwd(), cleanSrc);

      if (!fs.existsSync(localInputPath)) {
        // LOG DEBUG: Aktifkan ini jika masih 0 untuk tahu script nyari ke mana
         console.log(`🔍 File tak ditemukan: ${localInputPath}`);
        continue;
      }

      if (INVALID_CHARS.test(path.basename(localInputPath))) continue;

      try {
        const imageInstance = sharp(localInputPath);
        const meta = await imageInstance.metadata().catch(() => null);
        if (!meta || !meta.width) continue;

        const dirName = path.dirname(localInputPath);
        const baseName = path.basename(localInputPath, '.webp');
        const desktopPath = path.join(dirName, `${baseName}.webp`);
        const mobilePath = path.join(dirName, `${baseName}-sm.webp`);

        const originalWidth = meta.width;
        const targetWidth = originalWidth > 1000 ? 1000 : originalWidth;

        // Proses gambar
        const desktopBuffer = await imageInstance.rotate().resize(targetWidth, null, { withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
        await writeFile(desktopPath, desktopBuffer);

        if (originalWidth > 480) {
          await sharp(localInputPath).rotate().resize(480, null, { withoutEnlargement: true }).webp({ quality: 75 }).toFile(mobilePath);
        }

        // Generate URL untuk HTML (Pastikan pakai forward slash)
        const webDesktopUrl = `${BASE_URL}/img/${baseName}.webp`;
        const webMobileUrl = `${BASE_URL}/img/${baseName}-sm.webp`;

        const pictureHtml = `
        <picture style="display: block; text-align: center;">
        ${originalWidth > 480 ? `<source media="(max-width: 500px)" srcset="${webMobileUrl}">` : ''}
        <img src="${webDesktopUrl}"
        alt="${($img.attr('alt') || articleTitle).replace(/\s+/g, ' ').trim()}"
        width="${targetWidth}"
        height="${Math.round(targetWidth * (meta.height! / originalWidth))}"
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

// EKSEKUSI UTAMA
const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`\n🔍 Fase 1: Discovery (Memetakan struktur blok di ${files.length} file)...`);
const dynamicSelectors = await discoverContainers(files);

console.log(`\n🔍 Fase 2: Transformasi (Menggunakan deteksi blok cerdas)...`);
for (const file of files) {
  await processHtmlFile(file, dynamicSelectors);
}

console.log(`---`);
console.log(`📊 RINGKASAN FINAL:`);
console.log(`   - Total File Dipindai : ${stats.total}`);
console.log(`   - Berhasil Diproses   : ${stats.processed}`);
console.log(`   - Skip/Tanpa Gambar   : ${stats.skipped}`);
console.log(`---\n✨ Selesai! Cek folder /${OUTPUT_DIR}\n`);
