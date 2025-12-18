// =========================================================
// SCRIPT: ext/generate-ai-api.js
// VERSI: Optimasi Async, Rotasi Cerdas, Modular
// =========================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { GoogleGenAI } from '@google/genai';

// ==================== SETUP PATH ========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const INPUT_METADATA_FILE = path.join(PROJECT_ROOT, 'artikel.json');
const INPUT_ARTICLES_DIR = path.join(PROJECT_ROOT, 'artikel');
const INPUT_LLMS_FILE = path.join(PROJECT_ROOT, 'llms.txt');
const OUTPUT_API_DIR = path.join(PROJECT_ROOT, 'api', 'v1');
const DOMAIN_BASE_URL = 'https://dalam.web.id';

// ==================== LOGGING HELPERS ===================
const log = {
    info: msg => console.log(`ℹ️  ${msg}`),
    warn: msg => console.warn(`⚠️  ${msg}`),
    error: msg => console.error(`❌ ${msg}`)
};

// ==================== ROTASI MODEL & KEY =================
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

const apiKeys = [];
if (process.env.GEMINI_API_KEY) apiKeys.push(process.env.GEMINI_API_KEY);
for (let i = 1; i <= 20; i++) {
    const key = process.env[`GEMINI_API_KEY${i}`];
    if (key) apiKeys.push(key);
}

const TOTAL_KEYS = apiKeys.length;
const TOTAL_MODELS = MODELS_TO_ROTATE.length;

if (TOTAL_KEYS === 0) {
    log.warn("Tidak ada GEMINI_API_KEY ditemukan. Mode fallback/manual.");
} else {
    log.info(`${TOTAL_KEYS} Kunci API dimuat & ${TOTAL_MODELS} Model siap digunakan.`);
}

const failedKeys = new Set();
const failedModels = new Set();

// Precompute kombinasi sehat
const validCombinations = [];
apiKeys.forEach(key => MODELS_TO_ROTATE.forEach(model => validCombinations.push({ key, model })));

function getNextCombination(currentIndex) {
    for (let i = currentIndex; i < validCombinations.length; i++) {
        const { key, model } = validCombinations[i];
        if (!failedKeys.has(key) && !failedModels.has(model)) {
            return { key, model, newIndex: i + 1 };
        }
    }
    return { key: null, model: null, newIndex: validCombinations.length };
}

function getAIInstance(key) {
    return new GoogleGenAI({ apiKey: key });
}

// ==================== CHEERIO CONTENT CLEANING ==========
async function extractCleanContent(slug_html) {
    try {
        const htmlFilePath = path.join(INPUT_ARTICLES_DIR, slug_html);
        const htmlContent = await fs.readFile(htmlFilePath, 'utf8');
        const $ = load(htmlContent);

        ['script', 'style','footer','#iposbrowser','#pesbukdiskus','.search-floating-container','#related-marquee-section']
        .forEach(sel => $(sel).remove());

        let content_plain = $('.container').first().text() || $('.main').first().text() || $('body').text();
        content_plain = content_plain.replace(/\s+/g, ' ').trim();
        return content_plain;
    } catch (e) {
        log.warn(`Gagal membaca/membersihkan konten: ${slug_html} → skip`);
        return null;
    }
}

// ==================== LLMS WHITELIST ====================
async function getLlmsWhitelistedSlugs() {
    try {
        const content = await fs.readFile(INPUT_LLMS_FILE, 'utf8');
        const whitelistedSlugs = new Set();
        const lines = content.split('\n');
        const articleRegex = /-\s*\[\*\*(.*?)\*\*\]\((.*?\/artikel\/(.*?)\.html)\):\s*(.*?)\s*—\s*(.*)/;

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
        log.info(`${parsedCount} artikel diizinkan (whitelisted) berdasarkan llms.txt.`);
        return whitelistedSlugs;
    } catch (e) {
        log.warn("File llms.txt tidak ditemukan atau gagal parse. Semua artikel dilewati.");
        return new Set();
    }
}

// ==================== GENERATE PROMPT HINT =================
async function generatePromptHint(content, title, summary) {
    let currentIndex = 0;
    while (currentIndex < validCombinations.length) {
        const { key, model, newIndex } = getNextCombination(currentIndex);
        currentIndex = newIndex;

        if (!key || !model) {
            log.error("EARLY EXIT: Tidak ada kombinasi kunci/model sehat tersisa.");
            break;
        }

        const ai = getAIInstance(key);
        const prompt = `Anda adalah ahli Generative Engine Optimization (GEO).
        Buat string singkat 1-3 pertanyaan dari konten ini.
        Pisahkan dengan titik koma (;).
        JUDUL: ${title}
        SUMMARY: ${summary}
        KONTEN UTAMA: ${content.substring(0, 1000)}...`;

        try {
            log.info(`Coba: Key ${apiKeys.indexOf(key)+1} | Model: ${model}`);
            const response = await ai.models.generateContent({
                model,
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: { temperature: 0.1 }
            });
            return response.text.trim().replace(/^['"]|['"]$/g, '');
        } catch (e) {
            const errMsg = e.message.toLowerCase();
            if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("resource exhausted")) {
                log.warn(`Gagal kuota: Key Index ${apiKeys.indexOf(key)+1} di-blacklist.`);
                failedKeys.add(key);
            } else {
                log.warn(`Error model/non-quota: ${model} di-blacklist.`);
                failedModels.add(model);
            }
        }
    }
    return summary; // fallback
}

// ==================== FLATTEN METADATA ====================
function flattenAndNormalizeData(metadata) {
    const allPosts = [];
    for (const category in metadata) {
        if (metadata.hasOwnProperty(category)) {
            metadata[category].forEach(articleArray => {
                const [title, slug_html, img_url, date, summary, custom_prompt_hint] = articleArray;
                const post = {
                    id: slug_html.replace('.html',''),
                                       title,
                                       slug: slug_html,
                                       url: `${DOMAIN_BASE_URL}/artikel/${slug_html}`,
                                       datePublished: date,
                                       summary,
                                       category,
                                       promptHint: custom_prompt_hint || summary || null,
                                       customPromptHintManuallySet: !!custom_prompt_hint,
                                       imageUrl: img_url
                };
                allPosts.push(post);
            });
        }
    }
    allPosts.sort((a,b)=> new Date(b.datePublished)-new Date(a.datePublished));
    return allPosts;
}

// ==================== MAIN FUNCTION ====================
async function generateApiFiles() {
    log.info("Memulai Generasi L-K AI API...");

    await fs.mkdir(OUTPUT_API_DIR, { recursive: true });
    const singlePostDir = path.join(OUTPUT_API_DIR, 'post');
    await fs.mkdir(singlePostDir, { recursive: true });

    try {
        const rawMetadata = JSON.parse(await fs.readFile(INPUT_METADATA_FILE, 'utf8'));
        const allPosts = flattenAndNormalizeData(rawMetadata);
        const whitelistedSlugs = await getLlmsWhitelistedSlugs();

        log.info(`Metadata ${allPosts.length} artikel telah dibaca.`);

        const summaryPosts = [];
        let processedCount = 0, cachedCount = 0, skippedNotWhitelisted = 0, skippedFailed = 0;

        for (const post of allPosts) {
            if (!whitelistedSlugs.has(post.id)) {
                skippedNotWhitelisted++;
                continue;
            }

            const singlePostPath = path.join(singlePostDir, `${post.id}.json`);
            let cleanContent = await extractCleanContent(post.slug);
            if (!cleanContent) {
                skippedFailed++;
                continue;
            }

            let finalPromptHint = post.promptHint;
            let generatedByAI = false;
            let isManual = post.customPromptHintManuallySet;

            // caching JSON
            try {
                if (!isManual && await fs.access(singlePostPath).then(()=>true).catch(()=>false)) {
                    const existingData = JSON.parse(await fs.readFile(singlePostPath,'utf8'));
                    const { content_plain, ...summary } = existingData;
                    summaryPosts.push(summary);
                    cachedCount++;
                    continue;
                }
            } catch {}

            if (!isManual && TOTAL_KEYS > 0) {
                const newHint = await generatePromptHint(cleanContent, post.title, post.summary);
                if (newHint !== post.summary) {
                    finalPromptHint = newHint;
                    generatedByAI = true;
                } else skippedFailed++;
            }

            const isSuccessful = isManual || generatedByAI;
            if (isSuccessful) {
                post.promptHint = finalPromptHint;
                post.content_plain = cleanContent;
                const { customPromptHintManuallySet, ...postForJson } = post;
                await fs.writeFile(singlePostPath, JSON.stringify(postForJson,null,2));
                const { content_plain, ...summary } = postForJson;
                summaryPosts.push(summary);
                processedCount++;
            }
        }

        // Batch write index.json
        if (summaryPosts.length > 0) {
            await fs.writeFile(path.join(OUTPUT_API_DIR,'index.json'), JSON.stringify(summaryPosts,null,2));
        } else {
            log.warn('Tidak ada artikel berhasil diproses. index.json tidak dibuat.');
        }

        log.info(`Proses Selesai!`);
        log.info(`Diproses: ${processedCount}, Cache: ${cachedCount}, Skip whitelist: ${skippedNotWhitelisted}, Skip AI gagal: ${skippedFailed}`);
        log.info(`Keys Blacklisted: ${failedKeys.size}, Models Blacklisted: ${failedModels.size}`);

    } catch (e) {
        log.error(`ERROR FATAL: ${e.message}`);
        process.exit(1);
    }
}

// ==================== RUN SCRIPT ====================
generateApiFiles().catch(e => {
    log.error(`Fatal error during async execution: ${e.message}`);
    process.exit(1);
});
