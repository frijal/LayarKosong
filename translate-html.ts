import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import pLimit from "p-limit";
import { parse } from "node-html-parser";

const SOURCE_DIRS = ["gaya-hidup"];
const TARGET_ROOT = "en";

const MODEL = "qwen2.5:3b";
const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";

const WORKERS = 6;

let total = 0;
let done = 0;

async function translateArticle(text: string) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt: `Translate Indonesian to English. Keep HTML tags unchanged.\n\n${text}`,
      stream: false
    })
  });

  const json = await res.json();
  return json.response || text;
}

function protectBlocks(html: string) {
  const blocks: string[] = [];

  const protectedHTML = html.replace(
    /<(script|style|code)[\s\S]*?<\/\1>/gi,
    (match) => {
      const id = blocks.length;
      blocks.push(match);
      return `___BLOCK_${id}___`;
    }
  );

  return { protectedHTML, blocks };
}

function restoreBlocks(html: string, blocks: string[]) {
  return html.replace(/___BLOCK_(\d+)___/g, (_, i) => blocks[i]);
}

async function processFile(src: string, dest: string) {
  try {
    const html = await readFile(src, "utf8");

    const { protectedHTML, blocks } = protectBlocks(html);

    const translated = await translateArticle(protectedHTML);

    const restored = restoreBlocks(translated, blocks);

    await writeFile(dest, restored);

    done++;
    process.stdout.write(`\r${done}/${total} translated`);
  } catch (err) {
    console.error("\nError:", src, err);
  }
}

async function walk(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function scan(d: string) {
    const items = await readdir(d, { withFileTypes: true });

    for (const item of items) {
      const p = path.join(d, item.name);

      if (item.isDirectory()) {
        await scan(p);
      } else if (item.name.endsWith(".html")) {
        files.push(p);
      }
    }
  }

  await scan(dir);
  return files;
}

async function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
}

async function main() {
  const allFiles: string[] = [];

  for (const dir of SOURCE_DIRS) {
    const files = await walk(dir);
    allFiles.push(...files);
  }

  total = allFiles.length;

  console.log("Total HTML:", total);

  const limit = pLimit(WORKERS);

  await Promise.all(
    allFiles.map((file) =>
      limit(async () => {
        const dest = path.join(TARGET_ROOT, file);

        await ensureDir(dest);

        await processFile(file, dest);
      })
    )
  );

  console.log("\nDone.");
}

main();
