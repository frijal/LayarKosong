import { titleToCategory } from './titleToCategory.ts';

const C = {
    root: `${import.meta.dir}/..`,
    art: `${import.meta.dir}/../artikel`,
    base: 'https://dalam.web.id',
    limit: 30,
    xsl: 'sitemap-style.xsl',
    cats: ['gaya-hidup', 'jejak-sejarah', 'lainnya', 'olah-media', 'opini-sosial', 'sistem-terbuka', 'warta-tekno']
};

const decodeHTML = (str: string) => {
    const entities: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&bull;': '•', '&ndash;': '–', '&mdash;': '—', '&nbsp;': ' ' };
    return str.replace(/&[a-z0-9#]+;/gi, (m) => entities[m.toLowerCase()] || m)
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([a-f0-9]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))).trim();
};

const slug = (t: any) => t.toString().toLowerCase().trim().replace(/^[^\w\s]*/u,'').replace(/ & /g,'-and-').replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-');
const iso = (d: any) => new Date(isNaN(Date.parse(d)) ? new Date() : d).toISOString().replace(/\.\d+Z$/, '+08:00');
const sanitize = (r: string) => r.replace(/^\p{Emoji_Presentation}\s*/u, '').trim();
const mime = (u: string) => ({ 'png':'image/png', 'webp':'image/webp', 'svg':'image/svg+xml' }[u.split('.').pop()!] || 'image/jpeg');

const buildRss = (t: string, items: any[], link: string, desc: string) =>
`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title><![CDATA[${decodeHTML(t)}]]></title><link>${C.base}/</link><description>${desc}</description><language>id-ID</language><atom:link href="${link}" rel="self" type="application/rss+xml"/><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items.map(it => `<item><title><![CDATA[${decodeHTML(it.title)}]]></title><link>${it.loc}</link><guid>${it.loc}</guid><description><![CDATA[${it.desc || sanitize(decodeHTML(it.title))}]]></description><pubDate>${new Date(it.lastmod).toUTCString()}</pubDate><category><![CDATA[${it.category}]]></category><enclosure url="${it.img}" length="0" type="${mime(it.img)}"/></item>`).join('')}</channel></rss>`;

const distribute = async (f: string, cat: string, url: string, html: string) => {
    const dir = `${C.root}/${slug(cat)}`;
    await require('fs').promises.mkdir(dir, { recursive: true });
    const content = html
    .replace(/<link rel="canonical" href="[^"]+">/i, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:url" content="[^"]+">/i, `<meta property="og:url" content="${url}">`)
    .replace(new RegExp(`${C.base}/artikel/${f.replace('.html','')}`, 'g'), url)
    .replace(/\/artikel\/-\/([a-z-]+)(\.html)?\/?/g, '/$1');
    await Bun.write(`${dir}/${f}`, content);
};

(async () => {
    console.log('🚀 Diet Mode V8.7 (Stable Edition)');
    const [stm, mst] = await Promise.all([
        Bun.file(`${C.root}/sitemap.txt`).text().catch(()=>''),
                                         Bun.file(`${C.art}/artikel.json`).json().catch(()=>({}))
    ]);

    const urls = new Set(stm.split('\n').filter(Boolean));
    const files = [...new Bun.Glob("*.html").scanSync(C.art)].filter(f => !f.startsWith('-'));
    const final: any = {};
    const flat: any[] = [];
    const valid = new Set();

    for (const f of files) {
        const txt = await Bun.file(`${C.art}/${f}`).text();
        const t = decodeHTML((txt.match(/<title>(.*?)<\/title>/i)?.[1] || 'Tanpa Judul').trim());

        // 1. Tentukan Kategori & Tanggal dari Master JSON
        let c: string | null = null;
        let dateVal = null;
        for (const [mc, mits] of Object.entries(mst)) {
            const found = (mits as any[]).find(i => i[1] === f);
            if (found) {
                c = mc;
                dateVal = found[3];
                break;
            }
        }
        if (!c) c = titleToCategory(t);
        const date = dateVal || txt.match(/article:published_time" content="(.*?)"/i)?.[1] || (await require('fs').promises.stat(`${C.art}/${f}`)).mtime;

        const url = `${C.base}/${slug(c)}/${f.replace('.html','')}`;
        const img = txt.match(/(og|twitter):image" content="(.*?)"/i)?.[2] || `${C.base}/img/${f.replace('.html','')}.webp`;
        const desc = (txt.match(/description" content="(.*?)"/i)?.[1] || '').trim();

        await distribute(f, c, url, txt);
        (final[c] ??= []).push([t, f, img, iso(date), desc]);
        flat.push({ title: t, file: f, img, lastmod: iso(date), desc, category: c, loc: url });
        urls.add(url);
        valid.add(`${slug(c)}/${f}`);
    }

    // Cleanup & Sync Sitemap
    for (const s of C.cats) {
        const d = `${C.root}/${s}`;
        await require('fs').promises.mkdir(d, { recursive: true });
        for (const f of [...new Bun.Glob("*.html").scanSync(d)]) {
            if (f !== 'index.html' && !valid.has(`${s}/${f}`)) {
                await require('fs').promises.unlink(`${d}/${f}`);
            }
        }
    }

    await Promise.all([
        Bun.write(`${C.root}/sitemap.txt`, [...urls].sort().join('\n')),
                      Bun.write(`${C.root}/artikel.json`, JSON.stringify(final, null, 2))
    ]);

    console.log('✅ Selesai.');
})();