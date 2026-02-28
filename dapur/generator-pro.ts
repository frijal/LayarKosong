import { titleToCategory } from './titleToCategory.js';
const C = {
    root: `${import.meta.dir}/..`, art: `${import.meta.dir}/../artikel`, base: 'https://dalam.web.id', limit: 30,
    xsl: 'sitemap-style.xsl', cats: ['gaya-hidup', 'jejak-sejarah', 'lainnya', 'olah-media', 'opini-sosial', 'sistem-terbuka', 'warta-tekno']
};

const slug = (t: any) => t.toString().toLowerCase().trim().replace(/^[^\w\s]*/u,'').replace(/ & /g,'-and-').replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-');
const iso = (d: any) => new Date(d).toISOString().replace(/\.\d+Z$/, '+08:00');
const sanitize = (r: string) => r.replace(/^\p{Emoji_Presentation}\s*/u, '').trim();
const mime = (u: string) => ({ 'png':'image/png', 'webp':'image/webp', 'svg':'image/svg+xml' }[u.split('.').pop()!] || 'image/jpeg');

const buildRss = (t: string, items: any[], link: string, desc: string) => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title><![CDATA[${t}]]></title><link>${C.base}/</link><description>${desc}</description><language>id-ID</language><atom:link href="${link}" rel="self" type="application/rss+xml"/><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items.map(it => `<item><title><![CDATA[${it.title}]]></title><link>${it.loc}</link><guid>${it.loc}</guid><description><![CDATA[${it.desc || sanitize(it.title)}]]></description><pubDate>${new Date(it.lastmod).toUTCString()}</pubDate><category><![CDATA[${it.category}]]></category><enclosure url="${it.img}" length="0" type="${mime(it.img)}"/></item>`).join('')}</channel></rss>`;

const distribute = async (f: string, cat: string, url: string, pre?: string) => {
    const dir = `${C.root}/${slug(cat)}`; await require('fs').promises.mkdir(dir, { recursive: true });
    let html = pre || await Bun.file(`${C.art}/${f}`).text();
    html = html.replace(/<link rel="canonical" href="[^"]+">/i, `<link rel="canonical" href="${url}">`).replace(/<meta property="og:url" content="[^"]+">/i, `<meta property="og:url" content="${url}">`).replace(new RegExp(`${C.base}/artikel/${f.replace('.html','')}`, 'g'), url).replace(/\/artikel\/-\/([a-z-]+)(\.html)?\/?/g, '/$1');
    await Bun.write(`${dir}/${f}`, html);
};

(async () => {
    console.log('🚀 Diet Mode V8.6');
    const [eta, stm, mst] = await Promise.all([Bun.file(`${C.root}/artikel.json`).json().catch(()=>({})), Bun.file(`${C.root}/sitemap.txt`).text().catch(()=>''), Bun.file(`${C.art}/artikel.json`).json().catch(()=>({}))]);
    const urls = new Set(stm.split('\n').filter(Boolean)), files = [...new Bun.Glob("*.html").scanSync(C.art)].filter(f => !f.startsWith('-')), final: any = {}, flat: any[] = [], valid = new Set();

    for (const f of files) {
        let d: any = null, cat: any = null;
        for (const [c, its] of Object.entries(eta)) { if ((its as any[]).find(i => i[1] === f)) { d = (its as any[]).find(i => i[1] === f); cat = c; break; } }
        if (d && urls.has(`${C.base}/${slug(cat)}/${f.replace('.html','')}`)) { (final[cat] ??= []).push(d); flat.push({ title: d[0], file: f, img: d[2], lastmod: d[3], desc: d[4], category: cat, loc: `${C.base}/${slug(cat)}/${f.replace('.html','')}` }); valid.add(`${slug(cat)}/${f}`); continue; }

        for (const [c, its] of Object.entries(mst)) { if ((its as any[]).find(i => i[1] === f)) { d = (its as any[]).find(i => i[1] === f); cat = c; break; } }
        if (d) { const url = `${C.base}/${slug(cat)}/${f.replace('.html','')}`; await distribute(f, cat, url); (final[cat] ??= []).push(d); flat.push({ title: d[0], file: f, img: d[2], lastmod: d[3], desc: d[4], category: cat, loc: url }); urls.add(url); valid.add(`${slug(cat)}/${f}`); continue; }

        const txt = await Bun.file(`${C.art}/${f}`).text(), t = (txt.match(/<title>(.*?)<\/title>/i)?.[1] || 'Tanpa Judul').trim(), c = titleToCategory(t), url = `${C.base}/${slug(c)}/${f.replace('.html','')}`, date = txt.match(/article:published_time" content="(.*?)"/i)?.[1] || (await require('fs').promises.stat(`${C.art}/${f}`)).mtime;
        const img = txt.match(/(og|twitter):image" content="(.*?)"/i)?.[2] || `${C.base}/img/${f.replace('.html','')}.webp`, desc = (txt.match(/description" content="(.*?)"/i)?.[1] || '').trim();
        const newData = [t, f, img, iso(date), desc]; await distribute(f, c, url, txt); (final[c] ??= []).push(newData); flat.push({ title: t, file: f, img, lastmod: iso(date), desc, category: c, loc: url }); urls.add(url); valid.add(`${slug(c)}/${f}`);
    }

    for (const s of C.cats) { const d = `${C.root}/${s}`; await require('fs').promises.mkdir(d, { recursive: true }); for (const f of [...new Bun.Glob("*.html").scanSync(d)]) { if (f !== 'index.html' && !valid.has(`${s}/${f}`)) { await require('fs').promises.unlink(`${d}/${f}`); urls.delete(`${C.base}/${s}/${f.replace('.html','')}`); } } }

    flat.sort((a,b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());
    await Promise.all([Bun.write(`${C.root}/sitemap.txt`, [...urls].sort().join('\n')), Bun.write(`${C.root}/artikel.json`, JSON.stringify(final, null, 2))]);

    let xP = '', xI = '', xV = '';
for (const it of flat) {
    xP += `<url><loc>${it.loc}</loc><lastmod>${it.lastmod}</lastmod></url>`;
    xI += `<url><loc>${it.loc}</loc><lastmod>${it.lastmod}</lastmod><image:image><image:loc>${it.img}</image:loc><image:caption><![CDATA[${it.title}]]></image:caption></image:image></url>`;
    const txt = await Bun.file(`${C.art}/${it.file}`).text(), vids = [...txt.matchAll(/<iframe[^>]+src="([^"]+)"/gi)].map(m => m[1]).filter(s => !s.endsWith('.js'));
    vids.forEach(s => { const id = s.match(/embed\/([^/?]+)/)?.[1]; if(id) xV += `<url><loc>${it.loc}</loc><video:video><video:thumbnail_loc>https://img.youtube.com/vi/${id}/hqdefault.jpg</video:thumbnail_loc><video:title><![CDATA[${it.title}]]></video:title><video:description><![CDATA[${it.desc || it.title}]]></video:description><video:player_loc>${s.replace(/&/g,'&amp;')}</video:player_loc></video:video></url>`; });
}

const hdr = `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/${C.xsl}"?>`, mod = flat[0]?.lastmod || iso(new Date());
await Promise.all([Bun.write(`${C.root}/sitemap.xml`, `${hdr}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['sitemap-1','image-sitemap-1','video-sitemap-1'].map(s => `<sitemap><loc>${C.base}/${s}.xml</loc><lastmod>${mod}</lastmod></sitemap>`).join('')}</sitemapindex>`), Bun.write(`${C.root}/sitemap-1.xml`, `${hdr}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xP}</urlset>`), Bun.write(`${C.root}/image-sitemap-1.xml`, `${hdr}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${xI}</urlset>`), Bun.write(`${C.root}/video-sitemap-1.xml`, `${hdr}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${xV}</urlset>`), Bun.write(C.root+'/rss.xml', buildRss('Layar Kosong', flat.slice(0,C.limit), C.base+'/rss.xml', 'Feed artikel terbaru'))]);

const tmp = await Bun.file(`${C.art}/-/template-kategori.html`).text().catch(()=>'');
if (tmp) for (const [cat, arts] of Object.entries(final)) {
    const s = slug(cat), rUrl = `${C.base}/feed-${s}.xml`, hp = JSON.stringify((arts as any[]).map(a => ({"@type":"WebPage","name":a[0],"url":`${C.base}/${s}/${a[1].replace('.html','')}`,"datePublished":a[3],"description":a[4]||a[0]})), null, 2);
    let pg = tmp.replace(/%%TITLE%%|%%DESCRIPTION%%/g, sanitize(cat)).replace(/%%CATEGORY_NAME%%/g, cat).replace(/%%RSS_URL%%/g, rUrl).replace(/%%CANONICAL_URL%%/g, `${C.base}/${s}`).replace(/%%ICON%%/g, cat.match(/(\p{Emoji})/u)?.[0] || '📁').replace(/"inLanguage": "id-ID"/, `"inLanguage": "id-ID",\n  "hasPart": ${hp}`);
    await Bun.write(`${C.root}/${s}/index.html`, pg);
    await Bun.write(`${C.root}/feed-${s}.xml`, buildRss(`Kategori ${sanitize(cat)}`, (arts as any[]).map(a => ({title:a[0], file:a[1], img:a[2], lastmod:a[3], desc:a[4], category:cat, loc:`${C.base}/${s}/${a[1].replace('.html','')}`})).slice(0,C.limit), rUrl, `Artikel ${cat}`));
}
console.log('✅ Selesai.');
})();
