// =========================================================
// SCRIPT: ext/generate-ai-api.js
// FITUR: Multi-Key Rotation, Hard Caching, & Index.json Output
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
    console.warn("⚠️ PERINGATAN: Tidak ada GEMINI_API_KEY (atau variannya) ditemukan di ENV. Mode fallback summary.");
} else {
    console.log(`✅ ${apiKeys.length} Kunci API berhasil dimuat. Siap untuk rotasi otomatis!`);
}

// Helper untuk mendapatkan instance AI dengan kunci yang aktif saat ini
function getCurrentAI() {
    if (apiKeys.length === 0) return null;
    // Pastikan index tidak out of bounds (looping kembali ke 0 jika perlu, atau stop)
    if (currentKeyIndex >= apiKeys.length) {
        console.warn("⚠️ Semua kunci API telah habis/limit!");
        return null;
    }
    return new GoogleGenAI({ apiKey: apiKeys[currentKeyIndex] });
}


// --- 4. FUNGSI PEMBUAT PROMPT HINT DENGAN ROTASI KUNCI ---
async function generatePromptHint(content, title, summary) {
    // Loop retry: Mencoba kunci saat ini, jika gagal pindah ke kunci berikutnya
    // Batas loop adalah sisa jumlah kunci yang tersedia
    let attempts = 0;
    const maxAttempts = apiKeys.length;

    while (attempts < maxAttempts) {
        const ai = getCurrentAI();

        if (!ai) {
            console.warn("   ⚠️ Tidak ada client AI tersedia (Keys exhausted).");
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
            // console.log(`   🔌 Menggunakan Key Index: ${currentKeyIndex + 1} (${apiKeys[currentKeyIndex].substring(0,5)}...)`);

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: { temperature: 0.1 }
            });

            const hint = response.text.trim().replace(/^['"]|['"]$/g, '');
            return hint; // SUKSES! Keluar dari fungsi

        } catch (error) {
            // Analisis Error
            const errorMsg = error.message.toLowerCase();
            const isQuotaError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("resource exhausted");

            if (isQuotaError) {
                console.warn(`   ⚠️ Key Index ${currentKeyIndex + 1} LIMIT/EXPIRED. Beralih ke kunci berikutnya...`);
                currentKeyIndex++; // Pindah ke kunci berikutnya secara permanen untuk sesi ini
                attempts++;
                // Loop 'while' akan mengulang dengan kunci baru
            } else {
                // Jika error lain (misal 500 server error atau bad request), mungkin tidak perlu ganti kunci, tapi kita skip artikel ini
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


// --- 7. FUNGSI UTAMA: MENJALANKAN GENERASI API (ASYNC) ---
async function generateApiFiles() {
    console.log('--- Memulai Generasi L-K AI API (Multi-Key Support) ---');

    if (!fs.existsSync(OUTPUT_API_DIR)) {
        fs.mkdirSync(OUTPUT_API_DIR, { recursive: true });
        console.log(`✅ Direktori API dibuat: ${OUTPUT_API_DIR}`);
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

            // --- LOGIKA UTAMA: CEK EKSISTENSI FILE TERLEBIH DAHULU ---
            if (fs.existsSync(singlePostPath)) {
                try {
                    // Jika file JSON sudah ada, baca isinya untuk dimasukkan ke index.json
                    const existingPostData = JSON.parse(fs.readFileSync(singlePostPath, 'utf8'));

                    // Kita perlu data summary-nya saja untuk master list (buang content_plain biar ringan)
                    const { content_plain, ...summaryData } = existingPostData;

                    summaryPosts.push(summaryData);
                    skippedCount++;
                    continue; // <--- PENTING: Lanjut ke artikel berikutnya, jangan proses AI/HTML lagi

                } catch (e) {
                    console.warn(`⚠️ File JSON rusak untuk ${post.title}, akan dibuat ulang.`);
                }
            }
            // --- END LOGIKA CEK EKSISTENSI ---

            // Jika sampai sini, berarti file belum ada atau rusak. Proses ulang!
            const cleanContent = extractCleanContent(post.slug);

            if (cleanContent) {
                // Panggil AI (Function ini sekarang sudah support multi-key rotation)
                if (apiKeys.length > 0) {
                    console.log(`   ⏳ Membuat Prompt Hint AI untuk: ${post.title}`);
                    const newHint = await generatePromptHint(cleanContent, post.title, post.summary);
                    post.promptHint = newHint;
                }

                post.content_plain = cleanContent;

                // Tulis JSON Single Post
                const { customPromptHintManuallySet, ...postForJson } = post;
                fs.writeFileSync(singlePostPath, JSON.stringify(postForJson, null, 2));

                // Siapkan untuk Master List (Hapus Konten Penuh)
                const { content_plain, ...summary } = postForJson;
                summaryPosts.push(summary);
                processedCount++;
            }
        }

        // --- TULIS FILE INDEX UTAMA ---
        const masterListPath = path.join(OUTPUT_API_DIR, 'index.json');

        fs.writeFileSync(masterListPath, JSON.stringify(summaryPosts, null, 2));

        console.log(`\n🎉 Proses Selesai!`);
        console.log(`Total Artikel diproses baru: ${processedCount}`);
        console.log(`Total Artikel dilewati (sudah ada): ${skippedCount}`);
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