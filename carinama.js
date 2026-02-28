#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// --- KONFIGURASI ---
const SEARCH_QUERY = process.argv[2];
if (!SEARCH_QUERY) {
    console.error('Tolong masukkan kata kunci! Contoh: node cari.js logo.webp');
    process.exit(1);
}
const SEARCH_DIR = './';
const SKIP_FOLDERS = new Set(['node_modules', '.git', 'img', 'sementara', 'artikelx', 'mini', '.github']);

// Ekstensi yang akan dipindai (tambahkan atau kurangi sesuai kebutuhan)
const EXTENSIONS = new Set(['.html', '.js', '.yml', '.ts', '.py', '.css']);

/**
 * Cari string di dalam file dengan mengembalikan array baris yang cocok
 */
function findMatchesInFile(filePath, query) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/);
        const matches = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(query)) {
                matches.push({ line: i + 1, text: lines[i].trim() });
            }
        }
        return matches;
    } catch (err) {
        console.warn(`⚠️ Gagal membaca ${filePath}: ${err.message}`);
        return [];
    }
}

/**
 * Rekursif: cari di folder, lewati folder yang ada di SKIP_FOLDERS
 * Mengembalikan jumlah file unik yang mengandung query
 */
function searchDir(dir, query) {
    let foundFiles = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (SKIP_FOLDERS.has(entry.name)) continue;
            foundFiles += searchDir(fullPath, query);
            continue;
        }

        const ext = path.extname(entry.name).toLowerCase();
        if (!EXTENSIONS.has(ext)) continue;

        const matches = findMatchesInFile(fullPath, query);
        if (matches.length > 0) {
            console.log(`\n📍 Ditemukan di: ${fullPath}`);
            matches.forEach(m => {
                console.log(`   Baris ${m.line}: ${m.text}`);
            });
            foundFiles++;
        }
    }

    return foundFiles;
}

// --- Eksekusi ---
console.log(`🔍 Mencari string: "${SEARCH_QUERY}" di ekstensi: ${[...EXTENSIONS].join(', ')}`);
console.log('---');

const total = searchDir(SEARCH_DIR, SEARCH_QUERY);

console.log('---');
if (total > 0) {
    console.log(`✅ Selesai! Ditemukan di ${total} file berbeda.`);
} else {
    console.log(`❌ String "${SEARCH_QUERY}" tidak ditemukan di file dengan ekstensi yang dicari.`);
}
