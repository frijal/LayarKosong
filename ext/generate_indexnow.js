// ext/generate_indexnow.js
import fs from 'fs/promises';
import path from 'path';

// --- Konfigurasi ---
const HOST = "frijal.pages.dev";
const KEY = "f8399d60e90d46a6945577b73ff3f778";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ARTIKEL_JSON_PATH = 'artikel.json'; // Path ke file JSON di root
// --------------------

async function main() {
    try {
        console.log("🚀 Memulai proses pembuatan file IndexNow...");

        // Pastikan folder 'mini' ada
        await fs.mkdir('mini', { recursive: true });

        // Baca artikel.json di root
        let data;
        try {
            const fileContent = await fs.readFile(ARTIKEL_JSON_PATH, 'utf-8');
            data = JSON.parse(fileContent);
        } catch (error) {
            console.error(`❌ Error: File '${ARTIKEL_JSON_PATH}' tidak ditemukan.`);
            process.exit(1);
        }

        // Ekstrak semua URL artikel dari dalam setiap kategori
        const urlList = [];
        // Loop melalui nilai-nilai objek (yaitu, array artikel per kategori)
        for (const categoryArticles of Object.values(data)) {
            // Loop melalui setiap array artikel di dalam kategori
            for (const entry of categoryArticles) {
                // arr[1] adalah nama file (mis: "sembelit.html")
                const fileName = entry[1];
                if (fileName && typeof fileName === 'string' && fileName.endsWith(".html")) {
                    urlList.push(`https://${HOST}/artikel/${fileName}`);
                }
            }
        }

        // Siapkan payload untuk IndexNow
        const indexnowPayload = {
            host: HOST,
            key: KEY,
            keyLocation: KEY_LOCATION,
            urlList: urlList
        };

        // Simpan file JSON untuk IndexNow
        const outJsonPath = path.join('mini', 'artikel-indexnow.json');
        await fs.writeFile(outJsonPath, JSON.stringify(indexnowPayload, null, 2), 'utf-8');

        // Buat file log dengan timestamp unik
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timestamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
        
        const outLogPath = path.join('mini', `indexnow-log-${timestamp}.txt`);
        const logContent = `Timestamp (UTC): ${timestamp}\nTotal URL submitted: ${urlList.length}\n`;
        await fs.writeFile(outLogPath, logContent, 'utf-8');

        console.log(`✅ Berhasil membuat ${outJsonPath} dengan ${urlList.length} URL.`);
        console.log(`✅ Log disimpan di ${outLogPath}`);

    } catch (error) {
        console.error("❌ Terjadi kesalahan fatal:", error);
        process.exit(1);
    }
}

// Menjalankan fungsi utama
main();
