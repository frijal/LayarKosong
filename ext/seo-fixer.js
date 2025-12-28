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

  // Regex sakti untuk menangkap URL Blogger di manapun (CSS atau JS)
  const bloggerRegex = /https:\/\/blogger\.googleusercontent\.com\/[^"']+\.(?:jpg|jpeg|png|webp|gif|JPG)/gi;

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const $ = load(rawContent, { decodeEntities: false });
    const baseName = path.basename(file, '.html');

    console.log(`\n🔍 Memproses: ${baseName}.html`);

    // --- 1. PROSES JAVASCRIPT & CSS (Isi Teks) ---
    // Kita scan semua tag <script> dan <style>
    const textTags = $('script, style').get();
    for (const tag of textTags) {
      let content = $(tag).text();
      let matches = content.match(bloggerRegex);

      if (matches) {
        // Gunakan Set supaya tidak download URL yang sama berulang kali
        const uniqueUrls = [...new Set(matches)];
        for (const extUrl of uniqueUrls) {
          const local = await mirrorAndConvert(extUrl);
          // Ganti semua kemunculan URL tersebut di dalam blok teks
          content = content.split(extUrl).join(local);
          console.log(`   📜 JS/CSS: Berhasil mengganti link ke ${local}`);
        }
        $(tag).text(content);
      }
    }

    // --- 2. PROSES INLINE STYLE (Atribut style="") ---
    $('[style]').each(async (i, el) => {
      let style = $(el).attr('style');
      let matches = style.match(bloggerRegex);
      if (matches) {
        for (const extUrl of matches) {
          const local = await mirrorAndConvert(extUrl);
          style = style.replace(extUrl, local);
        }
        $(el).attr('style', style);
      }
    });

    // --- 3. PROSES TAG HTML BIASA (img, a, data-*) ---
    const imgs = $('img').get();
    for (const el of imgs) {
      const $el = $(el);
      const attrs = ['src', 'data-src', 'data-fullsrc'];
      for (const attr of attrs) {
        const val = $el.attr(attr);
        if (val && val.startsWith('http') && !val.includes(baseUrl)) {
          const local = await mirrorAndConvert(val);
          $el.attr(attr, local);
        }
      }
    }

    const links = $('a').get();
    for (const el of links) {
      const $el = $(el);
      const val = $el.attr('href');
      if (val && val.startsWith('http') && !val.includes(baseUrl)) {
        if (bloggerRegex.test(val)) {
          const local = await mirrorAndConvert(val);
          $el.attr('href', local);
        }
      }
    }

    // --- 4. META TAGS & LD-JSON ---
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
  console.log('\n✅ SEO Fixer selesai. Gambar di JavaScript Array sudah migrasi ke lokal!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
