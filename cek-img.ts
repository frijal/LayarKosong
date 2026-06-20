// check-files.ts
import { Glob } from "bun";

const pattern = /<link\s+href="[^"]*"\s+fetchpriority=high\s+as=image\s+rel=preload\s*>/g;
const glob = new Glob("**/*.html");
const logFile = "list-to-clean.txt";
const foundFiles: string[] = [];

console.log("🔍 Mencari file yang mengandung target...");

for await (const file of glob.scan(".")) {
  const content = await Bun.file(file).text();
  if (pattern.test(content)) {
    foundFiles.push(file);
    console.log(`✅ Ditemukan: ${file}`);
  }
}

await Bun.write(logFile, foundFiles.join("\n"));
console.log(`\n📄 Daftar file telah disimpan ke: ${logFile}`);
console.log(`Total file: ${foundFiles.length}`);
