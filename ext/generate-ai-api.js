// =========================================================
// SCRIPT: ext/generate-ai-api.js
// VERSI: Optimized Native Node v20 (No External Glob)
// =========================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

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
// Disesuaikan ke versi model yang sudah stabil/tersedia publik
const MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-2.5-flash",
  "gemini-3-pro-preview",
  "gemini-2.0-flash-exp"
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
  return newArr.map(k => added.includes(k) ? `**${k}**` : removed.includes(k) ? `~~${k}~~` : k);
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
      const genAI = getAI(key);
      const modelInstance = genAI.getGenerativeModel({ model });
      
      const prompt = `
Kembalikan JSON valid (tanpa markdown code block):
{
  "summary": "maks 2 kalimat",
  "prompt_hint": "1-3 pertanyaan singkat",
  "keywords": ["1-5 kata"],
  "topics": ["maks 3 topik"]
}
Judul: ${title}
Konten:
"""${text.slice(0,8000)}"""
`;
      const result = await modelInstance.generateContent(prompt);
      const response = await result.response;
      const cleanJson = response.text().replace(/```json|```/g, "").trim();
      return JSON.parse(cleanJson);
      
    } catch(e) {
      const msg = e.message.toLowerCase();
      log.w(`Gagal dengan ${model}: ${msg}`);
      if (msg.includes('quota') || msg.includes('429')) {
        failedKeys.add(key);
      } else {
        failedModels.add(model);
      }
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

  // MENGGUNAKAN NATIVE READDIR (Node v20 Compatible)
  let files = [];
  try {
    const allFiles = await fs.readdir(POST_DIR);
    files = allFiles
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(POST_DIR, f));
  } catch (err) {
    log.e(`Gagal membaca folder POST_DIR: ${err.message}`);
    return;
  }

  log.i(`Ditemukan ${files.length} file JSON untuk diproses.`);

  for (const file of files) {
    try {
      const rawData = await fs.readFile(file, 'utf8');
      const data = JSON.parse(rawData);

      // Pastikan objek meta ada
      if (!data.meta) data.meta = {};

      const oldSummary = data.meta.summary || '';
      const oldPromptHint = data.meta.prompt_hint || '';
      const oldKeywords = data.meta.keywords || [];
      const oldTopics = data.meta.topics || [];

      // Generate metadata via AI
      const aiMeta = await aiGenerateMetadata(data.content?.text || '', data.title);

      const newSummary = aiMeta.summary || oldSummary;
      const newPromptHint = aiMeta.prompt_hint || oldPromptHint;
      const newKeywords = aiMeta.keywords || oldKeywords;
      const newTopics = aiMeta.topics || oldTopics;

      // Update data
      data.meta.summary = newSummary;
      data.meta.prompt_hint = newPromptHint;
      data.meta.keywords = newKeywords;
      data.meta.topics = newTopics;
      
      await fs.writeFile(file, JSON.stringify(data, null, 2));

      // Highlight perubahan untuk LogAI
      const summaryDiff = highlightTextChange(oldSummary, newSummary);
      const promptHintDiff = highlightTextChange(oldPromptHint, newPromptHint);
      const keywordsDiff = highlightDiff(oldKeywords, newKeywords);
      const topicsDiff = highlightDiff(oldTopics, newTopics);

      logMd += `## [${data.title}](${data.url})\n`;
      logMd += `| Metadata | Sebelumnya | Terbaru |\n|---|---|---|\n`;
      logMd += `| Summary | ${oldSummary} | ${summaryDiff} |\n`;
      logMd += `| Prompt Hint | ${oldPromptHint} | ${promptHintDiff} |\n`;
      logMd += `| Keywords | ${oldKeywords.join(', ')} | ${keywordsDiff.join(', ')} |\n`;
      logMd += `| Topics | ${oldTopics.join(', ')} | ${topicsDiff.join(', ')} |\n\n`;
      
      log.i(`Berhasil memproses: ${path.basename(file)}`);
    } catch (err) {
      log.e(`Error pada file ${file}: ${err.message}`);
    }
  }

  await fs.writeFile(logFile, logMd);
  log.i(`Selesai. LogAI disimpan: ${logFile}`);
}

// ================= RUN =================
main().catch(e => {
  log.e(e.stack);
  process.exit(1);
});
