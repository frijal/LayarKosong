// =========================================================
// SCRIPT: ext/generate-ai-api.js
// VERSI: Multi-Key & Multi-Model Rotation, Llms.txt Whitelist
// =========================================================

// --- 1. IMPORT & SETUP ---
import * as fs from 'node:fs'; 
import * as path from 'node:path'; 
import { fileURLToPath } from 'node:url'; 
import { load } from 'cheerio'; 
import { GoogleGenAI } from '@google/genai'; 

// --- 2. PATH RESOLUTION & KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..'); 

const INPUT_METADATA_FILE = path.join(PROJECT_ROOT, 'artikel.json'); 
const INPUT_ARTICLES_DIR = path.join(PROJECT_ROOT, 'artikel'); 
const INPUT_LLMS_FILE = path.join(PROJECT_ROOT, 'llms.txt'); 
const OUTPUT_API_DIR = path.join(PROJECT_ROOT, 'api', 'v1'); 
const DOMAIN_BASE_URL = 'https://dalam.web.id'; 

// --- 3. KEY & MODEL ROTATION SETUP ---

// Daftar Model yang akan digunakan secara rotasi
const MODELS_TO_ROTATE = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash-tts",
    "gemini-robotics-er-1.5-preview",
    "gemma-3-12b",
    "gemma-3-1b",
    "gemma-3-27b",
    "gemma-3-2b",
    "gemma-3-4b",
    "gemini-2.5-flash-native-audio-dialog"
];

let currentModelIndex = 0; // Global pointer untuk model

// Daftar Kunci API
const apiKeys = [];
if (process.env.GEMINI_API_KEY) {
    apiKeys.push(process.env.GEMINI_API_KEY);
}
for (let i = 1; i <= 20; i++) {
    const key = process.env[`GEMINI_API_KEY${i}`];
    if (key) {
        apiKeys.push(key);
    }
}
let currentKeyIndex = 0; // Global pointer untuk kunci

if (apiKeys.length === 0) {
    console.warn("⚠️ PERINGATAN: Tidak ada GEMINI_API_KEY ditemukan. Mode fallback/manual.");
} else {
    console.log(`✅ ${apiKeys.length} Kunci API dimuat. Model tersedia: ${MODELS_TO_ROTATE.length}.`);
}

function getCurrentAI() {
    if (apiKeys.length === 0) return null;
    if (currentKeyIndex >= apiKeys.length) {
        return null;
    }
    return new GoogleGenAI({ apiKey: apiKeys[currentKeyIndex] });
}

function getNextModel() {
    const model = MODELS_TO_ROTATE[currentModelIndex % MODELS_TO_ROTATE.length];
    currentModelIndex = (currentModelIndex + 1) % MODELS_TO_ROTATE.length;
    return model;
}


// --- 4. FUNGSI PEMBUAT PROMPT HINT DENGAN ROTASI KUNCI DAN MODEL ---
async function generatePromptHint(content, title, summary) {
    let attempts = 0;
    const maxAttempts = apiKeys.length; 

    while (attempts < maxAttempts) {
        const ai = getCurrentAI();
        const model = getNextModel(); // <-- AMBIL MODEL BERIKUTNYA
        
        if (!ai) {
            return summary; 
        }

        const prompt = `Anda adalah ahli Generative Engine Optimization (GEO). 
                        Tugas Anda adalah membuat satu string singkat yang berisi 3-5 pertanyaan yang paling mungkin ditanyakan oleh pengguna kepada AI, yang jawabannya persis ada di dalam konten ini. 
                        Gunakan gaya bahasa percakapan. Pisahkan setiap pertanyaan/frasa dengan titik koma (;).

                        JUDUL: ${title}
                        SUMMARY: ${summary}
                        KONTEN UTAMA: ${content.substring(0, 1000)}...

                        Contoh Output: Apa itu GEO?; Apa perbedaan SEO dan GEO?; Strategi komunikasi di era AI generatif.`;

        try {
            console.log(`   🔌 Key Index ${currentKeyIndex + 1} | Model: ${model}`);
            
            const response = await ai.models.generateContent({
                model: model, // <-- GUNAKAN MODEL ROTASI
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: { temperature: 0.1 }
            });

            const hint = response.text.trim().replace(/^['"]|['"]$/g, ''); 
            return hint; 

        } catch (error) {
            const errorMsg = error.message.toLowerCase();
            const isQuotaError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("resource exhausted");

            if (isQuotaError) {
                console.warn(`   ⚠️ Key Index ${currentKeyIndex + 1} LIMIT/EXPIRED. Beralih kunci & mencoba lagi...`);
                currentKeyIndex++; // Pindah ke kunci berikutnya
                attempts++;
                // Model sudah otomatis di-rotate di awal loop/fungsi
            } else {
                console.error(`   ❌ Error non-quota/model ${model} pada artikel ${title}: ${error.message}`);
                // Jika error non-quota (misal model not found atau error server), kita tetap coba key berikutnya dan model berikutnya.
                currentKeyIndex++;
                attempts++;
                
                // Jika semua key habis, ini akan mengembalikan summary
                if (currentKeyIndex >= apiKeys.length) return summary; 
            }
        }
    }

    console.error("   ❌ Semua kunci API gagal untuk artikel ini.");
    return summary;
}


// --- 5. FUNGSI PEMERSATU DATA (FLATTENING) ---
function flattenAndNormalizeData(metadata) {
    // Fungsi ini tidak berubah
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
    // Fungsi ini tidak berubah
    const htmlFilePath = path.join(INPUT_ARTICLES_DIR, slug_html);
    if (!fs.existsSync(htmlFilePath)) {
        console.error(`File tidak ditemukan: ${htmlFilePath}`);
        return null;
    }
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    const $ = load(htmlContent); 
    const junkSelectors = [
        'script', 'style','footer','#iposbrowser','#pesbukdiskus','.search-floating-container','#related-marquee-section'
    ];
    junkSelectors.forEach(selector => { $(selector).remove(); });
    const container = $('.container').first();
    let content_plain = container.text();
    content_plain = content_plain.replace(/\s\s+/g, ' ').trim(); 
    return content_plain;
}


// --- 7. FUNGSI PEMBACA LLMS.TXT (UNTUK WHITELIST SLUG) ---
function getLlmsWhitelistedSlugs() {
    if (!fs.existsSync(INPUT_LLMS_FILE)) {
        console.warn("⚠️ File llms.txt tidak ditemukan. TIDAK ADA artikel yang akan diproses.");
        return new Set();
    }

    try {
        const content = fs.readFileSync(INPUT_LLMS_FILE, 'utf8');
        const whitelistedSlugs = new Set();
        
        // Regex untuk menangkap SLUG (Group 3)
        const articleRegex = /-\s*\[\*\*(.*?)\*\*\]\((.*?\/artikel\/(.*?)\.html)\):\s*(.*?)\s*—\s*(.*)/;
        
        const lines = content.split('\n');
        let parsedCount = 0;
        for (const line of lines) {
            const match = line.match(articleRegex);
            if (match) {
                const slug = match[3].trim(); 
                if (slug) {
                    whitelistedSlugs.add(slug);
                    parsedCount++;
                }
            }
        }
        console.log(`✅ ${parsedCount} artikel diizinkan (whitelisted) berdasarkan llms.txt.`);
        return whitelistedSlugs;
    } catch (error) {
        console.error("❌ Gagal membaca atau mem-parsing llms.txt:", error.message);
        return new Set();
    }
}


// --- 8. FUNGSI UTAMA: MENJALANKAN GENERASI API (ASYNC) ---
async function generateApiFiles() {
    console.log('--- Memulai Generasi L-K AI API (Multi-Key & Model Rotation) ---');

    if (!fs.existsSync(OUTPUT_API_DIR)) {
        fs.mkdirSync(OUTPUT_API_DIR, { recursive: true });
    }
    const singlePostDir = path.join(OUTPUT_API_DIR, 'post');
     if (!fs.existsSync(singlePostDir)) {
        fs.mkdirSync(singlePostDir, { recursive: true });
    }

    try {
        const rawMetadata = JSON.parse(fs.readFileSync(INPUT_METADATA_FILE, 'utf8'));
        const allPosts = flattenAndNormalizeData(rawMetadata);
        const whitelistedSlugs = getLlmsWhitelistedSlugs(); 
        
        console.log(`✅ Metadata ${allPosts.length} artikel telah dibaca.`);

        const summaryPosts = [];
        let processedCount = 0;
        let cachedCount = 0;
        let skippedNotWhitelistedCount = 0;

        for (const post of allPosts) {
            
            // --- LOGIKA UTAMA: Cek Whitelist Wajib ---
            if (!whitelistedSlugs.has(post.id)) {
                skippedNotWhitelistedCount++;
                continue; 
            }

            const singlePostPath = path.join(singlePostDir, `${post.id}.json`); 
            
            // --- LOGIKA A: FILE SUDAH ADA (CACHING) ---
            if (fs.existsSync(singlePostPath)) {
                try {
                    const existingPostData = JSON.parse(fs.readFileSync(singlePostPath, 'utf8'));
                    const { content_plain, ...summaryData } = existingPostData;
                    summaryPosts.push(summaryData);
                    cachedCount++;
                    continue; 
                } catch (e) {
                    console.warn(`⚠️ File JSON rusak untuk ${post.title} (WHITELISTED), akan dibuat ulang.`);
                }
            }

            // --- LOGIKA B: FILE PERLU DIBUAT/DIPROSES ULANG (WHITELISTED ONLY) ---
            const cleanContent = extractCleanContent(post.slug);
            let finalPromptHint = post.promptHint; 
            let generatedByAI = false;
            let isManual = post.customPromptHintManuallySet; 

            if (cleanContent) {
                
                // 1. Panggil AI HANYA jika Keys tersedia DAN belum di-set manual
                if (apiKeys.length > 0 && !isManual) { 
                    console.log(`   ⏳ Membuat Prompt Hint AI untuk: ${post.title}`);
                    const newHint = await generatePromptHint(cleanContent, post.title, post.summary);
                    
                    if (newHint !== post.summary) {
                        finalPromptHint = newHint; 
                        generatedByAI = true;
                    } else {
                        console.log(`   ⚠️ Hint gagal di-generate AI (atau sama dengan summary).`);
                    }
                } else if (isManual) {
                    console.log(`   ✅ Prompt Hint manual ditemukan, dilewati AI.`);
                }
                
                // 2. Cek Kondisi Keberhasilan (Hanya ditulis jika berhasil)
                const isSuccessful = isManual || generatedByAI;

                if (isSuccessful) {
                    // Penulisan File (HANYA JIKA SUKSES)
                    post.promptHint = finalPromptHint; 
                    post.content_plain = cleanContent;

                    const { customPromptHintManuallySet, ...postForJson } = post;
                    fs.writeFileSync(singlePostPath, JSON.stringify(postForJson, null, 2));
                    
                    const { content_plain, ...summary } = postForJson; 
                    summaryPosts.push(summary);
                    processedCount++;
                    
                } else {
                    // KONDISI GAGAL: AI GAGAL (dan tidak ada hint manual)
                    console.log(`   ❌ Gagal mendapatkan Prompt Hint: ${post.title}. DILOMPATI dari index.`);
                }
            }
        }

        // --- TULIS FILE INDEX UTAMA ---
        const masterListPath = path.join(OUTPUT_API_DIR, 'index.json');
        
        if (summaryPosts.length > 0) {
            fs.writeFileSync(masterListPath, JSON.stringify(summaryPosts, null, 2));
        } else {
            console.warn('⚠️ Tidak ada artikel yang berhasil diproses. File index.json TIDAK DIBUAT.');
        }

        console.log(`\n🎉 Proses Selesai!`);
        console.log(`Total Artikel diproses & ditulis (baru): ${processedCount}`);
        console.log(`Total Artikel dilewati (cache JSON): ${cachedCount}`);
        console.log(`Total Artikel di artikel.json dilewati (bukan di llms.txt): ${skippedNotWhitelistedCount}`);
        console.log(`Total Artikel Sukses di Index: ${summaryPosts.length}`);
        console.log(`Sisa Key Index Aktif: ${currentKeyIndex + 1} dari ${apiKeys.length}`);
        console.log(`Model Rotation Index Akhir: ${currentModelIndex}`);
        
    } catch (error) {
        console.error('\n❌ ERROR FATAL SAAT MENJALANKAN SKRIP:');
        console.error(error.message);
        console.error('⚠️ Tidak ada file index.json yang dibuat/diupdate untuk mencegah kerusakan data.');
        process.exit(1); 
    }
}

// --- JALANKAN SKRIP ---
generateApiFiles().catch(error => {
    console.error('Fatal error during asynchronous execution:', error);
    process.exit(1);
});
