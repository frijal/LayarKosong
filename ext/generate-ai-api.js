// =========================================================
// SCRIPT: ext/generate-ai-api.js
// VERSI FINAL: GEO Enabled + FIX Otentikasi GitHub Actions
// =========================================================

// --- 1. IMPORT & SETUP ---
import * as fs from 'node:fs'; 
import * as path from 'node:path'; 
import { fileURLToPath } from 'node:url'; 
import { load } from 'cheerio'; 
import { GoogleGenAI } from '@google/genai'; 

// CATATAN: dotenv telah dihapus dari sini untuk mencegah konflik di lingkungan CI/CD.

// --- 2. PATH RESOLUTION & KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..'); 

const INPUT_METADATA_FILE = path.join(PROJECT_ROOT, 'artikel.json'); 
const INPUT_ARTICLES_DIR = path.join(PROJECT_ROOT, 'artikel'); 
const OUTPUT_API_DIR = path.join(PROJECT_ROOT, 'api', 'v1'); 
const DOMAIN_BASE_URL = 'https://dalam.web.id'; 

// --- 3. SETUP GEMINI API & DEBUGGING KUNCI ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

if (!GEMINI_API_KEY) {
    console.warn("⚠️ PERINGATAN: GEMINI_API_KEY tidak ditemukan di ENV. 'promptHint' akan menggunakan Summary sebagai fallback.");
    var ai = null;
} else {
    // 💥 DEBUGGING KRUSIAL: Membuktikan skrip melihat ENV var dari Actions
    console.log(`✅ Kunci API Ditemukan di ENV. Panjang: ${GEMINI_API_KEY.length} karakter.`);

    // Menggunakan pola inisialisasi yang disarankan untuk lingkungan CI/CD:
    // Kita memasukkan kunci, tetapi jika gagal, SDK akan mencari process.env.GEMINI_API_KEY.
    // Dengan kunci yang eksplisit di konstruktor, SDK *seharusnya* tidak jatuh ke ADC.
    try {
        var ai = new GoogleGenAI(GEMINI_API_KEY);
    } catch (e) {
        console.error("❌ GAGAL inisialisasi GoogleGenAI dengan kunci yang tersedia:", e.message);
        var ai = null;
    }
}


// --- 4. FUNGSI PEMBUAT PROMPT HINT DENGAN AI ---
async function generatePromptHint(content, title, summary) {
    if (!ai) return summary; 

    const prompt = `Anda adalah ahli Generative Engine Optimization (GEO). 
                    Tugas Anda adalah membuat satu string singkat yang berisi 3-5 pertanyaan yang paling mungkin ditanyakan oleh pengguna kepada AI, yang jawabannya persis ada di dalam konten ini. 
                    Gunakan gaya bahasa percakapan. Pisahkan setiap pertanyaan/frasa dengan titik koma (;).

                    JUDUL: ${title}
                    SUMMARY: ${summary}
                    KONTEN UTAMA: ${content.substring(0, 1000)}...

                    Contoh Output: Apa itu GEO?; Apa perbedaan SEO dan GEO?; Strategi komunikasi di era AI generatif.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                temperature: 0.1, 
            }
        });

        const hint = response.text.trim().replace(/^['"]|['"]$/g, ''); 
        return hint;

    } catch (error) {
        // Log Error dan Fallback
        console.error(`❌ ERROR memanggil Gemini untuk artikel ${title}: ${error.message}`);
        // Fallback ke summary jika panggilan API gagal (misalnya, karena otentikasi atau rate limit)
        return summary; 
    }
}


// --- 5. FUNGSI PEMERSATU DATA (FLATTENING) ---
function flattenAndNormalizeData(metadata) {
    const allPosts = [];
    
    for (const category in metadata) {
        if (Object.hasOwnProperty.call(metadata, category)) {
            const articles = metadata[category];
            
            articles.forEach(articleArray => {
                const [title, slug_html, img_url, date, summary, custom_prompt_hint] = articleArray;

                const initial_prompt_hint = custom_prompt_hint || summary || null;
                const id = slug_html.replace('.html', ''); 

                const postObject = {
                    id: id,
                    title: title,
                    slug: slug_html,
                    url: `${DOMAIN_BASE_URL}/artikel/${slug_html}`,
                    datePublished: date,
                    summary: summary,
                    category: category,
                    promptHint: initial_prompt_hint, 
                    customPromptHintManuallySet: !!custom_prompt_hint, 
                    imageUrl: img_url,
                };
                allPosts.push(postObject);
            });
        }
    }
    
    allPosts.sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));
    return allPosts;
}


// --- 6. FUNGSI PEMBERSIN KONTEN (CHEERIO) ---
function extractCleanContent(slug_html) {
    const htmlFilePath = path.join(INPUT_ARTICLES_DIR, slug_html);
    
    if (!fs.existsSync(htmlFilePath)) {
        console.error(`File tidak ditemukan: ${htmlFilePath}`);
        return null;
    }
    
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    const $ = load(htmlContent); 

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


// --- 7. FUNGSI UTAMA: MENJALANKAN GENERASI API (ASYNC) ---
async function generateApiFiles() {
    console.log('--- Memulai Generasi L-K AI API (GEO Enabled) ---');

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

        // 3. Loop Artikel untuk Generasi Konten Penuh (Menggunakan for...of karena ASYNC)
        for (const post of allPosts) {
            const cleanContent = extractCleanContent(post.slug);
            
            if (cleanContent) {
                // HANYA PANGGIL AI JIKA PROMPT HINT BELUM DIISI MANUAL DAN AI ADA
                if (!post.customPromptHintManuallySet && ai) { 
                    console.log(`   ⏳ Membuat Prompt Hint AI untuk: ${post.title}`);
                    const newHint = await generatePromptHint(cleanContent, post.title, post.summary);
                    post.promptHint = newHint;
                } else if (post.customPromptHintManuallySet) {
                    console.log(`   ✅ Prompt Hint manual ditemukan, dilewati: ${post.title}`);
                }
                
                post.content_plain = cleanContent;

                // ---- A. Tulis File JSON Konten Penuh (Single Post API) ----
                const singlePostPath = path.join(singlePostDir, `${post.id}.json`);
                fs.writeFileSync(singlePostPath, JSON.stringify(post, null, 2));
                
                // ---- B. Siapkan Objek Ringkasan (Hapus Konten Penuh) ----
                const { content_plain, customPromptHintManuallySet, ...summary } = post; // Hapus flag debugging juga

                summaryPosts.push(summary);
                processedCount++;
            }
        }

        // 4. Tulis File JSON Daftar Artikel (Master List API)
        const masterListPath = path.join(OUTPUT_API_DIR, 'posts.json');
        fs.writeFileSync(masterListPath, JSON.stringify(summaryPosts, null, 2));

        console.log(`\n🎉 Proses Selesai!`);
        console.log(`Total Artikel diproses: ${processedCount}`);
        console.log(`File API Utama dibuat di: ${masterListPath}`);
        console.log(`File Single Post API dibuat di: ${singlePostDir}`);
        console.log('\n--- Layar Kosong Anda Sekarang AI-Ready dan GEO-Optimized! ---');
        
    } catch (error) {
        console.error('\n❌ ERROR FATAL SAAT MENJALANKAN SKRIP:');
        console.error(error.message);
        process.exit(1); 
    }
}

// --- JALANKAN SKRIP ---
generateApiFiles().catch(error => {
    console.error('Fatal error during asynchronous execution:', error);
    process.exit(1);
});
