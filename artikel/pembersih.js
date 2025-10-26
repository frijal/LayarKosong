// pembersih.js (Versi Gabungan Final)

// Menggunakan sintaks 'import' yang modern
import fs from 'fs';
import path from 'path';

// --- Konfigurasi ---
const targetFolder = './'; // '.' berarti folder saat ini.

// --- Logika Skrip ---

// Cek apakah argumen --dry-run ada saat skrip dijalankan
const isDryRun = process.argv.includes('--dry-run');

// Regex gabungan untuk mencari semua target dalam satu kali proses.
// Target: <div class="fb-comments">, <div id="fb-root">, dan <script src="...facebook...">
const facebookRegex = /<div class="fb-comments".*?<\/div>|<div id="fb-root"><\/div>|<script.*?src=".*?connect\.facebook\.net.*?<\/script>\s*/gs;

// Menampilkan pesan header sesuai mode yang aktif
if (isDryRun) {
    console.log('--- 🛡️  MODE SIMULASI (DRY RUN) AKTIF 🛡️  ---');
    console.log('Tidak ada file yang akan diubah. Skrip hanya akan melaporkan.\n');
} else {
    console.log('--- ⚡ MODE EKSEKUSI (LIVE) AKTIF ⚡ ---');
    console.log('PERINGATAN: Perubahan pada file akan disimpan secara permanen.\n');
}

console.log(`Memulai pemindaian file .html di folder: ${path.resolve(targetFolder)}`);
let filesChanged = 0;
let filesUnchanged = 0;
let filesScanned = 0;

try {
    const files = fs.readdirSync(targetFolder);

    files.forEach(file => {
        // Proses hanya file yang berakhiran .html
        if (path.extname(file).toLowerCase() === '.html') {
            filesScanned++;
            const filePath = path.join(targetFolder, file);
            
            try {
                const originalContent = fs.readFileSync(filePath, 'utf8');
                const cleanedContent = originalContent.replace(facebookRegex, '');
                
                // Cek apakah konten file benar-benar berubah
                if (cleanedContent !== originalContent) {
                    filesChanged++;
                    if (isDryRun) {
                        // Jika mode simulasi, hanya tampilkan log
                        console.log(`[SIMULASI] 🔍 File akan diubah: ${file}`);
                    } else {
                        // Jika mode live, tulis perubahan ke file
                        fs.writeFileSync(filePath, cleanedContent, 'utf8');
                        console.log(`✅ File berhasil dibersihkan: ${file}`);
                    }
                } else {
                    // Jika tidak ada perubahan, catat dan tampilkan log-nya
                    filesUnchanged++;
                    console.log(`⚪ File tidak memerlukan perubahan: ${file}`);
                }

            } catch (error) {
                console.error(`❌ Gagal memproses file ${file}:`, error.message);
            }
        }
    });

    // Menampilkan ringkasan di akhir
    if (filesScanned === 0) {
        console.log('\nTidak ada file .html yang ditemukan di folder ini.');
    } else {
        console.log(`\n--- Ringkasan Proses ---`);
        console.log(`Total File Dipindai : ${filesScanned}`);
        console.log(`File Diubah         : ${filesChanged} (atau akan diubah)`);
        console.log(`File Tidak Diubah  : ${filesUnchanged}`);
    }

} catch (error) {
    console.error(`\n❌ Gagal membaca direktori: ${error.message}`);
    console.error('Pastikan skrip ini dijalankan dari folder yang benar.');
}
