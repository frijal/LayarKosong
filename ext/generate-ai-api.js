// =========================================================
// ext/generate-ai-api.js
// Final Full: AI Metadata Update + LogAI Markdown
// =========================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname,'..');

const META_FILE = path.join(ROOT,'artikel.json');
const HTML_DIR = path.join(ROOT,'artikel');
const LLMS_FILE = path.join(ROOT,'llms.txt');
const API_DIR = path.join(ROOT,'api/v1');
const POST_DIR = path.join(API_DIR,'post');
const LOG_DIR = path.join(ROOT,'mini');
const BASE_URL = 'https://dalam.web.id';

await fs.mkdir(POST_DIR,{recursive:true});
await fs.mkdir(LOG_DIR,{recursive:true});

const log = {
  i: m => console.log(`ℹ️  ${m}`),
  w: m => console.warn(`⚠️ ${m}`),
  e: m => console.error(`❌ ${m}`)
};

// ================= Models & API Keys =================
const MODELS = ["gemini-2.5-flash","gemini-2.5-flash-lite","gemma-3-4b","gemma-3-12b"];
const apiKeys = Object.keys(process.env)
  .filter(k=>k.startsWith('GEMINI_API_KEY'))
  .map(k=>process.env[k])
  .filter(Boolean);

if(!apiKeys.length) log.w("Tidak ada GEMINI_API_KEY, AI dimatikan.");

const failedKeys = new Set();
const failedModels = new Set();
const combinations = [];
apiKeys.forEach(key=>MODELS.forEach(model=>combinations.push({key,model})));

function getAI(key){ return new GoogleGenAI({apiKey:key}); }

// ================= Cheerio =================
async function extractContent(file){
  try{
    const html = await fs.readFile(path.join(HTML_DIR,file),'utf8');
    const $ = load(html);
    ['script','style','footer','nav','aside','noscript'].forEach(s=>$(s).remove());
    const root = $('article').first().length? $('article').first() : $('.container').first().length? $('.container').first() : $('body');
    const text = root.text().replace(/\s+/g,' ').trim();
    return text;
  }catch(e){ log.w(`Gagal baca HTML: ${file}`); return null; }
}

// ================= AI Extraction =================
async function aiExtract(text,title){
  if(!text || text.length<300) return null;
  for(const {key,model} of combinations){
    if(failedKeys.has(key)||failedModels.has(model)) continue;
    try{
      const ai = getAI(key);
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
      const res = await ai.models.generateContent({
        model,
        contents:[{role:"user",parts:[{text:prompt}]}],
        config:{temperature:0.2}
      });
      return JSON.parse(res.text);
    }catch(e){
      const msg=e.message.toLowerCase();
      msg.includes('quota')?failedKeys.add(key):failedModels.add(model);
    }
  }
  return null;
}

// ================= Whitelist =================
async function loadWhitelist(){
  try{
    const txt = await fs.readFile(LLMS_FILE,'utf8');
    return new Set([...txt.matchAll(/artikel\/(.*?)\.html/g)].map(m=>m[1]));
  }catch{ log.w("llms.txt tidak ditemukan"); return new Set(); }
}

// ================= Utility Highlight =================
function diffArray(oldArr=[],newArr=[]){
  const removed = oldArr.filter(k=>!newArr.includes(k));
  const added = newArr.filter(k=>!oldArr.includes(k));
  const res = newArr.map(k=>added.includes(k)? `**${k}**` : k);
  removed.forEach(k=>res.push(`~~${k}~~`));
  return res;
}

// ================= MAIN =================
async function generate(){
  log.i("Generate AI API + LogAI Markdown");

  const meta = JSON.parse(await fs.readFile(META_FILE,'utf8'));
  const whitelist = await loadWhitelist();
  const index = [];
  const logEntries = [];

  for(const [cat,items] of Object.entries(meta)){
    for(const [title,file,image,date,desc] of items){
      const id = file.replace('.html','');
      if(!whitelist.has(id)) continue;

      const outFile = path.join(POST_DIR,`${id}.json`);
      let oldData=null;
      if(await fs.access(outFile).then(()=>true).catch(()=>false)){
        oldData = JSON.parse(await fs.readFile(outFile,'utf8'));
      }

      const content = await extractContent(file);
      if(!content) continue;

      const ai = apiKeys.length? await aiExtract(content,title) : null;

      const newSummary = oldData?.meta?.summary||ai?.summary||desc||'';
      const newPromptHint = oldData?.meta?.prompt_hint||ai?.prompt_hint||desc||'';
      const newKeywords = ai?.keywords||oldData?.meta?.keywords||[];
      const newTopics = ai?.topics||oldData?.meta?.topics||[];

      // Save JSON
      const post = {
        id,
        slug:id,
        title,
        category:cat,
        published_at:date,
        url:`${BASE_URL}/artikel/${file}`,
        image,
        content_plain:content,
        meta:{
          summary:newSummary,
          prompt_hint:newPromptHint,
          keywords:newKeywords,
          topics:newTopics
        }
      };
      await fs.writeFile(outFile,JSON.stringify(post,null,2));

      index.push({
        id,title,category:cat,date,image,excerpt:newSummary,endpoint:`/api/v1/post/${id}.json`
      });

      // Prepare Markdown log if changed
      const changed = (
        newSummary!==oldData?.meta?.summary ||
        newPromptHint!==oldData?.meta?.prompt_hint ||
        JSON.stringify(newKeywords)!==JSON.stringify(oldData?.meta?.keywords) ||
        JSON.stringify(newTopics)!==JSON.stringify(oldData?.meta?.topics)
      );

      if(changed){
        logEntries.push({id,title,category:cat,date,oldData,post});
      }
    }
  }

  // Write index.json
  await fs.writeFile(path.join(API_DIR,'index.json'),JSON.stringify(index,null,2));

  // Write LogAI Markdown
  const today = new Date().toISOString().slice(0,10);
  const logFile = path.join(LOG_DIR,`${today}-LogAI.md`);
  let md = `# LogAI - Layar Kosong\n**Tanggal:** ${today}\n**Jumlah Artikel Diproses:** ${index.length}\n\n`;

  if(logEntries.length===0){
    md += "Tidak ada perubahan metadata.\n";
  } else {
    md += "## Artikel yang diperbarui\n\n";
    for(const e of logEntries){
      md += `### ${e.title} (${e.id})\n**Kategori:** ${e.category}\n**Tanggal Publikasi:** ${e.date}\n\n`;

      md += `#### Summary\n\`Sebelumnya:\` ${e.oldData?.meta?.summary||''}\n\`Baru:\` ${e.post.meta.summary}\n\n`;
      md += `#### Prompt Hint\n\`Sebelumnya:\` ${e.oldData?.meta?.prompt_hint||''}\n\`Baru:\` ${e.post.meta.prompt_hint}\n\n`;

      const kwOld = e.oldData?.meta?.keywords||[];
      const kwNew = e.post.meta.keywords||[];
      const tpOld = e.oldData?.meta?.topics||[];
      const tpNew = e.post.meta.topics||[];

      const kwDiff = diffArray(kwOld,kwNew).join(', ');
      const tpDiff = diffArray(tpOld,tpNew).join(', ');

      md += `#### Metadata AI\n| Field | Sebelumnya | Baru |\n|-------|------------|-----|\n`;
      md += `| Keywords | ${kwOld.join(', ')} | ${kwDiff} |\n`;
      md += `| Topics   | ${tpOld.join(', ')} | ${tpDiff} |\n\n`;
    }
  }

  await fs.writeFile(logFile,md);
  log.i(`Selesai. LogAI: ${logFile}`);
}

generate().catch(e=>{ log.e(e.message); process.exit(1); });

