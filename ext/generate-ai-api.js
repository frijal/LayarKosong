// =========================================================
// SCRIPT DEBUG: ext/generate-ai-api-debug.js
// Refactor + Rotasi + Logging lengkap ke LogAI.md
// =========================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath as fpath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname,'..');

const META_FILE = path.join(ROOT,'artikel.json');
const HTML_DIR = path.join(ROOT,'artikel');
const LLMS_FILE = path.join(ROOT,'llms.txt');
const API_DIR = path.join(ROOT,'api','v1');
const POST_DIR = path.join(API_DIR,'post');
const MINI_DIR = path.join(ROOT,'mini');

const BASE_URL = 'https://dalam.web.id';
const DATE_NOW = new Date().toISOString().split('T')[0];
const LOG_FILE = path.join(MINI_DIR, `${DATE_NOW}-LogAI.md`);

await fs.mkdir(MINI_DIR,{recursive:true});
await fs.mkdir(POST_DIR,{recursive:true});

const logMsgs = [];

function log(msg){ 
  console.log(msg);
  logMsgs.push(msg.replace(/`/g,'')); 
}

// ================= MODELS & KEYS =================
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash-tts",
  "gemini-robotics-er-1.5-preview",
  "gemma-3-12b",
  "gemma-3-1b",
  "gemma-3-27b",
  "gemma-3-2b",
  "gemma-3-4b",
  "gemini-2.5-flash-native-audio-dialog"
];

const apiKeys = [];
if (process.env.GEMINI_API_KEY) apiKeys.push(process.env.GEMINI_API_KEY);
for(let i=1;i<=20;i++){
  const k = process.env[`GEMINI_API_KEY${i}`];
  if(k) apiKeys.push(k);
}

if(apiKeys.length===0) log("⚠️ Tidak ada GEMINI_API_KEY, AI dimatikan.");
log(`ℹ️ ${apiKeys.length} Key dimuat, ${MODELS.length} Model siap.`);

const failedKeys = new Set();
const failedModels = new Set();

// Precompute kombinasi sehat
const validCombinations = [];
apiKeys.forEach(key => MODELS.forEach(model => validCombinations.push({key,model})));

function getNextCombination(currentIndex){
  for(let i=currentIndex;i<validCombinations.length;i++){
    const {key,model} = validCombinations[i];
    if(!failedKeys.has(key) && !failedModels.has(model)){
      return {key,model,newIndex:i+1};
    }
  }
  return {key:null,model:null,newIndex:validCombinations.length};
}

function getAIInstance(key){
  return new GoogleGenAI({apiKey:key});
}

// =================== CHEERIO ====================
async function extractContent(file){
  try{
    const html = await fs.readFile(path.join(HTML_DIR,file),'utf8');
    const $ = load(html);
    ['script','style','footer','#iposbrowser','#pesbukdiskus','.search-floating-container','#related-marquee-section'].forEach(sel=>$(sel).remove());
    let text = $('.container').first().text() || $('.main').first().text() || $('body').text();
    text = text.replace(/\s+/g,' ').trim();
    return text;
  }catch(e){
    log(`⚠️ Gagal baca ${file}: ${e.message}`);
    return null;
  }
}

// =================== LLMS WHITELIST ====================
async function getWhitelist(){
  try{
    const txt = await fs.readFile(LLMS_FILE,'utf8');
    return new Set([...txt.matchAll(/artikel\/(.*?)\.html/g)].map(m=>m[1]));
  }catch{
    log("⚠️ llms.txt tidak ditemukan → semua artikel dilewati");
    return new Set();
  }
}

// =================== AI EXTRACT ====================
async function aiExtract(text,title){
  if(!text || text.length<300) return null;
  let currentIndex = 0;
  while(currentIndex<validCombinations.length){
    const {key,model,newIndex} = getNextCombination(currentIndex);
    currentIndex = newIndex;
    if(!key || !model) break;
    log(`🔄 Mencoba Key #${apiKeys.indexOf(key)+1}, Model: ${model}`);

    const ai = getAIInstance(key);
    const prompt = `
JSON VALID:
{
"summary":"maks 2 kalimat",
"keywords":["2-5 kata"],
"topics":["maks 3 topik"],
"prompt_hint":"1-3 pertanyaan singkat"
}

Judul: ${title}
Konten:
"""${text.slice(0,8000)}"""
`;
    try{
      const res = await ai.models.generateContent({
        model,
        contents:[{role:"user",parts:[{text:prompt}]}],
        config:{temperature:0.2}
      });
      const parsed = JSON.parse(res.text);
      log(`✅ Key berhasil: ${key}, Model: ${model}`);
      return parsed;
    }catch(e){
      const msg = e.message.toLowerCase();
      log(`❌ Error Key ${key}, Model ${model}: ${e.message}`);
      if(msg.includes("quota")||msg.includes("429")) failedKeys.add(key);
      else failedModels.add(model);
    }
  }
  return null;
}

// =================== LOAD META ====================
const rawMeta = JSON.parse(await fs.readFile(META_FILE,'utf8'));
const whitelist = await getWhitelist();

const summaryPosts = [];
let processedCount = 0, failedCount = 0;

for(const [category,items] of Object.entries(rawMeta)){
  for(const [title,file,image,date,summary] of items){
    const id = file.replace('.html','');
    if(!whitelist.has(id)) continue;

    const outFile = path.join(POST_DIR,`${id}.json`);
    let oldData = existsSync(outFile)?JSON.parse(await fs.readFile(outFile,'utf8')):null;
    const content = await extractContent(file);
    if(!content){failedCount++; continue;}

    const ai = await aiExtract(content,title);

    let newSummary = ai?.summary || summary || '';
    let newKeywords = ai?.keywords || oldData?.meta?.keywords || [];
    let newTopics = ai?.topics || oldData?.meta?.topics || [];
    let promptHint = ai?.prompt_hint || oldData?.meta?.prompt_hint || '';

    const post = {
      id,slug:id,title,category,published_at:date,url:`${BASE_URL}/artikel/${file}`,image,content,
      meta:{summary:newSummary,keywords:newKeywords,topics:newTopics,prompt_hint:promptHint}
    };

    await fs.writeFile(outFile,JSON.stringify(post,null,2));
    summaryPosts.push({id,title,category,date,summary:newSummary});

    processedCount++;
  }
}

// =================== TULIS LOGAI.md ====================
const lines = [];
lines.push(`# LogAI - Layar Kosong`);
lines.push(`Tanggal: ${DATE_NOW} Jumlah Artikel Diproses: ${processedCount+failedCount}`);
lines.push(`Gemini API`);
lines.push(`✅ Berhasil: ${processedCount} ❌ Gagal: ${failedCount}`);
lines.push('');

await fs.writeFile(LOG_FILE,lines.join('\n'));
log(`ℹ️ LogAI disimpan di ${LOG_FILE}`);


