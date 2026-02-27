import { Glob } from "bun";

// -------------------- CONFIG & CLI --------------------
const args = Bun.argv.slice(2);
const QUIET = args.includes("--quiet");
const NO_BACKUP = args.includes("--no-backup");
const DRY_RUN = args.includes("--dry-run");

const cssFiles = [
  "atom-one-dark.min.css", "atom-one-light.min.css", "default.min.css", 
  "highlight.js", "github-dark-dimmed.css", "github-dark.css", "github.css", 
  "leaflet.css", "monokai.min.css", "prism-okaidia.min.css", 
  "prism-tomorrow.min.css", "prism.min.css", "vs-dark.min.css"
];

// 2. Mapping Manual - DIBUAT SANGAT AGRESIF
const MANUAL_MAP = [
    // --- FONT AWESOME (SPESIFIK CDNJS & RELEASES) ---
    // Target: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css
    { 
        rx: /https?:\/\/[^"']+?\/ajax\/libs\/font\-awesome\/[^"']+?\/all(?:\.min)?\.css(?:\?[^"']*)?/gi, 
        repl: "/ext/fontawesome.css" 
    },
    // Target: font-awesome umum
    { 
        rx: /https?:\/\/[^"']+?\/(?:font-awesome|fontawesome)\/.*?\/(?:all|fontawesome)(?:\.min)?\.css(?:\?[^"']*)?/gi, 
        repl: "/ext/fontawesome.css" 
    },
    { 
        rx: /https?:\/\/(?:use|kit|cdnjs)\.fontawesome\.com\/.*?\/all(?:\.min)?\.css(?:\?[^"']*)?/gi, 
        repl: "/ext/fontawesome.css" 
    },

    // --- PRISM & LAINNYA ---
    { rx: /https?:\/\/.*?prism\-vsc\-dark\-plus\.min\.css/gi, repl: "/ext/vs-dark.min.css" },
    { rx: /https?:\/\/.*?prism\-twilight\.min\.css/gi, repl: "/ext/vs-dark.min.css" },
    { rx: /https?:\/\/.*?prism\-coy\.min\.css/gi, repl: "/ext/default.min.css" },
    { rx: /https?:\/\/[^"']+?\/prism(?:\-[\w\-]+)?(?:\.min)?\.css/gi, repl: "/ext/default.min.css" }
];

// Regex Otomatis yang lebih longgar (Catch-all)
// Kita gunakan [^"']+? untuk melompati folder versi di CDN mana pun
const autoPattern = new RegExp(`(\\b(?:href|src)\\b\\s*=\\s*['"])\\s*https?:\\/\\/[^"']+?\\/([^"']+?\\/)?(${cssFiles.join("|").replace(/\./g, "\\.")})\\s*(['"])`, "gi");

// Regex Pembersihan Atribut (Pindah ke global agar lebih bersih)
const attrRegex = /\s+(?:integrity|crossorigin|referrertarget|referrerpolicy)(?:\s*=\s*(['"])[^'"]*?\1|(?=\s|>))/gi;

function log(...parts) {
    if (!QUIET) console.log(...parts);
}

async function processFile(filePath) {
    if (filePath.endsWith("index.html")) return;
    const bunRef = globalThis.Bun || Bun;
    const file = bunRef.file(filePath);
    
    let content = await file.text();
    let originalContent = content;
    let replaceCount = 0;
    let cleanCount = 0;

    // STEP A: Manual Mapping (Font Awesome tertangkap di sini)
    for (const m of MANUAL_MAP) {
        content = content.replace(m.rx, () => {
            replaceCount++;
            return m.repl;
        });
    }

    // STEP B: Auto Mapping (File CSS lainnya tertangkap di sini)
    content = content.replace(autoPattern, (match, head, mid, fileName, tail) => {
        replaceCount++;
        return `${head}/ext/${fileName}${tail}`;
    });

    // STEP C: Pembersihan Atribut (Hanya jika ada perubahan)
    if (content !== originalContent) {
        // Hapus sisa-sisa atribut CDN
        content = content.replace(attrRegex, () => {
            cleanCount++;
            return "";
        });

        const summary = `(${replaceCount} ganti, ${cleanCount} bersih)`;

        if (DRY_RUN) {
            log(`🧪 [DRY-RUN] ${filePath} -> ${summary}`);
            return;
        }

        if (!NO_BACKUP) {
            await bunRef.write(`${filePath}.bak`, originalContent);
        }

        await bunRef.write(filePath, content);
        log(`✅ Fixed: ${filePath} ${summary}`);
    }
}

async function run() {
    log("🔍 Memulai pemindaian Turbo (Bun.Glob)...");
    
    // Perhatikan: Saya tambahkan glob agar mencari di semua folder sesuai Perl
    const glob = new Glob("{*.html,artikelx/*.html,artikel/*.html}");

    const tasks = [];
    for await (const file of glob.scan(".")) {
        tasks.push(processFile(file));
    }

    await Promise.all(tasks);
    log("✨ Selesai! Layar Kosong sekarang sudah bersih dari CDN eksternal.");
}

run().catch(console.error);
