import { Glob } from "bun";

// Konfigurasi CLI
const args = Bun.argv.slice(2);
const NO_BACKUP = args.includes("--no-backup");

// Mapping yang persis dengan daftar Perl kamu
const MAP = [
    { rx: /https:\/\/.*?\/(?:all|fontawesome)(\.min)?\.css/i, repl: '/ext/fontawesome.css' },
    { rx: /https:\/\/.*?\/(?:prism|vs-dark|default|github|monokai|atom-one).*?\.css/i, repl: '/ext/default.min.css' }, // Catch-all CSS
    { rx: /https:\/\/.*?\/leaflet\.css/i, repl: '/ext/leaflet.css' },
    { rx: /https:\/\/.*?\/highlight\.min\.js/i, repl: '/ext/highlight.js' }
];

// Regex Sapu Jagat untuk menangkap atribut href/src DAN membersihkan sisa sampah (integrity, dsb)
// Ini adalah versi JS dari regex 'while' milik Perl kamu
const SUPER_REGEX = /(\b(?:href|src)\b)\s*=\s*(['"])\s*https?:\/\/[^"']+?\/([^"']+?\.(?:css|js))(?:\?[^"']*)?\s*\2([^>]*)/gi;

async function processFile(filePath) {
    if (filePath.endsWith("index.html")) return;
    
    const file = Bun.file(filePath);
    let content = await file.text();
    let changed = false;

    // 1. Eksekusi Penggantian URL & Pembersihan Atribut sekaligus (Mirip Perl)
    content = content.replace(SUPER_REGEX, (match, attr, quote, fileName, extraAttr) => {
        let replacement = null;

        // Cek apakah file ini ada di MAP
        for (const m of MAP) {
            if (match.match(m.rx)) {
                replacement = m.repl;
                break;
            }
        }

        if (replacement) {
            changed = true;
            // Kita kembalikan hanya atribut utama, 'extraAttr' (integrity, crossorigin) dibuang!
            return `${attr}=${quote}${replacement}${quote}`;
        }
        
        return match; // Tidak ada yang cocok, kembalikan aslinya
    });

    if (changed) {
        if (!NO_BACKUP) await Bun.write(`${filePath}.bak`, await file.text());
        await Bun.write(filePath, content);
        console.log(`✅ Fixed: ${filePath}`);
    }
}

async function run() {
    console.log("🚀 Menantang Perl: Memulai pemindaian...");
    const glob = new Glob("{*.html,artikelx/*.html,artikel/*.html}");
    
    const files = [];
    for await (const file of glob.scan(".")) files.push(file);
    
    await Promise.all(files.map(processFile));
    console.log("✨ Selesai! Link cdnjs font-awesome 6.4.0? Tumbang!");
}

run();
