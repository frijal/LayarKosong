import fs from 'fs';
import path from 'path';

const targetFolders = ['gaya-hidup', 'jejak-sejarah', 'lainnya', 'olah-media', 'opini-sosial', 'sistem-terbuka', 'warta-tekno'];
const outputFile = 'ext/markdown-classes.txt';

let classSet = new Set();

// 1. Keyword yang SANGAT MUNGKIN berisi tulisan panjang/markdown
const priorityKeywords = [
    'note', 'box', 'card', 'alert', 'warning', 'tip', 'quote',
'callout', 'highlight', 'item', 'desc', 'summary', 'detail',
'content', 'body', 'article', 'meta', 'caption', 'label', 'text'
];

// 2. Blacklist Visual: Kata-kata ini biasanya cuma buat gaya (CSS) bukan kontainer teks
const visualBlacklist = [
    'icon', 'img', 'image', 'avatar', 'btn', 'button', 'badge', 'bar', 'thumb',
'bg-', 'text-', 'border', 'shadow', 'rounded', 'p-', 'm-', 'w-', 'h-',
'grid', 'flex', 'hidden', 'absolute', 'relative', 'sticky', 'fixed',
'transition', 'duration', 'opacity', 'blur', 'animate', 'z-', 'active',
'header', 'footer', 'nav', 'menu', 'sidebar', 'container', 'wrapper', 'inner',
'timeline', 'progress', 'barfill', 'orb', 'gradient', 'center', 'right', 'left'
];

console.log("🔍 Melakukan penyaringan tahap akhir...");

targetFolders.forEach(folder => {
    if (!fs.existsSync(folder)) return;
    const files = fs.readdirSync(folder).filter(f => f.endsWith('.html'));

    files.forEach(file => {
        const content = fs.readFileSync(path.join(folder, file), 'utf8');
        const classRegex = /class=["']([^"']+)["']/gi;

        let match;
        while ((match = classRegex.exec(content)) !== null) {
            match[1].split(/\s+/).forEach(cName => {
                const cleanName = cName.trim().toLowerCase();

                // KRITERIA FILTER YANG LEBIH TEGAS:
                const isUtility = /\d|[:\/]/.test(cleanName);
                // Cek apakah mengandung kata kunci visual/layout
                const isVisual = visualBlacklist.some(v => cleanName.includes(v));
                // Cek apakah mengandung kata kunci konten
                const hasContentKeyword = priorityKeywords.some(kw => cleanName.includes(kw));
                // Pastikan bukan class standar HTML yang terlalu umum
                const isGeneral = ['body', 'article', 'aside', 'section'].includes(cleanName);

                if (cleanName && !isUtility && !isVisual && hasContentKeyword && !isGeneral && cleanName.length > 3) {
                    classSet.add(cleanName);
                }
            });
        }
    });
});

const finalClasses = Array.from(classSet).sort();
fs.writeFileSync(outputFile, finalClasses.join('\n'), 'utf8');

console.log(`✅ Filter Selesai!`);
console.log(`📉 Hasil Akhir: ${finalClasses.length} class.`);
