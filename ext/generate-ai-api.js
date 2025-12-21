// =========================================================
// ext/generate-ai-api-debug.js
// FINAL DEBUG VERSION: Rotasi Key+Model, Log Detail, Highlight Metadata
// =========================================================

import fs from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { load } from 'cheerio';
import { GoogleGenAI } from '@google/genai';

// ==================== PATH =========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const META_FILE = path.join(ROOT, 'artikel.json');
const HTML_DIR = path.join(ROOT, 'artikel');
const LLMS_FILE = path.join(ROOT, 'llms.txt');
const API_DIR = path.join(ROOT, 'api', 'v1');
const POST_DIR = path.join(API_DIR, 'post');
const MINI_DIR = path.join(ROOT, 'mini');

const today = new Date();
const LOGAI_FILE = path.join(
  MINI_DIR,
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}-LogAI.md`
);

const BASE_URL = 'https://dalam.web.id';

// ==================== LOGGER =======================
const log = {
  i: m => console.log(`ℹ️  ${m}`),
  w: m => console.warn(`⚠️ ${m}`),
  e: m => console.error(`❌ ${m}`)
};

// ==================== MODELS & KEYS =================
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
if(process.env.GEMINI_API_KEY) apiKeys.push(process.env.GEMINI_API_KEY);
for(let i=1;i<=20;i++){
  const key = process.env[`GEMINI_API_KEY${i}`];
  if(key) apiKeys.push(key);
}

const TOTAL_KEYS = apiKeys.length;
const TOTAL_MODELS = MODELS_TO_ROTATE.length;
log.i(`${TOTAL_KEYS} API key & ${TOTAL_MODELS} model siap digunakan`);

const failedKeys = new Set();
const failedModels = new Set();

const validCombinations = [];
apiKeys.forEach(key => MODELS_TO_ROTATE.forEach(model => validCombinations.push({ key, model })));

function getNextCombination(currentIndex){
  for(let i=currentIndex;i<validCombinations.length;i++){
    const {key, model} = validCombinations[i];
    if(!failedKeys.has(key) && !failedModels.has(model)){
      return { key, model, newIndex: i+1 };
    }
  }
  return { key:null, model:null, newIndex: validCombinations.length };
}

function getAIInstance(key){
  return new GoogleGenAI({ apiKey:key });
}

// ==================== CHEERIO CLEAN =================
async function extractContent(file){
  try{
    const html = await fs.readFile(path.join(HTML_DIR, file),'utf8');
    const $ = load(html);
    ['script','style','nav','footer','aside','noscript'].forEach(s => $(s).remove());
    const root = $('article').first().length ? $('article').first() : $('.container').first().length ? $('.container').first() : $('body');
    const text = root.text().replace(/\s+/g,' ').trim();
    const htmlClean = root.html()?.trim()||'';
    return { text, html: htmlClean };
  }catch(e){
    log.w(`Gagal baca HTML: ${file}`);
    return null;
  }
}

// ==================== LLMS WHITELIST =================
async function loadWhitelist(){
  try{
    const txt = await fs.readFile(LLMS_FILE,'utf8');
    return new Set([...txt.matchAll(/artikel\/(.*?)\.html/g)].map(m=>m[1]));
  }catch{
    log.w("llms.txt tidak ditemukan → semua artikel dilewati");
    return new Set();
  }
}

// ==================== AI EXTRACTION =================
async function aiExtract(text, title){
  if(!text || text.length<300) return null;
  let currentIndex = 0;
  while(currentIndex < validCombinations.length){
    const { key, model, newIndex } = getNextCombination(currentIndex);
    currentIndex = newIndex;
    if(!key || !model) break;

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

    try{
      log.i(`Coba Key #${apiKeys.indexOf(key)+1} | Model: ${model}`);
      const res = await ai.models.generateContent({
        model,
        contents:[{ role:"user", parts:[{ text:prompt }] }],
        config:{ temperature:0.2 }
      });
      const data = JSON.parse(res.text);
      log.i(`Berhasil Key#${apiKeys.indexOf(key)+1} | Model:${model}`);
      return { ...data, usedKeyIndex: apiKeys.indexOf(key)+1, usedModel:model, success:true };
    }catch(e){
      const msg = e.message.toLowerCase();
      log.w(`Error Key#${apiKeys.indexOf(key)+1} | Model:${model} → ${e.message}`);
      msg.includes('quota') ? failedKeys.add(key) : failedModels.add(model);
    }
  }
  return { success:false };
}

// ==================== UTILS =========================
function diffArray(oldArr=[], newArr=[]){
  const added = newArr.filter(x=>!oldArr.includes(x));
  const removed = oldArr.filter(x=>!newArr.includes(x));
  return { added, removed };
}

// ==================== MAIN =========================
async function generate(){
  await fs.mkdir(POST_DIR, { recursive:true });
  await fs.mkdir(MINI_DIR, { recursive:true });

  const meta = JSON.parse(await fs.readFile(META_FILE,'utf8'));
  const whitelist = await loadWhitelist();

  const index = [];
  let totalProcessed=0, totalFailed=0, totalChanged=0;
  const logEntries = [];

  for(const [category, items] of Object.entries(meta)){
    for(const [title, file, image, date, desc] of items){
      const id = file.replace('.html','');
      if(!whitelist.has(id)) continue;

      const outFile = path.join(POST_DIR, `${id}.json`);
      let cached = {};
      let cachedExists = await fs.access(outFile).then(()=>true).catch(()=>false);
      if(cachedExists) cached = JSON.parse(await fs.readFile(outFile,'utf8'));

      const content = await extractContent(file);
      if(!content){ totalFailed++; continue; }

      const ai = await aiExtract(content.text, title);

      if(!ai.success){ totalFailed++; continue; }

      const oldMeta = cached.meta||{ summary:'', keywords:[], topics:[], prompt_hint:'' };
      const newMeta = {
        summary: ai.summary || desc || '',
        keywords: ai.keywords||[],
        topics: ai.topics||[],
        prompt_hint: ai.prompt_hint||desc||''
      };

      // detect perubahan
      const summaryChanged = oldMeta.summary!==newMeta.summary;
      const keywordsDiff = diffArray(oldMeta.keywords,newMeta.keywords);
      const topicsDiff = diffArray(oldMeta.topics,newMeta.topics);
      const promptHintChanged = oldMeta.prompt_hint!==newMeta.prompt_hint;

      const anyChange = summaryChanged || keywordsDiff.added.length>0 || keywordsDiff.removed.length>0 || topicsDiff.added.length>0 || topicsDiff.removed.length>0 || promptHintChanged;
      if(anyChange) totalChanged++;

      const post = {
        id,
        slug:id,
        title,
        category,
        published_at:date,
        url:`${BASE_URL}/artikel/${file}`,
        image,
        content,
        meta:newMeta
      };

      await fs.writeFile(outFile, JSON.stringify(post,null,2));

      index.push({
        id,
        title,
        category,
        date,
        image,
        excerpt:newMeta.summary,
        endpoint:`/api/v1/post/${id}.json`
      });

      totalProcessed++;
      logEntries.push({ id, title, success:true, anyChange, summaryChanged, keywordsDiff, topicsDiff, promptHintChanged, usedKey:ai.usedKeyIndex, usedModel:ai.usedModel });
    }
  }

  index.sort((a,b)=>new Date(b.date)-new Date(a.date));
  await fs.writeFile(path.join(API_DIR,'index.json'), JSON.stringify(index,null,2));

  // ==================== GENERATE LOGAI.md =================
  let logMd = `# LogAI - Layar Kosong
Tanggal: ${today.toISOString().split('T')[0]} | Jumlah Artikel Diproses: ${totalProcessed + totalFailed}
Gemini API
✅ Berhasil: ${totalProcessed} ❌ Gagal: ${totalFailed}
Artikel dengan perubahan metadata: ${totalChanged}\n\n`;

  for(const entry of logEntries){
    logMd += `### ${entry.title} (${entry.id})\n`;
    logMd += `Key/Model: #${entry.usedKey} / ${entry.usedModel}\n`;
    if(entry.anyChange){
      logMd += '| Field | Sebelumnya | Baru |\n|---|---|---|\n';
      if(entry.summaryChanged) logMd += `| Summary | ${oldMeta.summary||''} | ${newMeta.summary||''} |\n`;
      if(entry.keywordsDiff.added.length || entry.keywordsDiff.removed.length){
        const oldK = oldMeta.keywords.map(k=>entry.keywordsDiff.removed.includes(k)? `~~${k}~~` : k).join(', ');
        const newK = newMeta.keywords.map(k=>entry.keywordsDiff.added.includes(k)? `**${k}**` : k).join(', ');
        logMd += `| Keywords | ${oldK} | ${newK} |\n`;
      }
      if(entry.topicsDiff.added.length || entry.topicsDiff.removed.length){
        const oldT = oldMeta.topics.map(k=>entry.topicsDiff.removed.includes(k)? `~~${k}~~` : k).join(', ');
        const newT = newMeta.topics.map(k=>entry.topicsDiff.added.includes(k)? `**${k}**` : k).join(', ');
        logMd += `| Topics | ${oldT} | ${newT} |\n`;
      }
      if(entry.promptHintChanged) logMd += `| Prompt Hint | ${oldMeta.prompt_hint||''} | ${newMeta.prompt_hint||''} |\n`;
      logMd += '\n';
    }
  }

  await fs.writeFile(LOGAI_FILE, logMd);
  log.i(`Selesai. LogAI ditulis ke: ${LOGAI_FILE}`);
}

generate().catch(e=>log.e(e.message));

