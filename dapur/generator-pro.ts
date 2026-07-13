import { promises as fs } from 'fs';
import { titleToCategory } from './titleToCategory.ts';

const C = {
    root: `${import.meta.dir}/..`,
    art:  `${import.meta.dir}/../artikel`,
    base: 'https://dalam.web.id',
    limit: 30, // Limit ini SEKARANG HANYA dipakai untuk membatasi RSS & JSON Lite!
    cats: ['gaya-hidup', 'jejak-sejarah', 'lainnya', 'olah-media', 'opini-sosial', 'sistem-terbuka', 'warta-tekno'],
    hub: 'https://pubsubhubbub.appspot.com/' // 🔔 Hub WebSub publik (Google, masih conform ke spec 0.4 per Juli 2026)
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

const buildDate = new Date().toISOString().split('T')[0];

const slug = (t: any) => t.toString().toLowerCase().trim()
.replace(/^[^\w\s]*/u, '')
.replace(/ & /g, '-and-')
.replace(/[^a-z0-9\s-]/g, '')
.replace(/\s+/g, '-')
.replace(/-+/g, '-');

const iso = (d: any) => {
    const parsed = new Date(d);
    const base   = isNaN(parsed.getTime()) ? new Date() : parsed;
    return base.toISOString();
};

const sanitize = (r: string) => r.replace(/^\p{Emoji_Presentation}\s*/u, '').trim();

const mime = (u: string) =>
({ png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' }[u.split('.').pop()!] || 'image/jpeg');

const escapeAttr = (s: string) => s.replace(/"/g, '&quot;');

const imgWithFallback = (src: string, alt: string, extraAttrs: string = ''): string => {
    const smSrc = src.replace(/(\.[a-zA-Z0-9]+)$/, '-sm$1');
    const mdSrc = src.replace(/(\.[a-zA-Z0-9]+)$/, '-md$1');
    const onerror = `this.onerror=function(){this.onerror=function(){this.onerror=null;this.src='/thumbnail-sm.webp'};this.src='${src}'};this.src='${mdSrc}'`;
    return `<img src="${smSrc}" alt="${escapeAttr(alt)}" ${extraAttrs} onerror="${onerror}">`;
};

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

const buildRss = (t: string, items: any[], link: string, desc: string, sizes: Map<string, number> = new Map()) => {
    const rootDate = calculateFeedRootDate(items);
    return `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/rss.xsl"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title><![CDATA[${safeCDATA(decodeHTML(t))}]]></title><link>${escapeXML(C.base)}/</link><description><![CDATA[${safeCDATA(desc)}]]></description><language>id-ID</language><atom:link href="${escapeXML(link)}" rel="self" type="application/rss+xml"/><atom:link href="${escapeXML(C.hub)}" rel="hub"/><lastBuildDate>${rootDate.toUTCString()}</lastBuildDate>${items.map(it =>
        `<item><title><![CDATA[${safeCDATA(decodeHTML(it.title))}]]></title><link>${escapeXML(it.loc)}</link><guid>${escapeXML(it.loc)}</guid><description><![CDATA[${safeCDATA(it.desc || sanitize(decodeHTML(it.title)))}]]></description><pubDate>${new Date(it.lastmod).toUTCString()}</pubDate><category><![CDATA[${safeCDATA(it.category)}]]></category><enclosure url="${escapeXML(it.img)}" length="${sizes.get(it.img) ?? 0}" type="${mime(it.img)}"/></item>`
    ).join('')}</channel></rss>`;
};

const buildAtom = (t: string, items: any[], feedUrl: string, desc: string, sizes: Map<string, number> = new Map()) => {
    const rootDate = calculateFeedRootDate(items);
    return `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/atom.xsl"?><feed xmlns="http://www.w3.org/2005/Atom" xml:lang="id-ID"><title>${escapeXML(decodeHTML(t))}</title><subtitle>${escapeXML(desc)}</subtitle><link href="${escapeXML(C.base)}/" rel="alternate"/><link href="${escapeXML(feedUrl)}" rel="self" type="application/atom+xml"/><link href="${escapeXML(C.hub)}" rel="hub"/><id>${escapeXML(C.base)}/</id><updated>${rootDate.toISOString()}</updated>${items.map(it =>
        `<entry><title>${escapeXML(decodeHTML(it.title))}</title><link href="${escapeXML(it.loc)}" rel="alternate"/><link rel="enclosure" href="${escapeXML(it.img)}" type="${mime(it.img)}" length="${sizes.get(it.img) ?? 0}"/><id>${escapeXML(it.loc)}</id><updated>${it.lastmod}</updated><published>${it.lastmod}</published><author><name>Fakhrul Rijal</name></author><category term="${escapeXML(it.category)}"/><summary type="html"><![CDATA[${safeCDATA(it.desc || sanitize(decodeHTML(it.title)))}]]></summary></entry>`
    ).join('')}</feed>`;
};

const buildSitemapUrlset = (entries: string): string =>
`<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${entries}\n</urlset>`;

const buildSitemapIndex = (items: { loc: string; lastmod: string }[]): string =>
`<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.map(it => `  <sitemap>\n    <loc>${escapeXML(it.loc)}</loc>\n    <lastmod>${it.lastmod}</lastmod>\n  </sitemap>`).join('')}\n</sitemapindex>`;

const cleanupOldSitemaps = async (): Promise<number> => {
    let removed = 0;
    const files = await fs.readdir(C.root).catch(() => []);
    for (const f of files) {
        if (/^sitemap-.+\.xml$/i.test(f)) {
            await fs.rm(`${C.root}/${f}`, { force: true });
            removed++;
        }
    }
    for (const s of C.cats) {
        await fs.rm(`${C.root}/${s}.xml`, { force: true });
        removed++;
    }
    return removed;
};

const pingWebSub = async (feedUrls: string[]): Promise<void> => {
    if (feedUrls.length === 0) {
        console.log('🔕 WebSub: nggak ada feed yang berubah, skip ping ke hub.');
        return;
    }
    try {
        const body = new URLSearchParams();
        body.append('hub.mode', 'publish');
        feedUrls.forEach(u => body.append('hub.url', u));
        const res = await fetch(C.hub, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
                                signal: AbortSignal.timeout(10_000)
        });
        console.log(`📡 WebSub ping → ${C.hub} → HTTP ${res.status} (${feedUrls.length} feed berubah)`);
        feedUrls.forEach(u => console.log(`    🔗 ${u}`));
    } catch (e: any) {
        console.log(`⚠️  WebSub ping gagal (dilewati, tidak fatal): ${e?.message || e}`);
    }
};

const upsertManagedBlock = async (path: string, block: string): Promise<void> => {
    const MARK_START = '# --- BEGIN LK-AUTOGEN (komposisi.ts — jangan edit manual) ---';
    const MARK_END   = '# --- END LK-AUTOGEN ---';
    const existing = await Bun.file(path).text().catch(() => '');

    const startIdx = existing.indexOf(MARK_START);
    const endIdx   = existing.indexOf(MARK_END);
    let stripped = existing;
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        stripped = existing.slice(0, startIdx) + existing.slice(endIdx + MARK_END.length);
    }
    stripped = stripped.trim();

    const out = `${stripped ? stripped + '\n\n' : ''}${MARK_START}\n${block}\n${MARK_END}\n`;
    await Bun.write(path, out);
};

const distribute = async (
    f: string,
    cat: string,
    url: string,
    pre?: string,
    modTime?: string,
    prevData?: { url: string, title: string },
    nextData?: { url: string, title: string }
) => {
    const dir = `${C.root}/${slug(cat)}`;
    await fs.mkdir(dir, { recursive: true });

    let html = pre || await Bun.file(`${C.art}/${f}`).text();
    const catLabel = getCategoryLabel(slug(cat));
    const catSlug = slug(cat);

    const tags = catLabel.split(',').map(t => t.trim()).filter(Boolean);
    const tagsHtml = tags.map(t => `<meta property="article:tag" content="${t}">`).join('\n     ');

    let prevNextTags = '';
    if (prevData) {
        const safeTitle = escapeAttr(prevData.title);
        prevNextTags += `\n    <link rel="prev" href="${prevData.url}" title="${safeTitle}">`;
    }
    if (nextData) {
        const safeTitle = escapeAttr(nextData.title);
        prevNextTags += `\n    <link rel="next" href="${nextData.url}" title="${safeTitle}">`;
    }

    const catRssUrl  = `${C.base}/${catSlug}.rss`;
    const catAtomUrl = `${C.base}/${catSlug}.atom`;
    const feedLinkTags = `\n    <link rel="alternate" type="application/rss+xml" title="Feed RSS ${catLabel} - Layar Kosong" href="${catRssUrl}">\n    <link rel="alternate" type="application/atom+xml" title="Feed Atom ${catLabel} - Layar Kosong" href="${catAtomUrl}">`;

    html = html
    .replace(/<nav class="static-crumb"[\s\S]*?<\/nav>\s*/gi, '')
    .replace(/<meta property="article:tag" content="[^"]*">\s*/gi, '')
    .replace(/<link rel="(prev|next)" [^>]*>\s*/gi, '')
    .replace(/<link rel="alternate" type="application\/(rss|atom)\+xml" title="Feed (RSS|Atom)[^"]+"[^>]*>\s*/gi, '')
    .replace(/<meta property="article:section" content="[^"]*">\s*/gi, '')
    .replace(/<meta property="og:url" content="[^"]*">\s*/gi, '')
    .replace(/<meta name="twitter:url" content="[^"]*">\s*/gi, '');

    const seoInjection = `${prevNextTags}\n    <meta property="og:url" content="${url}">\n    <meta name="twitter:url" content="${url}">\n    <meta property="article:section" content="${catLabel}">\n    ${tagsHtml}${feedLinkTags}`;

    if (html.match(/<link rel="canonical" href="[^"]+">/i)) {
        html = html.replace(/<link rel="canonical" href="[^"]+">/i, `<link rel="canonical" href="${url}">${seoInjection}`);
    } else {
        html = html.replace('</head>', `    <link rel="canonical" href="${url}">${seoInjection}\n</head>`);
    }

    const breadcrumbHtml = `<nav class="static-crumb" aria-label="Breadcrumb" style="font-size: .85rem;"><a href="https://dalam.web.id">Beranda</a> / <a href="/${catSlug}">${catLabel}...</a></nav>`;

    const H1_OPEN_RE = /<h1[^>]*>/i;
    if (html.match(H1_OPEN_RE)) {
        html = html.replace(H1_OPEN_RE, (match) => `${breadcrumbHtml}\n    ${match}`);
    }

    html = html
    .replace(new RegExp(`${BASE_RE}/artikelx?/${f.replace('.html', '')}`, 'g'), url)
    .replace(/\/artikelx?\/-\/([a-z-]+)(\.html)?\/?/g, '/$1');

    if (modTime) {
        html = html.replace(/<meta property="article:modified_time" content="[^"]*">/i, `<meta property="article:modified_time" content="${modTime}">`);
    }

    await Bun.write(`${dir}/${f}`, html);
};

// =============================================================================
// ── TAHAP 1: PENGUMPULAN DATA BERDASARKAN ARTIKEL.JSON MASTER
// =============================================================================
(async () => {
    console.log('🚀 Komposisi Blog V10.6 - Nama Output Seragam + Json Island Hero');

    const CACHE_TODAY_FILE = `${C.root}/mini/edited-today.txt`;
    await fs.mkdir(`${C.root}/mini`, { recursive: true }).catch(() => {});

    const editedTodayMap = new Map<string, string>();
    const usedTimes = new Set<string>();

    try {
        const content = await Bun.file(CACHE_TODAY_FILE).text();
        const lines = content.split('\n').filter(Boolean);
        if (lines.length > 0 && lines[0].trim() === buildDate) {
            for (let i = 1; i < lines.length; i++) {
                const [filename, timeStr] = lines[i].split('|');
                if (filename && timeStr) {
                    editedTodayMap.set(filename, timeStr);
                    usedTimes.add(timeStr);
                }
            }
        }
    } catch (e) {}

    const getUniqueModTimeForToday = (filename: string): string => {
        if (editedTodayMap.has(filename)) return editedTodayMap.get(filename)!;
        let newTimeStr = "";
        do {
            const rDate = new Date();
            rDate.setUTCHours(Math.floor(Math.random() * 24));
            rDate.setUTCMinutes(Math.floor(Math.random() * 60));
            rDate.setUTCSeconds(Math.floor(Math.random() * 60));
            rDate.setUTCMilliseconds(Math.floor(Math.random() * 1000));
            newTimeStr = rDate.toISOString();
        } while (usedTimes.has(newTimeStr));

        usedTimes.add(newTimeStr);
        editedTodayMap.set(filename, newTimeStr);
        return newTimeStr;
    };

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
            flat.push({ title: d[0], file: f, img: d[2], lastmod: d[3], desc: d[4], category: cat, loc: `${C.base}/${slug(cat)}/${f.replace('.html', '')}`, finalModTime: d[3] });
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
        const stat = await fs.stat(`${C.art}/${f}`);
        const mtimeDateStr = stat.mtime.toISOString().split('T')[0];
        let finalModTime = stat.mtime.toISOString();

        if (mtimeDateStr === buildDate) {
            finalModTime = getUniqueModTimeForToday(f);
        }

        const publishedTime = txt.match(/article:published_time" content="(.*?)"/i)?.[1] || iso(stat.birthtime);
        const pubDateObj = new Date(publishedTime);
        const modDateObj = new Date(finalModTime);
        if (modDateObj < pubDateObj) {
            const adjustedDate = new Date(pubDateObj.getTime() + (Math.random() * 60000));
            finalModTime = adjustedDate.toISOString();
        }

        let masterDate: string | null = null;
        for (const [, mits] of Object.entries(mst)) {
            const found = (mits as any[]).find(i => i[1] === f);
            if (found?.[3]) { masterDate = found[3]; break; }
        }

        const date = masterDate || publishedTime || finalModTime;
        const img  = txt.match(/(og|twitter):image" content="(.*?)"/i)?.[2] || `${C.base}/img/${f.replace('.html', '')}.webp`;
        const desc = (txt.match(/description" content="(.*?)"/i)?.[1] || '').trim();

        flat.push({ title: t, file: f, img, lastmod: iso(date), desc, category: c, loc: url, finalModTime });
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
        it.lastmod = iso(currentItemTime);
    }

    // =============================================================================
    // ── TAHAP 2: SUNTIK KRONOLOGI TETANGGA
    // =============================================================================
    console.log('✨ Menjalankan Tahap 2: Menjahit Silsilah (URL + Judul) untuk Tooltip...');
    const articlesByCategory: Record<string, typeof flat> = {};
    for (const it of flat) {
        (articlesByCategory[it.category] ??= []).push(it);
    }
    for (const [kategori, arts] of Object.entries(articlesByCategory)) {
        for (let i = 0; i < arts.length; i++) {
            const current = arts[i];
            let prevData: { url: string, title: string } | undefined;
            let nextData: { url: string, title: string } | undefined;

            if (i > 0) nextData = { url: arts[i - 1].loc, title: arts[i - 1].title };
            if (i < arts.length - 1) prevData = { url: arts[i + 1].loc, title: arts[i + 1].title };

            const txtContent = await Bun.file(`${C.art}/${current.file}`).text();
            await distribute(current.file, current.category, current.loc, txtContent, current.finalModTime, prevData, nextData);
        }
    }

    // =============================================================================
    // ── TAHAP 3: FINISHING ASET DISTRIBUSI
    // =============================================================================
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
            await fs.rm(`${C.root}/${s}.rss`, { force: true });
            await fs.rm(`${C.root}/${s}.atom`, { force: true });
            await fs.rm(`${C.root}/${s}.xml`, { force: true });
        }
    }

    await Bun.write(`${C.root}/artikel.json`, JSON.stringify(final, null, 2));

    const LITE_LIMIT = 30;
    const liteDb: Record<string, any[]> = {};
    for (const kategori in final) {
        liteDb[kategori] = final[kategori].slice(0, LITE_LIMIT);
    }
    await Bun.write(`${C.root}/artikel-lite.json`, JSON.stringify(liteDb));

    const WEBSUB_CACHE_FILE = `${C.root}/mini/websub-cache.json`;
    const prevWebsubState: Record<string, string> = await Bun.file(WEBSUB_CACHE_FILE).json().catch(() => ({}));
    const newWebsubState: Record<string, string> = {};
    const feedsToNotify: string[] = [];

    const globalSizes      = new Map<string, number>();
    const sitemapByCategory = new Map<string, string[]>();

    for (const it of flat) {
        const [txt, size] = await Promise.all([
            Bun.file(`${C.art}/${it.file}`).text(),
                                              imgSize(it.img)
        ]);
        globalSizes.set(it.img, size);

        const vids = [...txt.matchAll(/<iframe[^>]+src="([^"]+)"/gi)]
        .map(m => m[1]).filter(s => !s.endsWith('.js'));

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

    const removedOldSitemaps = await cleanupOldSitemaps();

    await Promise.all([
        fs.rm(`${C.root}/rss.xml`, { force: true }),
                      fs.rm(`${C.root}/atom.xml`, { force: true }),
                      ...C.cats.flatMap(s => [
                          fs.rm(`${C.root}/feed-${s}.xml`, { force: true }),
                                        fs.rm(`${C.root}/feed-${s}-atom.xml`, { force: true }),
                                        fs.rm(`${C.root}/feed-${s}.rss`, { force: true }),
                                        fs.rm(`${C.root}/feed-${s}.atom`, { force: true }),
                                        fs.rm(`${C.root}/sitemap-${s}.xml`, { force: true }),
                      ]),
    ]);

    const categorySitemapItems = [...sitemapByCategory.entries()].map(([catSlug, entries]) => {
        const fileName = `${catSlug}.xml`;
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

    const finalSitemapIndexContent = buildSitemapIndex(
        categorySitemapItems.map(it => ({ loc: it.loc, lastmod: it.lastmod }))
    );

    await Promise.all([
        ...categorySitemapItems.map(it => Bun.write(`${C.root}/${it.fileName}`, it.content)),
                      Bun.write(`${C.root}/sitemap.xml`, finalSitemapIndexContent),
                      Bun.write(`${C.root}/sitemap.txt`, Array.from(urls).sort().join('\n') + '\n'),
                      Bun.write(`${C.root}/rss.rss`, buildRss('Layar Kosong', flat.slice(0, C.limit), `${C.base}/rss.rss`, 'RSS Feed artikel terbaru dari Layar Kosong', globalSizes)),
                      Bun.write(`${C.root}/atom.atom`, buildAtom('Layar Kosong', flat.slice(0, C.limit), `${C.base}/atom.atom`, 'Atom Feed artikel terbaru dari Layar Kosong', globalSizes)),
    ]);

    const rootNewest = flat[0]?.loc;
    if (rootNewest) {
        newWebsubState['__root__'] = rootNewest;
        const finalFeedPage = feedTemplate
        .replace('<div id="loading"></div>', '')
        .replace('<div id="feed-container"></div>', `<div id="feed-container">${feedItemsHTML}</div>`)
        .replace(/<script>[\s\S]*?fetchAndDisplayFeed\(\);[\s\S]*?<\/script>/, '')
        .replace('%%DATE_MODIFIED%%', buildDate);
        await Bun.write(`${C.root}/feed.html`, finalFeedPage);
    }

    // =============================================================================
    // ── TAHAP 4: INJEKSI DATA HERO (CSS SLIDER) & GRID ARTIKEL KE INDEX.HTML
    // =============================================================================
    console.log('✨ Menjalankan Tahap 4: Injeksi Hero (CSS Slider) & Grid Artikel ke index.html...');
    try {
        let heroInputsHtml = '';
        let heroSlidesHtml = '';
        let gridHtml = '';

        // 1. Dapatkan daftar kategori yang ada isinya
        const validCats = C.cats.filter(cat => final[cat] && final[cat].length > 0);
        const heroTotal = validCats.length;
        let heroIndex = 0;

        for (const cat of validCats) {
            const catLabel = getCategoryLabel(slug(cat));

            // --- LOGIKA HERO (ARTIKEL KE-0) ---
            const latest = final[cat][0];
            const dateObj = new Date(latest[3]);
            const formattedDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(dateObj);
            const safeDesc = escapeXML((latest[4] || latest[0]).substring(0, 150) + '...');
            const heroUrl = `${C.base}/${slug(cat)}/${latest[1].replace('.html', '')}`;

            // Kalkulasi indeks slider sebelumnya dan selanjutnya
            const prevIndex = (heroIndex - 1 + heroTotal) % heroTotal;
            const nextIndex = (heroIndex + 1) % heroTotal;

            // Injeksi tag Radio
            heroInputsHtml += `      <input type="radio" name="hero" id="slide-${heroIndex}" class="hero-radio" ${heroIndex === 0 ? 'checked' : ''}>\n`;

            // Injeksi HTML Slide
            heroSlidesHtml += `
            <div class="hero-slide slide-${heroIndex}">
            <div class="hero-media">
            ${imgWithFallback(latest[2], escapeXML(decodeHTML(latest[0])))}
            <label for="slide-${prevIndex}" class="hero-arrow prev" aria-label="Artikel sebelumnya">←</label>
            <label for="slide-${nextIndex}" class="hero-arrow next" aria-label="Artikel selanjutnya">→</label>
            </div>
            <div class="hero-copy">
            <span class="kicker">${escapeXML(catLabel)}</span>
            <a href="${heroUrl}" style="display: block; text-decoration: none; color: inherit;">
            <h1>${escapeXML(decodeHTML(latest[0]))}</h1>
            </a>
            <div class="meta">${formattedDate}</div>
            <p class="excerpt">${safeDesc}</p>
            </div>
            </div>`;

            heroIndex++;

            // --- LOGIKA GRID (ARTIKEL KE-1 & KE-2) ---
            for (let i = 1; i <= 2; i++) {
                if (final[cat][i]) {
                    const gridItem = final[cat][i];
                    const gridTitle = escapeXML(decodeHTML(gridItem[0]));
                    const gridUrl = `${C.base}/${slug(cat)}/${gridItem[1].replace('.html', '')}`;
                    const gridImg = gridItem[2];
                    const gridDesc = escapeXML((gridItem[4] || gridItem[0]).substring(0, 100) + '...');
                    const gridYear = new Date(gridItem[3]).getFullYear();
                    const gridMonth = new Date(gridItem[3]).toLocaleString('id-ID', { month: 'long', timeZone: 'UTC' });

                    gridHtml += `
                    <article class="thumb article-card" data-category="${slug(cat)}" data-year="${gridYear}" data-month="${gridMonth}">
                    <a href="${gridUrl}" style="display: block; text-decoration: none; color: inherit;">
                    <div class="media">${imgWithFallback(gridImg, gridTitle, 'loading="lazy"')}</div>
                    <div class="body">
                    <div class="tag">${escapeXML(catLabel)}</div>
                    <h3>${gridTitle}</h3>
                    <p class="excerpt">${gridDesc}</p>
                    </div>
                    </a>
                    </article>`;
                }
            }
        }

        const indexPath = `${C.root}/index.html`;
        let indexHtml = await Bun.file(indexPath).text().catch(() => '');

        if (indexHtml) {
            // Timpa area HERO AUTOGEN
            const HERO_START = '<!-- BEGIN HERO AUTOGEN -->';
            const HERO_END = '<!-- END HERO AUTOGEN -->';
            const heroRegex = new RegExp(`${HERO_START}[\\s\\S]*?${HERO_END}`, 'i');

            const fullHeroBlock = `${HERO_START}\n${heroInputsHtml}      <article class="hero-card article-card hero-rotator" id="hero-container">\n${heroSlidesHtml}\n      </article>\n      ${HERO_END}`;

            if (indexHtml.match(heroRegex)) {
                indexHtml = indexHtml.replace(heroRegex, fullHeroBlock);
            }

            // Hapus blok JSON script lama jika masih ada (pembersihan)
            indexHtml = indexHtml.replace(/<script id="hero-data" type="application\/json">[\s\S]*?<\/script>/i, '');

            // Timpa area GRID AUTOGEN
            const GRID_START = '<!-- BEGIN GRID AUTOGEN -->';
            const GRID_END = '<!-- END GRID AUTOGEN -->';
            const gridRegex = new RegExp(`${GRID_START}[\\s\\S]*?${GRID_END}`, 'i');

            if (indexHtml.match(gridRegex)) {
                indexHtml = indexHtml.replace(gridRegex, `${GRID_START}\n${gridHtml}\n        ${GRID_END}`);
            }

            await Bun.write(indexPath, indexHtml);
            console.log('✅ Injeksi Hero (CSS Murni) & Grid Artikel berhasil!');
        } else {
            console.log('⚠️ File index.html tidak ditemukan di root.');
        }
    } catch (e) {
        console.log(`⚠️ Gagal menginjeksi HTML ke index.html: ${e}`);
    }

    if (editedTodayMap.size > 0) {
        let cacheOut = buildDate + '\n';
for (const [filename, timeStr] of editedTodayMap.entries()) {
    cacheOut += `${filename}|${timeStr}\n`;
}
await Bun.write(CACHE_TODAY_FILE, cacheOut);
    }

    await pingWebSub(feedsToNotify);
    await Bun.write(WEBSUB_CACHE_FILE, JSON.stringify(newWebsubState, null, 2));

    const liveCatSlugs = [...finalSlugs];
    const headersBlock = [
        '/rss.rss', '  Content-Type: application/rss+xml; charset=utf-8',
        '/atom.atom', '  Content-Type: application/atom+xml; charset=utf-8',
        ...liveCatSlugs.flatMap(s => [
            `/${s}.rss`, '  Content-Type: application/rss+xml; charset=utf-8',
            `/${s}.atom`, '  Content-Type: application/atom+xml; charset=utf-8',
        ]),
    ].join('\n');

    const redirectsBlock = [
        '/rss.xml   /rss.rss    301',
        '/atom.xml  /atom.atom  301',
        ...C.cats.flatMap(s => [
            `/feed-${s}.xml        /${s}.rss   301`,
            `/feed-${s}-atom.xml   /${s}.atom  301`,
            `/feed-${s}.rss        /${s}.rss   301`,
            `/feed-${s}.atom       /${s}.atom  301`,
            `/sitemap-${s}.xml     /${s}.xml   301`,
        ]),
    ].join('\n');

    await upsertManagedBlock(`${C.root}/_headers`, headersBlock);
    await upsertManagedBlock(`${C.root}/_redirects`, redirectsBlock);

    console.log('✅ Selesai!');
})();
