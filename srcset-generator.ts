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

// ... (Bagian atas tetap sama)

async function processHtmlFile(filePath: string, containerSelectors: string) {
  stats.total++;
  const fileName = path.basename(filePath);

  try {
    const htmlContent = await readFile(filePath, 'utf-8');
    const $ = load(htmlContent, { decodeEntities: false });

    const imageCandidates = $('body img').toArray().filter(el => {
      const src = $(el).attr('src');
      // Pastikan hanya ambil yang internal
      return src && (src.startsWith('/img/') || src.startsWith('img/') || src.includes(BASE_URL + '/img/'));
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

      // 1. NORMALISASI PATH (PENTING!)
      // Kita bersihkan semua embel-embel agar tersisa path murni dari root project
      let cleanPath = src.replace(BASE_URL, '').replace(/^\/+/, '');

      // Sekarang cleanPath seharusnya: "img/folder/gambar.webp"
      const localInputPath = path.join(process.cwd(), cleanPath);

      // DEBUG: Aktifkan baris di bawah ini jika masih 0 untuk lihat script nyari ke mana
      // console.log(`🔎 Mencari file di: ${localInputPath}`);

      if (!fs.existsSync(localInputPath)) {
        continue; // Jika file fisik tidak ada, skip gambarnya saja
      }

      try {
        const imageInstance = sharp(localInputPath);
        const meta = await imageInstance.metadata();
        if (!meta || !meta.width) continue;

        const originalWidth = meta.width;
        const targetWidth = originalWidth > 1000 ? 1000 : originalWidth;

        // Tentukan folder tujuan (sama dengan folder asal)
        const dirName = path.dirname(localInputPath);
        const baseName = path.basename(localInputPath, '.webp');

        const desktopFilePath = path.join(dirName, `${baseName}.webp`);
        const mobileFilePath = path.join(dirName, `${baseName}-sm.webp`);

        // PROSES SHARP
        await imageInstance
        .rotate()
        .resize(targetWidth, null, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(desktopFilePath + '.tmp'); // Gunakan .tmp dulu biar nggak bentrok

        // Rename dari .tmp ke asli (untuk overwrite yang aman)
        if (fs.existsSync(desktopFilePath + '.tmp')) {
          fs.renameSync(desktopFilePath + '.tmp', desktopFilePath);
        }

        if (originalWidth > 480) {
          await sharp(localInputPath)
          .rotate()
          .resize(480, null, { withoutEnlargement: true })
          .webp({ quality: 75 })
          .toFile(mobileFilePath);
        }

        // 2. URL WEB (Tetap gunakan struktur folder asli)
        // Kita ambil folder dari cleanPath (misal: "img/blogger/...")
        const webDir = path.dirname(cleanPath).replace(/\\/g, '/');
        const webDesktopUrl = `${BASE_URL}/${webDir}/${baseName}.webp`;
        const webMobileUrl = `${BASE_URL}/${webDir}/${baseName}-sm.webp`;

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

      } catch (e) {
        // console.error(`❌ Error Sharp pada ${cleanPath}:`, e.message);
        continue;
      }
    }

    if (fileHasProcessedAnyImage) {
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

// MAIN EXECUTION
const files = await glob(`${SOURCE_DIR}/*.html`);
console.log(`\n🔍 Fase 1: Discovery (Mendeteksi struktur blok unik)...`);
const dynamicSelectors = await discoverContainers(files);

console.log(`\n🔍 Fase 2: Transformasi (Memproses ${files.length} file)...`);
for (const file of files) {
  await processHtmlFile(file, dynamicSelectors);
}

console.log(`\n✅ Selesai!\n📊 Berhasil: ${stats.processed}\n📊 Skip: ${stats.skipped}\n`);
