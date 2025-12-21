// =========================================================
// ext/generate-ai-api.js
// FINAL FULL: Node.js 20+ + glob ESM + LogAI highlight perubahan
// =========================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { glob } from 'glob';

// ================= PATH =================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const META_FILE = path.join(ROOT, 'artikel.json');
const HTML_DIR = path.join(ROOT, 'artikel');
const LLMS_FILE = path.join(ROOT, 'llms.txt');
const API_DIR = path.join(ROOT, 'api/v1');
const POST_DIR = path.join(API_DIR, 'post');
const LOG_DIR = path.join(ROOT, 'mini');
const BASE_URL = 'https://dalam.web.id';

// ================= LOGGER =================
const logLines = [];
const log = {
  i: m => { console.log(`ℹ️ ${m}`); logLines.push(`ℹ️ ${m}`); },
  w: m => { console.warn(`⚠️ ${m}`); logLines.push(`⚠️ ${m}`); },
  e: m => { console.error(`❌ ${m}`); logLines.push(`❌ ${m}`); }
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

// ================= CHEERIO CLEAN =================
async function extractContent(file) {
  try {
    const html = await fs.readFile(path.join(HTML_DIR, file), 'utf8');
    const $ = load(html);

    ['script','style','nav','footer','aside','noscript','#iposbrowser','#pesbukdiskus','.search-floating-container','#related-marquee-section'].forEach(s => $(s).remove());

    const root =
      $('article').first().length ? $('article').first()
      : $('.container').first().length ? $('.container').first()
      : $('body');

    const text = root.text().replace(/\s+/g,' ').trim();
    const htmlClean = root.html()?.trim() || '';
    return { text, html: htmlClean };
  } catch {
    log.w(`Gagal baca HTML: ${file}`);
    return null;
  }
}

// ================= AI EXTRACTION =================
async function aiExtractMeta(text, title) {
  if (!text || text.length < 300) return null;

  for (const { key, model } of combinations) {
    if (failedKeys.has(key) || failedModels.has(model)) continue;
    try {
      const ai = getAI(key);
      const prompt = `
Kembalikan JSON VALID:
{
  "summary": "maks 2 kalimat",
  "keywords": ["2-5 kata"],
  "topics": ["maks 3 topik"],
  "prompt_hint": "1-3 pertanyaan singkat"
}

Judul: ${title}
Konten:
"""${text.slice(0,8000)}"""
`;
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.2 }
      });
      return JSON.parse(res.text);
    } catch (e) {
      const msg = e.message.toLowerCase();
      msg.includes('quota') ? failedKeys.add(key) : failedModels.add(model);
    }
  }
  return null;
}

// ================= LLMS WHITELIST =================
async function loadWhitelist() {
  try {
    const txt = await fs.readFile(LLMS_FILE,'utf8');
    return new Set([...txt.matchAll(/artikel\/(.*?)\.html/g)].map(m=>m[1]));
  } catch {
    log.w("llms.txt tidak ditemukan → semua artikel dilewati");
    return new Set();
  }
}

// =================== UTILS ===================
function diffArray(oldArr=[], newArr=[]) {
  const added = newArr.filter(x => !oldArr.includes(x));
  const removed = oldArr.filter(x => !newArr.includes(x));
  return { added, removed };
}

// =================== MAIN ===================
async function generate() {
  log.i("Generate AI API (FINAL FULL) + LogAI");

  await fs.mkdir(POST_DIR, { recursive:true });
  await fs.mkdir(LOG_DIR, { recursive:true });

  const meta = JSON.parse(await fs.readFile(META_FILE,'utf8'));
  const whitelist = await loadWhitelist();
  const index = [];

  const logFileName = `${new Date().toISOString().split('T')[0]}-LogAI.md`;
  const logFilePath = path.join(LOG_DIR, logFileName);
  let logMd = `# LogAI - ${new Date().toLocaleString()}\n\n`;

  for (const [category, items] of Object.entries(meta)) {
    for (const [title, file, image, date, desc] of items) {
      const id = file.replace('.html','');
      if (!whitelist.has(id)) continue;

      const outFile = path.join(POST_DIR, `${id}.json`);

      let oldData = null;
      if (await fs.access(outFile).then(()=>true).catch(()=>false)) {
        oldData = JSON.parse(await fs.readFile(outFile,'utf8'));
      }

      const content = await extractContent(file);
      if (!content) continue;

      let aiMeta = await aiExtractMeta(content.text, title);

      const summary = aiMeta?.summary || desc || (oldData?.meta.summary || '');
      const prompt_hint = aiMeta?.prompt_hint || (oldData?.meta.prompt_hint || desc || '');
      const keywords = aiMeta?.keywords || oldData?.meta.keywords || [];
      const topics = aiMeta?.topics || oldData?.meta.topics || [];

      const post = {
        id,
        slug: id,
        title,
        category,
        published_at: date,
        url: `${BASE_URL}/artikel/${file}`,
        image,
        content,
        meta: { summary, prompt_hint, keywords, topics }
      };

      await fs.writeFile(outFile, JSON.stringify(post,null,2));

      index.push({
        id,
        title,
        category,
        date,
        image,
        excerpt: summary,
        endpoint: `/api/v1/post/${id}.json`
      });

      // ===== Log Markdown per artikel =====
      if (oldData) {
        const kwDiff = diffArray(oldData.meta.keywords, keywords);
        const tpDiff = diffArray(oldData.meta.topics, topics);
        const sumChanged = summary !== oldData.meta.summary;
        const hintChanged = prompt_hint !== oldData.meta.prompt_hint;

        if(sumChanged || hintChanged || kwDiff.added.length || kwDiff.removed.length || tpDiff.added.length || tpDiff.removed.length) {
          logMd += `## ${title} (${id})\n\n`;
          if(sumChanged) logMd += `- Summary updated: "${oldData.meta.summary}" → "${summary}"\n`;
          if(hintChanged) logMd += `- Prompt_hint updated: "${oldData.meta.prompt_hint}" → "${prompt_hint}"\n`;

          // Tabel Keywords
          logMd += `| Keywords Sebelumnya | Keywords Sekarang |\n| --- | --- |\n`;
          const maxKW = Math.max(oldData.meta.keywords.length, keywords.length);
          for(let i=0;i<maxKW;i++){
            const oldKW = oldData.meta.keywords[i] || '';
            const newKW = keywords[i] || '';
            const oldStr = kwDiff.removed.includes(oldKW) ? `~~${oldKW}~~` : oldKW;
            const newStr = kwDiff.added.includes(newKW) ? `**${newKW}**` : newKW;
            logMd += `| ${oldStr} | ${newStr} |\n`;
          }

          // Tabel Topics
          logMd += `\n| Topics Sebelumnya | Topics Sekarang |\n| --- | --- |\n`;
          const maxTP = Math.max(oldData.meta.topics.length, topics.length);
          for(let i=0;i<maxTP;i++){
            const oldTP = oldData.meta.topics[i] || '';
            const newTP = topics[i] || '';
            const oldStr = tpDiff.removed.includes(oldTP) ? `~~${oldTP}~~` : oldTP;
            const newStr = tpDiff.added.includes(newTP) ? `**${newTP}**` : newTP;
            logMd += `| ${oldStr} | ${newStr} |\n`;
          }

          logMd += `\n`;
        }
      }
    }
  }

  // ==================== Write Index JSON ====================
  index.sort((a,b)=>new Date(b.date)-new Date(a.date));
  await fs.writeFile(path.join(API_DIR,'index.json'), JSON.stringify(index,null,2));

  // ==================== Write Log Markdown ====================
  await fs.writeFile(logFilePath, logMd);
  log.i(`Selesai. Index: ${index.length} artikel, LogAI: ${logFilePath}`);
}

// ==================== RUN SCRIPT ====================
generate().catch(e=>{
  log.e(e.message);
  process.exit(1);
});

