// =========================================================
// ext/generate-ai-api.js
// Refactor: Hybrid Content Intelligence API Generator
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

/* ================= LOGGER ================= */
const log = {
  i: m => console.log(`ℹ️  ${m}`),
  w: m => console.warn(`⚠️  ${m}`),
  e: m => console.error(`❌ ${m}`)
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

/* ================= AI EXTRACTION ================= */
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
  "keywords": ["5-10 kata"],
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

/* ================= MAIN ================= */
async function generate() {
  log.i("Generate AI API (Hybrid)");

  await fs.mkdir(POST_DIR, { recursive:true });

  const meta = JSON.parse(await fs.readFile(META_FILE,'utf8'));
  const whitelist = await loadWhitelist();
  const index = [];

  for (const [category, items] of Object.entries(meta)) {
    for (const [title, file, image, date, desc] of items) {
      const id = file.replace('.html','');
      if (!whitelist.has(id)) continue;

      const outFile = path.join(POST_DIR, `${id}.json`);
      if (await fs.access(outFile).then(()=>true).catch(()=>false)) {
        const cached = JSON.parse(await fs.readFile(outFile,'utf8'));
        index.push({
          id,
          title,
          category,
          date,
          image,
          excerpt: cached.meta.summary,
          endpoint: `/api/v1/post/${id}.json`
        });
        continue;
      }

      const content = await extractContent(file);
      if (!content) continue;

      const ai = apiKeys.length ? await aiExtract(content.text, title) : null;

      const post = {
        id,
        slug: id,
        title,
        category,
        published_at: date,
        url: `${BASE_URL}/artikel/${file}`,
        image,
        content,
        meta: {
          summary: ai?.summary || desc || '',
          keywords: ai?.keywords || [],
          topics: ai?.topics || [],
          prompt_hint: ai?.prompt_hint || desc || ''
        }
      };

      await fs.writeFile(outFile, JSON.stringify(post,null,2));
      index.push({
        id,
        title,
        category,
        date,
        image,
        excerpt: post.meta.summary,
        endpoint: `/api/v1/post/${id}.json`
      });
    }
  }

  index.sort((a,b)=>new Date(b.date)-new Date(a.date));
  await fs.writeFile(path.join(API_DIR,'index.json'), JSON.stringify(index,null,2));

  log.i(`Selesai. Index: ${index.length} artikel`);
}

/* ================= RUN ================= */
generate().catch(e=>{
  log.e(e.message);
  process.exit(1);
});

