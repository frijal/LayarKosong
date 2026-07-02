import { promises as fs } from 'fs';
import { titleToCategory } from './titleToCategory.ts';

const C = {
    root: `${import.meta.dir}/..`,
    art:  `${import.meta.dir}/../artikel`,
    base: 'https://dalam.web.id',
    limit: 30, // Limit ini SEKARANG HANYA dipakai untuk membatasi RSS & JSON Lite!
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

const decodeHTML = (str: string) => {
    const entities: Record<string, string> = {
        '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
        '&#39;': "'", '&apos;': "'", '&bull;': '•', '&ndash;': '–',
        '&mdash;': '—', '&nbsp;': ' '
    };
    let t = str.replace(/&[a-z0-9#]+;/gi, (m) => entities[m.toLowerCase()] || m);
    t = t.replace(/&#(\d+);/g,       (_, dec) => String.fromCharCode(parseInt(dec, 10)));
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
    return `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/rss.xsl"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title><![CDATA[${safeCDATA(decodeHTML(t))}]]></title><link>${escapeXML(C.base)}/</link><description><![CDATA[${safeCDATA(desc)}]]></description><language>id-ID</language><atom:link href="${escapeXML(link)}" rel="self" type="application/rss+xml"/><lastBuildDate>${rootDate.toUTCString()}</lastBuildDate>${items.map(it =>
        `<item><title><![CDATA[${safeCDATA(decodeHTML(it.title))}]]></title><link>${escapeXML(it.loc)}</link><guid>${escapeXML(it.loc)}</guid><description><![CDATA[${safeCDATA(it.desc || sanitize(decodeHTML(it.title)))}]]></description><pubDate>${new Date(it.lastmod).toUTCString()}</pubDate><category><![CDATA[${safeCDATA(it.category)}]]></category><enclosure url="${escapeXML(it.img)}" length="${sizes.get(it.img) ?? 0}" type="${mime(it.img)}"/></item>`
    ).join('')}</channel></rss>`;
};

const buildAtom = (t: string, items: any[], feedUrl: string, desc: string, sizes: Map<string, number> = new Map()) => {
    const rootDate = calculateFeedRootDate(items);
    return `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/atom.xsl"?><feed xmlns="http://www.w3.org/2005/Atom" xml:lang="id-ID"><title>${escapeXML(decodeHTML(t))}</title><subtitle>${escapeXML(desc)}</subtitle><link href="${escapeXML(C.base)}/" rel="alternate"/><link href="${escapeXML(feedUrl)}" rel="self" type="application/atom+xml"/><id>${escapeXML(C.base)}/</id><updated>${rootDate.toISOString()}</updated>${items.map(it =>
        `<entry><title>${escapeXML(decodeHTML(it.title))}</title><link href="${escapeXML(it.loc)}" rel="alternate"/><link rel="enclosure" href="${escapeXML(it.img)}" type="${mime(it.img)}" length="${sizes.get(it.img) ?? 0}"/><id>${escapeXML(it.loc)}</id><updated>${it.lastmod}</updated><published>${it.lastmod}</published><author><name>Fakhrul Rijal</name></author><category term="${escapeXML(it.category)}"/><summary type="html"><![CDATA[${safeCDATA(it.desc || sanitize(decodeHTML(it.title)))}]]></summary></entry>`
    ).join('')}</feed>`;
};

const buildSitemapUrlset = (entries: string): string =>
`<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${entries}\n</urlset>`;

const buildSitemapIndex = (items: { loc: string; lastmod: string }[]): string =>
`<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.map(it => `  <sitemap>\n    <loc>${escapeXML(it.loc)}</loc>\n    <lastmod>${it.lastmod}</lastmod>\n  </sitemap>`).join('')}\n</sitemapindex>`;

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

// ── Distribute helper (Menulis HTML dengan Injeksi Super Kebal + Judul Tetangga Murni) ──
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

    // ✨ SUNTIK URL BESERTA ATRIBUT 'TITLE' (Langsung Judul Bersih) ✨
    let prevNextTags = '';
    if (prevData) {
        const safeTitle = escapeAttr(prevData.title);
        prevNextTags += `\n    <link rel="prev" href="${prevData.url}" title="${safeTitle}">`;
    }
    if (nextData) {
        const safeTitle = escapeAttr(nextData.title);
        prevNextTags += `\n    <link rel="next" href="${nextData.url}" title="${safeTitle}">`;
    }

    // 1. Bersihkan SEMUA sisa tag lama secara total agar tidak terjadi penumpukan
    html = html
    .replace(/<nav class="static-crumb"[\s\S]*?<\/nav>\s*/gi, '') // 🌟 ANTI-TUMPUK: Buang remah roti lama jika ada
    .replace(/<meta property="article:tag" content="[^"]*">\s*/gi, '')
    .replace(/<link rel="(prev|next)" [^>]*>\s*/gi, '') // Regex diperluas untuk menghapus tag yang punya 'title'
    .replace(/<meta property="article:section" content="[^"]*">\s*/gi, '')
    .replace(/<meta property="og:url" content="[^"]*">\s*/gi, '')
    .replace(/<meta name="twitter:url" content="[^"]*">\s*/gi, '');

    // 2. Siapkan Blok Tag SEO Baru
    const seoInjection = `${prevNextTags}\n    <meta property="og:url" content="${url}">\n    <meta name="twitter:url" content="${url}">\n    <meta property="article:section" content="${catLabel}">\n    ${tagsHtml}`;

    // 3. Suntik Kebal Gagal (Numpang di Tag Canonical)
    if (html.match(/<link rel="canonical" href="[^"]+">/i)) {
        html = html.replace(/<link rel="canonical" href="[^"]+">/i, `<link rel="canonical" href="${url}">${seoInjection}`);
    } else {
        html = html.replace('</head>', `    <link rel="canonical" href="${url}">${seoInjection}\n</head>`);
    }

    // 🌟 4. GENERASI & SUNTIK BREADCRUMB VISUAL 🌟
    // Kembali ke inline style mini, tanpa <style> internal, murni inherit CSS halaman
    const breadcrumbHtml = `<nav class="static-crumb" aria-label="Breadcrumb" style="font-size: .85rem;"><a href="https://dalam.web.id">Beranda</a> / <a href="/${catSlug}/">${catLabel}</a></nav>`;
    
    // Cukup jangkar ke tag PEMBUKA <h1...> saja — isi & posisi </h1> diabaikan total
    const H1_OPEN_RE = /<h1[^>]*>/i;
    if (html.match(H1_OPEN_RE)) {
        html = html.replace(H1_OPEN_RE, (match) => `${breadcrumbHtml}\n    ${match}`);
    }

    // 5. Koreksi URL & Waktu Modified
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
    console.log('🚀 Komposisi Blog V10.4 - Clean Title Tooltip Injection (with sitemap.txt fix)');

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
    // ── TAHAP 2: SUNTIK KRONOLOGI TETANGGA (URL + JUDUL BERSIH)
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

            if (i > 0) {
                nextData = { url: arts[i - 1].loc, title: arts[i - 1].title };
            }
            if (i < arts.length - 1) {
                prevData = { url: arts[i + 1].loc, title: arts[i + 1].title };
            }

            const txtContent = await Bun.file(`${C.art}/${current.file}`).text();
            await distribute(current.file, current.category, current.loc, txtContent, current.finalModTime, prevData, nextData);
        }
    }

    // =============================================================================
    // ── TAHAP 3: FINISHING ASET DISTRIBUSI (Sitemap XML, RSS, JSON)
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
            await fs.rm(`${C.root}/feed-${s}.xml`, { force: true });
            await fs.rm(`${C.root}/feed-${s}-atom.xml`, { force: true });
        }
    }

    await Bun.write(`${C.root}/artikel.json`, JSON.stringify(final, null, 2));

    const LITE_LIMIT = 30;
    const liteDb: Record<string, any[]> = {};
    for (const kategori in final) {
        liteDb[kategori] = final[kategori].slice(0, LITE_LIMIT);
    }
    await Bun.write(`${C.root}/artikel-lite.json`, JSON.stringify(liteDb));

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

    const finalSitemapIndexContent = buildSitemapIndex(
        categorySitemapItems.map(it => ({ loc: it.loc, lastmod: it.lastmod }))
    );

    await Promise.all([
        ...categorySitemapItems.map(it => Bun.write(`${C.root}/${it.fileName}`, it.content)),
                      Bun.write(`${C.root}/sitemap.xml`, finalSitemapIndexContent),
                      
                      // 🔥 INI DIA FIX-NYA: Simpan urls Set kembali ke sitemap.txt
                      Bun.write(`${C.root}/sitemap.txt`, Array.from(urls).sort().join('\n') + '\n'),
                      
                      Bun.write(`${C.root}/rss.xml`, buildRss('Layar Kosong', flat.slice(0, C.limit), `${C.base}/rss.xml`, 'RSS Feed artikel terbaru dari Layar Kosong', globalSizes)),
                      Bun.write(`${C.root}/atom.xml`, buildAtom('Layar Kosong', flat.slice(0, C.limit), `${C.base}/atom.xml`, 'Atom Feed artikel terbaru dari Layar Kosong', globalSizes)),
    ]);

    console.log(`✅ Sitemap index dibuat : sitemap.xml`);
    categorySitemapItems.forEach(it => console.log(`    📂 ${it.fileName.padEnd(32)} ${it.count} URL`));

    const tmp = await Bun.file(`${C.art}/-/template-kategori.html`).text().catch(() => '');
    const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' });

    if (tmp) {
        for (const [cat, arts] of Object.entries(final)) {
            const s                   = slug(cat);
            const rUrl              = `${C.base}/feed-${s}.xml`;
            const rAtomUrl          = `${C.base}/feed-${s}-atom.xml`;
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
            .replace(/%%TITLE%%/g, seoCategoryLabel)
            .replace(/%%DESCRIPTION%%/g, seoCategoryLabel)
            .replace(/%%CATEGORY_NAME%%/g, seoCategoryLabel)
            .replace(/%%RSS_URL%%/g,               rUrl)
            .replace(/%%ATOM_URL%%/g,               rAtomUrl)
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
                              Bun.write(`${C.root}/feed-${s}.xml`, buildRss(`Kategori ${seoCategoryLabel}`, catItems, rUrl, `Artikel ${seoCategoryLabel}`, globalSizes)),
                              Bun.write(`${C.root}/feed-${s}-atom.xml`, buildAtom(`Kategori ${seoCategoryLabel}`, catItems, rAtomUrl, `Artikel ${seoCategoryLabel}`, globalSizes)),
            ]);
        }
    }

    const feedTemplate = await Bun.file(`${C.art}/-/template-feed.html`).text().catch(() => '');
    if (feedTemplate) {
        const feedItemsHTML = flat.slice(0, C.limit).map(it => {
            const encodedLink = encodeURIComponent(it.loc);
            const encodedText = encodeURIComponent(it.desc || it.title);
            const displayDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(it.lastmod));
            const cleanCat = getCategoryLabel(slug(it.category));

            return `
            <div class="feed-item">
            <div class="feed-item-thumbnail"><img src="${it.img}" alt="${escapeAttr(it.title)}" loading="lazy"></div>
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
    }

    if (editedTodayMap.size > 0) {
        let cacheOut = buildDate + '\n';
for (const [filename, timeStr] of editedTodayMap.entries()) {
    cacheOut += `${filename}|${timeStr}\n`;
}
await Bun.write(CACHE_TODAY_FILE, cacheOut);
    }

    console.log('✅ Selesai!');
})();
