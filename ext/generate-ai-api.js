// =========================================================
// ext/generate-ai-api.js
// VERSI DEBUG + HIGHLIGHT METADATA
// =========================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const META_FILE = path.join(ROOT, 'artikel.json');
const HTML_DIR = path.join(ROOT, 'artikel');
const LLMS_FILE = path.join(ROOT, 'llms.txt');
const API_DIR = path.join(ROOT, 'api/v1');
const POST_DIR = path.join(API_DIR, 'post');
const MINI_DIR = path.join(ROOT, 'mini');

const BASE_URL = 'https://dalam.web.id';

const todayStr = new Date().toISOString().slice(0,10); // YYYY-MM-DD
const LOGAI_FILE = path.join(MINI_DIR, `${todayStr}-LogAI.md`);

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
async function extractContent(file) {
  try {
    const html = await fs.readFile(path.join(HTML_DIR, file), 'utf8');
    const $ = load(html);
    ['script','style','nav','footer','aside','noscript'].forEach(s => $(s).remove());
    const root = $('article').first().length ? $('article').first()
               : $('.container').first().length ? $('.container').first()
               : $('body');
    const text = root.text().replace(/\s+/g,' ').trim();
    return { text, html: root.html()?.trim() || '' };
  } catch {
    log.warn(`Gagal baca HTML: ${file}`);
    return null;
  }
}

// ==================== LLMS WHITELIST ==================
async function loadWhitelist() {
  try {
    const txt = await fs.readFile(LLMS_FILE,'utf8');
    return new Set([...txt.matchAll(/artikel\/(.*?)\.html/g)].map(m=>m[1]));
  } catch {
    log.warn("llms.txt tidak ditemukan → semua artikel dilewati");
    return new Set();
  }
}

// ==================== AI METADATA ==================
async function aiGenerateMetadata(text, title) {
  if (!text || text.length < 300) return null;

  let currentIndex = 0;
  while (currentIndex < validCombinations.length) {
    const { key, model, newIndex } = getNextCombination(currentIndex);
    currentIndex = newIndex;
    if (!key || !model) break;

    const ai = getAIInstance(key);
    const prompt = `
Kembalikan JSON VALID:
{
  "summary": "maks 2 kalimat",
  "keywords": ["1-5 kata"],
  "topics": ["maks 3 topik"],
  "prompt_hint": "1-3 pertanyaan singkat"
}
Judul: ${title}
Konten:
"""${text.slice(0,8000)}"""
`;

    try {
      log.info(`Coba Key #${apiKeys.indexOf(key)+1} | Model: ${model}`);
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.2 }
      });
      const json = JSON.parse(res.text);
      return { ...json, usedKeyIndex: apiKeys.indexOf(key)+1, usedModel: model };
    } catch (e) {
      const msg = e.message.toLowerCase();
      if (msg.includes('quota') || msg.includes('429') || msg.includes('resource exhausted')) {
        log.warn(`Quota/Error → Key #${apiKeys.indexOf(key)+1} di-blacklist`);
        failedKeys.add(key);
      } else {
        log.warn(`Error model → ${model} di-blacklist`);
        failedModels.add(model);
      }
    }
  }
  return null;
}

// ==================== HIGHLIGHT PERBEDAAN ==================
function diffArray(oldArr=[], newArr=[]) {
  const added = newArr.filter(x => !oldArr.includes(x));
  const removed = oldArr.filter(x => !newArr.includes(x));
  return { added, removed };
}

// ==================== MAIN ==================
async function generate() {
  await fs.mkdir(POST_DIR, { recursive:true });
  await fs.mkdir(MINI_DIR, { recursive:true });

  const meta = JSON.parse(await fs.readFile(META_FILE,'utf8'));
  const whitelist = await loadWhitelist();

  let logMd = `# LogAI - Layar Kosong\nTanggal: ${todayStr}\n\n`;
  let totalArticles = 0, successCount=0, failCount=0, changedArticles=0;
  const perArticleLogs = [];

  for (const [category, items] of Object.entries(meta)) {
    for (const [title, file, image, date, desc] of items) {
      const id = file.replace('.html','');
      if (!whitelist.has(id)) continue;

      totalArticles++;
      const outFile = path.join(POST_DIR, `${id}.json`);

      let oldData = {};
      if (await fs.access(outFile).then(()=>true).catch(()=>false)) {
        oldData = JSON.parse(await fs.readFile(outFile,'utf8'));
      }

      const content = await extractContent(file);
      if (!content) { failCount++; continue; }

      const ai = await aiGenerateMetadata(content.text, title);
      if (!ai) { failCount++; continue; }

      const newMeta = {
        summary: ai.summary || desc || '',
        keywords: ai.keywords || [],
        topics: ai.topics || [],
        prompt_hint: ai.prompt_hint || desc || ''
      };

      // highlight perbedaan
      const kwDiff = diffArray(oldData.meta?.keywords, newMeta.keywords);
      const tpDiff = diffArray(oldData.meta?.topics, newMeta.topics);
      const summaryChanged = oldData.meta?.summary !== newMeta.summary;

      let hasChange = summaryChanged || kwDiff.added.length || kwDiff.removed.length || tpDiff.added.length || tpDiff.removed.length;

      if (hasChange) changedArticles++;

      const post = {
        id,
        slug: id,
        title,
        category,
        published_at: date,
        url: `${BASE_URL}/artikel/${file}`,
        image,
        content,
        meta: newMeta
      };

      await fs.writeFile(outFile, JSON.stringify(post,null,2));
      successCount++;

      // Markdown log per artikel
      if (hasChange) {
        let md = `### ${title} (${id})\n`;
        md += `| Metadata | Lama | Baru |\n| --- | --- | --- |\n`;
        if (summaryChanged) md += `| Summary | ${oldData.meta?.summary||''} | ${newMeta.summary} |\n`;
        if (kwDiff.added.length || kwDiff.removed.length) {
          const oldKW = (oldData.meta?.keywords||[]).map(k=>kwDiff.removed.includes(k)?`~~${k}~~`:k).join(', ');
          const newKW = (newMeta.keywords||[]).map(k=>kwDiff.added.includes(k)?`**${k}**`:k).join(', ');
          md += `| Keywords | ${oldKW} | ${newKW} |\n`;
        }
        if (tpDiff.added.length || tpDiff.removed.length) {
          const oldTP = (oldData.meta?.topics||[]).map(k=>tpDiff.removed.includes(k)?`~~${k}~~`:k).join(', ');
          const newTP = (newMeta.topics||[]).map(k=>tpDiff.added.includes(k)?`**${k}**`:k).join(', ');
          md += `| Topics | ${oldTP} | ${newTP} |\n`;
        }
        perArticleLogs.push(md);
      }
    }
  }

  // final log
  logMd += `Gemini API\n✅ Berhasil: ${successCount} ❌ Gagal: ${failCount}\n`;
  logMd += `Artikel dengan perubahan metadata: ${changedArticles}\n\n`;
  logMd += perArticleLogs.join('\n');

  await fs.writeFile(LOGAI_FILE, logMd);
  log.info(`Selesai. LogAI ditulis ke: ${LOGAI_FILE}`);
}

generate().catch(e=>{
  log.error(e.message);
  process.exit(1);
});

