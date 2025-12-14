const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// --- PERBAIKAN PATH KRITIS ---
// Dapatkan path absolut ke direktori root proyek (satu level di atas 'ext')
const PROJECT_ROOT = path.resolve(__dirname, '..'); 

// --- KONFIGURASI ---
// Semua path sekarang menggunakan PROJECT_ROOT sebagai basis
const INPUT_METADATA_FILE = path.join(PROJECT_ROOT, 'artikel.json'); // Path ke file metadata Anda
const INPUT_ARTICLES_DIR = path.join(PROJECT_ROOT, 'artikel'); // Folder berisi file HTML
const OUTPUT_API_DIR = path.join(PROJECT_ROOT, 'api', 'v1'); // Folder output API
const DOMAIN_BASE_URL = 'https://dalam.web.id'; // Domain Anda

// --- FUNGSI PEMERSATU DATA (FLATTENING) ---
function flattenAndNormalizeData(metadata) {
    const allPosts = [];
    
    // Looping melalui setiap Kategori (key) dalam objek metadata
    for (const category in metadata) {
        if (Object.hasOwnProperty.call(metadata, category)) {
            const articles = metadata[category];
            
            // Looping melalui setiap Array Artikel (value)
            articles.forEach(articleArray => {
                const [title, slug_html, img_url, date, summary] = articleArray;
                
                // Menghapus ekstensi .html dari slug
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
                    // content_plain akan ditambahkan di langkah berikutnya
                };
                allPosts.push(postObject);
            });
        }
    }
    
    // Sortir berdasarkan tanggal (terbaru ke terlama)
    allPosts.sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));

    return allPosts;
}


// --- FUNGSI PEMBERSIN KONTEN (CHEERIO BLACKLIST) ---
function extractCleanContent(slug_html) {
    // Path file input sekarang sudah benar
    const htmlFilePath = path.join(INPUT_ARTICLES_DIR, slug_html);
    
    if (!fs.existsSync(htmlFilePath)) {
        console.error(`File tidak ditemukan: ${htmlFilePath}`);
        return null;
    }
    
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    const $ = cheerio.load(htmlContent);

    // Selector Blacklist: Elemen yang pasti BUKAN konten artikel utama
    const junkSelectors = [
        'script', 
        'style',
        'footer',
        '#iposbrowser',
        '#pesbukdiskus',
        '.search-floating-container',
        '#related-marquee-section'
    ];

    // Hapus elemen Blacklist dari dokumen
    junkSelectors.forEach(selector => {
        $(selector).remove(); 
    });
    
    // Ambil teks murni dari elemen container utama
    const container = $('.container').first();
    
    let content_plain = container.text();

    // Normalisasi Teks: Hapus spasi, baris baru, dan tab yang berlebihan
    content_plain = content_plain
        .replace(/\s\s+/g, ' ') 
        .trim(); 

    return content_plain;
}


// --- FUNGSI UTAMA: MENJALANKAN GENERASI API ---
function generateApiFiles() {
    console.log('--- Memulai Generasi L-K AI API ---');

    // 1. Persiapan Direktori Output
    // Output API akan dibuat di PROJECT_ROOT/api/v1
    if (!fs.existsSync(OUTPUT_API_DIR)) {
        fs.mkdirSync(OUTPUT_API_DIR, { recursive: true });
        console.log(`✅ Direktori API dibuat: ${OUTPUT_API_DIR}`);
    }
    
    // Persiapan folder untuk single post API
    const singlePostDir = path.join(OUTPUT_API_DIR, 'post');
     if (!fs.existsSync(singlePostDir)) {
        fs.mkdirSync(singlePostDir, { recursive: true });
    }

    // 2. Baca dan Ratakan Metadata
    try {
        const rawMetadata = JSON.parse(fs.readFileSync(INPUT_METADATA_FILE, 'utf8'));
        const allPosts = flattenAndNormalizeData(rawMetadata);
        console.log(`✅ Metadata ${allPosts.length} artikel telah dibaca.`);

        // Data untuk file ringkasan posts.json
        const summaryPosts = [];
        let processedCount = 0;

        // 3. Loop Artikel untuk Generasi Konten Penuh
        allPosts.forEach(post => {
            const cleanContent = extractCleanContent(post.slug);
            
            if (cleanContent) {
                // Tambahkan konten murni ke objek post lengkap
                post.content_plain = cleanContent;

                // ---- A. Tulis File JSON Konten Penuh (Single Post API) ----
                const singlePostPath = path.join(singlePostDir, `${post.id}.json`);
                fs.writeFileSync(singlePostPath, JSON.stringify(post, null, 2));
                
                // ---- B. Siapkan Objek Ringkasan (Hapus Konten Penuh) ----
                // Menggunakan destructuring assignment untuk copy objek (ES6+)
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
        process.exit(1); // Keluar dengan kode error agar GitHub Action gagal
    }
}


// --- JALANKAN SKRIP ---
// Pastikan pustaka cheerio sudah diinstal: npm install cheerio
generateApiFiles();
