// =========================================================
// SCRIPT: ext/generate-ai-api.js
// VERSI: Rotasi Cerdas & Early Exit
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

// Daftar Model yang akan digunakan
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

// Daftar Kunci API (Maksimal 20 Kunci)
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

const TOTAL_KEYS = apiKeys.length;
const TOTAL_MODELS = MODELS_TO_ROTATE.length;
const TOTAL_COMBINATIONS = TOTAL_KEYS * TOTAL_MODELS;

// --- DAFTAR BLACKLIST GLOBAL (LEARNED ROTATION) ---
// Set untuk melacak Key atau Model yang gagal pada artikel SEBELUMNYA
const failedKeys = new Set();
const failedModels = new Set();
// --- END BLACKLIST ---

if (TOTAL_KEYS === 0) {
    console.warn("⚠️ PERINGATAN: Tidak ada GEMINI_API_KEY ditemukan. Mode fallback/manual.");
} else {
    console.log(`✅ ${TOTAL_KEYS} Kunci API dimuat & ${TOTAL_MODELS} Model. Rotasi Cerdas Aktif.`);
}

// Fungsi untuk membuat instance AI dengan kunci tertentu
function getAIInstance(key) {
    return new GoogleGenAI({ apiKey: key });
}

// Helper untuk mendapatkan kombinasi berikutnya yang TIDAK ADA DI BLACKLIST
function getNextCombination(currentIndex) {
    
    // Iterasi melalui semua kombinasi yang mungkin, dimulai dari currentIndex
    for (let i = currentIndex; i < TOTAL_COMBINATIONS; i++) {
        
        const keyIndex = i % TOTAL_KEYS;
        const modelIndex = Math.floor(i / TOTAL_KEYS) % TOTAL_MODELS;
        
        const key = apiKeys[keyIndex];
        const model = MODELS_TO_ROTATE[modelIndex];

        // Cek Blacklist: HANYA ambil kombinasi yang sehat
        if (!failedKeys.has(key) && !failedModels.has(model)) {
            return { 
                ai: getAIInstance(key), 
                model: model, 
                keyIndex: keyIndex, 
                modelIndex: modelIndex,
                newIndex: i + 1 // Index kombinasi berikutnya yang akan dicoba
            };
        }
    }
    
    // Jika semua kombinasi (yang tersisa) sudah diuji atau di-blacklist
    return { ai: null, model: null, keyIndex: -1, modelIndex: -1, newIndex: TOTAL_COMBINATIONS };
}


// --- 4. FUNGSI PEMBUAT PROMPT HINT DENGAN ROTASI CERDAS & EARLY EXIT ---
async function generatePromptHint(content, title, summary) {
    
    let currentCombinationIndex = 0; // Mulai dari awal untuk setiap artikel

    while (currentCombinationIndex < TOTAL_COMBINATIONS) {
        
        const combination = getNextCombination(currentCombinationIndex);
        
        const { ai, model, keyIndex, newIndex } = combination;
        currentCombinationIndex = newIndex; // Update index untuk iterasi berikutnya
        
        if (!ai) {
            // Early Exit: Jika tidak ada kombinasi sehat tersisa yang dapat dicoba.
            console.error(`   ❌ EARLY EXIT: Tidak ada kombinasi kunci/model sehat tersisa untuk artikel ini.`);
            break; 
        }

        const prompt = `Anda adalah ahli Generative Engine Optimization (GEO). 
                        Tugas Anda adalah membuat satu string singkat yang berisi 3-5 pertanyaan yang paling mungkin ditanyakan oleh pengguna kepada AI, yang jawabannya persis ada di dalam konten ini. 
                        Gunakan gaya bahasa percakapan. Pisahkan setiap pertanyaan/frasa dengan titik koma (;).

                        JUDUL: ${title}
                        SUMMARY: ${summary}
                        KONTEN UTAMA: ${content.substring(0, 1000)}...

                        Contoh Output: Apa itu GEO?; Apa perbedaan SEO dan GEO?; Strategi komunikasi di era AI generatif.`;

        try {
            console.log(`   ⏳ Coba: Key ${keyIndex + 1} | Model: ${model}`);
            
            const response = await ai.models.generateContent({
                model: model, 
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: { temperature: 0.1 }
            });

            const hint = response.text.trim().replace(/^['"]|['"]$/g, ''); 
            return hint; // SUKSES!

        } catch (error) {
            const errorMsg = error.message.toLowerCase();
            const currentKey = apiKeys[keyIndex];
            
            const isQuotaError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("resource exhausted");

            if (isQuotaError) {
                console.warn(`   ⚠️ GAGAL KUOTA: Key Index ${keyIndex + 1} di-blacklist untuk sisa artikel.`);
                failedKeys.add(currentKey); // Blacklist Kunci
            } else {
                console.error(`   ❌ ERROR MODEL/NON-QUOTA: Model ${model} di-blacklist untuk sisa artikel: ${error.message}`);
                failedModels.add(model); // Blacklist Model
            }
            // Loop akan secara otomatis beralih ke kombinasi berikutnya yang tidak ada di blacklist
        }
    }

    // Jika loop berakhir tanpa return (berarti terjadi Early Exit atau semua gagal), kembalikan summary lama.
    return summary;
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
    console.log('--- Memulai Generasi L-K AI API (Rotasi Cerdas & Early Exit) ---');

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
        let skippedFailedCount = 0;

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
                if (TOTAL_KEYS > 0 && !isManual) { 
                    console.log(`   ⏳ Mulai mencari Prompt Hint AI untuk: ${post.title}`);
                    const newHint = await generatePromptHint(cleanContent, post.title, post.summary);
                    
                    if (newHint !== post.summary) {
                        finalPromptHint = newHint; 
                        generatedByAI = true;
                    } else {
                        // Jika hint sama dengan summary lama, berarti semua kombinasi gagal/Early Exit
                        console.log(`   ⚠️ Hint gagal di-generate AI (atau sama dengan summary lama).`);
                        skippedFailedCount++;
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
        console.log(`Total Artikel DILOMPATI karena GAGAL AI/Key: ${skippedFailedCount}`);
        console.log(`\nREKAP KEGAGALAN PERMANEN (Blacklisted untuk proses selanjutnya):`);
        console.log(`Keys Gagal (Blacklisted): ${failedKeys.size} ${failedKeys.size > 0 ? `[${Array.from(failedKeys).map((_, i) => i+1).join(', ')}]` : ''}`);
        console.log(`Models Gagal (Blacklisted): ${failedModels.size} ${failedModels.size > 0 ? `[${Array.from(failedModels).join(', ')}]` : ''}`);
        
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
