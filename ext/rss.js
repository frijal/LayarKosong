import fs from 'fs/promises';
import path from 'path';
import { DOMParser } from '@xmldom/xmldom';
import { fileURLToPath } from 'url';

// --- Konfigurasi ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artikelJsonPath = path.join(__dirname, '../artikel.json');
const sitemapPath = path.join(__dirname, '../sitemap.xml');
const mainRssPath = path.join(__dirname, '../rss.xml');
const RSS_LIMIT = 30; // Batas jumlah artikel di feed utama

// --- Konstanta Indeks ---
const IDX_TITLE = 0;
const IDX_FILE = 1;
const IDX_IMAGE = 2;
const IDX_LASTMOD = 3;
const IDX_DESCRIPTION = 4;

// --- Fungsi Bantuan ---
function sanitizeTitle(raw) {
    if (!raw) return '';
    return raw.replace(/^\p{Emoji_Presentation}\s*/u, '').trimStart();
}

function categoryToSlug(name) {
    return name
        .replace(/^[^\w\s]*/u, '') // Hapus emoji di awal
        .trim()
        .toLowerCase()
        .replace(/ & /g, '-and-')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

async function loadSitemapMap() {
    try {
        await fs.access(sitemapPath);
        const sitemapContent = await fs.readFile(sitemapPath, 'utf8');
        const doc = new DOMParser().parseFromString(sitemapContent, 'text/xml');
        const urls = doc.getElementsByTagName('url');
        const map = {};

        for (let i = 0; i < urls.length; i++) {
            const locElement = urls[i].getElementsByTagName('loc')[0];
            if (locElement) {
                const loc = locElement.textContent;
                
                // --- PERBAIKAN PENTING DI SINI ---
                // Kita perlu mendapatkan nama file asli (misalnya, 'nama-file.html') 
                // dari Pretty URL (misalnya, '.../nama-file').
                // Kita asumsikan URL adalah: https://baseurl/artikel/nama-file
                // Kita tahu nama file HTML pasti sama dengan bagian terakhir URL, 
                // ditambah ekstensi '.html'.
                let prettyFileName = path.basename(loc);
                
                // Karena artikel.json menggunakan nama file dengan ekstensi, 
                // kita harus mengembalikan ekstensi tersebut untuk key maping.
                if (!prettyFileName.endsWith('.html')) {
                    prettyFileName += '.html';
                }
                // Jika URL adalah Pretty URL, prettyFileName akan menjadi 'nama-file.html'

                map[prettyFileName] = {
                    lastmod: urls[i].getElementsByTagName('lastmod')[0]?.textContent || null,
                    imageLoc: urls[i].getElementsByTagName('image:loc')[0]?.textContent || null,
                    // Kita juga simpan Pretty URL yang benar untuk digunakan nanti
                    prettyLoc: loc, 
                };
            }
        }
        return map;
    } catch (e) {
        console.warn(`⚠️ sitemap.xml tidak ditemukan atau error saat parsing. (${e.message}) Data tanggal dan gambar mungkin kurang akurat.`);
        return {};
    }
}

// --- Fungsi Utama ---
async function generateAllFeeds() {
    console.log("🚀 Memulai proses pembuatan semua feed RSS...");

    // 1. Muat semua data yang diperlukan
    let artikelData;
    try {
        await fs.access(artikelJsonPath);
        artikelData = JSON.parse(await fs.readFile(artikelJsonPath, 'utf8'));
    } catch {
        console.error('❌ ERROR: File artikel.json tidak ditemukan. Proses dibatalkan.');
        process.exit(1);
    }
    const sitemapMap = await loadSitemapMap();

    // ==========================================================
    // BAGIAN A: GENERATE RSS UTAMA (ARTIKEL TERBARU)
    // ==========================================================
    console.log("\n🔄 Membuat rss.xml utama...");
    
    let allItems = [];
    for (const articles of Object.values(artikelData)) {
        for (const arr of articles) {
            const fileName = arr[IDX_FILE]; // Format: nama-file.html
            // MENCARI DENGAN KEY YANG SAMA DENGAN ARTIKEL.JSON
            const sitemapInfo = sitemapMap[fileName]; 
            
            if (sitemapInfo) {
                // Gunakan sitemapInfo.prettyLoc yang sudah kita simpan
                const prettyUrl = sitemapInfo.prettyLoc; 

                allItems.push({
                    title: arr[IDX_TITLE],
                    loc: prettyUrl, // Menggunakan Pretty URL
                    pubDate: new Date(sitemapInfo.lastmod).toUTCString(),
                    desc: arr[IDX_DESCRIPTION] || sanitizeTitle(arr[IDX_TITLE]),
                    category: Object.keys(artikelData).find(key => artikelData[key].includes(arr)),
                    imageLoc: arr[IDX_IMAGE],
                    dateObj: new Date(sitemapInfo.lastmod),
                });
            }
        }
    }

    allItems.sort((a, b) => b.dateObj - a.dateObj);
    const latestItems = allItems.slice(0, RSS_LIMIT);

    const mainItemsXml = latestItems.map(it => {
        // Enclosure type diubah ke 'image/*' untuk kompatibilitas yang lebih baik
        const enclosure = it.imageLoc ? `    <enclosure url="${it.imageLoc}" length="0" type="image/jpeg" />` : ''; 
        return `    <item>
      <title><![CDATA[${it.title}]]></title>
      <link><![CDATA[${it.loc}]]></link>
      <guid><![CDATA[${it.loc}]]></guid>
      <pubDate>${it.pubDate}</pubDate>
      <description><![CDATA[${it.desc}]]></description>
      <category><![CDATA[${it.category}]]></category>
${enclosure}
    </item>`;
    }).join('\n');

    const mainRss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[Layar Kosong]]></title>
    <link><![CDATA[https://dalam.web.id/]]></link>
    <description><![CDATA[Feed ${RSS_LIMIT} artikel terbaru]]></description>
    <language>id-ID</language>
    <atom:link href="https://dalam.web.id/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${mainItemsXml}
  </channel>
</rss>`;
    
    await fs.writeFile(mainRssPath, mainRss, 'utf8');
    console.log(`✅ rss.xml berhasil dibuat (${latestItems.length} item).`);

    // ==========================================================
    // BAGIAN B: GENERATE RSS PER KATEGORI
    // ==========================================================
    console.log("\n🔄 Membuat feed untuk setiap kategori...");
    
    const categoryWritePromises = [];

    for (const [category, articles] of Object.entries(artikelData)) {
        const categorySlug = categoryToSlug(category);
        const categoryRssPath = path.join(__dirname, `../feed-${categorySlug}.xml`);
        
        let categoryItems = [];
        for (const arr of articles) {
            const fileName = arr[IDX_FILE]; // Format: nama-file.html
            const sitemapInfo = sitemapMap[fileName]; 
            
            if (sitemapInfo) {
                const prettyUrl = sitemapInfo.prettyLoc; 
                
                categoryItems.push({
                    title: arr[IDX_TITLE],
                    loc: prettyUrl, // Menggunakan Pretty URL
                    pubDate: new Date(sitemapInfo.lastmod).toUTCString(),
                    desc: arr[IDX_DESCRIPTION] || sanitizeTitle(arr[IDX_TITLE]),
                    imageLoc: arr[IDX_IMAGE],
                    dateObj: new Date(sitemapInfo.lastmod),
                });
            }
        }

        categoryItems.sort((a, b) => b.dateObj - a.dateObj);
        
        const categoryItemsXml = categoryItems.map(it => {
            const enclosure = it.imageLoc ? `<enclosure url="${it.imageLoc}" length="0" type="image/jpeg" />` : '';
            return `    <item>
      <title><![CDATA[${it.title}]]></title>
      <link><![CDATA[${it.loc}]]></link>
      <guid><![CDATA[${it.loc}]]></guid>
      <pubDate>${it.pubDate}</pubDate>
      <description><![CDATA[${it.desc}]]></description>
      <category><![CDATA[${category}]]></category>
${enclosure}
    </item>`;
        }).join('\n');

        const categoryRss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${category} - Layar Kosong]]></title>
    <link><![CDATA[https://dalam.web.id/]]></link>
    <description><![CDATA[Feed artikel terbaru untuk kategori ${category}]]></description>
    <language>id-ID</language>
    <atom:link href="https://dalam.web.id/feed-${categorySlug}.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${categoryItemsXml}
  </channel>
</rss>`;

        categoryWritePromises.push(
            fs.writeFile(categoryRssPath, categoryRss, 'utf8')
                .then(() => console.log(`✅ feed-${categorySlug}.xml berhasil dibuat (${categoryItems.length} item).`))
        );
    }
    
    await Promise.all(categoryWritePromises);
    
    console.log("\n✨ Semua proses selesai!");
}

// Jalankan fungsi utama
generateAllFeeds().catch(err => {
    console.error('❌ Terjadi kesalahan fatal:', err);
    process.exit(1);
});
