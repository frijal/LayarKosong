// =========================================================
// ext/generate-ai-api.js
// Final Node.js Version - Gemini API with Debug & Metadata Highlight
// =========================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const META_FILE = path.join(ROOT, 'artikel.json');
const HTML_DIR = path.join(ROOT, 'artikel');
const LLMS_FILE = path.join(ROOT, 'llms.txt');
const API_DIR = path.join(ROOT, 'api', 'v1');
const POST_DIR = path.join(API_DIR, 'post');
const MINI_DIR = path.join(ROOT,'mini');
const BASE_URL = 'https://dalam.web.id';

const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const LOGAI_FILE = path.join(MINI_DIR, `${todayStr}-LogAI.md`);

const log = {
  i: m => console.log(`ℹ️  ${m}`),
  w: m => console.warn(`⚠️  ${m}`),
  e: m => console.error(`❌ ${m}`)
};

const MODELS_TO_ROTATE = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-robotics-er-1.5-preview"
];

const apiKeys = [];
if (process.env.GEMINI_API_KEY) apiKeys.push(process.env.GEMINI_API_KEY);
for (let i=1;i<=20;i++){
  const key = process.env[`GEMINI_API_KEY${i}`];
  if (key) apiKeys.push(key);
}

const TOTAL_KEYS = apiKeys.length;
const TOTAL_MODELS = MODELS_TO_ROTATE.length;
const failedKeys = new Set();
const failedModels = new Set();

const validCombinations = [];
apiKeys.forEach(key => MODELS_TO_ROTATE.forEach(model => validCombinations.push({key,model})));

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

// ==================== CHEERIO CONTENT CLEANING ==========
async function extractCleanContent(file){
  try{
    const html = await fs.readFile(path.join(HTML_DIR,file),'utf8');
    const $ = load(html);
    ['script','style','footer','nav','aside','noscript'].forEach(s=>$(s).remove());
    const root = $('article').first().length ? $('article').first() :
                 $('.container').first().length ? $('.container').first() : $('body');
    const text = root.text().replace(/\s+/g,' ').trim();
    return text;
  }catch(e){
    log.w(`Gagal baca HTML: ${file}`);
    return null;
  }
}

// ==================== LLMS WHITELIST ====================
async function loadWhitelist(){
  try{
    const txt = await fs.readFile(LLMS_FILE,'utf8');
    return new Set([...txt.matchAll(/artikel\/(.*?)\.html/g)].map(m=>m[1]));
  }catch{
    log.w("llms.txt tidak ditemukan → semua artikel dilewati");
    return new Set();
  }
}

// ==================== UTILITY CLEAN JSON ====================
function cleanJsonString(rawText){
  if(!rawText) return null;
  let cleaned = rawText.replace(/^```json\s*/i,'').replace(/```$/i,'').trim();
  return cleaned;
}

// ==================== AI GENERATION ====================
async function generateMetadata(content,title){
  if(!content || content.length<300) return null;
  let currentIndex = 0;
  while(currentIndex<validCombinations.length){
    const {key,model,newIndex} = getNextCombination(currentIndex);
    currentIndex = newIndex;
    if(!key||!model) break;
    const ai = getAIInstance(key);
    const prompt = `
Kembalikan JSON VALID:
{
"summary":"maks 2 kalimat",
"keywords":["1-5 kata"],
"topics":["maks 3 topik"],
"prompt_hint":"1-3 pertanyaan singkat"
}
Judul: ${title}
Konten: """${content.slice(0,8000)}"""
`;
    try{
      log.i(`Coba Key #${apiKeys.indexOf(key)+1} | Model: ${model}`);
      const res = await ai.models.generateContent({
        model,
        contents:[{role:"user",parts:[{text:prompt}]}],
        config:{temperature:0.2}
      });
      const cleaned = cleanJsonString(res.text);
      const data = JSON.parse(cleaned);
      return {data,key,model};
    }catch(e){
      const msg = e.message.toLowerCase();
      if(msg.includes('quota') || msg.includes('429') || msg.includes('resource exhausted')){
        failedKeys.add(key);
        log.w(`Key #${apiKeys.indexOf(key)+1} di-blacklist karena quota`);
      }else{
        failedModels.add(model);
        log.w(`Model ${model} di-blacklist karena error`);
      }
    }
  }
  return null;
}

// ==================== HIGHLIGHT PERBEDAAN ====================
function highlightChanges(oldMeta,newMeta){
  const highlight = {};
  // summary
  highlight.summary = oldMeta.summary !== newMeta.summary ? `**${newMeta.summary}**` : newMeta.summary;
  // keywords
  const oldKeys = oldMeta.keywords||[];
  const newKeys = newMeta.keywords||[];
  const addedKeys = newKeys.filter(k=>!oldKeys.includes(k));
  const removedKeys = oldKeys.filter(k=>!newKeys.includes(k));
  highlight.keywords = [...newKeys.map(k=>addedKeys.includes(k)?`**${k}**`:removedKeys.includes(k)?`~~${k}~~`:k)];
  // topics
  const oldTopics = oldMeta.topics||[];
  const newTopics = newMeta.topics||[];
  const addedTopics = newTopics.filter(t=>!oldTopics.includes(t));
  const removedTopics = oldTopics.filter(t=>!newTopics.includes(t));
  highlight.topics = [...newTopics.map(t=>addedTopics.includes(t)?`**${t}**`:removedTopics.includes(t)?`~~${t}~~`:t)];
  return highlight;
}

// ==================== MAIN ====================
async function generate(){
  await fs.mkdir(POST_DIR,{recursive:true});
  await fs.mkdir(MINI_DIR,{recursive:true});
  const meta = JSON.parse(await fs.readFile(META_FILE,'utf8'));
  const whitelist = await loadWhitelist();
  const index = [];
  let logLines = [`# LogAI - Layar Kosong`,`Tanggal: ${todayStr}`];

  let processed = 0, failed = 0, changedMeta = 0;

  for(const [category,items] of Object.entries(meta)){
    for(const [title,file,image,date,desc] of items){
      const id = file.replace('.html','');
      if(!whitelist.has(id)) continue;
      const outFile = path.join(POST_DIR,`${id}.json`);
      let oldData = null;
      if(await fs.access(outFile).then(()=>true).catch(()=>false)){
        oldData = JSON.parse(await fs.readFile(outFile,'utf8'));
      }
      const content = await extractCleanContent(file);
      if(!content){
        failed++; logLines.push(`❌ ${title} (${id}) → Gagal baca konten`); continue;
      }
      const aiRes = await generateMetadata(content,title);
      if(!aiRes){
        failed++; logLines.push(`❌ ${title} (${id}) → Semua key/model gagal`); continue;
      }
      const {data,key,model} = aiRes;
      processed++;
      logLines.push(`✅ ${title} (${id}) → Key#${apiKeys.indexOf(key)+1} | Model:${model}`);
      const newPost = {
        id, slug:id, title, category, published_at:date,
        url:`${BASE_URL}/artikel/${file}`, image, content,
        meta:{
          summary:data.summary||desc||'',
          keywords:data.keywords||[],
          topics:data.topics||[],
          prompt_hint:data.prompt_hint||desc||''
        }
      };
      await fs.writeFile(outFile,JSON.stringify(newPost,null,2));

      // Highlight perubahan metadata
      if(oldData){
        const changes = highlightChanges(oldData.meta,newPost.meta);
        if(changes.summary!==newPost.meta.summary || 
           JSON.stringify(changes.keywords)!==JSON.stringify(newPost.meta.keywords) || 
           JSON.stringify(changes.topics)!==JSON.stringify(newPost.meta.topics)){
          changedMeta++;
          logLines.push(`### Perubahan Metadata: ${title} (${id})`);
          logLines.push('| Field | Lama | Baru |');
          logLines.push('|-------|-----|-----|');
          logLines.push(`| Summary | ${oldData.meta.summary} | ${changes.summary} |`);
          logLines.push(`| Keywords | ${oldData.meta.keywords.join(', ')} | ${changes.keywords.join(', ')} |`);
          logLines.push(`| Topics | ${oldData.meta.topics.join(', ')} | ${changes.topics.join(', ')} |`);
        }
      }

      index.push({
        id,title,category,date,image,
        excerpt:newPost.meta.summary,
        endpoint:`/api/v1/post/${id}.json`
      });
    }
  }

  index.sort((a,b)=>new Date(b.date)-new Date(a.date));
  await fs.writeFile(path.join(API_DIR,'index.json'),JSON.stringify(index,null,2));

  logLines.unshift(`Jumlah Artikel Diproses: ${processed}`);
  logLines.unshift(`Gemini API\n✅ Berhasil: ${processed} ❌ Gagal: ${failed}\nArtikel dengan perubahan metadata: ${changedMeta}\n`);
  await fs.writeFile(LOGAI_FILE,logLines.join('\n'));

  log.i(`Selesai. LogAI ditulis ke: ${LOGAI_FILE}`);
}

generate().catch(e=>{
  log.e(e.message);
  process.exit(1);
});

