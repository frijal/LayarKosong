import { Glob, $ } from "bun";

/**
 * LAYAR KOSONG - CDN TO LOCAL REPLACEMENT (BUN EDITION)
 * Lokasi: Balikpapan | Strategy: Predator Tag Rebuilding
 */

// 1. CONFIG & CLI
const args = Bun.argv.slice(2);
const QUIET = args.includes("--quiet");
const NO_BACKUP = args.includes("--no-backup");
const DRY_RUN = args.includes("--dry-run");

// 2. TARGET MAPPING
// Selama URL mengandung 'key', maka akan diganti ke 'repl'
const TARGETS = [
    { key: "font-awesome", repl: "/ext/fontawesome.css" },
    { key: "all.min.css",  repl: "/ext/fontawesome.css" }, // Catch-all untuk FA di cdnjs
    { key: "prism",        repl: "/ext/default.min.css" },
    { key: "leaflet",      repl: "/ext/leaflet.css" },
    { key: "highlight",    repl: "/ext/highlight.js" },
    { key: "github-dark",  repl: "/ext/github-dark.min.css" }
];

// Regex Predator: Menangkap seluruh tag <link> atau <script> yang punya href/src berisi http
const TAG_REGEX = /<(link|script)[^>]+(?:href|src)=["'](https?:\/\/[^"']+)["'][^>]*>/gi;

function log(...parts) {
    if (!QUIET) console.log(...parts);
}

async function processFile(filePath) {
    // Abaikan index.html untuk menjaga struktur navigasi utama
    if (filePath.endsWith("index.html")) return;

    const file = Bun.file(filePath);
    const content = await file.text();
    let replaceCount = 0;

    // Proses penggantian dengan logika rakit ulang tag
    const newContent = content.replace(TAG_REGEX, (fullTag, type, url) => {
        for (const target of TARGETS) {
            if (url.toLowerCase().includes(target.key)) {
                replaceCount++;
                
                // Rakit ulang tag dari nol (Otomatis buang integrity, crossorigin, dsb)
                if (type === 'link') {
                    return `<link rel="stylesheet" href="${target.repl}">`;
                } else {
                    return `<script src="${target.repl}"></script>`;
                }
            }
        }
        return fullTag; // Tidak cocok? Kembalikan tag aslinya
    });

    // Jika ada perubahan, tulis ke file
    if (replaceCount > 0) {
        if (DRY_RUN) {
            log(`🧪 [DRY-RUN] ${filePath} -> Terdeteksi ${replaceCount} link CDN`);
            return;
        }

        if (!NO_BACKUP) {
            await Bun.write(`${filePath}.bak`, content);
        }

        await Bun.write(filePath, newContent);
        log(`✅ Fixed: ${filePath} (${replaceCount} link diganti)`);
    }
}
async function run() {
    log("🔍 Memulai pemindaian Turbo (Bun.Glob)...");
    const startTime = performance.now();

    // 1. Gunakan pattern yang lebih sederhana tapi mencakup semua
    // **/*.html artinya: cari semua file .html di folder ini dan semua subfoldernya
    const glob = new Glob("**/*.html");
    const files = [];

    // 2. Scan dari directory saat ini
    for await (const file of glob.scan({ cwd: ".", onlyFiles: true })) {
        // Kita tetap jaga-jaga filter manual agar tidak merusak folder node_modules atau .git
        if (!file.includes("node_modules") && !file.includes(".git")) {
            files.push(file);
        }
    }

    if (files.length === 0) {
        log("⚠️ Tidak ada file HTML ditemukan. Coba cek apakah kamu menjalankan script dari root project?");
        return;
    }

    log(`📂 Ditemukan ${files.length} file. Menjalankan operasi 'Cari & Hancurkan' CDN...`);

    // 3. Jalankan paralel
    await Promise.all(files.map(processFile));

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    log(`\n🎯 Selesai! Semua link CDN tumbang dalam ${duration} detik.`);
}

run().catch(err => {
    console.error("❌ Terjadi kesalahan fatal:", err.message);
});
