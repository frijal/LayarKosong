// pengganti-webp.js (Versi Perbaikan)
// Skrip untuk mengganti SEMUA ekstensi gambar .jpg ke .webp di dalam path URL tertentu.

import fs from 'fs';
import path from 'path';

// --- Konfigurasi ---
const targetFolder = './'; // '.' berarti folder saat ini.
const baseUrl = 'https://frijal.pages.dev/img/'; // URL dasar untuk gambar

// --- Logika Skrip ---

const isDryRun = process.argv.includes('--dry-run');

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

    // --- PERUBAHAN UTAMA: Regex yang lebih fleksibel ---
    // Regex ini akan mencari URL yang diawali dengan baseUrl, diikuti nama file apa pun,
    // dan diakhiri dengan .jpg.
    const escapedBaseUrl = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexToFind = new RegExp(`(${escapedBaseUrl}[^"']*)(\\.jpg)`, 'g');
    const stringToReplace = '$1.webp';

    files.forEach(file => {
        if (path.extname(file).toLowerCase() === '.html') {
            filesScanned++;
            const filePath = path.join(targetFolder, file);

            try {
                const originalContent = fs.readFileSync(filePath, 'utf8');
                
                // Menggunakan regex yang baru untuk mengganti semua kemunculan
                const newContent = originalContent.replace(regexToFind, stringToReplace);

                if (newContent !== originalContent) {
                    filesChanged++;
                    if (isDryRun) {
                        console.log(`[SIMULASI] 🔍 Tautan akan diganti di file: ${file}`);
                    } else {
                        fs.writeFileSync(filePath, newContent, 'utf8');
                        console.log(`✅ Tautan berhasil diganti di file: ${file}`);
                    }
                } else {
                    filesUnchanged++;
                }

            } catch (error) {
                console.error(`❌ Gagal memproses file ${file}:`, error.message);
            }
        }
    });

    if (filesScanned === 0) {
        console.log('\nTidak ada file .html yang ditemukan di folder ini.');
    } else {
        if (filesChanged > 0 && filesUnchanged > 0) {
             console.log(`\n⚪ ${filesUnchanged} file .html lainnya dipindai dan tidak memerlukan perubahan.`);
        } else if (filesChanged === 0) {
            console.log(`\n⚪ Semua ${filesUnchanged} file .html yang dipindai tidak memerlukan perubahan.`);
        }

        console.log(`\n--- Ringkasan Proses ---`);
        console.log(`Total File Dipindai : ${filesScanned}`);
        console.log(`File Diubah         : ${filesChanged} (atau akan diubah)`);
        console.log(`File Tidak Diubah  : ${filesUnchanged}`);
    }

} catch (error) {
    console.error(`\n❌ Gagal membaca direktori: ${error.message}`);
    console.error('Pastikan skrip ini dijalankan dari folder yang benar.');
}

