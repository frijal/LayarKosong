import fs from 'fs';
import path from 'path';
import { minify } from 'html-minifier-terser';

const folders = ['./gaya-hidup', './jejak-sejarah', './lainnya', './olah-media', './opini-sosial', './sistem-terbuka', './warta-tekno'];

// Stempel personal untuk menandai file yang sudah dioptimasi
const SIGNATURE = '';

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
            
            // 🔍 CEK: Jika sudah ada stempel 'frijal', lewati file ini
            if (originalHTML.includes(SIGNATURE)) {
                console.log(`⏭️  Skipped (Signed by frijal): ${filePath}`);
                continue;
            }

            try {
                let minifiedHTML = await minify(originalHTML, {
                    collapseWhitespace: true,      // Menghilangkan spasi & baris kosong
                    removeComments: true,          // Menghapus komentar bawaan (kecuali signature kita nanti)
                    minifyJS: true,                // Mengoptimasi script internal
                    minifyCSS: true,               // Mengoptimasi style internal
                    processScripts: ['application/ld+json'], // Mengamankan struktur Schema JSON-LD
                    ignoreCustomFragments: [/<%[\s\S]*?%>/, /<\?[\s\S]*?\?>/]
                });

                // 💉 INJEKSI: Tambahkan stempel 'frijal' di baris paling akhir
                // Ini berfungsi sebagai flag agar tidak diproses ulang di run berikutnya
                minifiedHTML += `\n${SIGNATURE}`;

                fs.writeFileSync(filePath, minifiedHTML);
                console.log(`✅ Berhasil Minify & Sign: ${filePath}`);
            } catch (err) {
                console.error(`❌ Gagal pada ${filePath}:`, err.message);
            }
        }
    }
}

console.log("🧼 Memulai Minify Berstempel untuk Layar Kosong...");
for (const folder of folders) {
    await minifyFiles(folder);
}
