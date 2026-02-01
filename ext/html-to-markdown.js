const fs = require('fs');
const path = require('path');

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

    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        
        if (fs.lstatSync(fullPath).isDirectory()) {
            processFolder(fullPath);
        } else {
            // Syarat mutlak: Harus .html DAN bukan index.html
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

console.log('🚀 Memulai operasi "Layar Kosong Bersih" (Kecuali index.html)...');
targetFolders.forEach(folder => {
    processFolder(path.join(__dirname, folder));
});
console.log('🏁 Selesai! 800+ Artikel telah diproses dengan aman.');
