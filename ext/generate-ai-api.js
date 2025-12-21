// =========================================================
// SCRIPT: ext/generate-ai-api.js
// FINAL: Full AI Metadata Updater + Log Gemini API
// =========================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import glob from 'glob';

// ==================== SETUP PATH ========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname,'..');

const INPUT_METADATA_FILE = path.join(ROOT,'artikel.json');
const INPUT_LLMS_FILE = path.join(ROOT,'llms.txt');
const POST_DIR = path.join(ROOT,'api/v1/post');
const LOG_DIR = path.join(ROOT,'mini');
const BASE_URL = 'https://dalam.web.id';

// ==================== LOGGER ============================
const log = {
    i: m=>console.log(`ℹ️ ${m}`),
    w: m=>console.warn(`⚠️ ${m}`),
    e: m=>console.error(`❌ ${m}`)
};

// ==================== ROTASI MODEL & KEY =================
const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemma-3-4b",
    "gemma-3-12b"
];

const apiKeys = Object.keys(process.env)
  .filter(k=>k.startsWith('GEMINI_API_KEY'))
  .map(k=>process.env[k])
  .filter(Boolean);

if(!apiKeys.length) log.w("Tidak ada GEMINI_API_KEY, AI dimatikan.");

const failedKeys = new Set();
const failedModels = new Set();
const combinations = [];
apiKeys.forEach(key => MODELS.forEach(model=>combinations.push({key,model})));

// ==================== CHEERIO CLEAN =====================
async function extractContent(file) {
    try {
        const html = await fs.readFile(path.join(ROOT,'artikel',file),'utf8');
        const $ = load(html);
        ['script','style','footer','#iposbrowser','#pesbukdiskus','.search-floating-container','#related-marquee-section'].forEach(sel=>$(sel).remove());
        const root = $('.container').first().length ? $('.container').first() : $('.main').first().length ? $('.main').first() : $('body');
        const text = root.text().replace(/\s+/g,' ').trim();
        return text;
    } catch {
        log.w(`Gagal membaca/membersihkan konten: ${file}`);
        return null;
    }
}

// ==================== LLMS WHITELIST ====================
async function loadWhitelist() {
    try {
        const txt = await fs.readFile(INPUT_LLMS_FILE,'utf8');
        return new Set([...txt.matchAll(/artikel\/(.*?)\.html/g)].map(m=>m[1]));
    } catch {
        log.w("llms.txt tidak ditemukan → semua artikel dilewati");
        return new Set();
    }
}

// ==================== GEMINI AI ==========================
async function aiExtract(text,title) {
    if(!text || text.length<300) return null;
    for(const {key,model} of combinations){
        if(failedKeys.has(key) || failedModels.has(model)) continue;
        try {
            const ai = new GoogleGenAI({apiKey:key});
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
            const res = await ai.models.generateContent({
                model,
                contents:[{role:"user",parts:[{text:prompt}]}],
                config:{temperature:0.1}
            });
            const parsed = JSON.parse(res.text);
            apiLog.successCount++;
            apiLog.details.push({title,keyIndex:apiKeys.indexOf(key)+1,model,status:"✅ Success",message:""});
            return parsed;
        } catch(e){
            const msg = e.message.toLowerCase();
            apiLog.failCount++;
            if(msg.includes("quota")||msg.includes("429")) failedKeys.add(key);
            else failedModels.add(model);
            apiLog.details.push({title,keyIndex:apiKeys.indexOf(key)+1,model,status:"❌ Fail",message:e.message});
        }
    }
    return null;
}

// ==================== GEMINI API LOG =====================
const apiLog = {successCount:0,failCount:0,failedKeys:new Set(),failedModels:new Set(),details:[]};

// ==================== UTILS =============================
function highlightArrayDiff(oldArr=[],newArr=[]){
    const added = newArr.filter(x=>!oldArr.includes(x)).map(x=>`**${x}**`);
    const removed = oldArr.filter(x=>!newArr.includes(x)).map(x=>`~~${x}~~`);
    const kept = oldArr.filter(x=>newArr.includes(x));
    return [...kept,...added,...removed];
}

// ==================== MAIN =============================
async function generate() {
    log.i("Memulai Generasi AI API...");

    await fs.mkdir(POST_DIR,{recursive:true});
    await fs.mkdir(LOG_DIR,{recursive:true});

    const meta = JSON.parse(await fs.readFile(INPUT_METADATA_FILE,'utf8'));
    const whitelist = await loadWhitelist();

    const globFiles = glob.sync(path.join(POST_DIR,'*.json'));
    const oldJsonMap = {};
    for(const f of globFiles){
        const j = JSON.parse(await fs.readFile(f,'utf8'));
        oldJsonMap[j.id]=j;
    }

    const index = [];
    const changes = [];
    let totalArticles=0;

    for(const [category,items] of Object.entries(meta)){
        for(const [title,file,img,date,desc] of items){
            const id=file.replace('.html','');
            if(!whitelist.has(id)) continue;
            totalArticles++;

            const postPath = path.join(POST_DIR,`${id}.json`);
            const cleanContent = await extractContent(file);
            if(!cleanContent) continue;

            const oldJson = oldJsonMap[id] || {};
            const ai = apiKeys.length ? await aiExtract(cleanContent,title) : null;

            const summary = (oldJson?.meta?.summary || desc || ai?.summary || "").trim();
            const prompt_hint = oldJson?.meta?.prompt_hint || ai?.prompt_hint || desc || "";
            const keywords = ai?.keywords || oldJson?.meta?.keywords || [];
            const topics = ai?.topics || oldJson?.meta?.topics || [];

            const post = {
                id,
                slug:id,
                title,
                category,
                published_at:date,
                url:`${BASE_URL}/artikel/${file}`,
                content:cleanContent,
                meta:{summary,keywords,topics,prompt_hint}
            };

            await fs.writeFile(postPath,JSON.stringify(post,null,2));

            index.push({
                id,title,category,date,image:img,excerpt:summary,endpoint:`/api/v1/post/${id}.json`
            });

            // ==== catat perubahan metadata ====
            const oldMeta = oldJson?.meta || {summary:"",keywords:[],topics:[],prompt_hint:""};
            if(JSON.stringify(oldMeta)!==JSON.stringify(post.meta)){
                changes.push({
                    title,
                    old:oldMeta,
                    new:post.meta,
                    keywordsDiff:highlightArrayDiff(oldMeta.keywords,post.meta.keywords),
                    topicsDiff:highlightArrayDiff(oldMeta.topics,post.meta.topics)
                });
            }
        }
    }

    // ==================== tulis index.json ==================
    index.sort((a,b)=>new Date(b.date)-new Date(a.date));
    await fs.writeFile(path.join(ROOT,'api/v1/index.json'),JSON.stringify(index,null,2));

    // ==================== tulis log Markdown ==================
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOG_DIR,`${today}-LogAI.md`);

    let md=`# LogAI - Layar Kosong\n\nTanggal: ${today}\nJumlah Artikel Diproses: ${totalArticles}\n\n`;

    md+=`## Gemini API Report\n- ✅ Berhasil: ${apiLog.successCount}\n- ❌ Gagal: ${apiLog.failCount}\n`;
    if(apiLog.failedKeys.size) md+=`- Keys Blacklisted: ${[...apiLog.failedKeys].join(', ')}\n`;
    if(apiLog.failedModels.size) md+=`- Models Blacklisted: ${[...apiLog.failedModels].join(', ')}\n\n`;

    md+=`| Artikel | Key Index | Model | Status | Pesan |\n|---------|----------|-------|--------|-------|\n`;
    for(const d of apiLog.details){
        md+=`| ${d.title} | ${d.keyIndex} | ${d.model} | ${d.status} | ${d.message.replace(/\|/g,'\\|')} |\n`;
    }

    if(changes.length){
        md+=`\n## Perubahan Metadata Artikel\n`;
        for(const c of changes){
            md+=`### ${c.title}\n| Field | Lama | Baru |\n|-------|------|-----|\n`;
            md+=`| summary | ${c.old.summary} | ${c.new.summary} |\n`;
            md+=`| keywords | ${c.keywordsDiff.join(', ')} | |\n`;
            md+=`| topics | ${c.topicsDiff.join(', ')} | |\n`;
            md+=`| prompt_hint | ${c.old.prompt_hint} | ${c.new.prompt_hint} |\n`;
        }
    } else md+=`\nTidak ada perubahan metadata.\n`;

    await fs.writeFile(logFile,md,'utf8');
    log.i(`Selesai. Index: ${index.length} artikel, log tersimpan di ${logFile}`);
}

// ==================== RUN SCRIPT ==========================
generate().catch(e=>{
    log.e(e.message);
    process.exit(1);
});

