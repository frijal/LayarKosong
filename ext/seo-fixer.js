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

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const $ = load(rawContent, { decodeEntities: false });
    const baseName = path.basename(file, '.html');

    console.log(`\n🔍 Memproses: ${baseName}.html`);

    // --- 1. PROSES CSS (Tag <style> dan atribut style="") ---
    // Mencari pattern url('...') atau url("...") atau url(...)
    const cssUrlRegex = /url\(['"]?(https?:\/\/[^'")]+\.(?:jpg|jpeg|png|webp|gif|JPG))['"]?\)/gi;

    // A. Cek semua tag <style>
    const styles = $('style').get();
    for (const styleEl of styles) {
      let cssText = $(styleEl).text();
      let match;
      while ((match = cssUrlRegex.exec(cssText)) !== null) {
        const extUrl = match[1];
        if (!extUrl.includes(baseUrl)) {
          const local = await mirrorAndConvert(extUrl);
          cssText = cssText.replace(extUrl, local);
          console.log(`   🎨 CSS Style: Link Blogger diganti ke ${local}`);
        }
      }
      $(styleEl).text(cssText);
    }

    // B. Cek semua atribut style di semua tag
    const allElements = $('[style]').get();
    for (const el of allElements) {
      let inlineStyle = $(el).attr('style');
      let match;
      while ((match = cssUrlRegex.exec(inlineStyle)) !== null) {
        const extUrl = match[1];
        if (!extUrl.includes(baseUrl)) {
          const local = await mirrorAndConvert(extUrl);
          inlineStyle = inlineStyle.replace(extUrl, local);
          console.log(`   🎨 Inline Style: Link Blogger diganti ke ${local}`);
        }
      }
      $(el).attr('style', inlineStyle);
    }

    // --- 2. PROSES TAG HTML (img, a, data-*) ---
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
        if (/\.(jpg|jpeg|png|webp|gif|JPG)(\?.*)?$/i.test(val) || val.includes('blogger.googleusercontent.com')) {
          const local = await mirrorAndConvert(val);
          $el.attr('href', local);
        }
      }
    }

    // --- 3. PROSES META TAGS & LD-JSON ---
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

    // Update LD-JSON (Schema)
    const ldScript = $('script[type="application/ld+json"]');
    if (ldScript.length) {
      try {
        let ldData = JSON.parse(ldScript.text());
        if (!currentBestImage) {
          const fImg = $('img').first();
          const imgUrl = fImg.attr('src') || fImg.attr('data-src') || fImg.attr('data-fullsrc');
          currentBestImage = imgUrl ? (imgUrl.startsWith('http') ? imgUrl : `${baseUrl}${imgUrl}`) : `${baseUrl}/img/${baseName}.webp`;
        }
        ldData.image = currentBestImage;
        ldScript.text(JSON.stringify(ldData, null, 2));
      } catch (e) {}
    }

    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer selesai. Gambar di CSS (Background-url) sudah lokal!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
