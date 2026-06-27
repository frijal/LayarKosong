import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { Glob } from 'bun';

// Folder induk tempat script dieksekusi
const ROOT_DIR = process.cwd();

// ============================================================================
// 1. TEMPLATE UI DASHBOARD (TANGGAL REPAIR)
// ============================================================================
const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tanggal Repair - Layar Kosong</title>
<style>
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 24px 32px; background: #121214; color: #e1e1e6; }
.container { width: 100%; max-width: 800px; margin: 0 auto; background: #202024; padding: 30px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
h2 { color: #facc15; border-bottom: 2px solid #29292e; padding-bottom: 10px; margin-top: 0; display: flex; align-items: center; gap: 10px; }

/* Panel Input Folder */
.folder-panel { background: #18181c; padding: 20px; border-radius: 6px; border: 1px solid #29292e; margin-bottom: 25px; }
.folder-panel label { display: block; font-size: 14px; color: #a4a4a8; font-weight: bold; margin-bottom: 10px; }
.input-group { display: flex; gap: 10px; margin-bottom: 15px; }
input[type="text"] { flex: 1; padding: 12px; background: #121214; border: 1px solid #45475a; color: #e1e1e6; border-radius: 4px; font-family: monospace; font-size: 14px; outline: none; }
input[type="text"]:focus { border-color: #facc15; }

/* Tombol Global */
.btn { padding: 12px 20px; font-size: 14px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.btn-add { background: #4b5563; color: white; }
.btn-add:hover { background: #6b7280; }
.btn-sync { background: #3b82f6; color: white; width: 100%; font-size: 16px; margin-top: 10px; }
.btn-sync:hover { background: #2563eb; transform: translateY(-2px); }
.btn-sync:disabled { background: #4b5563; cursor: not-allowed; transform: none; }

/* Daftar Folder (Tags) */
.folder-list { display: flex; flex-wrap: wrap; gap: 10px; min-height: 40px; padding: 10px; background: #121214; border: 1px dashed #45475a; border-radius: 4px; }
.folder-tag { background: #29292e; color: #e1e1e6; padding: 6px 12px; border-radius: 20px; font-size: 13px; display: flex; align-items: center; gap: 8px; font-family: monospace; border: 1px solid #45475a; }
.folder-tag span { cursor: pointer; color: #ef4444; font-weight: bold; font-size: 16px; line-height: 1; }
.folder-tag span:hover { color: #f87171; }
.empty-msg { color: #888; font-size: 13px; font-style: italic; margin: auto; }

/* Statistik */
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
.stat-box { background: #18181c; border: 1px solid #29292e; border-radius: 6px; padding: 15px; text-align: center; }
.stat-box h3 { margin: 0 0 5px 0; font-size: 28px; }
.stat-box p { margin: 0; font-size: 12px; color: #a4a4a8; text-transform: uppercase; letter-spacing: 1px; }
.color-success { color: #00e676; }
.color-skip { color: #3b82f6; }
.color-error { color: #ef4444; }

.action-area { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; background: #18181c; padding: 15px 20px; border-radius: 6px; border: 1px solid #29292e; }
#status { font-style: italic; color: #ffb300; font-weight: bold; font-size: 14px; flex: 1; }
#log-link { display: none; color: #ff3e3e; text-decoration: none; font-weight: bold; font-size: 14px; border: 1px solid #ff3e3e; padding: 5px 12px; border-radius: 4px; }
#log-link:hover { background: rgba(255, 62, 62, 0.1); }
</style>
</head>
<body>
<div class="container">
<h2>🛠️ Dashboard Reparasi Tanggal HTML</h2>
<p style="color: #a4a4a8; font-size: 13px; margin-top: -5px;">Lokasi Akar: <code style="color: #facc15;">${ROOT_DIR}</code></p>

<div class="folder-panel">
    <label>Tentukan folder mana saja yang ingin di-scan (contoh: artikel, opini-sosial):</label>
    
    <div class="input-group">
        <input type="text" id="folder-input" placeholder="Ketik nama folder di sini..." autocomplete="off">
        <button class="btn btn-add" onclick="tambahFolder()">➕ Tambahkan</button>
    </div>

    <div class="folder-list" id="folder-list">
        </div>

    <button id="btn-sync" class="btn btn-sync" onclick="mulaiSinkronisasi()">🔄 Mulai Cocokkan Tanggal</button>
</div>

<div class="stats-grid">
    <div class="stat-box">
        <h3 id="stat-sukses" class="color-success">0</h3>
        <p>Berhasil Update</p>
    </div>
    <div class="stat-box">
        <h3 id="stat-skip" class="color-skip">0</h3>
        <p>Aman / Lewati</p>
    </div>
    <div class="stat-box">
        <h3 id="stat-error" class="color-error">0</h3>
        <p>Gagal / No Meta</p>
    </div>
</div>

<div class="action-area">
    <div id="status">Status: Menunggu instruksi...</div>
    <a id="log-link" href="/log" target="_blank">📄 Buka Log Gagal</a>
</div>
</div>

<script>
// State Frontend
let folderArray = ['artikel']; // Default folder pertama kali buka

const folderInput = document.getElementById('folder-input');
const folderListEl = document.getElementById('folder-list');

// Fitur nambah folder pakai Enter
folderInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') tambahFolder();
});

function renderFolders() {
    if (folderArray.length === 0) {
        folderListEl.innerHTML = '<span class="empty-msg">Belum ada folder yang dipilih. Ketik di atas lalu Tambahkan.</span>';
        return;
    }

    folderListEl.innerHTML = folderArray.map((folder, index) => \`
        <div class="folder-tag">
            📁 \${folder} <span onclick="hapusFolder(\${index})" title="Hapus">×</span>
        </div>
    \`).join('');
}

function tambahFolder() {
    let val = folderInput.value.trim();
    // Hilangkan slash depan/belakang kalau user iseng ngetik "/artikel/"
    val = val.replace(/^\\/+/, '').replace(/\\/+$/, ''); 
    
    if (val && !folderArray.includes(val)) {
        folderArray.push(val);
        folderInput.value = '';
        renderFolders();
    } else if (folderArray.includes(val)) {
        alert("Foldernya udah ada di daftar, Jal!");
    }
}

function hapusFolder(index) {
    folderArray.splice(index, 1);
    renderFolders();
}

async function mulaiSinkronisasi() {
    if (folderArray.length === 0) {
        alert("Masukkan minimal satu folder dulu sebelum mulai scan!");
        return;
    }

    const btn = document.getElementById('btn-sync');
    const statusDiv = document.getElementById('status');
    const logLink = document.getElementById('log-link');
    
    // Reset UI
    btn.disabled = true;
    btn.innerHTML = "⏳ Sedang Membedah HTML...";
    statusDiv.innerText = "Status: Mencari file di folder yang dipilih...";
    logLink.style.display = 'none';
    document.getElementById('stat-sukses').innerText = "0";
    document.getElementById('stat-skip').innerText = "0";
    document.getElementById('stat-error').innerText = "0";

    try {
        const response = await fetch('/sync', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetFolders: folderArray })
        });
        
        const data = await response.json();

        if (data.error) {
            statusDiv.innerText = "Status Gagal: " + data.error;
            statusDiv.style.color = "#ef4444";
        } else {
            // Update Stats
            document.getElementById('stat-sukses').innerText = data.sukses;
            document.getElementById('stat-skip').innerText = data.skip;
            document.getElementById('stat-error').innerText = data.errorCount;
            
            statusDiv.innerText = data.message;
            statusDiv.style.color = "#00e676";

            if (data.adaLog) {
                logLink.style.display = 'block';
            }
        }
    } catch (err) {
        statusDiv.innerText = "Koneksi ke backend terputus: " + err;
        statusDiv.style.color = "#ef4444";
    } finally {
        btn.disabled = false;
        btn.innerHTML = "🔄 Mulai Cocokkan Tanggal";
    }
}

// Inisiasi Render Pertama
renderFolders();
</script>
</body>
</html>
`;

// ============================================================================
// 2. FUNGSI INTI SINKRONISASI (Menerima Array Folder dari Frontend)
// ============================================================================
type ArtikelData = [string, string, string, string, string];

async function jalankanSinkronisasi(targetFolders: string[]) {
    const jsonPath = path.join(ROOT_DIR, 'artikel.json');
    const logPath = path.join(ROOT_DIR, 'laporan-gagal.txt'); 

    let sukses = 0;
    let skip = 0;
    let errorCount = 0;
    const daftarGagal: string[] = [];

    try {
        // 1. Baca data kebenaran mutlak (artikel.json)
        const rawData = await fs.readFile(jsonPath, 'utf-8');
        const parsedData = JSON.parse(rawData);
        const daftarArtikel: ArtikelData[] = Object.values(parsedData).flat() as ArtikelData[];

        if (daftarArtikel.length === 0) {
            return { error: "Data artikel.json kosong. Cek file-nya!" };
        }

        // 2. PEMETAAN FILE BERDASARKAN FOLDER TARGET
        const fileMap = new Map<string, string>(); // Format: { "namafile.html" => "PathAbsolut" }

        // Looping hanya pada folder yang di-request oleh Frontend
        for (const folder of targetFolders) {
            const fullFolderPath = path.join(ROOT_DIR, folder);
            
            try {
                // Pastikan folder tersebut ada biar script nggak mati
                const stat = await fs.stat(fullFolderPath);
                if (!stat.isDirectory()) continue;

                // Scan khusus di folder ini pakai Bun.Glob
                const glob = new Glob("*.html");
                for await (const file of glob.scan({ cwd: fullFolderPath, absolute: true })) {
                    fileMap.set(path.basename(file), file);
                }
            } catch (folderErr) {
                console.log(`⚠️ Folder "${folder}" tidak ditemukan atau gagal dibaca.`);
            }
        }

        // 3. MULAI EKSEKUSI PENCOCOKAN DENGAN CHEERIO
        for (const artikel of daftarArtikel) {
            if (!Array.isArray(artikel) || artikel.length < 4) continue;

            const fileName = artikel[1];
            const tanggalKebenaran = artikel[3];
            
            // Cek apakah file ini ada di daftar folder yang kita scan tadi
            const filePath = fileMap.get(fileName);

            // Kalau file nggak ketemu di folder yang di-scan, lewati diam-diam.
            // (Nggak usah masukin ke error, karena mungkin file-nya ada di folder lain 
            // yang emang nggak dipilih user buat di-scan).
            if (!filePath) continue; 

            try {
                const htmlContent = await fs.readFile(filePath, 'utf-8');
                const $ = cheerio.load(htmlContent, { xmlMode: false });
                const $metaTag = $('meta[property="article:published_time"]');

                if ($metaTag.length > 0) {
                    const tanggalLama = $metaTag.attr('content');

                    if (tanggalLama !== tanggalKebenaran) {
                        $metaTag.attr('content', tanggalKebenaran);
                        await fs.writeFile(filePath, $.html(), 'utf-8');
                        sukses++;
                    } else {
                        skip++;
                    }
                } else {
                    daftarGagal.push(`⚠️ [NO META] Meta tag tidak ditemukan di ${filePath}`);
                    skip++;
                    errorCount++;
                }
            } catch (fileErr: any) {
                daftarGagal.push(`❌ [ERROR] Gagal membedah ${filePath}: ${fileErr.message}`);
                errorCount++;
            }
        }

        // 4. PENANGANAN LOG GAGAL
        let adaLog = false;
        if (daftarGagal.length > 0) {
            const waktuEksekusi = new Date().toLocaleString('id-ID');
            const isiLog = `Laporan Reparasi Tanggal Gagal\nWaktu Eksekusi: ${waktuEksekusi}\nFolder di-Scan: [${targetFolders.join(', ')}]\nTotal File Bermasalah: ${daftarGagal.length}\n\nRincian:\n` + daftarGagal.join('\n');
            
            await fs.writeFile(logPath, isiLog, 'utf-8');
            adaLog = true;
        }

        return {
            sukses,
            skip,
            errorCount,
            adaLog,
            message: `Reparasi kelar! Scan pada folder: ${targetFolders.join(', ')}`
        };

    } catch (err: any) {
        return { error: `Gagal membaca artikel.json: ${err.message}` };
    }
}

// ============================================================================
// 3. ALUR RUNTIME BACKEND SERVER (BUN.SERVE)
// ============================================================================
Bun.serve({
    port: 5000,
    async fetch(request) {
        const url = new URL(request.url);

        // ROUTE 1: Tampilkan UI Dashboard
        if (url.pathname === "/" && request.method === "GET") {
            return new Response(htmlTemplate, {
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        }

        // ROUTE 2: Terima Array Folder & Eksekusi
        if (url.pathname === "/sync" && request.method === "POST") {
            try {
                const body = await request.json();
                const targetFolders = body.targetFolders || [];
                
                const hasil = await jalankanSinkronisasi(targetFolders);
                return Response.json(hasil);
            } catch (e: any) {
                return Response.json({ error: "Gagal memproses request dari frontend." });
            }
        }

        // ROUTE 3: Buka File Log Gagal
        if (url.pathname === "/log" && request.method === "GET") {
            try {
                const logPath = path.join(ROOT_DIR, 'laporan-gagal.txt');
                const logContent = await fs.readFile(logPath, 'utf-8');
                return new Response(logContent, {
                    headers: { "Content-Type": "text/plain; charset=utf-8" }
                });
            } catch (e) {
                return new Response("Belum ada file log / Semua file aman sentosa.", { status: 404 });
            }
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log("🚀 Dashboard Tanggal Repair Aktif!");
console.log(`Lokasi Induk: ${ROOT_DIR}`);
console.log("Akses UI di: http://localhost:5000");
