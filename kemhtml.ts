import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "path";

// Arahkan ke folder artikel di lokal
const artikelDir = join(process.cwd(), "artikel");

function reverseMarkdownToHTML(html: string): string {
    let out = html;

    // 1. REVERSE: BOLD (**) -> <strong>
    out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // 2. REVERSE: ITALIC (*) -> <em>
    // Menggunakan negative lookahead agar tidak tertangkap oleh regex Bold
    out = out.replace(/\*(?!\*)(.*?)\*/g, "<em>$1</em>");

    // 3. REVERSE: STRIKETHROUGH (~~) -> <del>
    out = out.replace(/~~(.*?)~~/g, "<del>$1</del>");

    // 4. REVERSE: INLINE CODE (`) -> <code>
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");

    // 5. REVERSE: LINKS [text](url) -> <a href="url">text</a>
    out = out.replace(/\[([^\]]+)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    return out;
}

function processFolder(dir: string) {
    const files = readdirSync(dir);

    for (const file of files) {
        const fullPath = join(dir, file);
        if (statSync(fullPath).isDirectory()) {
            processFolder(fullPath);
        } else if (file.endsWith(".html")) {
            const content = readFileSync(fullPath, "utf-8");
            const reverted = reverseMarkdownToHTML(content);
            
            writeFileSync(fullPath, reverted, "utf-8");
            console.log(`✅ Diproses: ${file}`);
        }
    }
}

console.log(`📂 Memulai operasi Reverse Markdown ke HTML di: ${artikelDir}`);
processFolder(artikelDir);
console.log(`🏁 Selesai! Semua file di folder artikel sudah dikembalikan ke HTML.`);
