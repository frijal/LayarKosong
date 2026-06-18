import { Glob } from "bun";
import { load } from 'cheerio';
import path from 'node:path';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// --- KONFIGURASI ---
const BASE_URL      = 'https://dalam.web.id';
const TARGET_FOLDER = process.argv[2] || 'artikel';
const CHUNK_SIZE    = 10;

// --- HELPER UTILS ---
const escapeHtmlAttr = (text: string) => {
    if (!text) return '';
    return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const prepareDesc = (text: string) => escapeHtmlAttr(text.replace(/\s+/g, ' ').trim());

/** Normalisasi timestamp ke UTC ISO 8601 (Z); pakai fallback jika kosong/invalid */
const toUTCIso = (val: string | undefined, fallback: string): string => {
    if (!val) return fallback;
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
};

/**
 * Quick scan regex — baca date part dari published_time yang sudah ada.
 * Tidak pakai Cheerio agar cepat. Fallback ke hari ini jika tidak ada.
 */
const extractExistingDate = async (file: string): Promise<string> => {
    const content = await Bun.file(file).text();
    const match   = content.match(/article:published_time[^>]*content="(\d{4}-\d{2}-\d{2})/i);
    return match ? match[1] : new Date().toISOString().split('T')[0];
};

/**
 * Pre-generate fallback timestamps sebelum processing dimulai.
 *
 * - Tanggal dikunci dari published_time artikel yang sudah ada (jika tersedia)
 * - Fallback ke hari ini jika artikel belum punya published_time sama sekali
 * - Hanya bagian HH:MM:SS yang diacak — dijamin unik per tanggal
 * - Pool detik dikelola per tanggal agar artikel beda tanggal tidak saling bentrok
 */
const buildFallbackMap = async (files: string[]): Promise<Map<string, string>> => {
    const map       = new Map<string, string>();
    // Pass pertama: baca tanggal semua file secara paralel (hanya regex, tanpa Cheerio)
    const dateParts = await Promise.all(files.map(extractExistingDate));

    // Satu Set<number> per tanggal — cegah detik duplikat dalam tanggal yang sama
    const usedSecondsPerDate = new Map<string, Set<number>>();

    for (let i = 0; i < files.length; i++) {
        const file     = files[i];
        const datePart = dateParts[i]; // e.g. "2025-08-20"

        if (!usedSecondsPerDate.has(datePart)) {
            usedSecondsPerDate.set(datePart, new Set<number>());
        }
        const usedSeconds = usedSecondsPerDate.get(datePart)!;

        // Pilih detik acak yang belum dipakai dalam tanggal ini
        let sec: number;
        do { sec = Math.floor(Math.random() * 86_400); }
        while (usedSeconds.has(sec));
        usedSeconds.add(sec);

        const hh = Math.floor(sec / 3600).toString().padStart(2, '0');
        const mm = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
        const ss = (sec % 60).toString().padStart(2, '0');

        // Tanggal asli terkunci, hanya waktu yang bervariasi
        map.set(file, `${datePart}T${hh}:${mm}:${ss}.000Z`);
    }
    return map;
};

// --- CORE FUNCTIONS ---

async function mirrorAndConvert(externalUrl: string, baseUrl: string) {
    try {
        const url          = new URL(externalUrl);
        const baseHostname = new URL(baseUrl).hostname;

        if (url.hostname === baseHostname || url.hostname === 'localhost' || url.hostname === 'schema.org') {
            return externalUrl.replace(baseUrl, '');
        }

        const paramFormat = url.searchParams.get('format');
        const pathExt     = path.extname(url.pathname).toLowerCase();
        const detectedExt = paramFormat ? `.${paramFormat}` : pathExt;
        const cleanUrl    = externalUrl.split('?')[0];
        const fileHash    = Bun.hash(cleanUrl).toString(16);

        const isSvg    = detectedExt === '.svg';
        const isGif    = detectedExt === '.gif';
        const finalExt = (isSvg || isGif) ? detectedExt : '.webp';

        const safeHostname = url.hostname.replace(/[^a-z0-9.]/gi, '_');
        const localPath    = path.join('img', safeHostname, `${fileHash}${finalExt}`);

        const fileTarget = Bun.file(localPath);
        if (await fileTarget.exists()) return `/${localPath.replace(/\\/g, '/')}`;

        const response = await fetch(externalUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36' }
        });
        if (!response.ok) throw new Error(`Download Gagal: ${response.status}`);

        const buffer = Buffer.from(await response.arrayBuffer());
        await mkdir(path.dirname(localPath), { recursive: true });

        if (isSvg || isGif) {
            await Bun.write(localPath, buffer);
        } else {
            await sharp(buffer)
            .rotate()
            .webp({ quality: 100, effort: 6 })
            .toFile(localPath);
        }

        return `/${localPath.replace(/\\/g, '/')}`;
    } catch (err) {
        return externalUrl;
    }
}

async function processFile(file: string, baseUrl: string, fallbackTime: string) {
    const rawContent = await Bun.file(file).text();
    const baseName   = path.basename(file);
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
    const rawTitle        = $('title').text().trim() || 'Layar Kosong';
    const ogTitle         = rawTitle.replace(/\s*-\s*Layar Kosong$/i, '').trim();
    const seoTitle        = `${ogTitle} - Layar Kosong`;
    const escapedSeoTitle = escapeHtmlAttr(seoTitle);
    const escapedOgTitle  = escapeHtmlAttr(ogTitle);

    $('title').text(seoTitle);

    const cleanFileName = baseName.replace('.html', '');
    const canonicalUrl  = `${baseUrl}/artikel/${cleanFileName}`.replace(/\/$/, '');

    const rawMetaDesc    = $('meta[name="description"], meta[property="description"]').attr('content') || '';
    const rawOgDesc      = $('meta[property="og:description"]').attr('content') || '';
    const rawTwitterDesc = $('meta[name="twitter:description"]').attr('content') || '';

    // ✅ fallbackTime: tanggal asli terkunci, hanya waktu yang unik per artikel
    const publishedTime = toUTCIso($('meta[property="article:published_time"]').attr('content'), fallbackTime);
    const modifiedTime  = toUTCIso($('meta[property="article:modified_time"]').attr('content'), fallbackTime);

    const existingTags: string[] = [];
    $('meta[property="article:tag"]').each((_, el) => {
        const tag = $(el).attr('content');
        if (tag) existingTags.push(tag);
    });

    const firstP       = $('p').first().text().trim();
    const fallbackDesc = firstP ? prepareDesc(firstP.substring(0, 160)) : 'Layar Kosong - Catatan dan Opini.';

    const finalMetaDesc    = prepareDesc(rawMetaDesc || fallbackDesc);
    const finalOgDesc      = prepareDesc(rawOgDesc || rawMetaDesc || fallbackDesc);
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
    $('html')
    .attr('lang', 'id')
    .attr('prefix', 'og: https://ogp.me/ns# article: https://ogp.me/ns/article#');

    $([
        'link[rel="canonical"]',
        'link[rel="icon"]',
        'link[rel="shortcut icon"]',
        'link[rel="license"]',
        'link[rel="sitemap"]',
        'link[rel="search"]',
        'link[rel="manifest"]',
        'link[rel="alternate"]',
    ].join(', ')).remove();

    $('script[src="/ext/data-provider.js"]').remove();

    $([
        'meta[property^="og:"]',
        'meta[name^="twitter:"]',
        'meta[property^="twitter:"]',
        'meta[property^="article:"]',
        'meta[property="fb:app_id"]',
        'meta[property="fb:pages"]',
        'meta[name^="bluesky:"]',
        'meta[name^="fediverse:"]',
        'meta[itemprop="image"]',
        'meta[name="description"]',
        'meta[property="description"]',
        'meta[name="author"]',
        'meta[name="robots"]',
        'meta[name="googlebot"]',
        'meta[name="theme-color"]',
    ].join(', ')).remove();

    // --- 4. PENYUNTIKAN (INJECT) DATA BARU ---
   const metaTags = [
        // === 1. PRIORITAS UTAMA: METADATA UTAMA & IDENTITAS SITUS (WAJIB PALING ATAS) ===
        `<meta property="og:site_name" content="Layar Kosong">`,
        `<meta property="og:locale" content="id_ID">`,
        `<meta property="og:type" content="article">`,
        `<meta name="robots" content="index, max-snippet:-1, max-video-preview:-1, follow, max-image-preview:large">`,
        `<meta name="googlebot" content="max-image-preview:large">`,
        `<meta name="author" content="Fakhrul Rijal">`,
        `<meta name="theme-color" content="#00b0ed">`,

        // === 2. PRIORITAS KEDUA: URL CANONICAL & DOMAIN ===
        `<link rel="canonical" href="${canonicalUrl}">`,
        `<meta property="og:url" content="${canonicalUrl}">`,
        `<meta property="twitter:url" content="${canonicalUrl}">`,
        `<meta property="twitter:domain" content="https://dalam.web.id">`,

        // === 3. PRIORITAS KETIGA: JUDUL DAN DESKRIPSI (KRUSIAL UNTUK SNIPPET/PREVIEW) ===
        `<meta property="og:title" content="${escapedOgTitle}">`,
        `<meta name="twitter:title" content="${escapedOgTitle}">`,
        `<meta name="description" content="${finalMetaDesc}">`,
        `<meta property="og:description" content="${finalOgDesc}">`,
        `<meta name="twitter:description" content="${finalTwitterDesc}">`,

        // === 4. PRIORITAS KEEMPAT: PREVIEW GAMBAR (RICH MEDIA PREVIEW) ===
        `<meta property="og:image" content="${metaImgUrl}">`,
        `<meta name="twitter:image" content="${metaImgUrl}">`,
        `<meta property="og:image:alt" content="${escapedOgTitle}">`,
        `<meta property="og:image:width" content="1024">`,
        `<meta property="og:image:height" content="633">`,
        `<meta property="og:image:type" content="image/webp">`,

        // === 5. PRIORITAS KELIMA: CARD & INTEGRASI SOSIAL MEDIA (FACEBOOK, X, BLUESKY, FEDIVERSE) ===
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:widgets:new-embed-design" content="on">`,
        `<meta name="twitter:site" content="@responaja">`,
        `<meta name="twitter:creator" content="@responaja">`,
        `<meta name="bluesky:creator" content="@dalam.web.id">`,
        `<meta name="fediverse:creator" content="@frijal@mastodon.social">`,
        `<meta property="article:author" content="https://facebook.com/frijal">`,
        `<meta property="article:publisher" content="https://facebook.com/frijalpage">`,
        `<meta property="fb:app_id" content="175216696195384">`,
        `<meta property="fb:pages" content="917962134736490">`,

        // === 6. PRIORITAS KEENAM: FEEDS, ASSET ICONS, SITEMAP, LISENSI, & SCRIPTS ===
        `<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">`,
        `<link rel="manifest" href="/site.webmanifest">`,
        `<link rel="sitemap" type="application/xml" href="/sitemap.xml">`,
        `<link rel="alternate" type="application/rss+xml" title="Feed 30 artikel baru bikin." href="${baseUrl}/rss.xml">`,
        `<link rel="alternate" type="application/atom+xml" title="Atom 30 artikel baru bikin." href="${baseUrl}/atom.xml">`,
        `<link rel="search" type="application/opensearchdescription+xml" title="Layar Kosong" href="/opensearch.xml">`,
        `<link rel="license" href="https://creativecommons.org/licenses/by/4.0/">`,
        `<script defer src="/ext/data-provider.js"></script>`
    ];

    existingTags.forEach(tag => metaTags.push(`<meta property="article:tag" content="${tag}">`));
    metaTags.push(`<meta property="article:published_time" content="${publishedTime}">`);
    metaTags.push(`<meta property="article:modified_time" content="${modifiedTime}">`);

    head.prepend('\n    ' + metaTags.join('\n    ') + '\n');

    $('img').each((_, el) => {
        if (!$(el).attr('alt')) $(el).attr('alt', seoTitle);
    });

    const finalHtml = $.html()
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
    .replace(/^\s*[\r\n]/gm, "");

    await Bun.write(file, finalHtml);
}

async function fixSEO() {
    const baseUrl = BASE_URL;
    console.log('🧼 Memulai SEO Fixer (Bun Turbo TS Mode)...');
    const startTime = performance.now();

    const glob  = new Glob(`${TARGET_FOLDER}/*.html`);
    const files: string[] = [];
    for await (const file of glob.scan(".")) {
        files.push(file);
    }

    if (files.length === 0) {
        console.log(`⚠️ Tidak ada file HTML ditemukan di folder: ${TARGET_FOLDER}`);
        return;
    }

    // ✅ Pass 1: quick scan tanggal semua file (regex, tanpa Cheerio)
    // ✅ Pass 2: pre-generate fallback — tanggal asli terkunci, waktu unik per artikel
    const fallbackMap = await buildFallbackMap(files);
    console.log(`📅 ${fallbackMap.size} fallback timestamps di-pre-generate (tanggal asli terkunci, waktu unik).`);

    // ✅ Pass 3: full processing dengan Cheerio
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(file => processFile(file, baseUrl, fallbackMap.get(file)!)));
    }

    const duration = (performance.now() - startTime) / 1000;
    console.log(`\n✅ Selesai! ${files.length} artikel diproses dalam ${duration.toFixed(2)} detik.`);
}

fixSEO().catch(err => console.error(err));
