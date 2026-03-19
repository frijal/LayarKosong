import { file, Glob } from "bun";
import path from "node:path";

const articlePath = path.resolve(import.meta.dir, 'artikel');
const glob = new Glob("**/*.html");

console.log(`🔎 Mencari 77 file tanpa tag "related-articles-grid"...`);

let count = 0;
for await (const fileName of glob.scan({ cwd: articlePath })) {
    const content = await file(path.join(articlePath, fileName)).text();
    
    if (!content.includes('related-articles-grid')) {
        count++;
        console.log(`${count}. 📄 ${fileName}`);
    }
}

console.log(`\n✅ Total ditemukan: ${count} file.`);
