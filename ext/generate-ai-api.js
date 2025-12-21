// ext/generate-ai-api.js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { glob } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== CONFIG ====================
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-robotics-er-1.5-preview"
];

const apiKeys = [];
if (process.env.GEMINI_API_KEY) apiKeys.push(process.env.GEMINI_API_KEY);
for (let i = 1; i <= 20; i++) {
  const key = process.env[`GEMINI_API_KEY${i}`];
  if (key) apiKeys.push(key);
}
if (apiKeys.length === 0) throw new Error("Tidak ada GEMINI_API_KEY ditemukan.");

// ==================== ROTASI ====================
const failedKeys = new Set();
const failedModels = new Set();
const validCombinations = [];
apiKeys.forEach(key => MODELS.forEach(model => validCombinations.push({ key, model })));

function getNextCombination(startIndex = 0) {
  for (let i = startIndex; i < validCombinations.length; i++) {
    const { key, model } = validCombinations[i];
    if (!failedKeys.has(key) && !failedModels.has(model)) return { key, model, newIndex: i + 1 };
  }
  return { key: null, model: null, newIndex: validCombinations.length };
}

function getAIInstance(key) {
  return new GoogleGenAI({ apiKey: key });
}

// ==================== UTILS ====================
function sanitizeJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    const cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

function diffArrays(oldArr = [], newArr = []) {
  const added = newArr.filter(x => !oldArr.includes(x));
  const removed = oldArr.filter(x => !newArr.includes(x));
  return { added, removed };
}

// ==================== AI EXTRACT ====================
async function aiExtract(text, title) {
  if (!text || text.length < 300) return null;
  let currentIndex = 0;
  while (currentIndex < validCombinations.length) {
    const { key, model, newIndex } = getNextCombination(currentIndex);
    currentIndex = newIndex;
    if (!key || !model) break;

    console.log(`🔄 Mencoba Key #${apiKeys.indexOf(key) + 1}, Model: ${model}`);

    const ai = getAIInstance(key);
    const prompt = `
JSON VALID:
{
  "summary":"maks 2 kalimat",
  "keywords":["1-3 kata"],
  "topics":["maks 3 topik"],
  "prompt_hint":"1-3 pertanyaan singkat"
}
Judul: ${title}
Konten: """${text.slice(0, 8000)}"""
`;
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.2 }
      });
      const parsed = sanitizeJSON(res.text);
      console.log(`✅ Key berhasil: ${key}, Model: ${model}`);
      return parsed;
    } catch (e) {
      const msg = e.message.toLowerCase();
      console.log(`❌ Error Key ${key}, Model ${model}: ${e.message}`);
      if (msg.includes("quota") || msg.includes("429")) failedKeys.add(key);
      else failedModels.add(model);
    }
  }
  return null;
}

// ==================== MAIN ====================
(async () => {
  const LOG_DIR = path.join(__dirname, 'mini');
  await fs.mkdir(LOG_DIR, { recursive: true });

  const today = new Date().toISOString().split('T')[0];
  const LOG_FILE = path.join(LOG_DIR, `${today}-LogAI.md`);

  let logContent = `# LogAI - Layar Kosong
Tanggal: ${today}
`;

  const allArticles = glob.sync(path.join(__dirname, 'api/v1/**/*.json'));
  logContent += `Jumlah Artikel Diproses: ${allArticles.length}\n\n`;

  let successCount = 0;
  let failCount = 0;
  let metadataChangedCount = 0;

  for (const articlePath of allArticles) {
    const fileName = path.basename(articlePath);
    const oldData = JSON.parse(await fs.readFile(articlePath, 'utf-8'));

    const aiResult = await aiExtract(oldData.content || '', oldData.title || '');
    if (!aiResult) {
      failCount++;
      logContent += `❌ Gagal memproses: ${fileName}\n`;
      continue;
    }
    successCount++;

    // Compare metadata
    const oldSummary = oldData.summary || '';
    const newSummary = aiResult.summary || '';

    const oldKeywords = oldData.keywords || [];
    const newKeywords = aiResult.keywords || [];

    const oldTopics = oldData.topics || [];
    const newTopics = aiResult.topics || [];

    const keywordsDiff = diffArrays(oldKeywords, newKeywords);
    const topicsDiff = diffArrays(oldTopics, newTopics);

    if (oldSummary !== newSummary || keywordsDiff.added.length || keywordsDiff.removed.length || topicsDiff.added.length || topicsDiff.removed.length) {
      metadataChangedCount++;
      logContent += `### Perubahan Metadata: ${fileName}\n`;
      logContent += `| Field | Lama | Baru |\n| --- | --- | --- |\n`;
      logContent += `| Summary | ${oldSummary} | ${newSummary} |\n`;

      const formatArrayDiff = (oldArr, newArr) => {
        const { added, removed } = diffArrays(oldArr, newArr);
        const oldStr = oldArr.map(x => removed.includes(x) ? `~~${x}~~` : x).join(', ');
        const newStr = newArr.map(x => added.includes(x) ? `**${x}**` : x).join(', ');
        return { oldStr, newStr };
      };

      const kf = formatArrayDiff(oldKeywords, newKeywords);
      const tf = formatArrayDiff(oldTopics, newTopics);

      logContent += `| Keywords | ${kf.oldStr} | ${kf.newStr} |\n`;
      logContent += `| Topics | ${tf.oldStr} | ${tf.newStr} |\n`;

      await fs.writeFile(articlePath, JSON.stringify(aiResult, null, 2));
    }
  }

  logContent += `\nGemini API\n✅ Berhasil: ${successCount} ❌ Gagal: ${failCount}\n`;
  logContent += `Artikel dengan perubahan metadata: ${metadataChangedCount}\n`;

  await fs.writeFile(LOG_FILE, logContent);
  console.log(`ℹ️ Selesai. LogAI ditulis ke: ${LOG_FILE}`);
})();

