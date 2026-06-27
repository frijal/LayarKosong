import { promises as fs } from 'fs';
import { titleToCategory } from './titleToCategory.ts';

const C = {
root: `${import.meta.dir}/..`,
art:  `${import.meta.dir}/../artikel`,
base: 'https://dalam.web.id',
limit: 30,
cats: ['gaya-hidup', 'jejak-sejarah', 'lainnya', 'olah-media', 'opini-sosial', 'sistem-terbuka', 'warta-tekno']
};

// --- KAMUS KATEGORI UNTUK META TAG SEO ---
const CATEGORY_LABELS: Record<string, string> = {
"gaya-hidup": "Budaya, Kuliner, Lifestyle",
"jejak-sejarah": "Jejak Sejarah",
"lainnya": "Lainnya",
"olah-media": "Multimedia, Editing",
"opini-sosial": "Catatan, Sosial",
"sistem-terbuka": "Linux, Open Source",
"warta-tekno": "Windows, Teknologi Umum"
};

const getCategoryLabel = (catSlug: string) => {
return CATEGORY_LABELS[catSlug] || catSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};
// -----------------------------------------

const BASE_RE = C.base.replace(/\./g, '\\.');

/** Bersihkan HTML Entities menjadi teks murni */
const decodeHTML = (str: string) => {
const entities: Record<string, string> = {
'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
'&#39;': "'", '&apos;': "'", '&bull;': '•', '&ndash;': '–',
'&mdash;': '—', '&nbsp;': ' '
};
let t = str.replace(/&[a-z0-9#]+;/gi, (m) => entities[m.toLowerCase()] || m);
t = t.replace(/&#(\d+);/g,        (_, dec) => String.fromCharCode(parseInt(dec, 10)));
t = t.replace(/&#x([a-f0-9]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
return t.trim();
};

// Langsung ambil UTC murni untuk YYYY-MM-DD
const buildDate = new Date().toISOString().split('T')[0];

const slug = (t: any) => t.toString().toLowerCase().trim()
.replace(/^[^\w\s]*/u, '')
.replace(/ & /g, '-and-')
.replace(/[^a-z0-9\s-]/g, '')
.replace(/\s+/g, '-')
.replace(/-+/g, '-');

// Fungsi ISO: Format UTC Mutlak berakhiran 'Z'
const iso = (d: any) => {
const parsed = new Date(d);
const base   = isNaN(parsed.getTime()) ? new Date() : parsed;
return base.toISOString();
};

const sanitize = (r: string) => r.replace(/^\p{Emoji_Presentation}\s*/u, '').trim();

const mime = (u: string) =>
({ png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' }[u.split('.').pop()!] || 'image/jpeg');

const escapeAttr = (s: string) => s.replace(/"/g, '&quot;');

const escapeXML = (s: string) => s
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;');

const safeCDATA = (s: string) => s.replace(/]]>/g, ']]]]><![CDATA[>');

const imgSize = async (url: string): Promise<number> => {
try {
if (!url.startsWith(C.base)) return 0;
return (await fs.stat(url.replace(C.base, C.root))).size;
} catch {
return 0;
}
};

/** Menghitung waktu root feed yang logis, tetap dalam koridor waktu UTC */
const calculateFeedRootDate = (items: any[]): Date => {
const now = new Date();
if (!items || items.length === 0) return now;

const newestItemDate = new Date(items[0].lastmod);

if (now.getTime() <= newestItemDate.getTime()) {
const randomFeedOffset = Math.floor(Math.random() * (180000 - 60000 + 1)) + 60000;
return new Date(newestItemDate.getTime() + randomFeedOffset);
}
return now;
};

const buildRss = (
t: string,
items: any[],
link: string,
desc: string,
sizes: Map<string, number> = new Map()
) => {
const rootDate = calculateFeedRootDate(items);
return `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/rss.xsl"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title><![CDATA[${safeCDATA(decodeHTML(t))}]]></title><link>${escapeXML(C.base)}/</link><description><![CDATA[${safeCDATA(desc)}]]></description><language>id-ID</language><atom:link href="${escapeXML(link)}" rel="self" type="application/rss+xml"/><lastBuildDate>${rootDate.toUTCString()}</lastBuildDate>${items.map(it =>
`<item><title><![CDATA[${safeCDATA(decodeHTML(it.title))}]]></title><link>${escapeXML(it.loc)}</link><guid>${escapeXML(it.loc)}</guid><description><![CDATA[${safeCDATA(it.desc || sanitize(decodeHTML(it.title)))}]]></description><pubDate>${new Date(it.lastmod).toUTCString()}</pubDate><category><![CDATA[${safeCDATA(it.category)}]]></category><enclosure url="${escapeXML(it.img)}" length="${sizes.get(it.img) ?? 0}" type="${mime(it.img)}"/></item>`
).join('')}</channel></rss>`;
};

const buildAtom = (
t: string,
items: any[],
feedUrl: string,
desc: string,
sizes: Map<string, number> = new Map()
) => {
const rootDate = calculateFeedRootDate(items);
return `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/atom.xsl"?><feed xmlns="http://www.w3.org/2005/Atom" xml:lang="id-ID"><title>${escapeXML(decodeHTML(t))}</title><subtitle>${escapeXML(desc)}</subtitle><link href="${escapeXML(C.base)}/" rel="alternate"/><link href="${escapeXML(feedUrl)}" rel="self" type="application/atom+xml"/><id>${escapeXML(C.base)}/</id><updated>${rootDate.toISOString()}</updated>${items.map(it =>
`<entry><title>${escapeXML(decodeHTML(it.title))}</title><link href="${escapeXML(it.loc)}" rel="alternate"/><link rel="enclosure" href="${escapeXML(it.img)}" type="${mime(it.img)}" length="${sizes.get(it.img) ?? 0}"/><id>${escapeXML(it.loc)}</id><updated>${it.lastmod}</updated><published>${it.lastmod}</published><author><name>Fakhrul Rijal</name></author><category term="${escapeXML(it.category)}"/><summary type="html"><![CDATA[${safeCDATA(it.desc || sanitize(decodeHTML(it.title)))}]]></summary></entry>`
).join('')}</feed>`;
};

// ── Sitemap helpers ───────────────────────────────────────────────────────────

/** Bungkus string entries menjadi <urlset> lengkap per kategori */
const buildSitemapUrlset = (entries: string): string =>
`<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${entries}
</urlset>`;

/** Bangun sitemap.xml sebagai <sitemapindex> yang menunjuk ke sitemap per kategori */
const buildSitemapIndex = (items: { loc: string; lastmod: string }[]): string =>
`<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items.map(it => `
<sitemap>
<loc>${escapeXML(it.loc)}</loc>
<lastmod>${it.lastmod}</lastmod>
</sitemap>`).join('')}
</sitemapindex>`;

/**
* Hapus semua file sitemap-*.xml lama (numbered maupun kategori stale)
* sebelum nulis yang baru — cegah file zombie.
* sitemap.xml sendiri tidak tersentuh karena tidak punya dash.
*/
const cleanupOldSitemaps = async (): Promise<number> => {
const files = await fs.readdir(C.root).catch(() => []);
let removed = 0;
for (const f of files) {
if (/^sitemap-.+\.xml$/i.test(f)) {
await fs.rm(`${C.root}/${f}`, { force: true });
removed++;
}
}
return removed;
};

// ── Distribute helper ─────────────────────────────────────────────────────────

const distribute = async (f: string, cat: string, url: string, pre?: string) => {
const dir = `${C.root}/${slug(cat)}`;
await fs.mkdir(dir, { recursive: true });

let html = pre || await Bun.file(`${C.art}/${f}`).text();
const catLabel = getCategoryLabel(slug(cat));

html = html
.replace(/<link rel="canonical" href="[^"]+">/i,      `<link rel="canonical" href="${url}">`)
// INJEKSI META KATEGORI + REPLACE OG:URL
.replace(/<meta property="og:url" content="[^"]+">/i, `<meta property="og:url" content="${url}">\n    <meta property="article:section" content="${catLabel}">`)
// ✨ TAMBAHKAN BARIS INI UNTUK MEMPERBAIKI TWITTER:URL ✨
.replace(/<meta name="twitter:url" content="[^"]+">/i, `<meta name="twitter:url" content="${url}">`)
.replace(new RegExp(`${BASE_RE}/artikelx?/${f.replace('.html', '')}`, 'g'), url) // Tambahan 'x?' biar support folder /artikel/ atau /artikelx/
.replace(/\/artikelx?\/-\/([a-z-]+)(\.html)?\/?/g, '/$1');

await Bun.write(`${dir}/${f}`, html);
};

// =============================================================================
(async () => {
console.log('🚀 Diet Mode V9.2 - Absolute UTC Synchronization Activated');

const [eta, stm, mst] = await Promise.all([
Bun.file(`${C.root}/artikel.json`).json().catch(() => ({})),
Bun.file(`${C.root}/sitemap.txt`).text().catch(() => ''),
Bun.file(`${C.art}/artikel.json`).json().catch(() => ({}))
]);

const urls  = new Set(stm.split('\n').filter(Boolean));
const files = [...new Bun.Glob("*.html").scanSync(C.art)].filter(f => !f.startsWith('-'));
let final: any = {};
const flat:  any[] = [];
const valid = new Set();

for (const f of files) {
let d: any = null, cat: any = null;

for (const [c, its] of Object.entries(eta)) {
const found = (its as any[]).find(i => i[1] === f);
if (found) { d = [...found]; d[0] = decodeHTML(d[0]); cat = c; break; }
}

if (d) {
let targetCat = null;
for (const [mc, mits] of Object.entries(mst)) {
if ((mits as any[]).find(i => i[1] === f)) { targetCat = mc; break; }
}
if (!targetCat) targetCat = titleToCategory(d[0]);
if (cat !== targetCat) {
urls.delete(`${C.base}/${slug(cat)}/${f.replace('.html', '')}`);
d = null;
}
}

if (d && urls.has(`${C.base}/${slug(cat)}/${f.replace('.html', '')}`)) {
flat.push({ title: d[0], file: f, img: d[2], lastmod: d[3], desc: d[4], category: cat, loc: `${C.base}/${slug(cat)}/${f.replace('.html', '')}` });
valid.add(`${slug(cat)}/${f}`);
continue;
}

const txt  = await Bun.file(`${C.art}/${f}`).text();
const rawT = (
txt.match(/property="og:title" content="(.*?)"/i)?.[1] ||
txt.match(/<title>(.*?)<\/title>/i)?.[1].replace(/\s*-\s*Layar Kosong$/i, '') ||
'Tanpa Judul'
).trim();
const t = decodeHTML(rawT);

let c: any = null;
for (const [mc, mits] of Object.entries(mst)) {
if ((mits as any[]).find(i => i[1] === f)) { c = mc; break; }
}
if (!c) c = titleToCategory(t);

const url = `${C.base}/${slug(c)}/${f.replace('.html', '')}`;

let masterDate: string | null = null;
for (const [, mits] of Object.entries(mst)) {
const found = (mits as any[]).find(i => i[1] === f);
if (found?.[3]) { masterDate = found[3]; break; }
}
const date = masterDate
|| txt.match(/article:published_time" content="(.*?)"/i)?.[1]
|| (await fs.stat(`${C.art}/${f}`)).mtime;

const img  = txt.match(/(og|twitter):image" content="(.*?)"/i)?.[2] || `${C.base}/img/${f.replace('.html', '')}.webp`;
const desc = (txt.match(/description" content="(.*?)"/i)?.[1] || '').trim();

await distribute(f, c, url, txt);

// it.lastmod otomatis tersimpan sebagai string UTC (berakhiran Z) dari fungsi iso()
flat.push({ title: t, file: f, img, lastmod: iso(date), desc, category: c, loc: url });
urls.add(url);
valid.add(`${slug(c)}/${f}`);
}

flat.sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());

let lastProcessedTime = Infinity;
for (const it of flat) {
let currentItemTime = new Date(it.lastmod).getTime();

if (currentItemTime >= lastProcessedTime) {
const randomGap = Math.floor(Math.random() * (7 * 60000 - 60000 + 1)) + 60000;
currentItemTime = lastProcessedTime - randomGap;
}

lastProcessedTime = currentItemTime;
it.lastmod = iso(currentItemTime); // Selalu kembalikan dalam bentuk UTC ISO string
}

// JSON otomatis akan berisi string UTC
for (const it of flat) {
(final[it.category] ??= []).push([it.title, it.file, it.img, it.lastmod, it.desc]);
}

const finalSlugs = new Set(Object.keys(final).map(slug));

for (const s of C.cats) {
const d = `${C.root}/${s}`;
await fs.mkdir(d, { recursive: true });
for (const f of [...new Bun.Glob("*.html").scanSync(d)]) {
if (f !== 'index.html' && !valid.has(`${s}/${f}`)) {
await fs.unlink(`${d}/${f}`);
urls.delete(`${C.base}/${s}/${f.replace('.html', '')}`);
}
}

if (!finalSlugs.has(s)) {
await fs.rm(`${C.root}/feed-${s}.xml`, { force: true });
await fs.rm(`${C.root}/feed-${s}-atom.xml`, { force: true });
}
}

await Bun.write(`${C.root}/artikel.json`, JSON.stringify(final, null, 2));

// =====================================================================
// 🔥 GENERATE ARTIKEL-LITE.JSON (Untuk Marquee & Related Articles) 🔥
// =====================================================================
const LITE_LIMIT = 30;
const liteDb: Record<string, any[]> = {};

// Looping semua kategori di object 'final', potong sesuai batas LITE_LIMIT
for (const kategori in final) {
    liteDb[kategori] = final[kategori].slice(0, LITE_LIMIT);
}

// Cetak file JSON versi diet-nya (tanpa spasi/null 2 biar langsung padat)
await Bun.write(`${C.root}/artikel-lite.json`, JSON.stringify(liteDb));
console.log(`✅ ./artikel-lite.json : Berhasil dicetak dengan limit ${LITE_LIMIT} artikel/kategori`);
// =====================================================================

// ── Build sitemap per kategori ────────────────────────────────────────────
const globalSizes      = new Map<string, number>();
const sitemapByCategory = new Map<string, string[]>(); // catSlug → url entries

for (const it of flat) {
const [txt, size] = await Promise.all([
Bun.file(`${C.art}/${it.file}`).text(),
imgSize(it.img)
]);

globalSizes.set(it.img, size);

const vids = [...txt.matchAll(/<iframe[^>]+src="([^"]+)"/gi)]
.map(m => m[1])
.filter(s => !s.endsWith('.js'));

let videoXml = '';

vids.forEach(s => {
const id = s.match(/embed\/([^/?]+)/)?.[1];

if (id) {
const videoTitle = decodeHTML(it.title).substring(0, 100);
const videoDesc  = (it.desc || decodeHTML(it.title)).substring(0, 2048);

videoXml += `
<video:video>
<video:thumbnail_loc>https://img.youtube.com/vi/${id}/hqdefault.jpg</video:thumbnail_loc>
<video:title><![CDATA[${safeCDATA(videoTitle)}]]></video:title>
<video:description><![CDATA[${safeCDATA(videoDesc)}]]></video:description>
<video:player_loc>https://www.youtube.com/embed/${id}</video:player_loc>
<video:publication_date>${it.lastmod}</video:publication_date>
<video:family_friendly>yes</video:family_friendly>
</video:video>`;
}
});

// Kelompokkan entry per kategori — satu file sitemap per kategori
const catSlug = slug(it.category);
if (!sitemapByCategory.has(catSlug)) sitemapByCategory.set(catSlug, []);
sitemapByCategory.get(catSlug)!.push(`
<url>
<loc>${escapeXML(it.loc)}</loc>
<lastmod>${it.lastmod}</lastmod>
<image:image>
<image:loc>${escapeXML(it.img)}</image:loc>
</image:image>${videoXml}
</url>`);
}

// Hapus semua sitemap-*.xml lama (numbered lama + kategori stale) sebelum nulis baru
const removedOldSitemaps = await cleanupOldSitemaps();

// Bangun metadata + konten tiap sitemap kategori
// flat sudah sorted by date — artikel pertama tiap kategori = yang terbaru
const categorySitemapItems = [...sitemapByCategory.entries()].map(([catSlug, entries]) => {
const fileName = `sitemap-${catSlug}.xml`;
const latestInCat = flat.find(it => slug(it.category) === catSlug);
const lastmod     = latestInCat?.lastmod || new Date().toISOString();

return {
fileName,
loc:     `${C.base}/${fileName}`,
lastmod,
content: buildSitemapUrlset(entries.join('')),
count:   entries.length
};
});

// sitemap.xml = <sitemapindex> yang menunjuk ke semua sitemap kategori
const finalSitemapIndexContent = buildSitemapIndex(
categorySitemapItems.map(it => ({ loc: it.loc, lastmod: it.lastmod }))
);

await Promise.all([
// Tulis sitemap-{kategori}.xml untuk masing-masing kategori
...categorySitemapItems.map(it =>
Bun.write(`${C.root}/${it.fileName}`, it.content)
),
// sitemap.xml berisi <sitemapindex> yang menunjuk ke semua sitemap kategori
Bun.write(`${C.root}/sitemap.xml`, finalSitemapIndexContent),
Bun.write(`${C.root}/rss.xml`, buildRss(
'Layar Kosong',
flat.slice(0, C.limit),
`${C.base}/rss.xml`,
'RSS Feed artikel terbaru dari Layar Kosong',
globalSizes
)),
Bun.write(`${C.root}/atom.xml`, buildAtom(
'Layar Kosong',
flat.slice(0, C.limit),
`${C.base}/atom.xml`,
'Atom Feed artikel terbaru dari Layar Kosong',
globalSizes
)),
]);

console.log(`✅ Sitemap index dibuat : sitemap.xml`);
categorySitemapItems.forEach(it =>
console.log(`    📂 ${it.fileName.padEnd(32)} ${it.count} URL`)
);
console.log(`🧹 Sitemap lama dihapus : ${removedOldSitemaps} file`);
console.log('✅ Sitemap, JSON, RSS & Atom seluruhnya telah terkunci dalam zona waktu UTC!');

// ── Category pages ────────────────────────────────────────────────────────
const tmp = await Bun.file(`${C.art}/-/template-kategori.html`).text().catch(() => '');

// Parameter timeZone: 'UTC' dikunci agar tampilan tanggal konsisten di manapun script dijalankan
const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' });

if (tmp) {
for (const [cat, arts] of Object.entries(final)) {
const s                 = slug(cat);
const rUrl              = `${C.base}/feed-${s}.xml`;
const rAtomUrl          = `${C.base}/feed-${s}-atom.xml`;

// Mengambil label keren SEO dari kamus
const seoCategoryLabel  = getCategoryLabel(s);

const categoryArticlesHTML = (arts as any[])
.sort((a, b) => new Date(b[3]).getTime() - new Date(a[3]).getTime())
.map(a => {
const title         = sanitize(a[0]);
const cleanUrl      = a[1].replace('.html', '');
const image         = a[2];
const formattedDate = dateFormatter.format(new Date(a[3]));
const displayDesc   = sanitize((a[4] || a[0]).substring(0, 100) + '...');
return `
<a href="${cleanUrl}" class="article-card">
<div class="card-thumbnail">
<img src="${image}" alt="${escapeAttr(title)}" loading="lazy" width="300" height="200" onerror="this.src='/thumbnail.webp'">
</div>
<div class="card-content">
<h2>${title}</h2>
<p>${displayDesc}</p>
<span class="card-meta">${formattedDate}</span>
</div>
</a>`;
}).join('');

const pg = tmp
.replace(/%%TITLE%%/g, seoCategoryLabel) // SEO Friendly Title
.replace(/%%DESCRIPTION%%/g, seoCategoryLabel) // SEO Friendly Description Meta
.replace(/%%CATEGORY_NAME%%/g, seoCategoryLabel) // SEO Friendly H1 / Text Content
.replace(/%%RSS_URL%%/g,               rUrl)
.replace(/%%ATOM_URL%%/g,              rAtomUrl)
.replace(/%%CANONICAL_URL%%/g,         `${C.base}/${s}`)
.replace(/%%ICON%%/g,                  cat.match(/(\p{Emoji})/u)?.[0] || '📁')
.replace('<span id="category-title-text">Memuat...</span>', `<span id="category-title-text">${seoCategoryLabel}</span>`)
.replace('<div id="loading">Memuat...</div>', '')
.replace('<div id="article-grid"></div>', `<div id="article-grid">${categoryArticlesHTML}`);

const catItems = (arts as any[]).map(a => ({
title: a[0], file: a[1], img: a[2], lastmod: a[3], desc: a[4],
category: cat,
loc: `${C.base}/${s}/${a[1].replace('.html', '')}`
})).slice(0, C.limit);

await Promise.all([
Bun.write(`${C.root}/${s}/index.html`, pg),
Bun.write(`${C.root}/feed-${s}.xml`, buildRss(
`Kategori ${seoCategoryLabel}`, // Disesuaikan agar RSS Feed juga berbau SEO
catItems, rUrl,
`Artikel ${seoCategoryLabel}`,
globalSizes
)),
Bun.write(`${C.root}/feed-${s}-atom.xml`, buildAtom(
`Kategori ${seoCategoryLabel}`, // Disesuaikan agar Atom Feed juga berbau SEO
catItems, rAtomUrl,
`Artikel ${seoCategoryLabel}`,
globalSizes
)),
]);
}
}

// ── Feed page (HTML statis) ───────────────────────────────────────────────
const feedTemplate = await Bun.file(`${C.art}/-/template-feed.html`).text().catch(() => '');

if (feedTemplate) {
const feedItemsHTML = flat.slice(0, C.limit).map(it => {
const encodedLink = encodeURIComponent(it.loc);
const encodedText = encodeURIComponent(it.desc || it.title);
// Parameter timeZone: 'UTC' dikunci di sini juga
const displayDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(it.lastmod));

// CleanCat juga di-update untuk mengambil dari label kamus (opsional tapi bagus untuk tampilan UI)
const cleanCat = getCategoryLabel(slug(it.category));

return `
<div class="feed-item">
<div class="feed-item-thumbnail">
<img src="${it.img}" alt="${escapeAttr(it.title)}" loading="lazy">
</div>
<div class="feed-item-content">
<h2><a href="${it.loc}" rel="noreferrer">${it.title}</a></h2>
<div class="feed-meta">
<span class="feed-meta-item"><i class="fa-solid fa-calendar-alt"></i><span>${displayDate}</span></span>
<span class="feed-meta-item"><i class="fa-solid fa-folder-open"></i><span>${cleanCat}</span></span>
</div>
<p>${(it.desc || it.title).substring(0, 150)}...</p>
<div class="social-share">
<span>Bagikan:</span>
<a href="https://x.com/intent/post?text=${encodedText}&url=${encodedLink}" onclick="window.open(this.href,'targetWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=400');return false;"><i class="fa-brands fa-twitter"></i></a>
<a href="https://www.facebook.com/sharer/sharer.php?u=${encodedLink}&t=${encodedText}" onclick="window.open(this.href,'targetWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=400');return false;"><i class="fa-brands fa-facebook"></i></a>
<a href="https://api.whatsapp.com/send?text=${encodedText}%0A%0A${encodedLink}" onclick="window.open(this.href,'targetWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=400');return false;"><i class="fa-brands fa-whatsapp"></i></a>
<a href="https://www.threads.com/intent/post?text=${encodedText}&url=${encodedLink}" onclick="window.open(this.href,'targetWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=400');return false;"><i class="fa-brands fa-threads"></i></a>
<a href="https://share.flipboard.com/bookmarklet/popout?v=2&title=${encodedText}&url=${encodedLink}&utm_source=dalam.web.id" onclick="window.open(this.href,'targetWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=600');return false;"><i class="fa-brands fa-flipboard"></i></a>
</div>
</div>
</div>`;
}).join('');

const finalFeedPage = feedTemplate
.replace('<div id="loading"></div>', '')
.replace('<div id="feed-container"></div>', `<div id="feed-container">${feedItemsHTML}</div>`)
.replace(/<script>[\s\S]*?fetchAndDisplayFeed\(\);[\s\S]*?<\/script>/, '')
.replace('%%DATE_MODIFIED%%', buildDate);

await Bun.write(`${C.root}/feed.html`, finalFeedPage);
console.log('✨ Static Pages Generated (Locked to UTC).');
}

console.log('✅ Eksekusi Rampung: Semua lini dari Sitemap, JSON, Feed, hingga HTML resmi sinkron dalam UTC tunggal!');
})();
