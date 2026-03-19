import { file, Glob } from "bun";
import path from "node:path";

// 1. Tentukan Root Directory dengan lebih pasti
const rootDir = path.resolve(import.meta.dir, '..'); 
const targetFolder = "LayarKosong/artikel";

async function checkArticleLayout() {
    // Pastikan path folder artikel benar-benar ada
    const articlePath = path.join(rootDir, targetFolder);
    
    console.log(`🔍 Root: ${rootDir}`);
    console.log(`🔍 Target: ${articlePath}`);
    console.log('='.repeat(60));

    // 2. Gunakan pola Glob yang lebih universal
    // Mencari semua file .html di dalam folder artikel dan subfoldernya
    const pattern = `**/*.html`;
    const glob = new Glob(pattern);
    
    let processedCount = 0;
    const errors: any[] = [];

    // 3. Scan dengan CWD yang diarahkan langsung ke folder artikel
    for await (const fileName of glob.scan({ cwd: articlePath, onlyFiles: true })) {
        const fullPath = path.join(articlePath, fileName);
        const content = await file(fullPath).text();
        processedCount++;

        const posGrid = content.indexOf('related-articles-grid');
        const posResponse = content.indexOf('response');

        if (posGrid !== -1 && posResponse !== -1) {
            if (posGrid > posResponse) {
                errors.push({
                    file: fileName,
                    gridPos: posGrid,
                    responsePos: posResponse
                });
            }
        }
    }

    console.log(`📊 Selesai memproses ${processedCount} file.`);
    console.log('-'.repeat(60));

    if (processedCount === 0) {
        console.log('⚠️  PERINGATAN: Tidak ada file .html ditemukan! Periksa kembali path folder /artikel.');
        process.exit(1); // Gagal karena tidak ada file yang diproses
    }

    if (errors.length === 0) {
        console.log('✅ SEMUA AMAN: Urutan layout konsisten.');
    } else {
        console.log(`❌ DITEMUKAN ${errors.length} FILE TERBALIK:`);
        errors.forEach((err, i) => {
            console.log(`${i + 1}. ${err.file} (Grid: ${err.gridPos} > Resp: ${err.responsePos})`);
        });
        process.exit(1); 
    }
}

await checkArticleLayout();
