import fs from 'fs';
import { load } from 'cheerio';
import { glob } from 'glob';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

async function mirrorAndConvert(externalUrl, baseUrl) {
  try {
    const url = new URL(externalUrl);
    const baseHostname = new URL(baseUrl).hostname;

    if (url.hostname === baseHostname || url.hostname === 'localhost') {
      return externalUrl.replace(baseUrl, '');
    }

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
    return externalUrl;
  }
}

async function fixSEO() {
  const targetFolder = process.argv[2] || 'artikel';
  const files = await glob(`${targetFolder}/*.html`);
  const baseUrl = 'https://dalam.web.id';
  const bloggerRegex = /https:\/\/blogger\.googleusercontent\.com\/img\/[ab]\/[A-Za-z0-9\-_.]+/gi;

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const $ = load(rawContent, { decodeEntities: false });
    const baseName = path.basename(file, '.html');
    const articleTitle = $('title').text().replace(' - Layar Kosong', '').trim() || 'Layar Kosong';

    console.log(`\n🔍 Memproses: ${baseName}.html`);

    // --- 1. PROSES SEMUA ASSET (IMG, SCRIPT, CSS) ---
    const potentialAttrs = ['src', 'href', 'data-src', 'data-fullsrc', 'data-thumb'];
    const elements = $('img, a, div, span, figure').get();

    for (const el of elements) {
      const $el = $(el);
      for (const attr of potentialAttrs) {
        const val = $el.attr(attr);
        if (val && val.startsWith('http') && !val.startsWith(baseUrl) && !val.startsWith('/')) {
          if (val.includes('blogger.googleusercontent.com') || /\.(jpg|jpeg|png|webp|gif|JPG)/i.test(val)) {
            const local = await mirrorAndConvert(val, baseUrl);
            $el.attr(attr, local);
            if (el.name === 'img' && !$el.attr('alt')) $el.attr('alt', articleTitle);
          }
        }
      }
    }

    const textTags = $('script, style').get();
    for (const tag of textTags) {
      let content = $(tag).text();
      let matches = content.match(bloggerRegex);
      if (matches) {
        for (const extUrl of [...new Set(matches)]) {
          if (!extUrl.startsWith('/') && !extUrl.startsWith(baseUrl)) {
            const local = await mirrorAndConvert(extUrl, baseUrl);
            content = content.split(extUrl).join(`${baseUrl}${local}`);
          }
        }
        $(tag).text(content);
      }
    }

    // --- 2. SINKRONISASI METADATA (TWITTER AS MASTER) ---
    const twitterMeta = $('meta[name="twitter:image"]');
    let twitterImgUrl = twitterMeta.attr('content');

    // Pastikan twitter:image sudah dimirror jika dari blogger
    if (twitterImgUrl && twitterImgUrl.includes('blogger.googleusercontent.com') && !twitterImgUrl.startsWith(baseUrl)) {
      const local = await mirrorAndConvert(twitterImgUrl, baseUrl);
      twitterImgUrl = `${baseUrl}${local}`;
      twitterMeta.attr('content', twitterImgUrl);
    } else if (twitterImgUrl && twitterImgUrl.startsWith('/')) {
      twitterImgUrl = `${baseUrl}${twitterImgUrl}`;
      twitterMeta.attr('content', twitterImgUrl);
    }

    if (twitterImgUrl) {
      // Paksa OG Image mengikuti Twitter
      $('meta[property="og:image"]').attr('content', twitterImgUrl);
      $('meta[itemprop="image"]').attr('content', twitterImgUrl);

      // Sinkronisasi ke LD-JSON (Schema)
      const ldScript = $('script[type="application/ld+json"]');
      if (ldScript.length) {
        try {
          let ldData = JSON.parse(ldScript.text());
          const makeAbsolute = (url) => (url && url.startsWith('/') && !url.startsWith('http')) ? `${baseUrl}${url}` : url;

          // Update properti image utama
          if (ldData.image) {
            if (typeof ldData.image === 'object' && !Array.isArray(ldData.image)) {
              ldData.image.url = twitterImgUrl;
            } else {
              ldData.image = twitterImgUrl;
            }
          }

          // Bersihkan seluruh link blogger di dalam JSON dan arahkan ke twitterImgUrl jika itu gambar artikel
          const fixDeep = (obj) => {
            if (typeof obj === 'string') {
              if (obj.includes('blogger.googleusercontent.com')) return twitterImgUrl;
              if (obj.startsWith('/')) return makeAbsolute(obj);
            }
            if (obj !== null && typeof obj === 'object') {
              for (let key in obj) obj[key] = fixDeep(obj[key]);
            }
            return obj;
          };

          ldData = fixDeep(ldData);
          ldScript.text(JSON.stringify(ldData, null, 2));
        } catch (e) { }
      }
      console.log(`   🎯 Sync Success: OG & Schema mengikuti Twitter Image.`);
    }

    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer: Twitter master record applied to OG and Schema!');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
