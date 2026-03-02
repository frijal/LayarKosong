import { Glob } from "bun";
import { readFile, writeFile } from "node:fs/promises";

const FOLDERS = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"];
const SPECIAL_FOLDER = "artikel";

// Versi Minify (Tanpa spasi, tanpa kutip jika memungkinkan)
const MINIFIED_TAG = '<meta content=summary_large_image name=twitter:card>';
// Versi Standar
const STANDARD_TAG = '<meta name="twitter:card" content="summary_large_image">';

async function fixTwitterCard() {
    console.log("🛠️ Memulai Operasi Penyelamatan Twitter Card (Compatibility Mode)...");
    const startTime = performance.now();
    let totalFixed = 0;

    // 1. Proses Folder Umum (Target: Sebelum <body>)
    for (const folder of FOLDERS) {
        totalFixed += await processFolder(folder, MINIFIED_TAG);
    }

    // 2. Proses Folder Spesial (Target: Sebelum </head>)
    totalFixed += await processFolder(SPECIAL_FOLDER, STANDARD_TAG, true);

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Selesai dalam ${duration} detik!`);
    console.log(`✨ Total file diperbaiki: ${totalFixed}`);
}

async function processFolder(folderName: string, tagToInject: string, isArticle = false) {
    const glob = new Glob(`${folderName}/**/*.html`);
    let count = 0;

    const files = [];
    for await (const file of glob.scan(".")) {
        files.push(file);
    }

    await Promise.all(files.map(async (filePath) => {
        try {
            const content = await readFile(filePath, "utf-8");

            // Cek apakah sudah punya twitter:card (berbagai variasi)
            if (content.includes('twitter:card')) return;

            let newContent = content;

            if (isArticle && content.includes("</head>")) {
                // Khusus artikel: Taruh sebelum </head> biar rapi
                newContent = content.replace("</head>", `${tagToInject}\n</head>`);
            } else if (content.includes("<body")) {
                // Versi Minify: Taruh tepat sebelum <body> (bisa <body , <body>, atau <body class=...)
                // Menggunakan split dan join agar presisi di kemunculan pertama
                const parts = content.split("<body");
                newContent = parts[0] + tagToInject + "<body" + parts.slice(1).join("<body");
            } else {
                // Fallback terakhir: Jika body pun tak ada, taruh di paling atas
                newContent = tagToInject + content;
            }

            if (newContent !== content) {
                await writeFile(filePath, newContent, "utf-8");
                count++;
                console.log(`  [FIXED] ${filePath}`);
            }
        } catch (err) {
            console.error(`  [ERROR] Gagal di ${filePath}:`, err.message);
        }
    }));

    return count;
}

fixTwitterCard().catch(console.error);
