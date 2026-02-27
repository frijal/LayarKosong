import { watch } from "node:fs";
import { join, dirname } from "node:path";
import { $ } from "bun";

// Karena koki.ts ada di dalam /dapur, kita ambil path folder tersebut
const sourceDir = import.meta.dir; 
const targetDir = join(sourceDir, "../ext"); // Naik satu tingkat ke root, lalu masuk ke ext/

console.log("👨‍🍳 Koki Bun sudah stand-by di dalam Dapur!");
console.log(`📂 Memantau: ${sourceDir}`);
console.log(`📦 Etalase: ${targetDir}`);
console.log("------------------------------------------");

async function masak(fileName: string) {
  // Abaikan koki.ts itu sendiri supaya nggak masak dirinya sendiri (Insepsi!)
  if (fileName === "koki.ts") return;

  const sourcePath = join(sourceDir, fileName);
  const ext = fileName.split('.').pop();

  try {
    if (ext === 'ts' || ext === 'js') {
      const outName = fileName.replace(/\.ts$/, '.js');
      console.log(`⚡ [JS/TS] Masak: ${fileName} -> ${outName}`);
      await $`bun build ${sourcePath} --outfile ${join(targetDir, outName)} --minify`;
    } 
    else if (ext === 'css') {
      console.log(`🎨 [CSS] Masak: ${fileName}`);
      await $`bun build ${sourcePath} --outfile ${join(targetDir, fileName)} --minify`;
    }
    else if (ext === 'py') {
      console.log(`🐍 [Python] Geser ke etalase: ${fileName}`);
      await $`cp ${sourcePath} ${join(targetDir, fileName)}`;
    }
  } catch (err) {
    console.error(`❌ Masakan gosong di ${fileName}:`, err);
  }
}

// Pantau folder dapur/
watch(sourceDir, (event, filename) => {
  if (filename && !filename.startsWith(".")) {
    masak(filename);
  }
});
