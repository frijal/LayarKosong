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

    // --- PROTEKSI: Jangan mirror domain sendiri ---
    if (url.hostname === baseHostname || url.hostname === 'localhost') {
      return externalUrl.replace(baseUrl, '');
    }

    const originalPath = url.pathname;
    const ext = path.extname(originalPath);
    // Konversi ke .webp untuk semua asset eksternal
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

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const $ = load(rawContent, { decodeEntities: false });
    const baseName = path.basename(file, '.html');
    const articleTitle = $('title').text().replace(' - Layar Kosong', '').trim() || 'Layar Kosong';

    console.log(`\n🔍 Memproses: ${baseName}.html`);

    // --- 1. PROSES SEMUA ASSET DI BODY (UNIVERSAL MIRRORING) ---
    const potentialAttrs = ['src', 'href', 'data-src', 'data-fullsrc', 'data-thumb'];
    const elements = $('img, a, div, span, figure').get();

    for (const el of elements) {
      const $el = $(el);
      for (const attr of potentialAttrs) {
        const val = $el.attr(attr);
        // Sikat semua domain luar (bukan baseUrl & bukan path lokal /)
        if (val && val.startsWith('http') && !val.startsWith(baseUrl) && !val.startsWith('/')) {
          const local = await mirrorAndConvert(val, baseUrl);
          $el.attr(attr, local);
          if (el.name === 'img' && !$el.attr('alt')) $el.attr('alt', articleTitle);
        }
      }
    }

    // --- 2. SINKRONISASI METADATA (TWITTER AS MASTER) ---
    const twitterMeta = $('meta[name="twitter:image"]');
    let twitterImgUrl = twitterMeta.attr('content');

    // Cek apakah twitter:image butuh mirroring (Universal: ItsFoss, Blogger, dll)
    if (twitterImgUrl && twitterImgUrl.startsWith('http') && !twitterImgUrl.startsWith(baseUrl)) {
      const local = await mirrorAndConvert(twitterImgUrl, baseUrl);
      twitterImgUrl = `${baseUrl}${local}`;
      twitterMeta.attr('content', twitterImgUrl);
    } else if (twitterImgUrl && twitterImgUrl.startsWith('/')) {
      twitterImgUrl = `${baseUrl}${twitterImgUrl}`;
      twitterMeta.attr('content', twitterImgUrl);
    }

    if (twitterImgUrl) {
      // Paksa OG & Itemprop mengikuti hasil akhir Twitter Image
      $('meta[property="og:image"]').attr('content', twitterImgUrl);
      $('meta[itemprop="image"]').attr('content', twitterImgUrl);

      // Sinkronisasi ke LD-JSON (Schema)
      const ldScript = $('script[type="application/ld+json"]');
      if (ldScript.length) {
        try {
          let ldData = JSON.parse(ldScript.text());
          const makeAbsolute = (url) => (url && url.startsWith('/') && !url.startsWith('http')) ? `${baseUrl}${url}` : url;

          // Update properti image utama Schema
          if (ldData.image) {
            if (typeof ldData.image === 'object' && !Array.isArray(ldData.image)) {
              ldData.image.url = twitterImgUrl;
            } else {
              ldData.image = twitterImgUrl;
            }
          }

          // Fungsi pembersih rekursif: Ganti link eksternal apa pun di JSON menjadi twitterImgUrl
          const fixDeep = (obj) => {
            if (typeof obj === 'string') {
              // Jika masih ada link http dari luar di dalam JSON, ganti dengan Master Image
              if (obj.startsWith('http') && !obj.startsWith(baseUrl)) return twitterImgUrl;
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
      console.log(`   🎯 Sync Success: OG & Schema mengikuti ${twitterImgUrl}`);
    }

    fs.writeFileSync(file, $.html(), 'utf8');
  }
  console.log('\n✅ SEO Fixer: Selesai! Semua domain eksternal disikat habis.');
}

fixSEO().catch(err => { console.error(err); process.exit(1); });
