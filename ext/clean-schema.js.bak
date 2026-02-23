import fs from 'fs';
import path from 'path';

// ======================================================
// KONFIGURASI PEMBERSIH (STRICT LOCAL)
// ======================================================
// Ambil folder dari argument terminal atau default ke 'artikelx/'
const TARGET_FOLDER = process.argv[2] || './artikelx/';

// Regex untuk sikat abis ld+json (Case Insensitive & Multiline)
const SCHEMA_REGEX = /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi;

const EXTENSIONS = [".html", ".htm"];

function cleanSchemaInFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Cek apakah ada skema yang nempel
        if (SCHEMA_REGEX.test(content)) {
            // Hapus semua skema yang ditemukan
            const cleanedContent = content.replace(SCHEMA_REGEX, "");
            
            fs.writeFileSync(filePath, cleanedContent, 'utf8');
            return true;
        }
        return false;
    } catch (err) {
        console.error(`❌ Error pada ${filePath}: ${err.message}`);
        return false;
    }
}

function runCleanerLocal() {
    const absolutePath = path.resolve(TARGET_FOLDER);
    
    if (!fs.existsSync(absolutePath)) {
        console.error(`❌ Folder tidak ditemukan: ${absolutePath}`);
        return;
    }

    console.log(`🧹 Memulai pembersihan STRICT LOCAL di: ${absolutePath}`);
    console.log("⚠️  Non-Recursive Mode: Sub-folder tidak akan disentuh.");
    console.log("-".repeat(50));
    
    let countCleaned = 0;
    let countTotal = 0;

    // Membaca isi folder secara sinkron (Strict Local)
    const items = fs.readdirSync(absolutePath);

    items.forEach(item => {
        const itemPath = path.join(absolutePath, item);
        const stat = fs.statSync(itemPath);

        // Pastikan hanya file (bukan folder) dan cek extension
        const isHtml = EXTENSIONS.includes(path.extname(item).toLowerCase());

        if (stat.isFile() && isHtml) {
            countTotal++;
            if (cleanSchemaInFile(itemPath)) {
                console.log(`✅ Cleaned: ${item}`);
                countCleaned++;
            }
        }
    });

    console.log("-".repeat(50));
    console.log(`📊 HASIL PEMBERSIHAN (NODE.JS VERSION)`);
    console.log(`📂 Total file HTML ditemukan : ${countTotal}`);
    console.log(`✨ File yang dibersihkan      : ${countCleaned}`);
    console.log(`😴 File sudah bersih          : ${countTotal - countCleaned}`);
    console.log("-".repeat(50));
}

runCleanerLocal();
