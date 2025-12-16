// =========================================================
// SCRIPT: ext/generate-ai-api.js
// VERSI: Multi-Key Rotation, Llms.txt Sebagai Whitelist Wajib, Hanya Output yang Berhasil, Priority Queue, & Smart Fallback
// =========================================================

// --- 1. IMPORT & SETUP ---
import * as fs from 'node:fs'; 
import * as path from 'node:path'; 
import { fileURLToPath } from 'node:url'; 
import { load } from 'cheerio'; 
import { GoogleGenAI } from '@google/generative-ai'; 

// --- 2. PATH RESOLUTION & KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..'); 

const INPUT_METADATA_FILE = path.join(PROJECT_ROOT, 'artikel.json'); 
const INPUT_ARTICLES_DIR = path.join(PROJECT_ROOT, 'artikel'); 
const INPUT_LLMS_FILE = path.join(PROJECT_ROOT, 'llms.txt'); 
const OUTPUT_API_DIR = path.join(PROJECT_ROOT, 'api', 'v1'); 
const DOMAIN_BASE_URL = 'https://dalam.web.id'; 

// --- 3. KEY ROTATION SETUP (MULTI-KEYS) ---
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

let currentKeyIndex = 0;

if (apiKeys.length === 0) {
    console.warn("⚠️ PERINGATAN: Tidak ada GEMINI_API_KEY ditemukan. Hanya artikel LLMS.TXT dengan Prompt Hint manual/cache yang akan diproses.");
} else {
    console.log(`✅ ${apiKeys.length} Kunci API berhasil dimuat. Siap untuk rotasi otomatis!`);
}

function getCurrentAI() {
    if (apiKeys.length === 0) return null;
    if (currentKeyIndex >= apiKeys.length) {
        console.warn("⚠️ Semua kunci API telah habis/limit!");
        return null;
    }
    return new GoogleGenAI({ apiKey: apiKeys[currentKeyIndex] });
}


// --- 4. FUNGSI PEMBUAT PROMPT HINT DENGAN ROTASI KUNCI ---
async function generatePromptHint(content, title, summary) {
    let attempts = 0;
    const maxAttempts = apiKeys.length; 

    while (attempts < maxAttempts) {
        const ai = getCurrentAI();
        
        if (!ai) {
            // NEW: Smart fallback lokal kalau no AI
            console.log(`   😂 Fallback lokal: Gemini lagi ngopi, aku improvisasi hint dari content ya!`);
            const simpleHints = [];
            // Extract pertanyaan asli dari content (cari kalimat tanya)
            const questions = content.match(/[^.!?]*\?/g)?.slice(0, 3) || []; 
            simpleHints.push(...questions.map(q => q.trim()));
            // Kalau kurang, generate simple dari keywords title
            if (simpleHints.length < 3) {
                const keywords = title.split(' ').filter(w => w.length > 3).slice(0, 5);
                simpleHints.push(...keywords.map(k => `Apa itu ${k}?`));
            }
            return simpleHints.join('; ') || summary;  // Join ; atau fallback summary
        }

        const prompt = `Anda adalah ahli Generative Engine Optimization (GEO). 
                        Tugas Anda adalah membuat satu string singkat yang berisi 3-5 pertanyaan yang paling mungkin ditanyakan oleh pengguna kepada AI, yang jawabannya persis ada di dalam konten ini. 
                        Gunakan gaya bahasa percakapan. Pisahkan setiap pertanyaan/frasa dengan titik koma (;).

                        JUDUL: ${title}
                        SUMMARY: ${summary}
                        KONTEN UTAMA: ${content.substring(0, 1000)}...

                        Contoh Output: Apa itu GEO?; Apa perbedaan SEO dan GEO?; Strategi komunikasi di era AI generatif.`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-1.5-flash",  // NEW: Ubah ke 1.5-flash seperti simulasi sebelumnya (kalau mau, bisa config)
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: { temperature: 0.1 }
            });

            const hint = response.text.trim().replace(/^['"]|['"]$/g, ''); 
            return hint; 

        } catch (error) {
            const errorMsg = error.message.toLowerCase();
            const isQuotaError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("resource exhausted");

            if (isQuotaError) {
                console.warn(`   ⚠️ Key Index ${currentKeyIndex + 1} LIMIT/EXPIRED. Beralih ke kunci berikutnya...`);
                currentKeyIndex++; 
                attempts++;
            } else {
                console.error(`   ❌ Error non-quota pada artikel ${title}: ${error.message}`);
                return summary; 
            }
        }
    }

    console.error("   ❌ Semua kunci API gagal untuk artikel ini.");
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
                    priorityWeight: 0  // NEW: Field untuk priority queue
                };

                // NEW: Hitung priorityWeight
                const now = new Date();
                const publishedDate = new Date(post.datePublished);
                const daysSincePublished = (now - publishedDate) / (1000 * 60 * 60 * 24);
                if (daysSincePublished < 30) postObject.priorityWeight += 10;  // Recent high prio
                if (!postObject.customPromptHintManuallySet) postObject.priorityWeight += 5;  // No manual hint = prio
                // Bonus: Category prioritas (customize kalau mau)
                if (category.toLowerCase().includes('teknologi') || category.toLowerCase().includes('ai')) {
                    postObject.priorityWeight += 3;
                }

                allPosts.push(postObject);
            });
        }
    }
    // Sort by date sebagai fallback, tapi nanti di queue utama kita sort by weight
    allPosts.sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));
    return allPosts;
}


// --- 6. FUNGSI PEMBERSIH KONTEN (CHEERIO) ---
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
        
        // Regex diperkuat untuk menangkap SLUG (Group 3)
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
    console.log('--- Memulai Generasi L-K AI API (Multi-Key Support, Whitelist, Priority Queue & Smart Fallback) ---');

    if (!fs.existsSync(OUTPUT_API_DIR)) {
        fs.mkdirSync(OUTPUT_API_DIR, { recursive: true });
    }
    const singlePostDir = path.join(OUTPUT_API_DIR, 'post');
    if (!fs.existsSync(singlePostDir)) {
        fs.mkdirSync(singlePostDir, { recursive: true });
    }

    try {
        const rawMetadata = JSON.parse(fs.readFileSync(INPUT_METADATA_FILE, 'utf8'));
        let allPosts = flattenAndNormalizeData(rawMetadata);
        const whitelistedSlugs = getLlmsWhitelistedSlugs(); // <-- AMBIL DAFTAR WHITELIST
        
        console.log(`✅ Metadata ${allPosts.length} artikel telah dibaca.`);

        // NEW: Sort by priorityWeight descending (high prio dulu)
        allPosts.sort((a, b) => b.priorityWeight - a.priorityWeight);
        console.log('✅ Priority queue siap: Proses high-weight dulu!');

        const summaryPosts = [];
        let processedCount = 0;
        let cachedCount = 0;
        let skippedNotWhitelistedCount = 0;
        let retryQueue = [];  // NEW: Untuk log failed ones

        for (const post of allPosts) {
            // NEW: Log priority
            console.log(`   🔝 Processing priority weight: ${post.priorityWeight} untuk ${post.title}`);

            // --- LOGIKA UTAMA: Cek Whitelist Wajib ---
            if (!whitelistedSlugs.has(post.id)) {
                skippedNotWhitelistedCount++;
                continue; 
            }
            // --- END Cek Whitelist ---

            const singlePostPath = path.join(singlePostDir, `${post.id}.json`); 
            
            // --- LOGIKA A: FILE SUDAH ADA (CACHING) ---
            if (fs.existsSync(singlePostPath)) {
                try {
                    const existingPostData = JSON.parse(fs.readFileSync(singlePostPath, 'utf8'));
                    // Jika ada data JSON, ambil hintnya untuk dimasukkan ke index.json
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
            let finalPromptHint = post.promptHint; // Default: dari artikel.json
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
                        console.log(`   ⚠️ Hint gagal di-generate AI, akan diperlakukan sebagai GAGAL.`);
                    }
                } else if (isManual) {
                    console.log(`   ✅ Prompt Hint manual ditemukan, dilewati AI.`);
                }
                
                // 2. Cek Kondisi Keberhasilan (Hanya ditulis jika berhasil)
                // Berhasil jika: Manual set di artikel.json, ATAU AI berhasil generate
                const isSuccessful = isManual || generatedByAI;

                if (isSuccessful) {
                    // Penulisan File (HANYA JIKA SUKSES)
                    post.promptHint = finalPromptHint; 
                    post.content_plain = cleanContent;

                    const { customPromptHintManuallySet, priorityWeight, ...postForJson } = post;  // NEW: Buang priorityWeight dari JSON
                    fs.writeFileSync(singlePostPath, JSON.stringify(postForJson, null, 2));
                    
                    const { content_plain, ...summary } = postForJson; 
                    summaryPosts.push(summary);
                    processedCount++;
                    
                } else {
                    // KONDISI GAGAL: AI GAGAL (dan tidak ada hint manual)
                    console.log(`   ❌ Gagal mendapatkan Prompt Hint (tidak manual & AI gagal): ${post.title}. DILOMPATI dari index.`);
                    retryQueue.push(post.title);  // NEW: Tambah ke retry log
                }
            }

            // NEW: Optional batch limit (uncomment kalau mau)
            // if (processedCount >= 50) {
            //     console.log('   ⏸️ Batch limit tercapai (50 artikel). Sisanya next run ya!');
            //     break;
            // }
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
        if (retryQueue.length) {
            console.warn(`⚠️ ${retryQueue.length} artikel perlu retry: ${retryQueue.join(', ')}`);
        }
        
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
