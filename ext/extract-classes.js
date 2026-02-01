import fs from 'fs';
import path from 'path';

const targetFolders = [
    'gaya-hidup', 'jejak-sejarah', 'lainnya', 
    'olah-media', 'opini-sosial', 'sistem-terbuka', 'warta-tekno'
];

const outputDir = 'mini';
const outputFile = path.join(outputDir, 'html-class.md');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Objek untuk menyimpan data: { "nama-class": [ "file1.html", "file2.html" ] }
let classMap = {};

console.log("🔍 Menyisir artikel dan memetakan class <div>...");

targetFolders.forEach(folder => {
    if (!fs.existsSync(folder)) return;
    const files = fs.readdirSync(folder).filter(f => f.endsWith('.html'));
    
    files.forEach(file => {
        const filePath = path.join(folder, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = `${folder}/${file}`;

        // Regex spesifik untuk tag <div>
        const divClassRegex = /<div\s+[^>]*class=["']?([^"'>\s]+(?:\s+[^"'>\s]+)*)["']?[^>]*>/gi;
        
        let match;
        while ((match = divClassRegex.exec(content)) !== null) {
            const individualClasses = match[1].split(/\s+/);
            
            individualClasses.forEach(className => {
                const cName = className.trim();
                if (cName) {
                    if (!classMap[cName]) {
                        classMap[cName] = new Set(); // Pakai Set supaya nama file unik per class
                    }
                    classMap[cName].add(relativePath);
                }
            });
        }
    });
});

// Generate konten Markdown
let mdContent = `# 📊 Laporan Audit Class <div>\n\n`;
mdContent += `Dihasilkan pada: ${new Date().toLocaleString('id-ID')}\n\n`;
mdContent += `| Nama Class | Jumlah File | Daftar File |\n`;
mdContent += `| :--- | :---: | :--- |\n`;

// Urutkan class secara alfabetis
const sortedClasses = Object.keys(classMap).sort();

sortedClasses.forEach(cName => {
    const fileList = Array.from(classMap[cName]);
    const count = fileList.length;
    // Gabungkan nama file dengan break line <br> agar rapi di tabel MD
    const filesFormatted = fileList.join(', '); 
    mdContent += `| \`${cName}\` | ${count} | ${filesFormatted} |\n`;
});

if (sortedClasses.length > 0) {
    fs.writeFileSync(outputFile, mdContent, 'utf8');
    console.log(`✅ Laporan Markdown sukses dibuat: ${outputFile}`);
} else {
    console.log("⚠️ Tidak ada class div yang ditemukan.");
}
