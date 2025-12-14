// --- IMPORT (Menggantikan require) ---
import * as fs from 'node:fs'; // Menggunakan import dengan namespace
import * as path from 'node:path'; // Menggunakan import dengan namespace
import { fileURLToPath } from 'node:url'; // Diperlukan untuk __dirname
import cheerio from 'cheerio'; // Import default dari cheerio

// --- PATH RESOLUTION (Pengganti __dirname) ---
// Mendapatkan path file saat ini dari URL (import.meta.url)
const __filename = fileURLToPath(import.meta.url);
// Mendapatkan direktori file saat ini
const __dirname = path.dirname(__filename);
// Menentukan root proyek (satu tingkat di atas 'ext')
const PROJECT_ROOT = path.resolve(__dirname, '..'); 

// --- KONFIGURASI ---
// Semua path sekarang menggunakan PROJECT_ROOT sebagai basis
const INPUT_METADATA_FILE = path.join(PROJECT_ROOT, 'artikel.json'); 
const INPUT_ARTICLES_DIR = path.join(PROJECT_ROOT, 'artikel'); 
const OUTPUT_API_DIR = path.join(PROJECT_ROOT, 'api', 'v1'); 
const DOMAIN_BASE_URL = 'https://dalam.web.id'; 

// --- FUNGSI PEMERSATU DATA (FLATTENING) ---
function flattenAndNormalizeData(metadata) {
    const allPosts = [];
    
    for (const category in metadata) {
        if (Object.hasOwnProperty.call(metadata, category)) {
            const articles = metadata[category];
            
            articles.forEach(articleArray => {
                const [title, slug_html, img_url, date, summary] = articleArray;
                
                const id = slug_html.replace('.html', ''); 

                const postObject = {
                    id: id,
                    title: title,
                    slug: slug_html,
                    url: `${DOMAIN_BASE_URL}/artikel/${slug_html}`,
                    datePublished: date,
                    summary: summary,
                    category: category,
                    imageUrl: img_url,
                };
                allPosts.push(postObject);
            });
        }
    }
    
    allPosts.sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));

    return allPosts;
}


// --- FUNGSI PEMBERSIN KONTEN (CHEERIO BLACKLIST) ---
function extractCleanContent(slug_html) {
    const htmlFilePath = path.join(INPUT_ARTICLES_DIR, slug_html);
    
    if (!fs.existsSync(htmlFilePath)) {
        console.error(`File tidak ditemukan: ${htmlFilePath}`);
        return null;
    }
    
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    const $ = cheerio.load(htmlContent);

    const junkSelectors = [
        'script', 
        'style',
        'footer',
        '#iposbrowser',
        '#pesbukdiskus',
        '.search-floating-container',
        '#related-marquee-section'
    ];

    junkSelectors.forEach(selector => {
        $(selector).remove(); 
    });
    
    const container = $('.container').first();
    
    let content_plain = container.text();

    content_plain = content_plain
        .replace(/\s\s+/g, ' ') 
        .trim(); 

    return content_plain;
}


// --- FUNGSI UTAMA: MENJALANKAN GENERASI API ---
function generateApiFiles() {
    console.log('--- Memulai Generasi L-K AI API ---');

    // 1. Persiapan Direktori Output
    if (!fs.existsSync(OUTPUT_API_DIR)) {
        fs.mkdirSync(OUTPUT_API_DIR, { recursive: true });
        console.log(`✅ Direktori API dibuat: ${OUTPUT_API_DIR}`);
    }
    
    const singlePostDir = path.join(OUTPUT_API_DIR, 'post');
     if (!fs.existsSync(singlePostDir)) {
        fs.mkdirSync(singlePostDir, { recursive: true });
    }

    // 2. Baca dan Ratakan Metadata
    try {
        const rawMetadata = JSON.parse(fs.readFileSync(INPUT_METADATA_FILE, 'utf8'));
        const allPosts = flattenAndNormalizeData(rawMetadata);
        console.log(`✅ Metadata ${allPosts.length} artikel telah dibaca.`);

        const summaryPosts = [];
        let processedCount = 0;

        // 3. Loop Artikel untuk Generasi Konten Penuh
        allPosts.forEach(post => {
            const cleanContent = extractCleanContent(post.slug);
            
            if (cleanContent) {
                post.content_plain = cleanContent;

                // ---- A. Tulis File JSON Konten Penuh (Single Post API) ----
                const singlePostPath = path.join(singlePostDir, `${post.id}.json`);
                fs.writeFileSync(singlePostPath, JSON.stringify(post, null, 2));
                
                // ---- B. Siapkan Objek Ringkasan (Hapus Konten Penuh) ----
                const { content_plain, ...summary } = post; 

                summaryPosts.push(summary);
                processedCount++;
            }
        });

        // 4. Tulis File JSON Daftar Artikel (Master List API)
        const masterListPath = path.join(OUTPUT_API_DIR, 'posts.json');
        fs.writeFileSync(masterListPath, JSON.stringify(summaryPosts, null, 2));

        console.log(`\n🎉 Proses Selesai!`);
        console.log(`Total Artikel diproses: ${processedCount}`);
        console.log(`File API Utama dibuat di: ${masterListPath}`);
        console.log(`File Single Post API dibuat di: ${singlePostDir}`);
        console.log('\n--- Layar Kosong Anda Sekarang AI-Ready! ---');
        
    } catch (error) {
        console.error('\n❌ ERROR FATAL SAAT MENJALANKAN SKRIP:');
        console.error(error.message);
        process.exit(1); 
    }
}

// --- JALANKAN SKRIP ---
generateApiFiles();
