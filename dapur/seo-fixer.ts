import { Glob } from "bun";
import { load } from 'cheerio';
import path from 'node:path';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// --- KONFIGURASI ---
const BASE_URL = 'https://dalam.web.id';
const TARGET_FOLDER = process.argv[2] || 'artikel';

// --- HELPER UTILS ---
const escapeHtmlAttr = (text: string) => {
    if (!text) return '';
    return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '’')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const prepareDesc = (text: string) => escapeHtmlAttr(text.replace(/\s+/g, ' ').trim());

// --- CORE FUNCTIONS ---

async function mirrorAndConvert(externalUrl: string, baseUrl: string) {
    try {
        const url = new URL(externalUrl);
        const baseHostname = new URL(baseUrl).hostname;

        // Filter Internal atau URL Skema
        if (url.hostname === baseHostname || url.hostname === 'localhost' || url.hostname === 'schema.org') {
            return externalUrl.replace(baseUrl, '');
        }

        // --- LOGIKA PENAMAAN FILE (DENGAN HASH) ---
        // Menggunakan Hash agar URL panjang (seperti Facebook) tetap aman di filesystem
        const fileHash = Bun.hash(externalUrl).toString(16);
        let ext = path.extname(url.pathname).split('?')[0].toLowerCase(); // Buang query string dari ekstensi

        const isSvg = ext === '.svg';
        const isGif = ext === '.gif';
        const finalExt = (isSvg || isGif) ? ext : '.webp';

        const safeHostname = url.hostname.replace(/[^a-z0-9.]/gi, '_');
        const localPath = path.join('img', safeHostname, `${fileHash}${finalExt}`);

        // Cek jika file sudah ada
        const fileTarget = Bun.file(localPath);
        if (await fileTarget.exists()) return `/${localPath.replace(/\\/g, '/')}`;

        // Download dengan Header agar tidak diblokir CDN (Facebook/Cloudflare)
        const response = await fetch(externalUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                     'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
            }
        });
        if (!response.ok) throw new Error(`Download Gagal: ${response.status}`);

        const buffer = Buffer.from(await response.arrayBuffer());
        await mkdir(path.dirname(localPath), { recursive: true });

        // --- PROSES SHARP ---
        if (isSvg || isGif) {
            await Bun.write(localPath, buffer);
        } else {
            // Ubah semua format (JPG/PNG/HEIC) ke WebP
            await sharp(buffer)
            .rotate() // Menjaga orientasi foto HP agar tidak miring
            .webp({ quality: 85, effort: 6 })
            .toFile(localPath);
        }

        return `/${localPath.replace(/\\/g, '/')}`;
    } catch (err) {
        // console.error(`Gagal memproses: ${externalUrl}`);
        return externalUrl;
    }
}

async function processFile(file: string, baseUrl: string) {
    const rawContent = await Bun.file(file).text();
    const baseName = path.basename(file);
    console.log(`🚀 SEO Turbo: ${baseName}`);

    const $ = load(rawContent, { decodeEntities: false });
    const head = $('head');

    // 1. MIRRORING GAMBAR DALAM BODY
    const imgElements = $('img').toArray();
    await Promise.all(imgElements.map(async (el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('http')) {
            const localPath = await mirrorAndConvert(src, baseUrl);
            if (localPath.startsWith('/img')) $(el).attr('src', `${baseUrl}${localPath}`);
        }
    }));

    // --- 2. LOGIKA DATA SEO ---
    const articleTitle = $('title').text().split(' - ')[0].trim() || 'Layar Kosong';
    const escapedTitle = escapeHtmlAttr(articleTitle);
    const cleanFileName = baseName.replace('.html', '');
    const canonicalUrl = `${baseUrl}/artikel/${cleanFileName}`.replace(/\/$/, '');

    const rawMetaDesc = $('meta[name="description"], meta[property="description"]').attr('content') || '';
    const rawOgDesc = $('meta[property="og:description"]').attr('content') || '';
    const rawTwitterDesc = $('meta[name="twitter:description"]').attr('content') || '';

    let publishedTime = $('meta[property="article:published_time"]').attr('content');
    let modifiedTime = $('meta[property="article:modified_time"]').attr('content');

    const now = new Date().toISOString();
    if (!publishedTime) publishedTime = now;
    if (!modifiedTime) modifiedTime = now;

    const existingTags: string[] = [];
    $('meta[property="article:tag"]').each((_, el) => {
        const tag = $(el).attr('content');
        if (tag) existingTags.push(tag);
    });

        const firstP = $('p').first().text().trim();
        const fallbackDesc = firstP ? prepareDesc(firstP.substring(0, 160)) : 'Layar Kosong - Catatan dan Opini.';

        const finalMetaDesc = prepareDesc(rawMetaDesc || fallbackDesc);
        const finalOgDesc = prepareDesc(rawOgDesc || rawMetaDesc || fallbackDesc);
        const finalTwitterDesc = prepareDesc(rawTwitterDesc || rawMetaDesc || fallbackDesc);

        let metaImgUrl = $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('img').first().attr('src') ||
        '/thumbnail.webp';

        if (metaImgUrl && metaImgUrl.startsWith('http')) {
            const mirroredPath = await mirrorAndConvert(metaImgUrl, baseUrl);
            if (mirroredPath.startsWith('/img')) {
                metaImgUrl = `${baseUrl}${mirroredPath}`;
            }
        } else if (metaImgUrl.startsWith('/')) {
            metaImgUrl = `${baseUrl}${metaImgUrl}`;
        }

        // --- 3. OPERASI STERILISASI (CLEANUP) ---
        $('html').attr('lang', 'id').attr('prefix', 'og: https://ogp.me/ns# article: https://ogp.me/ns/article#');
        $('link[rel="canonical"], link[rel="icon"], link[rel="shortcut icon"], link[rel="license"]').remove();
        $('meta[name="description"], meta[property="description"], meta[property="og:description"], meta[name="og:description"], meta[name="twitter:description"], meta[property="twitter:description"]').remove();
        $('meta[property^="og:"], meta[name^="twitter:"], meta[property^="twitter:"], meta[property^="article:"], meta[itemprop="image"], meta[name^="bluesky:"], meta[name^="fediverse:"]').remove();
        $('meta[name="author"], meta[name="robots"], meta[name="googlebot"], meta[name="theme-color"], meta[property="fb:app_id"]').remove();

        // --- 4. PENYUNTIKAN (INJECT) DATA BARU ---
        const metaTags = [
            `<meta property="og:locale" content="id_ID">`,
            `<link rel="canonical" href="${canonicalUrl}">`,
            `<meta property="og:url" content="${canonicalUrl}">`,
            `<meta property="twitter:url" content="${canonicalUrl}">`,
            `<meta property="og:site_name" content="Layar Kosong">`,
            `<link rel="icon" href="/favicon.ico">`,
            `<link rel="sitemap" type="application/xml" href="/sitemap.xml">`,
            `<link rel="search" type="application/opensearchdescription+xml" title="Layar Kosong" href="/opensearch.xml">`,
            `<link rel="manifest" href="/site.webmanifest">`,
            `<meta name="twitter:card" content="summary_large_image">`,
            `<meta name="twitter:widgets:new-embed-design" content="on">`,
            `<meta property="og:title" content="${escapedTitle}">`,
            `<meta name="twitter:title" content="${escapedTitle}">`,
            `<meta name="description" content="${finalMetaDesc}">`,
            `<meta property="og:description" content="${finalOgDesc}">`,
            `<meta name="twitter:description" content="${finalTwitterDesc}">`,
            `<meta property="twitter:domain" content="https://dalam.web.id">`,
            `<meta property="og:type" content="article">`,
            `<meta name="robots" content="index, max-snippet:-1, max-video-preview:-1, follow, max-image-preview:large">`,
            `<meta name="author" content="Fakhrul Rijal">`,
            `<link rel="license" href="https://creativecommons.org/publicdomain/zero/1.0/">`,
            `<meta name="twitter:creator" content="@responaja">`,
            `<meta name="bluesky:creator" content="@dalam.web.id">`,
            `<meta name="fediverse:creator" content="@frijal@mastodon.social">`,
            `<meta name="googlebot" content="max-image-preview:large">`,
            `<meta name="twitter:site" content="@responaja">`,
            `<meta property="article:author" content="https://facebook.com/frijal">`,
            `<meta property="article:publisher" content="https://facebook.com/frijalpage">`,
            `<meta property="fb:app_id" content="175216696195384">`,
            `<meta itemprop="image" content="${metaImgUrl}">`,
            `<meta name="twitter:image" content="${metaImgUrl}">`,
            `<meta property="twitter:image" content="${metaImgUrl}">`,
            `<meta property="og:image" content="${metaImgUrl}">`,
            `<meta property="og:image:alt" content="${escapedTitle}">`,
            `<meta property="og:image:width" content="1200">`,
            `<meta property="og:image:height" content="675">`,
            `<meta name="theme-color" content="#00b0ed">`
        ];

        existingTags.forEach(tag => metaTags.push(`<meta property="article:tag" content="${tag}">`));
        if (publishedTime) metaTags.push(`<meta property="article:published_time" content="${publishedTime}">`);
        if (modifiedTime) metaTags.push(`<meta property="article:modified_time" content="${modifiedTime}">`);

        head.append('\n    ' + metaTags.join('\n    ') + '\n');

        $('img').each((_, el) => {
            if (!$(el).attr('alt')) $(el).attr('alt', articleTitle);
        });

            await Bun.write(file, $.html());
}

async function fixSEO() {
    const baseUrl = BASE_URL;
    console.log('🧼 Memulai SEO Fixer (Bun Turbo TS Mode)...');
    const startTime = performance.now();

    const glob = new Glob(`${TARGET_FOLDER}/*.html`);
    const files: string[] = [];
    for await (const file of glob.scan(".")) {
        files.push(file);
    }

    if (files.length === 0) {
        console.log(`⚠️ Tidak ada file HTML ditemukan di folder: ${TARGET_FOLDER}`);
        return;
    }

    const CHUNK_SIZE = 5;
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(file => processFile(file, baseUrl)));
    }

    const duration = (performance.now() - startTime) / 1000;
    console.log(`\n✅ Selesai! ${files.length} file diproses dalam ${duration.toFixed(2)} detik.`);
}

fixSEO().catch(err => console.error(err));