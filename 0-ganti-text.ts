import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const EXCLUDED_DIRS = new Set(["node_modules", "functions", "img", "mini", "sementara"]);

// ============================================================================
// 1. TEMPLATE UI DASHBOARD
// ============================================================================
const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Global Replace - Layar Kosong</title>
<style>
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 24px 32px; background: #121214; color: #e1e1e6; }
.container { width: 100%; max-width: 900px; margin: 0 auto; background: #202024; padding: 30px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
h2 { color: #00b0ed; border-bottom: 2px solid #29292e; padding-bottom: 10px; margin-top: 0; display: flex; align-items: center; gap: 10px; }

/* Grid Layout untuk Input */
.input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.form-group { background: #18181c; padding: 15px; border-radius: 6px; border: 1px solid #29292e; }
.form-group.full { grid-column: 1 / -1; }

label { display: block; font-size: 14px; color: #a4a4a8; font-weight: bold; margin-bottom: 8px; }
input[type="text"], textarea { width: 100%; padding: 12px; background: #121214; border: 1px solid #45475a; color: #e1e1e6; border-radius: 4px; font-family: 'Fira Code', monospace; font-size: 14px; outline: none; }
input[type="text"]:focus, textarea:focus { border-color: #00b0ed; }
textarea { height: 120px; resize: vertical; }

.text-danger:focus { border-color: #ef4444 !important; }

/* Tombol Eksekusi */
.btn-sync { background: #ef4444; color: white; width: 100%; font-size: 16px; padding: 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; margin-top: 10px; }
.btn-sync:hover { background: #dc2626; transform: translateY(-2px); }
.btn-sync:disabled { background: #4b5563; cursor: not-allowed; transform: none; }

/* Statistik */
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
.stat-box { background: #18181c; border: 1px solid #29292e; border-radius: 6px; padding: 15px; text-align: center; }
.stat-box h3 { margin: 0 0 5px 0; font-size: 28px; }
.stat-box p { margin: 0; font-size: 12px; color: #a4a4a8; text-transform: uppercase; letter-spacing: 1px; }

/* Daftar File */
.file-list { margin-top: 20px; background: #18181c; border: 1px solid #29292e; border-radius: 6px; max-height: 300px; overflow-y: auto; padding: 10px; display: none; }
.file-item { padding: 8px 12px; border-bottom: 1px solid #29292e; font-family: monospace; font-size: 13px; color: #00e676; }
.file-item:last-child { border-bottom: none; }

.action-area { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; background: #18181c; padding: 15px 20px; border-radius: 6px; border: 1px solid #29292e; }
#status { font-style: italic; color: #ffb300; font-weight: bold; font-size: 14px; }
</style>
</head>
<body>
<div class="container">
<h2>🪄 Dashboard Global Search & Replace</h2>
<p style="color: #a4a4a8; font-size: 13px; margin-top: -5px;">Lokasi Akar: <code style="color: #00b0ed;">${ROOT_DIR}</code></p>

<div class="input-grid">
    <div class="form-group">
        <label>🔍 Cari Teks (Search):</label>
        <textarea id="search-text" class="text-danger" placeholder="Masukkan teks yang mau diganti..."></textarea>
    </div>
    <div class="form-group">
        <label>✏️ Ganti Menjadi (Replace):</label>
        <textarea id="replace-text" placeholder="Masukkan teks baru (kosongkan jika ingin menghapus teks di samping)..."></textarea>
    </div>
    
    <div class="form-group">
        <label>📂 Folder Target (kosongkan untuk root):</label>
        <input type="text" id="target-folder" placeholder="contoh: artikelx atau .">
    </div>
    <div class="form-group">
        <label>📄 Ekstensi File (pisahkan koma):</label>
        <input type="text" id="target-ext" placeholder="contoh: html, ts, css (kosongkan untuk semua)">
    </div>
</div>

<button id="btn-sync" class="btn-sync" onclick="mulaiGanti()">⚠️ Eksekusi Penggantian Masal (Aksi Permanen!)</button>

<div class="stats-grid">
    <div class="stat-box">
        <h3 id="stat-checked" style="color: #3b82f6;">0</h3>
        <p>File Diperiksa</p>
    </div>
    <div class="stat-box">
        <h3 id="stat-changed" style="color: #00e676;">0</h3>
        <p>File Diubah</p>
    </div>
</div>

<div class="action-area">
    <div id="status">Status: Standby. Siap menerima perintah...</div>
</div>

<div class="file-list" id="file-list"></div>

</div>

<script>
async function mulaiGanti() {
    const searchVal = document.getElementById('search-text').value;
    const replaceVal = document.getElementById('replace-text').value;
    const folderVal = document.getElementById('target-folder').value.trim() || '.';
    const extVal = document.getElementById('target-ext').value.trim();

    if (!searchVal) {
        alert("Kolom 'Cari Teks' nggak boleh kosong, Jal!");
        return;
    }

    if (!confirm(\`Yakin mau mengganti teks ini di folder "\${folderVal}"?\nPeringatan: Aksi ini tidak bisa di-undo (kecuali lewat Git)!\`)) {
        return;
    }

    const btn = document.getElementById('btn-sync');
    const statusDiv = document.getElementById('status');
    const fileListEl = document.getElementById('file-list');
    
    // Reset UI
    btn.disabled = true;
    btn.innerHTML = "⏳ Sedang Membedah Ribuan File...";
    statusDiv.innerText = "Status: Menyisir folder dan mengganti teks...";
    statusDiv.style.color = "#ffb300";
    fileListEl.style.display = 'none';
    document.getElementById('stat-checked').innerText = "0";
    document.getElementById('stat-changed').innerText = "0";

    try {
        const response = await fetch('/replace', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                search: searchVal, 
                replace: replaceVal, 
                folder: folderVal, 
                exts: extVal 
            })
        });
        
        const data = await response.json();

        if (data.error) {
            statusDiv.innerText = "Status Gagal: " + data.error;
            statusDiv.style.color = "#ef4444";
        } else {
            // Update Stats
            document.getElementById('stat-checked').innerText = data.checkedCount;
            document.getElementById('stat-changed').innerText = data.changedCount;
            
            statusDiv.innerText = data.message;
            statusDiv.style.color = "#00e676";

            if (data.changedCount > 0) {
                fileListEl.style.display = 'block';
                fileListEl.innerHTML = data.changedFiles.map(f => \`<div class="file-item">✅ \${f}</div>\`).join('');
            }
        }
    } catch (err) {
        statusDiv.innerText = "Koneksi ke backend terputus: " + err;
        statusDiv.style.color = "#ef4444";
    } finally {
        btn.disabled = false;
        btn.innerHTML = "⚠️ Eksekusi Penggantian Masal (Aksi Permanen!)";
    }
}
</script>
</body>
</html>
`;

// ============================================================================
// 2. FUNGSI INTI SEARCH & REPLACE (Asynchronous)
// ============================================================================

// Fungsi untuk menyisir folder secara rekursif
async function walkDir(dir: string, allowedExts: string[]): Promise<string[]> {
    let results: string[] = [];
    try {
        const list = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of list) {
            if (entry.name.startsWith(".")) continue;
            if (EXCLUDED_DIRS.has(entry.name)) continue;

            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                const subResults = await walkDir(fullPath, allowedExts);
                results = results.concat(subResults);
            } else {
                const ext = path.extname(entry.name);
                if (allowedExts.length === 0 || allowedExts.includes(ext)) {
                    results.push(fullPath);
                }
            }
        }
    } catch (err: any) {
        console.error(`⚠️ Lewati folder ${dir}: ${err.message}`);
    }
    return results;
}

async function jalankanPenggantian(searchStr: string, replaceStr: string, targetFolder: string, extString: string) {
    const fullTargetDir = path.join(ROOT_DIR, targetFolder);
    
    // Parsing Ekstensi
    const exts = extString
        .split(",")
        .map((e) => `.${e.trim().replace(/^\./, '')}`) // Normalisasi: buang titik kalau user nulis ".html"
        .filter((e) => e.length > 1 && e !== '.');

    let checkedCount = 0;
    let changedCount = 0;
    const changedFiles: string[] = [];

    try {
        // Cek apakah folder tujuan ada
        const stat = await fs.stat(fullTargetDir);
        if (!stat.isDirectory()) throw new Error("Target bukan sebuah folder yang valid.");

        // Dapatkan semua file yang memenuhi syarat
        const allFiles = await walkDir(fullTargetDir, exts);

        // Eksekusi penggantian
        for (const file of allFiles) {
            checkedCount++;
            try {
                const original = await fs.readFile(file, "utf-8");
                const updated  = original.replaceAll(searchStr, replaceStr);
                
                if (original !== updated) {
                    await fs.writeFile(file, updated, "utf-8");
                    changedFiles.push(file);
                    changedCount++;
                }
            } catch (err) {
                console.error(`❌ Gagal proses ${file}`);
            }
        }

        // Tulis output log file (Syarat workflow lamamu)
        if (changedCount > 0) {
            const sementaraDir = path.join(ROOT_DIR, "sementara");
            try {
                // Bikin foldernya kalau misal kehapus
                await fs.mkdir(sementaraDir, { recursive: true });
                const outputPath = path.join(sementaraDir, "changed_files.txt");
                await fs.writeFile(outputPath, changedFiles.join(","), "utf-8");
            } catch (e) {
                console.error("Gagal nulis ke folder sementara", e);
            }
        }

        return {
            checkedCount,
            changedCount,
            changedFiles,
            message: `Alhamdulillah kelar! Berhasil ngubah teks di ${changedCount} file.`
        };

    } catch (e: any) {
        return { error: e.message };
    }
}

// ============================================================================
// 3. ALUR RUNTIME BACKEND SERVER
// ============================================================================
Bun.serve({
    port: 5000,
    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === "/" && request.method === "GET") {
            return new Response(htmlTemplate, {
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        }

        if (url.pathname === "/replace" && request.method === "POST") {
            try {
                const body = await request.json();
                const { search, replace, folder, exts } = body;
                
                if (!search) {
                    return Response.json({ error: "Kolom pencarian nggak boleh kosong." }, { status: 400 });
                }

                const hasil = await jalankanPenggantian(search, replace, folder, exts);
                return Response.json(hasil);
            } catch (e: any) {
                return Response.json({ error: "Gagal memproses request." }, { status: 500 });
            }
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log("🚀 Dashboard Global Search & Replace Aktif!");
console.log(`Lokasi Akar: ${ROOT_DIR}`);
console.log("Akses UI di: http://localhost:5000");
