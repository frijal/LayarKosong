import { file, write, Glob } from "bun";
import path from "node:path";

const rootDir = path.resolve(import.meta.dir, '..');
const targetFolder = "LayarKosong/artikel";

async function swapLayoutStrings() {
    console.log('🔄 Memulai Pertukaran Teks: [Related Grid] <-> [Response]');
    console.log('='.repeat(60));

    const articlePath = path.join(rootDir, targetFolder);
    const glob = new Glob("**/*.html");
    
    let swapCount = 0;

    for await (const fileName of glob.scan({ cwd: articlePath, onlyFiles: true })) {
        const fullPath = path.join(articlePath, fileName);
        let content = await file(fullPath).text();

        // Cek dulu apakah kedua teks tersebut ada
        if (content.includes('related-articles-grid') && content.includes('response')) {
            
            // Eksekusi 5 Langkah Transisi Aman
            let updated = content
                .replace(/related-articles-grid/g, "related-articles-grid1") // 1. Grid -> Grid1
                .replace(/related-articles-grid1/g, "response1")             // 2. Grid1 -> Resp1
                .replace(/response/g, "related-articles-grid2")              // 3. Resp -> Grid2
                .replace(/response1/g, "response")                           // 4. Resp1 -> Resp
                .replace(/related-articles-grid2/g, "related-articles-grid");// 5. Grid2 -> Grid

            if (content !== updated) {
                await write(fullPath, updated);
                swapCount++;
                console.log(`✅ Swapped: ${fileName}`);
            }
        }
    }

    console.log('-'.repeat(60));
    console.log(`🎉 Berhasil menukar teks di ${swapCount} file!`);
    console.log('='.repeat(60));
}

await swapLayoutStrings();
