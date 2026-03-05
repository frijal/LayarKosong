import { readdirSync, statSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import crypto from "crypto";

const SOURCE_FOLDERS = ["gaya hidup"];
const TARGET_ROOT = "en";

const WORKERS = 8;

const CACHE_FILE = ".translate-cache.json";

let cache: Record<string,string> = {};

if (existsSync(CACHE_FILE)) {
  cache = JSON.parse(readFileSync(CACHE_FILE,"utf8"));
}

function walk(dir:string):string[]{

  let results:string[] = [];

  for (const file of readdirSync(dir)) {

    const full = join(dir,file);

    const stat = statSync(full);

    if(stat.isDirectory()) results = results.concat(walk(full));
    else if(file.endsWith(".html")) results.push(full);

  }

  return results;

}

function hash(content:string){

  return crypto.createHash("sha1").update(content).digest("hex");

}

function ensureDir(path:string){

  if(!existsSync(path)){
    mkdirSync(path,{recursive:true});
  }

}

async function translateHTML(html:string){

  const prompt = `
Translate this HTML to English.

Rules:
- DO NOT break HTML tags
- DO NOT modify <script>, <style>, <code>
- Keep structure identical
- Translate title and meta description
- Rewrite internal links to /en/

HTML:

${html}
`;

  const res = await fetch("http://localhost:11434/api/generate",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"mistral",
      prompt,
      stream:false
    })
  });

  const json = await res.json();

  return json.response;

}

async function worker(queue:string[],progress:any){

  while(queue.length){

    const file = queue.pop();

    if(!file) return;

    const html = readFileSync(file,"utf8");

    const fileHash = hash(html);

    const target = join(TARGET_ROOT,file);

    ensureDir(dirname(target));

    if(existsSync(target)){

      progress.done++;
      continue;

    }

    if(cache[fileHash]){

      writeFileSync(target,cache[fileHash]);
      progress.done++;
      continue;

    }

    const translated = await translateHTML(html);

    cache[fileHash] = translated;

    writeFileSync(target,translated);

    progress.done++;

  }

}

function progressBar(done:number,total:number,start:number){

  const percent = Math.floor((done/total)*100);

  const width = 40;

  const filled = Math.floor(width*(done/total));

  const bar = "█".repeat(filled)+"░".repeat(width-filled);

  const elapsed = (Date.now()-start)/1000;

  const rate = done/elapsed;

  const eta = ((total-done)/rate)||0;

  process.stdout.write(
    `\r ${bar} ${percent}% | ${done}/${total} | ETA ${eta.toFixed(0)}s`
  );

}

async function main(){

  let files:string[] = [];

  for(const folder of SOURCE_FOLDERS){

    files = files.concat(walk(folder));

  }

  const queue = [...files];

  const progress = {done:0};

  const start = Date.now();

  const workers = [];

  for(let i=0;i<WORKERS;i++){

    workers.push(worker(queue,progress));

  }

  const interval = setInterval(()=>{

    progressBar(progress.done,files.length,start);

  },200);

  await Promise.all(workers);

  clearInterval(interval);

  writeFileSync(CACHE_FILE,JSON.stringify(cache,null,2));

  console.log("\n\nDone translating",files.length,"articles");

}

main();
