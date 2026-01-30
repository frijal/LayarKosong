import fs from 'fs';
import path from 'path';
import { minify } from 'html-minifier-terser';

const folders = ['./gaya-hidup', './jejak-sejarah', './lainnya', './olah-media', './opini-sosial', './sistem-terbuka', './warta-tekno'];

async function minifyFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            await minifyFiles(filePath);
        } else if (file.endsWith('.html') && file !== 'index.html') {
            const originalHTML = fs.readFileSync(filePath, 'utf8');
            
            try {
                const minifiedHTML = await minify(originalHTML, {
                    collapseWhitespace: true,
                    removeComments: true,
                    minifyJS: true,
                    processScripts: ['application/ld+json'], // Menjaga JSON-LD tetap valid
                    ignoreCustomFragments: [/<%[\s\S]*?%>/, /<\?[\s\S]*?\?>/]
                });

                fs.writeFileSync(filePath, minifiedHTML);
                console.log(`✅ Minified: ${filePath}`);
            } catch (err) {
                console.error(`❌ Gagal pada ${filePath}:`, err.message);
            }
        }
    }
}

console.log("🧼 Memulai Minify Cerdas untuk Layar Kosong...");
for (const folder of folders) {
    await minifyFiles(folder);
}
