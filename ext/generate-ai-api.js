// =========================================================
// SCRIPT: ext/generate-ai-api.js
// VERSI: Final Full Update AI Metadata + LogAI Highlight
// =========================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
// import glob from 'glob';
// import { promisify } from 'util';
// const globP = promisify(glob);
import { glob } from 'node:fs/promises';
// ================= PATH =================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(ROOT, 'api/v1');
const POST_DIR = path.join(API_DIR, 'post');
const MINI_DIR = path.join(ROOT, 'mini');
const BASE_URL = 'https://dalam.web.id';

// ================= LOGGER =================
const log = {
  i: m => console.log(`ℹ️  ${m}`),
  w: m => console.warn(`⚠️  ${m}`),
  e: m => console.error(`❌ ${m}`)
};

// ================= MODELS & KEYS =================
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemma-3-4b",
  "gemma-3-12b"
];

const apiKeys = Object.keys(process.env)
  .filter(k => k.startsWith('GEMINI_API_KEY'))
  .map(k => process.env[k])
  .filter(Boolean);

if (!apiKeys.length) log.w("Tidak ada GEMINI_API_KEY, AI dimatikan.");

const failedKeys = new Set();
const failedModels = new Set();
const combinations = [];
apiKeys.forEach(key => MODELS.forEach(model => combinations.push({ key, model })));

function getAI(key) {
  return new GoogleGenAI({ apiKey: key });
}

// ================= HELPERS =================
function highlightDiff(oldArr=[], newArr=[]) {
  const added = newArr.filter(x => !oldArr.includes(x));
  const removed = oldArr.filter(x => !newArr.includes(x));
  return newArr.map(k=>added.includes(k)?`**${k}**`:removed.includes(k)?`~~${k}~~`:k);
}

function highlightTextChange(oldText='', newText='') {
  return oldText !== newText ? `**UPDATED** → ${newText}` : newText;
}

// ================= AI GENERATORS =================
async function aiGenerateMetadata(text, title) {
  if (!text || text.length < 300) return { summary:'', prompt_hint:'', keywords:[], topics:[] };
  for (const { key, model } of combinations) {
    if (failedKeys.has(key) || failedModels.has(model)) continue;
    try {
      const ai = getAI(key);
      const prompt = `
Kembalikan JSON valid:
{
  "summary": "maks 2 kalimat",
  "prompt_hint": "1-3 pertanyaan singkat",
  "keywords": ["5-10 kata"],
  "topics": ["maks 5 topik"]
}
Judul: ${title}
Konten:
"""${text.slice(0,8000)}"""
`;
      const res = await ai.models.generateContent({
        model,
        contents: [{ role:"user", parts:[{ text: prompt }] }],
        config: { temperature: 0.2 }
      });
      return JSON.parse(res.text);
    } catch(e) {
      const msg = e.message.toLowerCase();
      msg.includes('quota') ? failedKeys.add(key) : failedModels.add(model);
    }
  }
  return { summary:'', prompt_hint:'', keywords:[], topics:[] };
}

// ================= MAIN =================
async function main() {
  await fs.mkdir(MINI_DIR, { recursive: true });
  log.i("Memulai update metadata AI dan LogAI...");

  const dateStr = new Date().toISOString().slice(0,10);
  const logFile = path.join(MINI_DIR, `${dateStr}-LogAI.md`);
  let logMd = `# LogAI - ${dateStr}\n\n`;

//  const files = await globP(path.join(POST_DIR,'*.json'));
const files = [];
for await (const file of glob(path.join(POST_DIR, '*.json'))) {
    files.push(file);
}

///
  for (const file of files) {
    const data = JSON.parse(await fs.readFile(file,'utf8'));

    const oldSummary = data.meta.summary || '';
    const oldPromptHint = data.meta.prompt_hint || '';
    const oldKeywords = data.meta.keywords || [];
    const oldTopics = data.meta.topics || [];

    // generate metadata baru via AI
    const aiMeta = await aiGenerateMetadata(data.content?.text || '', data.title);

    const newSummary = aiMeta.summary || oldSummary;
    const newPromptHint = aiMeta.prompt_hint || oldPromptHint;
    const newKeywords = aiMeta.keywords || oldKeywords;
    const newTopics = aiMeta.topics || oldTopics;

    // highlight perubahan
    const summaryDiff = highlightTextChange(oldSummary, newSummary);
    const promptHintDiff = highlightTextChange(oldPromptHint, newPromptHint);
    const keywordsDiff = highlightDiff(oldKeywords, newKeywords);
    const topicsDiff = highlightDiff(oldTopics, newTopics);

    // update cache
    data.meta.summary = newSummary;
    data.meta.prompt_hint = newPromptHint;
    data.meta.keywords = newKeywords;
    data.meta.topics = newTopics;
    await fs.writeFile(file, JSON.stringify(data,null,2));

    // log markdown per artikel
    logMd += `## [${data.title}](${data.url})\n`;
    logMd += `| Metadata | Sebelumnya | Terbaru |\n|---|---|---|\n`;
    logMd += `| Summary | ${oldSummary} | ${summaryDiff} |\n`;
    logMd += `| Prompt Hint | ${oldPromptHint} | ${promptHintDiff} |\n`;
    logMd += `| Keywords | ${oldKeywords.join(', ')} | ${keywordsDiff.join(', ')} |\n`;
    logMd += `| Topics | ${oldTopics.join(', ')} | ${topicsDiff.join(', ')} |\n\n`;
  }

  await fs.writeFile(logFile, logMd);
  log.i(`Selesai. LogAI disimpan: ${logFile}`);
}

// ================= RUN =================
main().catch(e=>{
  log.e(e.message);
  process.exit(1);
});

