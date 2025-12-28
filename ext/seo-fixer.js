import fs from 'fs';
import { load } from 'cheerio';
import { glob } from 'glob';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

async function mirrorAndConvert(externalUrl) {
  try {
    const url = new URL(externalUrl);
    const originalPath = url.pathname;
    const ext = path.extname(originalPath);
    const webpPathName = ext ? originalPath.replace(ext, '.webp') : `${originalPath}.webp`;

    const localPath = path.join('img', url.hostname, webpPathName);
    const dirPath = path.dirname(localPath);

    if (fs.existsSync(localPath)) {
      return `/${localPath.replace(/\\/g, '/')}`;
    }

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    console.log(`📥 Mirroring: ${url.hostname}...`);

    const response = await axios({
      url: externalUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    await sharp(response.data).webp({ quality: 85 }).toFile(localPath);
    return `/${localPath.replace(/\\/g, '/')}`;
  } catch (err) {
    console.error(`❌ Gagal Mirror ${externalUrl}:`, err.message);
    return externalUrl;
  }
}

async function fixSEO() {
  const targetFolder = process.argv[2] || 'artikel';
  const files = await glob(`${targetFolder}/*.html`);
  const baseUrl = 'https://dalam.web.id';
  const bloggerRegex = /https:\/\/blogger\.googleusercontent\.com\/[^"']+\.(?:jpg|jpeg|png|webp|gif|JPG)/gi;

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const $ = load(rawContent, { decodeEntities: false });
    const baseName = path.basename(file, '.html');

    console.log(`\n🔍 Scanning: ${baseName}.html`);

    // --- 1. RADAR ATRIBUT (img, a, figure, dll) ---
    // Kita sikat semua atribut yang berpotensi menyimpan link gambar
    const potentialAttrs = ['src', 'href', 'data-src', 'data-fullsrc', 'data-thumb'];
    const elements = $('img, a, div, span, figure').get();

    for (const el of elements) {
      const $el = $(el);
      for (const attr of potentialAttrs) {
        const val = $el.attr(attr);
        if (val && val.startsWith('http') && !val.includes(baseUrl)) {
          // Cek apakah ini link gambar atau domain Blogger
          if (bloggerRegex.test(val) || /\.(jpg|jpeg|png|webp|gif|JPG)/i.test(val)) {
            const local = await mirrorAndConvert(val);
            $el.attr(attr, local);
            console.log(`   ✅ Tag <${el.name}> attribute [${attr}] updated.`);
          }
        }
      }
    }

    // --- 2. RADAR INTERNAL TEKS (Script & Style) ---
    const textTags = $('script, style').get();
    for (const tag of textTags) {
      let content = $(tag).text();
      let matches = content.match(bloggerRegex);
      if (matches) {
        const uniqueUrls = [...new Set(matches)];
        for (const extUrl of uniqueUrls) {
          const local = await mirrorAndConvert(extUrl);
          content = content.split(extUrl).join(local);
        }
        $(tag).text(content);
        console.log(`   📜 Internal <${tag.name}> cleaned.`);
      }
    }

    // --- 3. RADAR INLINE STYLE ---
    $('[style]').each(async (i, el) => {
      let style = $(el).attr('style');
      if (style.includes('https://blogger.googleusercontent.com')) {
        let matches = style.match(bloggerRegex);
        if (matches) {
          for (const extUrl of matches) {
            const local = await mirrorAndConvert(extUrl);
            style = style.replace(extUrl, local);
          }
          $(el).attr('style', style);
        }
      }
    });

    // --- 4. META & LD-JSON (Schema) ---
    const metaSelectors = ['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[itemprop="image"]'];
    let currentBestImage = "";

    for (const selector of metaSelectors) {
      const $meta = $(selector);
      let content = $meta.attr('content');
      if (content && content.startsWith('http') && !content.includes(baseUrl)) {
        const local = await mirrorAndConvert(content);
        const finalUrl = `${baseUrl}${local}`;
        $meta.attr('content', finalUrl);
        if (!currentBestImage) currentBestImage = finalUrl;
      }
    }

    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer: Misi selesai. Semua jejak Blogger telah dihapus!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
