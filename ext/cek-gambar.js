import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const IMG_FOLDER = './img/';
const OUTPUT_FILE = './img/gambarnganggur.txt';
const SKIP_FOLDERS = ['node_modules', '.git', 'img', 'sementara', 'artikelx', 'mini', 'ext', '.github'];

/**
 * Fungsi Rekursif untuk ambil SEMUA .webp di dalam img/ sub-sub-sub folder
 */
function getAllPhysicalImages(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of list) {
        const res = path.join(dir, file.name);
        if (file.isDirectory()) {
            results = results.concat(getAllPhysicalImages(res));
        } else if (file.name.toLowerCase().endsWith('.webp')) {
            results.push({
                fullPath: res,
                basename: file.name
            });
        }
    }
    return results;
}

/**
 * Fungsi Rekursif untuk scan referensi di semua file .html
 */
const usedBasenames = new Set();
function walkAndScanHtml(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            if (SKIP_FOLDERS.includes(file.name)) continue;
            walkAndScanHtml(fullPath);
        } else if (file.name.endsWith('.html')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const matches = content.match(/([^/\\"\']+\.webp)/ig);
                if (matches) {
                    matches.forEach(m => usedBasenames.add(path.basename(m)));
                }
            } catch (e) {
                console.warn(`⚠️ Gagal baca ${fullPath}`);
            }
        }
    }
}

console.log('🚀 Memulai Deep Scan V10.0 (Recursive Img Mode)...');

// 1. Ambil semua gambar fisik (Deep Dive)
const allImages = getAllPhysicalImages(IMG_FOLDER);

// 2. Cari semua yang terpakai di HTML
walkAndScanHtml('./');

// 3. Filter: Cari yang fisiknya ada tapi namanya TIDAK ADA di HTML
const unused = allImages.filter(img => !usedBasenames.has(img.basename));

// 4. Eksekusi
if (unused.length > 0) {
    // Tulis full path ke log supaya kita tahu lokasi persisnya di subfolder mana
    const logContent = unused.map(img => img.fullPath).sort().join('\n') + '\n';
    fs.writeFileSync(OUTPUT_FILE, logContent);
    
    console.log(`✅ Ditemukan ${unused.length} gambar nganggur di kedalaman folder.`);

    let cleanedCount = 0;
    unused.forEach(img => {
        if (fs.existsSync(img.fullPath)) {
            try {
                console.log(`→ Git RM: ${img.fullPath}`);
                // Gunakan quotes "" untuk jaga-jaga jika ada spasi di nama folder/file
                execSync(`git rm -f "${img.fullPath}"`);
                cleanedCount++;
            } catch (err) {
                console.error(`❌ Gagal hapus ${img.fullPath}`);
            }
        }
    });
    console.log(`Successfully cleaned ${cleanedCount} files from various depths.`);
} else {
    fs.writeFileSync(OUTPUT_FILE, '');
    console.log("😎 Aman! Semua gambar di semua subfolder terpakai.");
}
