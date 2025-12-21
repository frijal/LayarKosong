// ext/generate-ai-api.js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai'; // ganti sesuai library
import glob from 'glob';

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

// ==================== UTILS ====================
const sanitizeJSON = (str) => {
  try { return JSON.parse(str); } 
  catch {
    const cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }
};

const diffArrays = (oldArr = [], newArr = []) => {
  const added = newArr.filter(x => !oldArr.includes(x));
  const removed = oldArr.filter(x => !newArr.includes(x));
  return { added, removed };
};

// ==================== LOG ====================
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

// ==================== ROTASI & Fallback ====================
const failedCombinations = new Set(); // combo gagal sebelumnya

for (const articlePath of allArticles) {
  const fileName = path.basename(articlePath);
  const oldData = JSON.parse(await fs.readFile(articlePath, 'utf-8'));

  let aiResult = null;
  let attempted = false;

  for (const model of MODELS) {
    for (const key of apiKeys) {
      const comboKey = `${key}|${model}`;
      if (failedCombinations.has(comboKey)) continue; // skip kombinasi gagal sebelumnya

      attempted = true;
      try {
        logContent += `ℹ️ Coba Key | Model: ${comboKey} → ${fileName}\n`;
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.generate({ prompt: oldData.prompt_hint || '', model });
        aiResult = sanitizeJSON(response);
        successCount++;
        break; // berhasil, keluar loop kombinasi
      } catch (err) {
        logContent += `⚠️ Key | Model: ${comboKey} → ${err.message}\n`;
        failedCombinations.add(comboKey); // tandai kombinasi gagal
      }
    }
    if (aiResult) break;
  }

  if (!aiResult) {
    failCount++;
    logContent += `❌ Gagal memproses artikel: ${fileName}\n\n`;
    continue;
  }

  // ==================== Periksa perubahan metadata ====================
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

    // update JSON
    await fs.writeFile(articlePath, JSON.stringify(aiResult, null, 2));
  }
}

logContent += `\nGemini API\n✅ Berhasil: ${successCount} ❌ Gagal: ${failCount}\n`;
logContent += `Artikel dengan perubahan metadata: ${metadataChangedCount}\n`;

await fs.writeFile(LOG_FILE, logContent);
console.log(`ℹ️ Selesai. LogAI ditulis ke: ${LOG_FILE}`);

