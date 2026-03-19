import { file, write, Glob } from "bun";
import path from "node:path";

const rootDir = path.resolve(import.meta.dir, '..');
const targetFolder = "LayarKosong/artikel";

interface Stats {
    processed: number;
    fixed: number;
    alreadyCorrect: number;
    missingTags: number;
}

let stats: Stats = {
    processed: 0,
    fixed: 0,
    alreadyCorrect: 0,
    missingTags: 0
};

async function runMasterFix() {
    const articlePath = path.join(rootDir, targetFolder);
    const glob = new Glob("**/*.html");

    console.log('🚀 Memulai Operasi "Layar Kosong: Urutan Benar"');
    console.log(`📂 Lokasi Target: ${articlePath}`);
    console.log('='.repeat(60));

    for await (const fileName of glob.scan({ cwd: articlePath, onlyFiles: true })) {
        const fullPath = path.join(articlePath, fileName);
        const content = await file(fullPath).text();
        stats.processed++;

        // 1. Deteksi Posisi (Real-time dari isi file)
        const posGrid = content.indexOf('related-articles-grid');
        const posResponse = content.indexOf('response');

        // 2. Evaluasi Kondisi
        if (posGrid === -1 || posResponse === -1) {
            stats.missingTags++;
            continue;
        }

        if (posGrid < posResponse) {
            // Sudah benar: Grid di atas, Response di bawah
            stats.alreadyCorrect++;
            continue;
        }

        // 3. EKSEKUSI SWAP (Hanya jika terbalik: posGrid > posResponse)
        // Menggunakan teknik 3-way swap agar tidak terjadi tabrakan nama
        const updated = content
            .replace(/related-articles-grid/g, "___TEMP_GRID_HOLDER___")
            .replace(/response/g, "related-articles-grid")
            .replace(/___TEMP_GRID_HOLDER___/g, "response");

        await write(fullPath, updated);
        stats.fixed++;
        console.log(`✅ DISWAP: ${fileName} (Grid: ${posGrid} > Resp: ${posResponse})`);
    }

    // Rekap Akhir
    console.log('\n' + '='.repeat(60));
    console.log('📊 REKAPITULASI AKHIR');
    console.log('='.repeat(60));
    console.log(`📂 Total File Diperiksa  : ${stats.processed}`);
    console.log(`✨ Berhasil Diperbaiki   : ${stats.fixed}`);
    console.log(`✔️  Sudah Benar Sejak Awal: ${stats.alreadyCorrect}`);
    console.log(`⚠️  Tag Tidak Lengkap     : ${stats.missingTags}`);
    console.log('='.repeat(60));

    if (stats.fixed > 0) {
        console.log('🏁 Selesai! Semua urutan kini sudah logis.');
    } else {
        console.log('🏁 Selesai! Tidak ada file yang perlu diperbaiki.');
    }
}

await runMasterFix();
