import fs from 'node:fs';
import path from 'node:path';

// --- KONFIGURASI ---
// Ganti baris SEARCH_QUERY menjadi:
const SEARCH_QUERY = process.argv[2]; 
if (!SEARCH_QUERY) {
    console.error("Tolong masukkan kata kunci! Contoh: node cari.js logo.webp");
    process.exit(1);
}
const SEARCH_DIR = './'; // Mulai cari dari root
const SKIP_FOLDERS = ['node_modules', '.git', 'img', 'sementara', 'artikelx', 'mini', 'ext', '.github'];

/**
 * Fungsi rekursif untuk mencari string di dalam file HTML
 */
function findStringInHtml(dir) {
    let foundCount = 0;
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
            // Lewati folder yang masuk daftar skip
            if (SKIP_FOLDERS.includes(file.name)) continue;
            foundCount += findStringInHtml(fullPath);
        } else if (file.name.endsWith('.html')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                
                // Cek apakah string ada di dalam konten
                if (content.includes(SEARCH_QUERY)) {
                    // Cari nomor baris (opsional tapi sangat membantu)
                    const lines = content.split(/\r?\n/);
                    lines.forEach((line, index) => {
                        if (line.includes(SEARCH_QUERY)) {
                            console.log(`📍 Ditemukan di: ${fullPath} (Baris: ${index + 1})`);
                        }
                    });
                    foundCount++;
                }
            } catch (err) {
                console.warn(`⚠️ Gagal membaca ${fullPath}: ${err.message}`);
            }
        }
    }
    return foundCount;
}

console.log(`🔍 Mencari string: "${SEARCH_QUERY}"...`);
console.log('---');

const totalFiles = findStringInHtml(SEARCH_DIR);

console.log('---');
if (totalFiles > 0) {
    console.log(`✅ Selesai! Ditemukan di ${totalFiles} file berbeda.`);
} else {
    console.log(`❌ String "${SEARCH_QUERY}" tidak ditemukan di file HTML mana pun.`);
}
