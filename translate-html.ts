import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import pLimit from "p-limit";
import cliProgress from "cli-progress";
import { parse, TextNode } from "node-html-parser";

const SOURCE_DIRS = ["gaya-hidup","jejak-sejarah","lainnya"];
const TARGET_ROOT = "en";

const API = "http://127.0.0.1:11434/api/generate";
const MODEL = "qwen2.5:3b";

const WORKERS = 6;

const limit = pLimit(WORKERS);

async function translate(text:string){
  if(!text.trim()) return text;

  const res = await fetch(API,{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({
      model:MODEL,
      prompt:`Translate Indonesian to English. Only translate the text.\n${text}`,
      stream:false
    })
  });

  const json = await res.json();
  return json.response?.trim() || text;
}

function shouldSkip(el:any){
  const tag = el.tagName?.toLowerCase();
  return tag==="script" || tag==="style" || tag==="code";
}

async function translateHTML(html:string){

  const root = parse(html);

  const nodes:TextNode[]=[];

  root.querySelectorAll("*").forEach(el=>{

    if(shouldSkip(el)) return;

    el.childNodes.forEach(node=>{
      if(node instanceof TextNode){
        nodes.push(node);
      }
    });

  });

  for(const node of nodes){

    const original=node.rawText;

    if(!original.trim()) continue;

    try{
      const translated=await translate(original);
      node.rawText=translated;
    }catch{
      node.rawText=original;
    }

  }

  return root.toString();
}

async function ensureDir(dir:string){
  await mkdir(dir,{recursive:true});
}

async function walk(dir:string):Promise<string[]>{

  const files:string[]=[];

  async function scan(d:string){

    const items=await readdir(d,{withFileTypes:true});

    for(const item of items){

      const p=path.join(d,item.name);

      if(item.isDirectory()) await scan(p);

      else if(item.name.endsWith(".html")) files.push(p);

    }

  }

  await scan(dir);

  return files;

}

async function processFile(src:string,dest:string){

  const html=await readFile(src,"utf8");

  const translated=await translateHTML(html);

  await ensureDir(path.dirname(dest));

  await writeFile(dest,translated);

}

async function main(){

  const all:string[]=[];

  for(const dir of SOURCE_DIRS){

    const files=await walk(dir);

    all.push(...files);

  }

  const bar=new cliProgress.SingleBar({},cliProgress.Presets.shades_classic);

  bar.start(all.length,0);

  await Promise.all(all.map(file=>

    limit(async()=>{

      const dest=path.join(TARGET_ROOT,file);

      await processFile(file,dest);

      bar.increment();

    })

  ));

  bar.stop();

  console.log("Done");

}

main();
