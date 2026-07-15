/**
 * ==============================================================================
 * 🚀 GENERATOR HALAMAN DEPAN (STANDAR) - LAYAR KOSONG
 * ==============================================================================
 * Script ini berfungsi untuk menginjeksi artikel terbaru (Hero & Grid)
 * ke dalam template tema HTML yang kamu buat.
 *
 * 📌 SYARAT THEMES / TEMPLATE AGAR BISA DI-INJECT:
 * 1. Lokasi file template harus berada di: `artikel/-/template-index1.html`
 *    (Kamu bisa ubah variabel `templatePath` di bawah jika nama filenya beda).
 *
 * 2. Wajib memiliki PLACEHOLDER HERO.
 *    Script akan mencari dan menimpa SEMUA kode di antara dua tag komentar ini:
 *    <!-- BEGIN HERO AUTOGEN -->
 *    (kode apapun di sini akan ditimpa menjadi CSS Slider artikel terbaru)
 *    <!-- END HERO AUTOGEN -->
 *
 * 3. Wajib memiliki PLACEHOLDER GRID.
 *    Script akan mencari dan menimpa SEMUA kode di antara dua tag komentar ini:
 *    <!-- BEGIN GRID AUTOGEN -->
 *    (kode apapun di sini akan ditimpa menjadi daftar grid artikel ke-2 & ke-3)
 *    <!-- END GRID AUTOGEN -->
 *
 * Selama tema barumu memiliki 2 blok komentar di atas, script ini akan
 * otomatis menjahit datanya tanpa merusak struktur HTML tema barumu! 🕵️‍♂️✨
 * ==============================================================================
 */

import { promises as fs } from 'fs';

// Konstanta dasar yang dibutuhin untuk struktur folder
const C = {
    root: `${import.meta.dir}/..`,
    art:  `${import.meta.dir}/../artikel`,
    base: 'https://dalam.web.id',
    cats: ['gaya-hidup', 'jejak-sejarah', 'lainnya', 'olah-media', 'opini-sosial', 'sistem-terbuka', 'warta-tekno']
};

// --- KAMUS KATEGORI & HELPER ---
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

const slug = (t: any) => t.toString().toLowerCase().trim()
.replace(/^[^\w\s]*/u, '')
.replace(/ & /g, '-and-')
.replace(/[^a-z0-9\s-]/g, '')
.replace(/\s+/g, '-')
.replace(/-+/g, '-');

const escapeAttr = (s: string) => s.replace(/"/g, '&quot;');

const escapeXML = (s: string) => s
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;');

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

const imgWithFallback = (src: string, alt: string, extraAttrs: string = ''): string => {
    const smSrc = src.replace(/(\.[a-zA-Z0-9]+)$/, '-sm$1');
    const mdSrc = src.replace(/(\.[a-zA-Z0-9]+)$/, '-md$1');
    const onerror = `this.onerror=function(){this.onerror=function(){this.onerror=null;this.src='/thumbnail-sm.webp'};this.src='${src}'};this.src='${mdSrc}'`;
    return `<img src="${smSrc}" alt="${escapeAttr(alt)}" ${extraAttrs} onerror="${onerror}">`;
};
// ---------------------------------

// =============================================================================
// ── GENERATOR HALAMAN DEPAN
// =============================================================================
(async () => {
    console.log('✨ Menjalankan generator-depan.ts: Injeksi Hero & Grid ke index.html...');
    try {
        // Ambil data final dari file JSON
        const artikelJsonPath = `${C.root}/artikel.json`;
        const final: Record<string, any[]> = await Bun.file(artikelJsonPath).json().catch(() => ({}));

        let heroInputsHtml = '';
        let heroSlidesHtml = '';
        let gridHtml = '';

        const activeCategories = Object.keys(final).filter(k => final[k].length > 0 && C.cats.includes(slug(k)));
        const heroTotal = activeCategories.length;
        let heroIndex = 0;

        if (heroTotal === 0) {
            console.log("⚠️ Waduh! artikel.json kosong atau nggak ada kategori valid. Injeksi bakal kosong melompong nih!");
        }

        for (const catKey of activeCategories) {
            const catSlug = slug(catKey);
            const catLabel = getCategoryLabel(catSlug);

            // --- LOGIKA HERO (ARTIKEL KE-0) ---
            const latest = final[catKey][0];
            const dateObj = new Date(latest[3]);
            const formattedDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(dateObj);
            const safeDesc = escapeXML(latest[4] || latest[0]);
            const heroUrl = `${C.base}/${catSlug}/${latest[1].replace('.html', '')}`;

            // Kalkulasi indeks slider sebelumnya dan selanjutnya
            const prevIndex = (heroIndex - 1 + heroTotal) % heroTotal;
            const nextIndex = (heroIndex + 1) % heroTotal;

            // Injeksi tag Radio
            heroInputsHtml += `      <input type="radio" name="hero" id="slide-${heroIndex}" class="hero-radio" ${heroIndex === 0 ? 'checked' : ''}>\n`;

            // Injeksi HTML Slide
            heroSlidesHtml += `
            <div class="hero-slide slide-${heroIndex}">
            <div class="hero-media">
            <img src="${latest[2]}" alt="${escapeXML(decodeHTML(latest[0]))}" onerror="this.onerror=null;this.src='/thumbnail.webp'">
            <label for="slide-${prevIndex}" class="hero-arrow prev" aria-label="Artikel sebelumnya">←</label>
            <label for="slide-${nextIndex}" class="hero-arrow next" aria-label="Artikel selanjutnya">→</label>
            </div>
            <div class="hero-copy">
            <span class="kicker">${escapeXML(catLabel)}</span>
            <a href="${heroUrl}" style="display: block; text-decoration: none; color: inherit;">
            <h1>${escapeXML(decodeHTML(latest[0]))}</h1>
            </a>
            <div class="meta">Rilis: ${formattedDate}</div>
            <p class="excerpt">${safeDesc}</p>
            </div>
            </div>`;

            heroIndex++;

            // --- LOGIKA GRID (ARTIKEL KE-1 & KE-2) ---
            for (let i = 1; i <= 2; i++) {
                if (final[catKey][i]) {
                    const gridItem = final[catKey][i];
                    const gridTitle = escapeXML(decodeHTML(gridItem[0]));
                    const gridUrl = `${C.base}/${catSlug}/${gridItem[1].replace('.html', '')}`;
                    const gridImg = gridItem[2];
                    const gridDesc = escapeXML(gridItem[4] || gridItem[0]);
                    const gridYear = new Date(gridItem[3]).getFullYear();
                    const gridMonth = new Date(gridItem[3]).toLocaleString('id-ID', { month: 'long', timeZone: 'UTC' });

                    gridHtml += `
                    <article class="thumb article-card" data-category="${catSlug}" data-year="${gridYear}" data-month="${gridMonth}">
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

        // BACA DARI TEMPLATE-INDEX1.HTML
        // (Ubah bagian ini kalau kamu mau ganti nama default template barumu nanti)
        const templatePath = `${C.art}/-/template-index1.html`;
        let indexHtml = await Bun.file(templatePath).text().catch(() => '');

        if (indexHtml) {
            // Timpa area HERO AUTOGEN
            const HERO_START = '<!-- BEGIN HERO AUTOGEN -->';
            const HERO_END = '<!-- END HERO AUTOGEN -->';
            const heroRegex = new RegExp(`${HERO_START}[\\s\\S]*?${HERO_END}`, 'i');

            const fullHeroBlock = `${HERO_START}\n${heroInputsHtml}      <article class="hero-card article-card hero-rotator" id="hero-container">\n${heroSlidesHtml}\n      </article>\n      ${HERO_END}`;

            if (indexHtml.match(heroRegex)) {
                indexHtml = indexHtml.replace(heroRegex, fullHeroBlock);
            }

            // Hapus blok JSON script lama jika masih ada (pembersihan aja)
            indexHtml = indexHtml.replace(/<script id="hero-data" type="application\/json">[\s\S]*?<\/script>/i, '');

            // Timpa area GRID AUTOGEN
            const GRID_START = '<!-- BEGIN GRID AUTOGEN -->';
            const GRID_END = '<!-- END GRID AUTOGEN -->';
            const gridRegex = new RegExp(`${GRID_START}[\\s\\S]*?${GRID_END}`, 'i');

            if (indexHtml.match(gridRegex)) {
                indexHtml = indexHtml.replace(gridRegex, `${GRID_START}\n${gridHtml}\n        ${GRID_END}`);
            }

            // Tulis ke file index.html di root
            await Bun.write(`${C.root}/index.html`, indexHtml);
            console.log('✅ Mantap! Injeksi Hero & Grid ke index.html sukses, Frijal! 🕵️‍♂️');
        } else {
            console.log(`⚠️ Waduh, file template nggak ketemu di path: ${templatePath}`);
        }
    } catch (e) {
        console.log(`⚠️ Ngapunten, gagal menginjeksi HTML nih: ${e}`);
    }
})();
