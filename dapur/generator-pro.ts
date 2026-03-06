import { titleToCategory } from './titleToCategory.ts';

const C = {
    root: `${import.meta.dir}/..`,
    art: `${import.meta.dir}/../artikel`,
    base: 'https://dalam.web.id',
    limit: 30,
    xsl: 'sitemap-style.xsl',
    cats: ['gaya-hidup', 'jejak-sejarah', 'lainnya', 'olah-media', 'opini-sosial', 'sistem-terbuka', 'warta-tekno']
};

/**
 * Fungsi untuk membersihkan HTML Entities menjadi teks murni
 */
const decodeHTML = (str: string) => {
    const entities: Record<string, string> = {
        '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
        '&#39;': "'", '&apos;': "'", '&bull;': '•', '&ndash;': '–',
        '&mdash;': '—', '&nbsp;': ' '
    };
    let t = str.replace(/&[a-z0-9#]+;/gi, (m) => entities[m.toLowerCase()] || m);
    t = t.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
    t = t.replace(/&#x([a-f0-9]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    return t.trim();
};

const slug = (t: any) => t.toString().toLowerCase().trim()
.replace(/^[^\w\s]*/u,'')
.replace(/ & /g,'-and-')
.replace(/[^a-z0-9\s-]/g,'')
.replace(/\s+/g,'-')
.replace(/-+/g,'-');

const iso = (d: any) => {
    const parsedDate = new Date(d);
    const finalDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    return finalDate.toISOString().replace(/\.\d+Z$/, '+08:00');
};

const sanitize = (r: string) => r.replace(/^\p{Emoji_Presentation}\s*/u, '').trim();

const mime = (u: string) => ({ 'png':'image/png', 'webp':'image/webp', 'svg':'image/svg+xml' }[u.split('.').pop()!] || 'image/jpeg');

const buildRss = (t: string, items: any[], link: string, desc: string) =>
`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title><![CDATA[${decodeHTML(t)}]]></title><link>${C.base}/</link><description>${desc}</description><language>id-ID</language><atom:link href="${link}" rel="self" type="application/rss+xml"/><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items.map(it => `<item><title><![CDATA[${decodeHTML(it.title)}]]></title><link>${it.loc}</link><guid>${it.loc}</guid><description><![CDATA[${it.desc || sanitize(decodeHTML(it.title))}]]></description><pubDate>${new Date(it.lastmod).toUTCString()}</pubDate><category><![CDATA[${it.category}]]></category><enclosure url="${it.img}" length="0" type="${mime(it.img)}"/></item>`).join('')}</channel></rss>`;

const distribute = async (f: string, cat: string, url: string, pre?: string) => {
    const dir = `${C.root}/${slug(cat)}`;
    await require('fs').promises.mkdir(dir, { recursive: true });
    let html = pre || await Bun.file(`${C.art}/${f}`).text();
    html = html.replace(/<link rel="canonical" href="[^"]+">/i, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:url" content="[^"]+">/i, `<meta property="og:url" content="${url}">`)
    .replace(new RegExp(`${C.base}/artikel/${f.replace('.html','')}`, 'g'), url)
    .replace(/\/artikel\/-\/([a-z-]+)(\.html)?\/?/g, '/$1');
    await Bun.write(`${dir}/${f}`, html);
};

(async () => {
    console.log('🚀 Diet Mode V8.6 (Anti-Entity Edition)');
    const [eta, stm, mst] = await Promise.all([
        Bun.file(`${C.root}/artikel.json`).json().catch(()=>({})),
        Bun.file(`${C.root}/sitemap.txt`).text().catch(()=>''),
        Bun.file(`${C.art}/artikel.json`).json().catch(()=>({}))
    ]);

    const urls = new Set(stm.split('\n').filter(Boolean));
    const files = [...new Bun.Glob("*.html").scanSync(C.art)].filter(f => !f.startsWith('-'));
    const final: any = {};
    const flat: any[] = [];
    const valid = new Set();

    for (const f of files) {
        let d: any = null, cat: any = null;

        // 1. Cari di cache (artikel.json root)
        for (const [c, its] of Object.entries(eta)) {
            const found = (its as any[]).find(i => i[1] === f);
            if (found) { d = [...found]; d[0] = decodeHTML(d[0]); cat = c; break; }
        }

        // --- FUNGSI OTOMATISASI PEMINDAHAN ---
        if (d) {
            let targetCat = null;
            // Cek apakah ada instruksi kategori berbeda di artikel/artikel.json (master)
            for (const [mc, mits] of Object.entries(mst)) {
                if ((mits as any[]).find(i => i[1] === f)) { targetCat = mc; break; }
            }
            // Jika tidak ada di master, cek titleToCategory
            if (!targetCat) targetCat = titleToCategory(d[0]);

            // Jika kategori saat ini berbeda dengan target, paksa re-scan
            if (cat !== targetCat) {
                urls.delete(`${C.base}/${slug(cat)}/${f.replace('.html','')}`);
                d = null;
            }
        }

        // Lanjut proses jika data masih valid
        if (d && urls.has(`${C.base}/${slug(cat)}/${f.replace('.html','')}`)) {
            (final[cat] ??= []).push(d);
            flat.push({ title: d[0], file: f, img: d[2], lastmod: d[3], desc: d[4], category: cat, loc: `${C.base}/${slug(cat)}/${f.replace('.html','')}` });
            valid.add(`${slug(cat)}/${f}`);
            continue;
        }

        // 2. Jika tidak valid/berubah, baca file fisik
        const txt = await Bun.file(`${C.art}/${f}`).text();
        const rawT = (txt.match(/<title>(.*?)<\/title>/i)?.[1] || 'Tanpa Judul').trim();
        const t = decodeHTML(rawT);

        // Tentukan kategori (prioritas: Master JSON > titleToCategory)
        let c = null;
        for (const [mc, mits] of Object.entries(mst)) {
            if ((mits as any[]).find(i => i[1] === f)) { c = mc; break; }
        }
        if (!c) c = titleToCategory(t);

        const url = `${C.base}/${slug(c)}/${f.replace('.html','')}`;
        const date = txt.match(/article:published_time" content="(.*?)"/i)?.[1] || (await require('fs').promises.stat(`${C.art}/${f}`)).mtime;
        const img = txt.match(/(og|twitter):image" content="(.*?)"/i)?.[2] || `${C.base}/img/${f.replace('.html','')}.webp`;
        const desc = (txt.match(/description" content="(.*?)"/i)?.[1] || '').trim();

        const newData = [t, f, img, iso(date), desc];
        await distribute(f, c, url, txt);

        (final[c] ??= []).push(newData);
        flat.push({ title: t, file: f, img, lastmod: iso(date), desc, category: c, loc: url });
        urls.add(url);
        valid.add(`${slug(c)}/${f}`);
    }

    // Cleanup files lama & Sinkronisasi Sitemap
    for (const s of C.cats) {
        const d = `${C.root}/${s}`;
        await require('fs').promises.mkdir(d, { recursive: true });
        for (const f of [...new Bun.Glob("*.html").scanSync(d)]) {
            if (f !== 'index.html' && !valid.has(`${s}/${f}`)) {
                await require('fs').promises.unlink(`${d}/${f}`);
                urls.delete(`${C.base}/${s}/${f.replace('.html','')}`);
            }
        }
    }

    flat.sort((a,b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());
    await Promise.all([
        Bun.write(`${C.root}/sitemap.txt`, [...urls].sort().join('\n')),
                      Bun.write(`${C.root}/artikel.json`, JSON.stringify(final, null, 2))
    ]);

    // Build XML Sitemaps
    let xP = '', xI = '', xV = '';
for (const it of flat) {
    xP += `<url><loc>${it.loc}</loc><lastmod>${it.lastmod}</lastmod></url>`;
    xI += `<url><loc>${it.loc}</loc><lastmod>${it.lastmod}</lastmod><image:image><image:loc>${it.img}</image:loc><image:caption><![CDATA[${it.title}]]></image:caption></image:image></url>`;

    const txt = await Bun.file(`${C.art}/${it.file}`).text();
    const vids = [...txt.matchAll(/<iframe[^>]+src="([^"]+)"/gi)].map(m => m[1]).filter(s => !s.endsWith('.js'));
    vids.forEach(s => {
        const id = s.match(/embed\/([^/?]+)/)?.[1];
        if(id) xV += `<url><loc>${it.loc}</loc><video:video><video:thumbnail_loc>https://img.youtube.com/vi/${id}/hqdefault.jpg</video:thumbnail_loc><video:title><![CDATA[${it.title}]]></video:title><video:description><![CDATA[${it.desc || it.title}]]></video:description><video:player_loc>${s.replace(/&/g,'&amp;')}</video:player_loc></video:video></url>`;
    });
}

const hdr = `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/${C.xsl}"?>`;
const mod = flat[0]?.lastmod || iso(new Date());

await Promise.all([
    Bun.write(`${C.root}/sitemap.xml`, `${hdr}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['sitemap-1','image-sitemap-1','video-sitemap-1'].map(s => `<sitemap><loc>${C.base}/${s}.xml</loc><lastmod>${mod}</lastmod></sitemap>`).join('')}</sitemapindex>`),
                  Bun.write(`${C.root}/sitemap-1.xml`, `${hdr}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xP}</urlset>`),
                  Bun.write(`${C.root}/image-sitemap-1.xml`, `${hdr}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${xI}</urlset>`),
                  Bun.write(`${C.root}/video-sitemap-1.xml`, `${hdr}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${xV}</urlset>`),
                  Bun.write(C.root+'/rss.xml', buildRss('Layar Kosong', flat.slice(0,C.limit), C.base+'/rss.xml', 'Feed artikel terbaru'))
]);

// Build Category Pages (Static Version)
const tmp = await Bun.file(`${C.art}/-/template-kategori.html`).text().catch(()=>'');
if (tmp) {
    for (const [cat, arts] of Object.entries(final)) {
        const s = slug(cat);
        const rUrl = `${C.base}/feed-${s}.xml`;
        const categoryNameClean = sanitize(decodeHTML(cat));

        // 1. Rakit daftar artikel secara statis (Server-Side)
        const categoryArticlesHTML = (arts as any[])
        .sort((a, b) => new Date(b[3]).getTime() - new Date(a[3]).getTime())
        .map(a => {
            const title = a[0];
            const cleanUrl = a[1].replace('.html', '');
            const image = a[2];
            const formattedDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(a[3]));
            let displayDesc = (a[4] || title).substring(0, 100) + '...';

        return `
        <a href="${cleanUrl}" class="article-card">
        <div class="card-thumbnail">
        <img src="${image}" alt="${title}" loading="lazy" onerror="this.src='/thumbnail.webp'">
        </div>
        <div class="card-content">
        <h2>${title}</h2>
        <p>${displayDesc}</p>
        <span class="card-meta">${formattedDate}</span>
        </div>
        </a>`;
        }).join('');

        // 2. Siapkan Schema JSON-LD
        const hp = JSON.stringify((arts as any[]).map(a => ({"@type":"WebPage","name":a[0],"url":`${C.base}/${s}/${a[1].replace('.html','')}`,"datePublished":a[3],"description":a[4]||a[0]})), null, 2);

        // 3. Inject ke Template yang sudah bersih dari Script
        let pg = tmp
        .replace(/%%TITLE%%|%%DESCRIPTION%%/g, categoryNameClean)
        .replace(/%%CATEGORY_NAME%%/g, decodeHTML(cat))
        .replace(/%%RSS_URL%%/g, rUrl)
        .replace(/%%CANONICAL_URL%%/g, `${C.base}/${s}`)
        .replace(/%%ICON%%/g, cat.match(/(\p{Emoji})/u)?.[0] || '📁')
        // Langsung inject ke ID yang sudah kita siapkan di template
        .replace('<span id="category-title-text">Memuat...</span>', `<span id="category-title-text">${categoryNameClean}</span>`)
        .replace('<div id="loading">Memuat...</div>', '')
        .replace('<div id="article-grid"></div>', `<div id="article-grid">${categoryArticlesHTML}</div>`)
        .replace(/"inLanguage": "id-ID"/, `"inLanguage": "id-ID",\n  "hasPart": ${hp}`);

        await Bun.write(`${C.root}/${s}/index.html`, pg);

        // Buat RSS Feed per kategori (Tetap diperlukan untuk pembaca RSS)
        await Bun.write(`${C.root}/feed-${s}.xml`, buildRss(`Kategori ${categoryNameClean}`, (arts as any[]).map(a => ({title:a[0], file:a[1], img:a[2], lastmod:a[3], desc:a[4], category:cat, loc:`${C.base}/${s}/${a[1].replace('.html','')}`})).slice(0,C.limit), rUrl, `Artikel ${cat}`));
    }
    console.log('📂 Static Category Pages Generated (Clean Mode).');
}
// bikin halaman feed. html
const feedTemplatePath = `${C.art}/-/template-feed.html`; // Simpan HTML Anda tadi sebagai template di sini
const feedTemplate = await Bun.file(feedTemplatePath).text().catch(() => '');

if (feedTemplate) {
    const feedItemsHTML = flat.slice(0, C.limit).map(it => {
        const encodedLink = encodeURIComponent(it.loc);
        const encodedText = encodeURIComponent(it.desc || it.title);
        const displayDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(it.lastmod));
        const cleanCat = it.category.replace(/[\u{1F300}-\u{1F6FF}]/gu, '').trim(); // Hapus emoji untuk meta

        return `
        <div class="feed-item">
        <div class="feed-item-thumbnail">
        <img src="${it.img}" alt="${it.title}" loading="lazy">
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
        <a href="https://x.com/intent/post?text=${encodedText}&url=${encodedLink}"
        onclick="window.open(this.href,'targetWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=400');return false;"><i class="fa-brands fa-twitter"></i></a>

        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedLink}&t=${encodedText}"
        onclick="window.open(this.href,'targetWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=400');return false;"><i class="fa-brands fa-facebook"></i></a>

        <a href="https://api.whatsapp.com/send?text=${encodedText}%0A%0A${encodedLink}"
        onclick="window.open(this.href,'targetWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=400');return false;"><i class="fa-brands fa-whatsapp"></i></a>

        <a href="https://t.me/share/url?url=${encodedLink}&text=${encodedText}"
        onclick="window.open(this.href,'targetWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=400');return false;"><i class="fa-brands fa-telegram"></i></a>

        <a href="https://www.threads.com/intent/post?text=${encodedText}&url=${encodedLink}"
        onclick="window.open(this.href,'targetWindow','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=400');return false;"><i class="fa-brands fa-threads"></i></a>

        </div>
        </div>
        </div>`;
    }).join('');

    const finalFeedPage = feedTemplate
    .replace('<div id="loading"></div>', '') // Hapus loading spinner
    .replace('<div id="feed-container"></div>', `<div id="feed-container">${feedItemsHTML}</div>`)
    .replace(/<script>[\s\S]*?fetchAndDisplayFeed\(\);[\s\S]*?<\/script>/, ''); // Hapus script fetch otomatis

    await Bun.write(`${C.root}/feed.html`, finalFeedPage);
    console.log('✨ Static Feed Page Generated.');
}
console.log('✅ Selesai. Pindah kategori otomatis sukses.');
})();
