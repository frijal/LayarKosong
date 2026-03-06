import { readdirSync, statSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import crypto from "crypto";
import { parse, HTMLElement, TextNode } from "node-html-parser";
import pLimit from "p-limit";

// ---------------- CONFIG ----------------
const SOURCE_FOLDERS = ["gaya-hidup"];
const TARGET_ROOT = "en";
const WORKERS = 2;          // small batch for Codespace
const CHUNK_SIZE = 1500;    // small chunk for CPU
const CACHE_FILE = ".translate-cache.json";
const AI_API = "http://localhost:11434/api/generate";
const MODEL = "qwen2.5:3b"; // safer for CPU Codespace

// ---------------- CACHE ----------------
let cache: Record<string,string> = {};
if(existsSync(CACHE_FILE)) cache = JSON.parse(readFileSync(CACHE_FILE,"utf8"));

// ---------------- UTILS ----------------
function hash(content:string){ return crypto.createHash("sha1").update(content).digest("hex"); }
function ensureDir(path:string){ if(!existsSync(path)) mkdirSync(path,{recursive:true}); }
function walk(dir:string):string[]{
    let results:string[] = [];
    for(const file of readdirSync(dir)){
        const full = join(dir,file);
        const stat = statSync(full);
        if(stat.isDirectory()) results = results.concat(walk(full));
        else if(file.endsWith(".html")) results.push(full);
    }
    return results;
}

// ---------------- TRANSLATE ----------------
async function translateTextWithRetry(text:string, retries=3){
    for(let attempt=1; attempt<=retries; attempt++){
        try{
            const controller = new AbortController();
            const timeout = setTimeout(()=>controller.abort(), 180_000); // 3 menit

            const res = await fetch(AI_API,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    model:MODEL,
                    prompt:`Translate Indonesian to English. Only translate text, preserve HTML tags. Rewrite internal links to /en/.\n${text}`,
                    stream:false
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);
            const json = await res.json();
            return json.response?.trim() || text;

        }catch(e){
            console.warn(`Attempt ${attempt} failed:`, e.name || e);
            if(attempt===retries) return text;
            await new Promise(r=>setTimeout(r,1000));
        }
    }
    return text;
}

// ---------------- HTML PROCESS ----------------
function shouldSkip(el:HTMLElement){ 
    const tag = el.tagName?.toLowerCase();
    return tag==="script" || tag==="style" || tag==="code";
}

function extractTextNodes(root:HTMLElement){
    const nodes:TextNode[] = [];
    root.querySelectorAll("*").forEach(el=>{
        if(shouldSkip(el)) return;
        el.childNodes.forEach(node=>{
            if(node instanceof TextNode && node.rawText.trim()) nodes.push(node);
        });
    });
    return nodes;
}

function chunkTextNodes(nodes:TextNode[], maxChars:number){
    const chunks:TextNode[][] = [];
    let current:TextNode[] = [];
    let len = 0;
    for(const node of nodes){
        if(len + node.rawText.length > maxChars){
            if(current.length) chunks.push(current);
            current = [];
            len = 0;
        }
        current.push(node);
        len += node.rawText.length;
    }
    if(current.length) chunks.push(current);
    return chunks;
}

async function translateHTML(html:string){
    const root = parse(html) as HTMLElement;

    // Meta tags
    const metaTags = root.querySelectorAll("title, meta[name='description']");
    const metaNodes:TextNode[] = [];
    metaTags.forEach(tag=>{
        if(tag.tagName.toLowerCase() === "title" && tag.firstChild instanceof TextNode){
            metaNodes.push(tag.firstChild);
        }
        if(tag.tagName.toLowerCase() === "meta" && tag.getAttribute("content")){
            const txt = new TextNode(tag.getAttribute("content"));
            metaNodes.push(txt);
            (tag as any)._tmpContentNode = txt;
        }
    });

    const textNodes = extractTextNodes(root);
    const allNodes = [...metaNodes, ...textNodes];
    const chunks = chunkTextNodes(allNodes, CHUNK_SIZE);

    for(const chunk of chunks){
        const originalText = chunk.map(n=>n.rawText).join("\n");
        const translatedText = await translateTextWithRetry(originalText);
        const translatedLines = translatedText.split("\n");
        for(let i=0;i<chunk.length;i++){
            if(translatedLines[i]) chunk[i].rawText = translatedLines[i];
        }
    }

    // Restore meta description
    metaTags.forEach(tag=>{
        if(tag.tagName.toLowerCase() === "meta" && (tag as any)._tmpContentNode){
            tag.setAttribute("content",(tag as any)._tmpContentNode.rawText);
        }
    });

    // Rewrite internal links <a href="/">
    root.querySelectorAll("a").forEach(a=>{
        const href = a.getAttribute("href");
        if(href?.startsWith("/")) a.setAttribute("href", "/en"+href);
    });

    return root.toString();
}

// ---------------- PROCESS FILE ----------------
async function processFile(src:string){
    const html = readFileSync(src,"utf8");
    const fileHash = hash(html);
    const target = join(TARGET_ROOT,src);
    ensureDir(dirname(target));

    // Skip if already translated
    if(existsSync(target)) return;
    if(cache[fileHash]){
        writeFileSync(target,cache[fileHash]);
        return;
    }

    const translated = await translateHTML(html);
    cache[fileHash] = translated;
    writeFileSync(target,translated);
}

// ---------------- MAIN ----------------
async function main(){
    let files:string[] = [];
    for(const folder of SOURCE_FOLDERS){
        if(!existsSync(folder)){
            console.warn(`Folder ${folder} tidak ditemukan, dilewati`);
            continue;
        }
        files = files.concat(walk(folder));
    }

    const total = files.length;
    console.log(`Found ${total} HTML files to translate.`);

    let done = 0;
    const start = Date.now();
    const limit = pLimit(WORKERS);

    for(const f of files){
        await limit(async()=>{
            await processFile(f);
            done++;
            const percent = Math.floor(done/total*100);
            const elapsed = (Date.now()-start)/1000;
            const eta = ((total-done)/(done/elapsed))||0;
            const width = 40;
            const bar = "█".repeat(Math.floor(width*(done/total)))+"░".repeat(width-Math.floor(width*(done/total)));
            process.stdout.write(`\r ${bar} ${percent}% | ${done}/${total} | ETA ${eta.toFixed(0)}s`);
        });
    }

    writeFileSync(CACHE_FILE,JSON.stringify(cache,null,2));
    console.log("\n✅ Translation complete.");
}

main();
