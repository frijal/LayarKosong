// =========================================================
// SCRIPT: ext/generate-ai-api.js
// FINAL UPDATE - Node.js 20+ & glob ESM kompatibel
// =========================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { glob } from 'glob';

// ==================== PATH ====================
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

// ==================== LOGGER ====================
const log = {
  i: m => console.log(`ℹ️  ${m}`),
  w: m => console.warn(`⚠️  ${m}`),
  e: m => console.error(`❌ ${m}`)
};

// ==================== MODELS & KEYS ====================
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

// ==================== CHEERIO CLEAN ====================
async function extractContent(file) {
  try {
    const html = await fs.readFile(path.join(HTML_DIR, file), 'utf8');
    const $ = load(html);
    ['script','style','nav','footer','aside','noscript'].forEach(s => $(s).remove());

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

// ==================== AI EXTRACTION ====================
async function aiExtract(text, title) {
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
      if (msg.includes('quota') || msg.includes('429')) failedKeys.add(key);
      else failedModels.add(model);
    }
  }
  return null;
}

// ==================== LLMS WHITELIST ====================
async function loadWhitelist() {
  try {
    const txt = await fs.readFile(LLMS_FILE,'utf8');
    return new Set([...txt.matchAll(/artikel\/(.*?)\.html/g)].map(m=>m[1]));
  } catch {
    log.w("llms.txt tidak ditemukan → semua artikel dilewati");
    return new Set();
  }
}

// ==================== LOG GENERATOR ====================
function generateLogMarkdown(dateStr, processedCount, apiSuccess, apiFail, articleChanges) {
  let md = `# LogAI - Layar Kosong\n\n`;
  md += `**Tanggal:** ${dateStr}\n`;
  md += `**Jumlah Artikel Diproses:** ${processedCount}\n\n`;

  md += `## Gemini API\n`;
  md += `✅ Berhasil: ${apiSuccess}\n`;
  md += `❌ Gagal: ${apiFail}\n\n`;

  if (articleChanges.length === 0) {
    md += "Tidak ada perubahan metadata.\n";
    return md;
  }

  md += `## Perubahan Metadata Artikel\n\n`;

  for (const a of articleChanges) {
    md += `### ${a.title} (${a.id})\n`;
    md += `| Field | Sebelumnya | Baru |\n`;
    md += `|-------|-----------|-----|\n`;

    for (const field of ['summary','prompt_hint']) {
      if (a.old[field] !== a.new[field]) {
        md += `| ${field} | ${a.old[field]||'-'} | ${a.new[field]||'-'} |\n`;
      }
    }

    for (const field of ['keywords','topics']) {
      const oldArr = a.old[field] || [];
      const newArr = a.new[field] || [];

      const merged = Array.from(new Set([...oldArr, ...newArr]));
      const displayOld = merged.map(v => oldArr.includes(v)?v:`~~${v}~~`).join(', ');
      const displayNew = merged.map(v => newArr.includes(v)?`**${v}**`:`~~${v}~~`).join(', ');

      md += `| ${field} | ${displayOld || '-'} | ${displayNew || '-'} |\n`;
    }

    md += '\n';
  }

  return md;
}

// ==================== MAIN ====================
async function generate() {
  await fs.mkdir(POST_DIR, { recursive:true });
  await fs.mkdir(LOG_DIR, { recursive:true });

  const meta = JSON.parse(await fs.readFile(META_FILE,'utf8'));
  const whitelist = await loadWhitelist();
  const index = [];

  let processedCount = 0;
  let apiSuccess = 0;
  let apiFail = 0;
  const articleChanges = [];

  const dateStr = new Date().toISOString().slice(0,10);
  const logFilePath = path.join(LOG_DIR, `${dateStr}-LogAI.md`);

  // Loop semua artikel
  for (const [category, items] of Object.entries(meta)) {
    for (const [title, file, image, date, desc] of items) {
      const id = file.replace('.html','');
      if (!whitelist.has(id)) continue;

      const outFile = path.join(POST_DIR, `${id}.json`);

      let oldData = {};
      if (await fs.access(outFile).then(()=>true).catch(()=>false)) {
        oldData = JSON.parse(await fs.readFile(outFile,'utf8'));
      }

      const content = await extractContent(file);
      if (!content) continue;

      let aiData = null;
      if (apiKeys.length) {
        try {
          aiData = await aiExtract(content.text, title);
          if (aiData) apiSuccess++; else apiFail++;
        } catch { apiFail++; }
      }

      const newData = {
        id,
        slug: id,
        title,
        category,
        published_at: date,
        url: `${BASE_URL}/artikel/${file}`,
        image,
        content,
        meta: {
          summary: aiData?.summary || desc || oldData.meta?.summary || '',
          keywords: aiData?.keywords || oldData.meta?.keywords || [],
          topics: aiData?.topics || oldData.meta?.topics || [],
          prompt_hint: aiData?.prompt_hint || oldData.meta?.prompt_hint || desc || ''
        }
      };

      // Catat perubahan
      const changes = {
        id, title,
        old: {
          summary: oldData.meta?.summary || '',
          keywords: oldData.meta?.keywords || [],
          topics: oldData.meta?.topics || [],
          prompt_hint: oldData.meta?.prompt_hint || ''
        },
        new: newData.meta
      };
      if (JSON.stringify(changes.old) !== JSON.stringify(changes.new)) articleChanges.push(changes);

      await fs.writeFile(outFile, JSON.stringify(newData,null,2));

      index.push({
        id,
        title,
        category,
        date,
        image,
        excerpt: newData.meta.summary,
        endpoint: `/api/v1/post/${id}.json`
      });

      processedCount++;
    }
  }

  index.sort((a,b)=>new Date(b.date)-new Date(a.date));
  await fs.writeFile(path.join(API_DIR,'index.json'), JSON.stringify(index,null,2));

  // Generate log
  const md = generateLogMarkdown(dateStr, processedCount, apiSuccess, apiFail, articleChanges);
  await fs.writeFile(logFilePath, md, 'utf8');

  log.i(`✅ Selesai. Index: ${index.length} artikel, LogAI: ${logFilePath}`);
}

// ==================== RUN ====================
generate().catch(e=>{
  log.e(e.message);
  process.exit(1);
});

