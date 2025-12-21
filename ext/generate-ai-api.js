// =========================================================
// SCRIPT: ext/generate-ai-api.js
// VERSI: Fixed Gemini Call + Native Node v20
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

// ================= LOGGER =================
const log = {
  i: m => console.log(`ℹ️  ${m}`),
  w: m => console.warn(`⚠️  ${m}`),
  e: m => console.error(`❌ ${m}`)
};

// ================= MODELS & KEYS =================
const MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-2.0-flash-exp"
];

const apiKeys = [];
if (process.env.GEMINI_API_KEY) apiKeys.push(process.env.GEMINI_API_KEY);
for (let i = 1; i <= 20; i++) {
  const key = process.env[`GEMINI_API_KEY${i}`];
  if (key) apiKeys.push(key);
}

if (!apiKeys.length) log.w("Tidak ada GEMINI_API_KEY, AI dimatikan.");

const failedKeys = new Set();
const failedModels = new Set();
const combinations = [];
apiKeys.forEach(key => MODELS.forEach(model => combinations.push({ key, model })));

function getAIInstance(key) {
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
  if (!text || text.length < 300) return null;
  
  for (const { key, model } of combinations) {
    if (failedKeys.has(key) || failedModels.has(model)) continue;
    
    try {
      const ai = getAIInstance(key);
      const prompt = `Kembalikan JSON valid:
{
  "summary": "maks 2 kalimat",
  "prompt_hint": "1-3 pertanyaan singkat",
  "keywords": ["1-5 kata"],
  "topics": ["maks 3 topik"]
}
Judul: ${title}
Konten: """${text.slice(0, 8000)}"""`;

      // MENGGUNAKAN GAYA PEMANGGILAN YANG BERHASIL DI SCRIPT KAMU
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.2 }
      });

      // Pastikan response ada dan bersihkan markdown
      const responseText = res.text || "";
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanJson);
      
    } catch(e) {
      const msg = e.message.toLowerCase();
      log.w(`Gagal dengan ${model}: ${msg}`);
      if (msg.includes('quota') || msg.includes('429') || msg.includes('exhausted')) {
        failedKeys.add(key);
      } else {
        failedModels.add(model);
      }
    }
  }
  return null;
}

// ================= MAIN =================
async function main() {
  await fs.mkdir(MINI_DIR, { recursive: true });
  log.i("Memulai update metadata AI Layar Kosong...");

  const dateStr = new Date().toISOString().slice(0,10);
  const logFile = path.join(MINI_DIR, `${dateStr}-LogAI.md`);
  let logMd = `# LogAI - ${dateStr}\n\n`;

  let files = [];
  try {
    const allFiles = await fs.readdir(POST_DIR);
    files = allFiles
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(POST_DIR, f));
  } catch (err) {
    log.e(`Gagal membaca folder: ${err.message}`);
    return;
  }

  log.i(`Ditemukan ${files.length} file untuk dicek.`);

  for (const file of files) {
    try {
      const data = JSON.parse(await fs.readFile(file, 'utf8'));
      if (!data.meta) data.meta = {};

      const oldSummary = data.meta.summary || '';
      const oldPromptHint = data.meta.prompt_hint || '';
      const oldKeywords = data.meta.keywords || [];
      const oldTopics = data.meta.topics || [];

      // Hanya panggil AI jika konten tersedia
      const aiMeta = await aiGenerateMetadata(data.content?.text || '', data.title);

      if (aiMeta) {
        const newSummary = aiMeta.summary || oldSummary;
        const newPromptHint = aiMeta.prompt_hint || oldPromptHint;
        const newKeywords = aiMeta.keywords || oldKeywords;
        const newTopics = aiMeta.topics || oldTopics;

        // Update file JSON
        data.meta.summary = newSummary;
        data.meta.prompt_hint = newPromptHint;
        data.meta.keywords = newKeywords;
        data.meta.topics = newTopics;
        await fs.writeFile(file, JSON.stringify(data, null, 2));

        // Catat di LogAI
        logMd += `## [${data.title}](${data.url})\n`;
        logMd += `| Metadata | Sebelumnya | Terbaru |\n|---|---|---|\n`;
        logMd += `| Summary | ${oldSummary} | ${highlightTextChange(oldSummary, newSummary)} |\n`;
        logMd += `| Prompt Hint | ${oldPromptHint} | ${highlightTextChange(oldPromptHint, newPromptHint)} |\n`;
        logMd += `| Keywords | ${oldKeywords.join(', ')} | ${highlightDiff(oldKeywords, newKeywords).join(', ')} |\n`;
        logMd += `| Topics | ${oldTopics.join(', ')} | ${highlightDiff(oldTopics, newTopics).join(', ')} |\n\n`;

        log.i(`✅ Sukses: ${path.basename(file)}`);
      } else {
        log.w(`⏭️  Skip: ${path.basename(file)} (AI Gagal/Konten Pendek)`);
      }
    } catch (err) {
      log.e(`Error file ${file}: ${err.message}`);
    }
  }

  await fs.writeFile(logFile, logMd);
  log.i(`Selesai! Log harian disimpan di: ${logFile}`);
}

main().catch(e => {
  log.e(e.stack);
  process.exit(1);
});
