import { promises as fs } from 'fs';
import { titleToCategory } from './titleToCategory.ts';

const C = {
    root: `${import.meta.dir}/..`,
    art:  `${import.meta.dir}/../artikel`,
    base: 'https://dalam.web.id',
    limit: 30,
    cats: ['gaya-hidup', 'jejak-sejarah', 'lainnya', 'olah-media', 'opini-sosial', 'sistem-terbuka', 'warta-tekno']
};

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

const slug = (t: any) => t.toString().toLowerCase().trim()
.replace(/^[^\w\s]*/u, '')
.replace(/ & /g, '-and-')
.replace(/[^a-z0-9\s-]/g, '')
.replace(/\s+/g, '-')
.replace(/-+/g, '-');

const iso = (d: any) => {
    const parsed = new Date(d);
    const base   = isNaN(parsed.getTime()) ? new Date() : parsed;
    const wib    = new Date(base.getTime() + 8 * 60 * 60 * 1000);
    return wib.toISOString().replace(/\.\d+Z$/, '+08:00');
};

const sanitize = (r: string) => r.replace(/^\p{Emoji_Presentation}\s*/u, '').trim();

const mime = (u: string) =>
({ png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' }[u.split('.').pop()!] || 'image/jpeg');

const escapeAttr = (s: string) => s.replace(/"/g, '&quot;');

/** Baca ukuran file gambar dari disk lokal.
 *  Gambar eksternal (bukan C.base) langsung return 0. */
const imgSize = async (url: string): Promise<number> => {
    try {
        if (!url.startsWith(C.base)) return 0;
        return (await fs.stat(url.replace(C.base, C.root))).size;
    } catch {
        return 0;
    }
};

const buildRss = (
    t: string,
    items: any[],
    link: string,
    desc: string,
    sizes: Map<string, number> = new Map()
) =>
`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title><![CDATA[${decodeHTML(t)}]]></title><link>${C.base}/</link><description><![CDATA[${desc}]]></description><language>id-ID</language><atom:link href="${link}" rel="self" type="application/rss+xml"/><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items.map(it =>
    `<item><title><![CDATA[${decodeHTML(it.title)}]]></title><link>${it.loc}</link><guid>${it.loc}</guid><description><![CDATA[${it.desc || sanitize(decodeHTML(it.title))}]]></description><pubDate>${new Date(it.lastmod).toUTCString()}</pubDate><category><![CDATA[${it.category}]]></category><enclosure url="${it.img}" length="${sizes.get(it.img) ?? 0}" type="${mime(it.img)}"/></item>`
).join('')}</channel></rss>`;

const distribute = async (f: string, cat: string, url: string, pre?: string) => {
    const dir = `${C.root}/${slug(cat)}`;
    await fs.mkdir(dir, { recursive: true });
    let html = pre || await Bun.file(`${C.art}/${f}`).text();
    html = html
    .replace(/<link rel="canonical" href="[^"]+">/i,     `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:url" content="[^"]+">/i, `<meta property="og:url" content="${url}">`)
    .replace(new RegExp(`${BASE_RE}/artikel/${f.replace('.html', '')}`, 'g'), url)
    .replace(/\/artikel\/-\/([a-z-]+)(\.html)?\/?/g, '/$1');
    await Bun.write(`${dir}/${f}`, html);
};

// =============================================================================
(async () => {
    console.log('🚀 Diet Mode V8.9 - Google Sitemap Compliant');

    const [eta, stm, mst] = await Promise.all([
        Bun.file(`${C.root}/artikel.json`).json().catch(() => ({})),
                                              Bun.file(`${C.root}/sitemap.txt`).text().catch(() => ''),
                                              Bun.file(`${C.art}/artikel.json`).json().catch(() => ({}))
    ]);

    const urls  = new Set(stm.split('\n').filter(Boolean));
    const files = [...new Bun.Glob("*.html").scanSync(C.art)].filter(f => !f.startsWith('-'));
    const final: any = {};
    const flat:  any[] = [];
    const valid = new Set();

    // ── Proses setiap file artikel ───────────────────────────────────────────
    for (const f of files) {
        let d: any = null, cat: any = null;

        // 1. Cari di cache (artikel.json root)
        for (const [c, its] of Object.entries(eta)) {
            const found = (its as any[]).find(i => i[1] === f);
            if (found) { d = [...found]; d[0] = decodeHTML(d[0]); cat = c; break; }
        }

        // Otomatisasi pemindahan kategori
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

        // Lanjut jika cache masih valid
        if (d && urls.has(`${C.base}/${slug(cat)}/${f.replace('.html', '')}`)) {
            (final[cat] ??= []).push(d);
            flat.push({ title: d[0], file: f, img: d[2], lastmod: d[3], desc: d[4], category: cat, loc: `${C.base}/${slug(cat)}/${f.replace('.html', '')}` });
            valid.add(`${slug(cat)}/${f}`);
            continue;
        }

        // 2. Cache tidak valid — baca file fisik
        const txt  = await Bun.file(`${C.art}/${f}`).text();
        const rawT = (
            txt.match(/property="og:title" content="(.*?)"/i)?.[1] ||
            txt.match(/<title>(.*?)<\/title>/i)?.[1].replace(/\s*-\s*Layar Kosong$/i, '') ||
            'Tanpa Judul'
        ).trim();
        const t = decodeHTML(rawT);

        // Tentukan kategori: Master JSON → titleToCategory
        let c: any = null;
        for (const [mc, mits] of Object.entries(mst)) {
            if ((mits as any[]).find(i => i[1] === f)) { c = mc; break; }
        }
        if (!c) c = titleToCategory(t);

        const url = `${C.base}/${slug(c)}/${f.replace('.html', '')}`;

        // Prioritas tanggal: Master JSON → og:article:published_time → mtime
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
        (final[c] ??= []).push([t, f, img, iso(date), desc]);
        flat.push({ title: t, file: f, img, lastmod: iso(date), desc, category: c, loc: url });
        urls.add(url);
        valid.add(`${slug(c)}/${f}`);
    }

    // ── Cleanup file lama ────────────────────────────────────────────────────
    for (const s of C.cats) {
        const d = `${C.root}/${s}`;
        await fs.mkdir(d, { recursive: true });
        for (const f of [...new Bun.Glob("*.html").scanSync(d)]) {
            if (f !== 'index.html' && !valid.has(`${s}/${f}`)) {
                await fs.unlink(`${d}/${f}`);
                urls.delete(`${C.base}/${s}/${f.replace('.html', '')}`);
            }
        }
    }

    flat.sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());

    await Bun.write(`${C.root}/artikel.json`, JSON.stringify(final, null, 2));

    // ── Build XML Sitemap + globalSizes (satu pass) ──────────────────────────
    const globalSizes      = new Map<string, number>();
    let combinedXmlEntries = '';

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
        // ✅ FIX: Validasi max length sesuai Google guidelines
        const videoTitle = decodeHTML(it.title).substring(0, 100); // Max 100 chars
        const videoDesc = (it.desc || decodeHTML(it.title)).substring(0, 2048); // Max 2048 chars

        videoXml += `
        <video:video>
        <video:thumbnail_loc>https://img.youtube.com/vi/${id}/hqdefault.jpg</video:thumbnail_loc>
        <video:title><![CDATA[${videoTitle}]]></video:title>
        <video:description><![CDATA[${videoDesc}]]></video:description>
        <video:player_loc>https://www.youtube.com/embed/${id}</video:player_loc>
        <video:publication_date>${it.lastmod}</video:publication_date>
        <video:family_friendly>yes</video:family_friendly>
        </video:video>`;
    }
});

// ✅ FIX: Hapus <image:caption> yang deprecated
combinedXmlEntries += `
<url>
<loc>${it.loc}</loc>
<lastmod>${it.lastmod}</lastmod>
<image:image>
<image:loc>${it.img}</image:loc>
</image:image>${videoXml}
</url>`;
}

const finalSitemapContent =
`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${combinedXmlEntries}
</urlset>`;

await Promise.all([
    Bun.write(`${C.root}/sitemap.xml`, finalSitemapContent),
                  Bun.write(`${C.root}/rss.xml`, buildRss(
                      'Layar Kosong',
                      flat.slice(0, C.limit),
                                                          `${C.base}/rss.xml`,
                                                          'Feed artikel terbaru dari Layar Kosong',
                                                          globalSizes
                  )),
]);

console.log('✅ Sitemap Tunggal Berhasil Dibuat: sitemap.xml (Google Compliant)');
console.log('📡 RSS Feed Global Berhasil Dibuat: rss.xml');

// ── Build Category Pages (Static) ────────────────────────────────────────
const tmp = await Bun.file(`${C.art}/-/template-kategori.html`).text().catch(() => '');

if (tmp) {
    const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' });

    for (const [cat, arts] of Object.entries(final)) {
        const s                 = slug(cat);
        const rUrl              = `${C.base}/feed-${s}.xml`;
        const categoryNameClean = sanitize(decodeHTML(cat));

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
        .replace(/%%TITLE%%|%%DESCRIPTION%%/g, categoryNameClean)
        .replace(/%%CATEGORY_NAME%%/g,         decodeHTML(cat))
        .replace(/%%RSS_URL%%/g,               rUrl)
        .replace(/%%CANONICAL_URL%%/g,         `${C.base}/${s}`)
        .replace(/%%ICON%%/g,                  cat.match(/(\p{Emoji})/u)?.[0] || '📁')
        .replace('<span id="category-title-text">Memuat...</span>', `<span id="category-title-text">${categoryNameClean}</span>`)
        .replace('<div id="loading">Memuat...</div>', '')
        .replace('<div id="article-grid"></div>', `<div id="article-grid">${categoryArticlesHTML}`);

        const catItems = (arts as any[]).map(a => ({
            title: a[0], file: a[1], img: a[2], lastmod: a[3], desc: a[4],
            category: cat,
            loc: `${C.base}/${s}/${a[1].replace('.html', '')}`
        })).slice(0, C.limit);

        // Tulis index.html + feed RSS kategori sekaligus
        await Promise.all([
            Bun.write(`${C.root}/${s}/index.html`, pg),
                          Bun.write(`${C.root}/feed-${s}.xml`, buildRss(
                              `Kategori ${categoryNameClean}`,
                              catItems, rUrl,
                              `Artikel ${cat}`,
                              globalSizes
                          )),
        ]);
    }
    console.log('📂 Static Category Pages Generated (Clean Mode).');
}

// ── Build feed.html ──────────────────────────────────────────────────────
const feedTemplate = await Bun.file(`${C.art}/-/template-feed.html`).text().catch(() => '');

if (feedTemplate) {
    const feedItemsHTML = flat.slice(0, C.limit).map(it => {
        const encodedLink = encodeURIComponent(it.loc);
        const encodedText = encodeURIComponent(it.desc || it.title);
        const displayDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(it.lastmod));
        const cleanCat    = it.category.replace(/\p{Emoji_Presentation}\s*/gu, '').trim();
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
        <a href="[https://share.flipboard.com/bookmarklet/popout?v=2&title=$](https://share.flipboard.com/bookmarklet/popout?v=2&title=$){encodedText}&url=${encodedLink}&utm_source=dalam.web.id"   onclick="window.open(this.href,'targetWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=600');return false;"><i class="fa-brands fa-flipboard"></i></a>
        <a href="https://www.threads.com/intent/post?text=${encodedText}&url=${encodedLink}" onclick="window.open(this.href,'targetWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=400');return false;"><i class="fa-brands fa-threads"></i></a>
        </div>
        </div>
        </div>`;
    }).join('');

    const finalFeedPage = feedTemplate
    .replace('<div id="loading"></div>', '')
    .replace('<div id="feed-container"></div>', `<div id="feed-container">${feedItemsHTML}</div>`)
    .replace(/<script>[\s\S]*?fetchAndDisplayFeed\(\);[\s\S]*?<\/script>/, '');

    await Bun.write(`${C.root}/feed.html`, finalFeedPage);
    console.log('✨ Static Feed Page Generated.');
}

console.log('✅ Selesai. Pindah kategori otomatis sukses.');
})();
