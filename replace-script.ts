import { join } from "path";
import { readdir } from "fs/promises";

const targetDir = process.env.TARGET_DIR || ".";
const search = process.env.SEARCH;
const replace = process.env.REPLACE;
const extensions = process.env.EXTENSIONS?.split(",").map(e => e.trim()) || [".ts", ".js", ".md"];

async function processFiles(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "dist"].includes(entry.name)) continue;
      await processFiles(fullPath);
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      const file = Bun.file(fullPath);
      const content = await file.text();
      if (content.includes(search!)) {
        const updatedContent = content.split(search!).join(replace!);
        await Bun.write(fullPath, updatedContent);
        console.log(`✅ Updated: ${fullPath}`);
      }
    }
  }
}
await processFiles(targetDir);
