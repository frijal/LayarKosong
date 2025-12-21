// =========================================================
// ext/generate-ai-api.js
// VERSI FINAL: AI API + LogAI.md dengan highlight perubahan
// =========================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { GoogleGenAI } from '@google/genai';

// ==================== PATH ========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const META_FILE = path.join(ROOT, 'artikel.json');
const HTML_DIR = path.join(ROOT, 'artikel');
const LLMS_FILE = path.join(ROOT, 'llms.txt');
const API_DIR = path.join(ROOT, 'api', 'v1');
const POST_DIR = path.join(API_DIR, 'post');
const LOG_DIR = path.join(ROOT, 'mini');

const BASE_URL = 'https://dalam.web.id';
const TODAY = new Date().toISOString().split('T')[0];
const LOG_FILE = path.join(LOG_DIR, `${TODAY}-LogAI.md`);

// ==================== LOG HELPERS ==================
const log = {
  info: m => console.log(`ℹ️  ${m}`),
  warn: m => console.warn(`⚠️  ${m}`),
  error: m => console.error(`❌ ${m}`)
};

// ==================== ROTASI MODEL & KEY =================
const MODELS_TO_ROTATE = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-robotics-er-1.5-preview",
  "gemini-2.5-flash-tts",
  "gemini-3-flash",
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

const failedKeys = new Set();
const failedModels = new Set();
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

// ==================== CHEERIO CLEAN ==================
async function extractCleanContent(file) {
  try {
    const html = await fs.readFile(path.join(HTML_DIR, file), 'utf8');
    const $ = load(html);
    ['script','style','nav','footer','aside','noscript'].forEach(s => $(s).remove());
    const root = $('article').first().length ? $('article').first()
               : $('.container').first().length ? $('.container').first()
               : $('body');
    const text = root.text().replace(/\s+/g,' ').trim();
    return text;
  } catch {
    log.warn(`Gagal baca HTML: ${file}`);
    return null;
  }
}

// ==================== LLMS WHITELIST ==================
async function loadWhitelist() {
  try {
    const txt = await fs.readFile(LLMS_FILE, 'utf8');
    return new Set([...txt.matchAll(/artikel\/(.*?)\.html/g)].map(m => m[1]));
  } catch {
    log.warn("llms.txt tidak ditemukan → semua artikel dilewati");
    return new Set();
  }
}

// ==================== AI EXTRACTION ==================
async function generateMetadata(content, title) {
  let currentIndex = 0;
  while (currentIndex < validCombinations.length) {
    const { key, model, newIndex } = getNextCombination(currentIndex);
    currentIndex = newIndex;

    if (!key || !model) break;

    const ai = getAIInstance(key);
    const prompt = `
Buat JSON valid:
{
  "summary": "maks 2 kalimat",
  "keywords": ["1-5 kata"],
  "topics": ["maks 3 topik"],
  "prompt_hint": "1-3 pertanyaan singkat"
}

Judul: ${title}
Konten:
"""${content.slice(0,8000)}"""
`;

    try {
      log.info(`Coba: Key idx ${apiKeys.indexOf(key)+1} | Model: ${model}`);
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.2 }
      });
      const parsed = JSON.parse(res.text);
      return { ...parsed, key, model, success: true };
    } catch (e) {
      const msg = e.message.toLowerCase();
      log.warn(`❌ Key idx ${apiKeys.indexOf(key)+1} | Model ${model} error: ${e.message}`);
      if (msg.includes('quota') || msg.includes('429') || msg.includes('resource exhausted')) {
        failedKeys.add(key);
      } else {
        failedModels.add(model);
      }
    }
  }
  return { summary: null, keywords: [], topics: [], prompt_hint: null, success: false };
}

// ==================== HIGHLIGHT PERBEDAAN ==================
function diffArray(oldArr=[], newArr=[]) {
  const added = newArr.filter(x => !oldArr.includes(x));
  const removed = oldArr.filter(x => !newArr.includes(x));
  const result = newArr.map(x => added.includes(x) ? `**${x}**`
                     : removed.includes(x) ? `~~${x}~~`
                     : x);
  removed.forEach(x => {
    if (!result.includes(`~~${x}~~`)) result.push(`~~${x}~~`);
  });
  return result;
}

// ==================== MAIN ==================
async function generate() {
  log.info("Memulai Generate AI API & LogAI.md...");

  await fs.mkdir(POST_DIR, { recursive:true });
  await fs.mkdir(LOG_DIR, { recursive:true });

  const meta = JSON.parse(await fs.readFile(META_FILE, 'utf8'));
  const whitelist = await loadWhitelist();
  const index = [];
  let logEntries = [];
  let successCount = 0, failCount = 0, changedCount = 0;

  for (const [category, items] of Object.entries(meta)) {
    for (const [title, file, image, date, desc] of items) {
      const id = file.replace('.html','');
      if (!whitelist.has(id)) continue;
      const outFile = path.join(POST_DIR, `${id}.json`);

      let oldData = {};
      if (await fs.access(outFile).then(()=>true).catch(()=>false)) {
        oldData = JSON.parse(await fs.readFile(outFile,'utf8'));
      }

      const content = await extractCleanContent(file);
      if (!content) { failCount++; continue; }

      const aiMeta = await generateMetadata(content, title);
      aiMeta.success ? successCount++ : failCount++;

      // Merge metadata lama & baru
      const newMeta = {
        summary: oldData.meta?.summary || aiMeta.summary || desc || '',
        keywords: aiMeta.keywords?.length ? aiMeta.keywords : oldData.meta?.keywords || [],
        topics: aiMeta.topics?.length ? aiMeta.topics : oldData.meta?.topics || [],
        prompt_hint: aiMeta.prompt_hint || oldData.meta?.prompt_hint || desc || ''
      };

      // Hitung perubahan
      const keywordsDiff = diffArray(oldData.meta?.keywords, newMeta.keywords);
      const topicsDiff = diffArray(oldData.meta?.topics, newMeta.topics);
      const summaryChanged = oldData.meta?.summary !== newMeta.summary;

      if (keywordsDiff.join('') !== (oldData.meta?.keywords || []).join('') ||
          topicsDiff.join('') !== (oldData.meta?.topics || []).join('') ||
          summaryChanged) {
        changedCount++;
      }

      // Tulis post JSON
      const post = {
        id,
        slug: id,
        title,
        category,
        published_at: date,
        url: `${BASE_URL}/artikel/${file}`,
        image,
        content: { text: content },
        meta: newMeta
      };
      await fs.writeFile(outFile, JSON.stringify(post,null,2));

      index.push({
        id, title, category, date, image, excerpt: newMeta.summary, endpoint: `/api/v1/post/${id}.json`
      });

      // Log Markdown per artikel
      logEntries.push(`### ${title} (${id})\n`);
      if (summaryChanged) logEntries.push(`- **Summary diperbarui:** ${newMeta.summary}\n`);
      if (keywordsDiff.length) logEntries.push(`- **Keywords:** ${keywordsDiff.join(', ')}\n`);
      if (topicsDiff.length) logEntries.push(`- **Topics:** ${topicsDiff.join(', ')}\n`);
      logEntries.push('\n');
    }
  }

  // Tulis index.json
  index.sort((a,b)=>new Date(b.date)-new Date(a.date));
  await fs.writeFile(path.join(API_DIR,'index.json'), JSON.stringify(index,null,2));

  // Tulis LogAI.md
  let logContent = `# LogAI - Layar Kosong

Tanggal: ${TODAY} | Jumlah Artikel Diproses: ${successCount + failCount}
Gemini API
✅ Berhasil: ${successCount} ❌ Gagal: ${failCount}
Artikel dengan perubahan metadata: ${changedCount}

`;
  logContent += logEntries.join('\n');
  await fs.writeFile(LOG_FILE, logContent);

  log.info(`Selesai! Total artikel: ${successCount + failCount}, Perubahan metadata: ${changedCount}`);
  log.info(`LogAI.md ditulis ke ${LOG_FILE}`);
}

generate().catch(e=>{
  log.error(e.message);
  process.exit(1);
});

