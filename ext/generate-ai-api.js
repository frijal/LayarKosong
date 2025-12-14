// =========================================================
// SCRIPT: ext/generate-ai-api.js
// VERSI BERSIH: Menghapus dotenv, fokus pada GEMINI_API_KEY dari ENV.
// =========================================================

// --- 1. IMPORT & SETUP ---
import * as fs from 'node:fs'; 
import * as path from 'node:path'; 
import { fileURLToPath } from 'node:url'; 
import { load } from 'cheerio'; 
import { GoogleGenAI } from '@google/genai'; 

// --- 2. PATH RESOLUTION & KONFIGURASI (Tidak Berubah) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..'); 

const INPUT_METADATA_FILE = path.join(PROJECT_ROOT, 'artikel.json'); 
const INPUT_ARTICLES_DIR = path.join(PROJECT_ROOT, 'artikel'); 
const OUTPUT_API_DIR = path.join(PROJECT_ROOT, 'api', 'v1'); 
const DOMAIN_BASE_URL = 'https://dalam.web.id'; 

// --- 3. SETUP GEMINI API ---
// Kunci API diambil langsung dari Environment Variable yang disuntikkan GitHub Actions
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

if (!GEMINI_API_KEY) {
    // Kita biarkan script berjalan, tapi Prompt Hint akan menjadi summary
    console.warn("⚠️ PERINGATAN: GEMINI_API_KEY tidak ditemukan di ENV. 'promptHint' akan menggunakan Summary sebagai fallback.");
}

// Inisialisasi SDK menggunakan Kunci API yang eksplisit
// Jika Kunci ada, SDK akan menggunakannya dan *tidak* jatuh ke ADC
const ai = GEMINI_API_KEY ? new GoogleGenAI(GEMINI_API_KEY) : null; 

// --- 4. FUNGSI PEMBUAT PROMPT HINT DENGAN AI (Inti Logika) ---
async function generatePromptHint(content, title, summary) {
    if (!ai) return summary; 

    // ... (Logika prompt dan panggilan API tidak berubah) ...
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
        return summary; 
    }
}


// --- 5. FUNGSI PEMERSATU DATA (FLATTENING) (Tidak Berubah) ---
function flattenAndNormalizeData(metadata) {
// ... (Logika ini tetap sama) ...
}

// --- 6. FUNGSI PEMBERSIN KONTEN (CHEERIO) (Tidak Berubah) ---
function extractCleanContent(slug_html) {
// ... (Logika ini tetap sama) ...
}


// --- 7. FUNGSI UTAMA: MENJALANKAN GENERASI API (ASYNC) (Tidak Berubah) ---
async function generateApiFiles() {
// ... (Logika ini tetap sama) ...
    for (const post of allPosts) {
        const cleanContent = extractCleanContent(post.slug);
        
        if (cleanContent) {
            // HANYA PANGGIL AI JIKA PROMPT HINT BELUM DIISI MANUAL
            if (!post.customPromptHintManuallySet) { 
                console.log(`   ⏳ Membuat Prompt Hint AI untuk: ${post.title}`);
                const newHint = await generatePromptHint(cleanContent, post.title, post.summary);
                post.promptHint = newHint;
            } else {
                console.log(`   ✅ Prompt Hint manual ditemukan, dilewati: ${post.title}`);
            }
            
            post.content_plain = cleanContent;

            // ... (Tulis JSON dan Lanjutkan) ...
        }
    }
// ...
}

// --- JALANKAN SKRIP ---
generateApiFiles().catch(error => {
    console.error('Fatal error during asynchronous execution:', error);
    process.exit(1);
});
