import { readdir, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { parse, TextNode, HTMLElement } from "node-html-parser";

const SOURCE_DIRS = ["gaya-hidup", "jejak-sejarah", "lainnya"];
const TARGET_ROOT = "en";

const MODEL = "qwen2.5:3b";

async function translateText(text: string): Promise<string> {
  if (!text.trim()) return text;

  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt: `Translate Indonesian to English. Return only translation:\n${text}`,
      stream: false
    })
  });

  const json = await res.json();
  return json.response?.trim() || text;
}

function shouldSkip(node: HTMLElement) {
  const tag = node.tagName?.toLowerCase();
  return tag === "script" || tag === "style" || tag === "code";
}

async function translateHTML(html: string): Promise<string> {
  const root = parse(html);

  const textNodes: TextNode[] = [];

  root.querySelectorAll("*").forEach((el) => {
    if (shouldSkip(el)) return;

    el.childNodes.forEach((node) => {
      if (node instanceof TextNode) {
        textNodes.push(node);
      }
    });
  });

  for (const node of textNodes) {
    const original = node.rawText;

    if (!original.trim()) continue;

    try {
      const translated = await translateText(original);
      node.rawText = translated;
    } catch {
      node.rawText = original;
    }
  }

  return root.toString();
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function processFile(src: string, dest: string) {
  const html = await readFile(src, "utf8");

  console.log("Translating:", src);

  const translated = await translateHTML(html);

  await writeFile(dest, translated);
}

async function walk(srcDir: string, destDir: string) {
  await ensureDir(destDir);

  const items = await readdir(srcDir, { withFileTypes: true });

  for (const item of items) {
    const srcPath = path.join(srcDir, item.name);
    const destPath = path.join(destDir, item.name);

    if (item.isDirectory()) {
      await walk(srcPath, destPath);
    } else if (item.name.endsWith(".html")) {
      await processFile(srcPath, destPath);
    }
  }
}

async function main() {
  for (const dir of SOURCE_DIRS) {
    const dest = path.join(TARGET_ROOT, dir);
    await walk(dir, dest);
  }

  console.log("Translation complete.");
}

main();
