// =========================================================
// SCRIPT: ext/generate-ai-api.js
// VERSI: Multi-Key Rotation, Hard Caching, & Hanya Output yang Berhasil
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
const OUTPUT_API_DIR = path.join(PROJECT_ROOT, 'api', 'v1'); 
const DOMAIN_BASE_URL = 'https://dalam.web.id'; 

// --- 3. KEY ROTATION SETUP (MULTI-KEYS) ---
const apiKeys = [];

// 3a. Ambil kunci standar
if (process.env.GEMINI_API_KEY) {
    apiKeys.push(process.env.GEMINI_API_KEY);
}

// 3b. Ambil kunci bernomor (GEMINI_API_KEY1 s/d GEMINI_API_KEY20)
for (let i = 1; i <= 20; i++) {
    const key = process.env[`GEMINI_API_KEY${i}`];
    if (key) {
        apiKeys.push(key);
    }
}

// Global pointer untuk melacak kunci mana yang sedang aktif
let currentKeyIndex = 0;

if (apiKeys.length === 0) {
    console.warn("⚠️ PERINGATAN: Tidak ada GEMINI_API_KEY ditemukan. Hanya artikel dengan Prompt Hint manual yang akan diproses.");
} else {
    console.log(`✅ ${apiKeys.length} Kunci API berhasil dimuat. Siap untuk rotasi otomatis!`);
}

// Helper untuk mendapatkan instance AI dengan kunci yang aktif saat ini
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
            return summary; // Jika tidak ada kunci, kembalikan summary
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
                model: "gemini-2.5-flash", 
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: { temperature: 0.1 }
            });

            const hint = response.text.trim().replace(/^['"]|['"]$/g, ''); 
            return hint; // SUKSES!

        } catch (error) {
            const errorMsg = error.message.toLowerCase();
            const isQuotaError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("resource exhausted");

            if (isQuotaError) {
                console.warn(`   ⚠️ Key Index ${currentKeyIndex + 1} LIMIT/EXPIRED. Beralih ke kunci berikutnya...`);
                currentKeyIndex++; 
                attempts++;
            } else {
                console.error(`   ❌ Error non-quota pada artikel ${title}: ${error.message}`);
                return summary; // Fallback ke summary
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
    // ... (Logika flatten dan sort sama) ...
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


// --- 7. FUNGSI UTAMA: MENJALANKAN GENERASI API (ASYNC) ---
async function generateApiFiles() {
    console.log('--- Memulai Generasi L-K AI API (Multi-Key Support) ---');

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
        console.log(`✅ Metadata ${allPosts.length} artikel telah dibaca.`);

        const summaryPosts = [];
        let processedCount = 0;
        let skippedCount = 0;

        for (const post of allPosts) {
            const singlePostPath = path.join(singlePostDir, `${post.id}.json`); 
            
            // --- LOGIKA A: FILE SUDAH ADA (CACHING) ---
            if (fs.existsSync(singlePostPath)) {
                try {
                    const existingPostData = JSON.parse(fs.readFileSync(singlePostPath, 'utf8'));
                    const { content_plain, ...summaryData } = existingPostData;
                    summaryPosts.push(summaryData);
                    skippedCount++;
                    continue; // Lanjut ke artikel berikutnya
                } catch (e) {
                    console.warn(`⚠️ File JSON rusak untuk ${post.title}, akan dibuat ulang.`);
                    // Jika rusak, lanjut ke bawah untuk proses ulang
                }
            }
            // --- END LOGIKA A ---

            // --- LOGIKA B: FILE PERLU DIBUAT/DIPROSES ULANG ---
            const cleanContent = extractCleanContent(post.slug);
            let finalPromptHint = post.promptHint;
            let generatedByAI = false;

            if (cleanContent) {
                // 1. Panggil AI HANYA jika Keys tersedia DAN bukan hint manual
                if (apiKeys.length > 0 && !post.customPromptHintManuallySet) { 
                    console.log(`   ⏳ Membuat Prompt Hint AI untuk: ${post.title}`);
                    const newHint = await generatePromptHint(cleanContent, post.title, post.summary);
                    
                    if (newHint !== post.summary) {
                        finalPromptHint = newHint; // Update hint jika AI sukses
                        generatedByAI = true;
                    } else {
                        // Jika AI gagal/error, finalPromptHint tetap summary
                        console.log(`   ⚠️ Hint gagal di-generate AI, akan diperlakukan sebagai GAGAL.`);
                    }
                } else if (post.customPromptHintManuallySet) {
                    console.log(`   ✅ Prompt Hint manual ditemukan, dilewati AI.`);
                }
                
                // 2. Cek Kondisi Keberhasilan
                // Sukses jika: Manual set, ATAU AI berhasil membuat hint baru
                const isSuccessful = post.customPromptHintManuallySet || generatedByAI;

                if (isSuccessful) {
                    // Penulisan File (HANYA JIKA SUKSES)
                    post.promptHint = finalPromptHint; 
                    post.content_plain = cleanContent;

                    // Tulis JSON Single Post
                    const { customPromptHintManuallySet, ...postForJson } = post;
                    fs.writeFileSync(singlePostPath, JSON.stringify(postForJson, null, 2));
                    
                    // Siapkan untuk Master List
                    const { content_plain, ...summary } = postForJson; 
                    summaryPosts.push(summary);
                    processedCount++;
                    
                } else {
                    // KONDISI GAGAL: AI GAGAL (dan tidak ada hint manual)
                    console.log(`   ❌ Gagal mendapatkan Prompt Hint (tidak manual & AI gagal): ${post.title}. DILOMPATI.`);
                }
            }
        }

        // --- TULIS FILE INDEX UTAMA ---
        const masterListPath = path.join(OUTPUT_API_DIR, 'index.json');
        
        // Tulis file HANYA jika proses loop selesai dengan aman
        fs.writeFileSync(masterListPath, JSON.stringify(summaryPosts, null, 2));

        console.log(`\n🎉 Proses Selesai!`);
        console.log(`Total Artikel diproses & ditulis: ${processedCount}`);
        console.log(`Total Artikel dilewati (cache/manual): ${skippedCount}`);
        console.log(`Sisa Key Index Aktif: ${currentKeyIndex + 1} dari ${apiKeys.length}`);
        console.log(`File Index Utama dibuat di: ${masterListPath}`);
        
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
