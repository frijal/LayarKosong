import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "path";

const artikelDir = join(process.cwd(), "artikel");

function reverseMarkdownToHTML(html: string): string {
    let out = html;

    // Logic reverse seperti sebelumnya
    out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*(?!\*)(.*?)\*/g, "<em>$1</em>");
    out = out.replace(/~~(.*?)~~/g, "<del>$1</del>");
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
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
            let content = readFileSync(fullPath, "utf-8");

            // 1. Amankan area yang TIDAK BOLEH disentuh (HEAD, STYLE, SCRIPT)
            // Kita pisahkan isi tag body-nya saja
            const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            
            if (bodyMatch) {
                const fullBodyTag = bodyMatch[0]; // <body...>...</body>
                const bodyContent = bodyMatch[1]; // Isi di dalam body

                // 2. Jalankan reverse hanya pada isi body
                const reversedBodyContent = reverseMarkdownToHTML(bodyContent);
                
                // 3. Gabungkan kembali dengan struktur aslinya
                const finalContent = content.replace(fullBodyTag, fullBodyTag.replace(bodyContent, reversedBodyContent));
                
                writeFileSync(fullPath, finalContent, "utf-8");
                console.log(`✅ Diproses (Body saja): ${file}`);
            } else {
                console.log(`⚠️ Body tidak ditemukan di: ${file} - Dilewati.`);
            }
        }
    }
}

console.log(`📂 Memulai operasi Reverse Markdown ke HTML (Area Body) di: ${artikelDir}`);
processFolder(artikelDir);
console.log(`🏁 Selesai! Bagian Head/Style/Script aman sentosa.`);
