import { file, write, Glob } from "bun";
import path from "node:path";

const rootDir = path.join(import.meta.dir, '..');
const targetFolders = [
    "gaya-hidup", "jejak-sejarah", "lainnya", 
    "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"
];

// Logika pembersihan kamu tetap utuh
function cleanHTML(html: string): string {
    let updated = html
        .replace(/<pre>`([\s\S]*?)`<\/pre>/gi, '<pre><code>$1</code></pre>')
        .replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')
        .replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*')
        .replace(/<(del|s|strike)>(.*?)<\/\1>/gi, '~~$2~~')
        .replace(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, url, text) => {
            const isProtected = /class=|id=|style=|target=|rel=/i.test(match);
            const containsImg = /<img\s[^>]*>/i.test(text);
            return (isProtected || containsImg) ? match : `[${text}](${url})`;
        });

    updated = updated.replace(/<pre[\s\S]*?<\/pre>|<code>([\s\S]*?)<\/code>/gi, (match, codeText) => {
        if (match.toLowerCase().startsWith('<pre')) return match;
        if (codeText && !/\r|\n/.test(codeText) && !match.includes('class=') && !match.includes('id=')) {
            return `\`${codeText}\``;
        }
        return match;
    });

    return updated;
}

// Menggunakan Bun.glob untuk memproses file
async function processFiles() {
    console.log('🚀 Memulai Operasi "Layar Kosong Bersih" (Bun Native)');
    
    // Glob pattern: cari semua .html di dalam 7 folder, kecuali index.html
    const pattern = `{${targetFolders.join(',')}}/**/!(index).html`;
    const glob = new Glob(pattern);

    for await (const fileName of glob.scan({ cwd: rootDir, onlyFiles: true })) {
        const fullPath = path.join(rootDir, fileName);
        const f = file(fullPath);
        const content = await f.text();
        const updated = cleanHTML(content);

        if (content !== updated) {
            await write(fullPath, updated);
            console.log(`   ✅ Clean: ...${fileName}`);
        }
    }
}

await processFiles();
console.log('🏁 Selesai! Semua artikel kini lebih ramping.');
