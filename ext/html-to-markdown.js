import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper karena di ESM tidak ada __dirname secara default
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Karena file ini ada di folder 'ext', kita perlu naik satu level ke root
const rootDir = path.join(__dirname, '..');

function cleanHTML(html) {
    return html
        .replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')
        .replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*')
        .replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (match, url, text) => {
            return match.includes('class=') || match.includes('id=') ? match : `[${text}](${url})`;
        })
        .replace(/<code>(.*?)<\/code>/gi, '`$1`');
}

function processFolder(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`⚠️ Skip: Folder ${dir} tidak ditemukan.`);
        return;
    }

    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        let fullPath = path.join(dir, file);
        
        if (fs.lstatSync(fullPath).isDirectory()) {
            processFolder(fullPath);
        } else {
            const isHtml = file.toLowerCase().endsWith('.html');
            const isIndex = file.toLowerCase() === 'index.html';

            if (isHtml && !isIndex) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let updated = cleanHTML(content);
                
                if (content !== updated) {
                    fs.writeFileSync(fullPath, updated, 'utf8');
                    console.log(`✅ Berhasil dibersihkan: ${fullPath}`);
                }
            } else if (isIndex) {
                console.log(`🚫 Proteksi: Mengabaikan ${fullPath}`);
            }
        }
    });
}

const targetFolders = [
    'gaya-hidup',
    'jejak-sejarah',
    'lainnya',
    'olah-media',
    'opini-sosial',
    'sistem-terbuka',
    'warta-tekno'
];

console.log('🚀 Memulai operasi "Layar Kosong Bersih" via ESM...');
targetFolders.forEach(folder => {
    // Arahkan ke folder di root repository
    processFolder(path.join(rootDir, folder));
});
console.log('🏁 Selesai!');
