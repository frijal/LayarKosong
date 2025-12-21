// =========================================================
// ext/generate-ai-api.js
// Hybrid AI API Generator + Full Metadata Update + Markdown Log + Bold + Strikethrough untuk Perubahan
// =========================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { GoogleGenAI } from '@google/genai';

/* ================= PATH ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const META_FILE = path.join(ROOT, 'artikel.json');
const HTML_DIR = path.join(ROOT, 'artikel');
const LLMS_FILE = path.join(ROOT, 'llms.txt');
const API_DIR = path.join(ROOT, 'api/v1');
const POST_DIR = path.join(API_DIR, 'post');
const BASE_URL = 'https://dalam.web.id';
const LOG_DIR = path.join(ROOT, 'mini');
const LOG_FILE = path.join(LOG_DIR, `${new Date().toISOString().slice(0,10)}-LogAI.md`);

/* ================= LOGGER ================= */
const logBuffer = [];
const log = {
  i: m => { console.log(`ℹ️  ${m}`); logBuffer.push(`ℹ️  ${m}`); },
  w: m => { console.warn(`⚠️  ${m}`); logBuffer.push(`⚠️  ${m}`); },
  e: m => { console.error(`❌ ${m}`); logBuffer.push(`❌ ${m}`); }
};

/* ================= MODELS & KEYS ================= */
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
apiKeys.forEach(key =>
  MODELS.forEach(model => combinations.push({ key, model }))
);

function getAI(key) {
  return new GoogleGenAI({ apiKey: key });
}

/* ================= CHEERIO CLEAN ================= */
async function extractContent(file) {
  try {
    const html = await fs.readFile(path.join(HTML_DIR, file), 'utf8');
    const $ = load(html);

    ['script','style','nav','footer','aside','noscript','#iposbrowser','#pesbukdiskus','.search-floating-container','#related-marquee-section']
      .forEach(s => $(s).remove());

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

/* ================= AI EXTRACTION ================= */
async function aiExtractMetadata(text, title) {
  if (!text || text.length < 300) return null;

  for (const { key, model } of combinations) {
    if (failedKeys.has(key) || failedModels.has(model)) continue;

    try {
      const ai = getAI(key);
      const prompt = `
Kembalikan JSON VALID:

{
  "keywords": ["5-10 kata kunci"],
  "topics": ["maks 5 topik"],
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
      log.w(`AI gagal untuk ${title} dengan model ${model} | ${e.message}`);
    }
  }
  return null;
}

/* ================= LLMS WHITELIST ================= */
async function loadWhitelist() {
  try {
    const txt = await fs.readFile(LLMS_FILE,'utf8');
    return new Set([...txt.matchAll(/artikel\/(.*?)\.html/g)].map(m=>m[1]));
  } catch {
    log.w("llms.txt tidak ditemukan → semua artikel dilewati");
    return new Set();
  }
}

/* ================= HIGHLIGHT FUNCTION ================= */
function diffHighlight(oldArr=[], newArr=[]) {
  const oldSet = new Set(oldArr);
  const newSet = new Set(newArr);

  const allKeys = Array.from(new Set([...oldArr, ...newArr]));

  return allKeys.map(k => {
    if (!oldSet.has(k) && newSet.has(k)) return `**${k}**`; // baru
    if (oldSet.has(k) && !newSet.has(k)) return `~~${k}~~`;   // dihapus
    return k; // tidak berubah
  });
}

/* ================= MAIN ================= */
async function generate() {
  log.i("Generate AI API (Hybrid + Metadata Update + Markdown Log + Bold & Strikethrough)");

  await fs.mkdir(POST_DIR, { recursive:true });
  await fs.mkdir(LOG_DIR, { recursive:true });

  const meta = JSON.parse(await fs.readFile(META_FILE,'utf8'));
  const whitelist = await loadWhitelist();
  const index = [];

  let stats = { newArticles:0, updatedCache:0, skipWhitelist:0, failedAI:0, total:0 };
  const changedArticles = [];

  for (const [category, items] of Object.entries(meta)) {
    for (const [title, file, image, date, desc] of items) {
      const id = file.replace('.html','');
      stats.total++;

      if (!whitelist.has(id)) {
        stats.skipWhitelist++;
        log.i(`Skip whitelist: ${title}`);
        continue;
      }

      const outFile = path.join(POST_DIR, `${id}.json`);
      let cached = null;
      let isNewArticle = false;

      if (await fs.access(outFile).then(()=>true).catch(()=>false)) {
        try { cached = JSON.parse(await fs.readFile(outFile,'utf8')); }
        catch { log.w(`Cache corrupt: ${id}, akan regenerate metadata.`); cached = null; }
      } else { isNewArticle = true; }

      const content = await extractContent(file);
      if (!content) continue;

      let ai = null;
      const needsMetadataUpdate = apiKeys.length && (!cached?.meta?.keywords || !cached?.meta?.topics || !cached?.meta?.prompt_hint);
      if (needsMetadataUpdate) {
        ai = await aiExtractMetadata(content.text, title);
        if (!ai) stats.failedAI++;
      }

      const post = {
        id, slug:id, title, category, published_at:date, url:`${BASE_URL}/artikel/${file}`, image, content,
        meta: {
          summary: cached?.meta?.summary || desc || '',
          keywords: diffHighlight(cached?.meta?.keywords || [], ai?.keywords || cached?.meta?.keywords || []),
          topics: diffHighlight(cached?.meta?.topics || [], ai?.topics || cached?.meta?.topics || []),
          prompt_hint: ai?.prompt_hint || cached?.meta?.prompt_hint || desc || ''
        }
      };

      await fs.writeFile(outFile, JSON.stringify(post,null,2));

      // ================= HIGHLIGHT CHANGES =================
      if (!isNewArticle && ai) {
        const tableRow = (field, before, after) => {
          const emoji = before.length === 0 ? '🟢' : '🟡';
          return `| ${title} | ${field} | ${before.length ? JSON.stringify(before) : 'EMPTY'} | ${after.length ? JSON.stringify(after) : 'EMPTY'} | ${emoji}`;
        };

        const oldKeywords = cached?.meta?.keywords || [];
        const newKeywords = post.meta.keywords;
        if (JSON.stringify(oldKeywords) !== JSON.stringify(newKeywords)) changedArticles.push(tableRow('keywords', oldKeywords, newKeywords));

        const oldTopics = cached?.meta?.topics || [];
        const newTopics = post.meta.topics;
        if (JSON.stringify(oldTopics) !== JSON.stringify(newTopics)) changedArticles.push(tableRow('topics', oldTopics, newTopics));

        if ((ai.prompt_hint || '') !== (cached?.meta?.prompt_hint || '')) changedArticles.push(tableRow('prompt_hint', cached?.meta?.prompt_hint || '', ai.prompt_hint || ''));

        stats.updatedCache++;
      }

      if (isNewArticle) stats.newArticles++;

      index.push({
        id, title, category, date, image, excerpt: post.meta.summary, endpoint: `/api/v1/post/${id}.json`
      });
    }
  }

  index.sort((a,b)=>new Date(b.date)-new Date(a.date));
  await fs.writeFile(path.join(API_DIR,'index.json'), JSON.stringify(index,null,2));

  // ================= WRITE LOG MD =================
  const tableHeader = '| Artikel | Field | Sebelumnya | Sesudah | Status |\n|---|---|---|---|---|';
  const tableContent = changedArticles.length ? [tableHeader, ...changedArticles].join('\n') : 'Tidak ada metadata lama yang berubah.';

  const mdLog = [
    `# AI API Generation Log - ${new Date().toISOString()}`,
    `**Total artikel diproses:** ${stats.total}`,
    `- Baru dibuat: ${stats.newArticles}`,
    `- Cache lama di-update (metadata AI): ${stats.updatedCache}`,
    `- Skip whitelist: ${stats.skipWhitelist}`,
    `- Gagal AI: ${stats.failedAI}`,
    '',
    '## Metadata Update Review',
    tableContent,
    '',
    '---',
    '',
    logBuffer.join('\n')
  ].join('\n');

  await fs.writeFile(LOG_FILE, mdLog);
  log.i(`Log disimpan di: ${LOG_FILE}`);
  log.i(`Proses selesai. Index: ${index.length} artikel`);
}

/* ================= RUN ================= */
generate().catch(e=>{ log.e(e.message); process.exit(1); });

