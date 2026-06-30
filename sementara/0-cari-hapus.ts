import { readdir, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

// === MODIFIKASI: ROOT_DIR diarahkan ke folder induk (root proyek) ===
const ROOT_DIR = resolve(import.meta.dir, "..");

/**
 * Fungsi Rekursif untuk menyisir seluruh folder dan subfolder
 */
async function sisirSemuaFolder(dirPath: string, targetKeyword: string, hasil: any[] = []) {
    try {
        const list = await readdir(dirPath, { withFileTypes: true });

        for (const item of list) {
            const fullPath = join(dirPath, item.name);

            if (item.isDirectory()) {
                if (item.name === "node_modules" || item.name === ".git") continue;
                await sisirSemuaFolder(fullPath, targetKeyword, hasil);
            } else if (item.isFile()) {
                if (item.name.toLowerCase().includes(targetKeyword.toLowerCase())) {
                    hasil.push({
                        nama: item.name,
                        path: fullPath
                    });
                }
            }
        }
    } catch (e: any) {
        console.error(`Gagal menyisir folder ${dirPath}: ${e.message}`);
    }
    return hasil;
}

// TEMPLATE UI (tidak berubah)
const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Dynamic File Hunter Dashboard</title>
<style>
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 24px 32px; background: #121214; color: #e1e1e6; }
.container { width: 100%; max-width: none; background: #202024; padding: 30px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
h2 { color: #ff3e3e; border-bottom: 2px solid #29292e; padding-bottom: 10px; margin-top: 0; }

.search-box { display: flex; flex-direction: column; gap: 8px; background: #18181c; padding: 20px; border-radius: 6px; border: 1px solid #29292e; margin-bottom: 25px; }
.search-box label { font-size: 14px; color: #a4a4a8; font-weight: bold; }
textarea { width: 100%; height: 80px; padding: 12px; background: #121214; border: 1px solid #45475a; color: #e1e1e6; border-radius: 4px; font-family: monospace; font-size: 14px; resize: vertical; }
textarea:focus { border-color: #ff3e3e; outline: none; }

.btn { padding: 10px 20px; font-size: 14px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s; display: inline-flex; align-items: center; gap: 6px; }
.btn-search { background: #3b82f6; color: white; font-size: 15px; }
.btn-search:hover { background: #2563eb; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-control { background: #4b5563; color: white; }
.btn-control:hover { background: #374151; }

.control-group { margin: 15px 0; display: flex; gap: 10px; }

.file-list { margin: 20px 0; background: #18181c; border: 1px solid #29292e; border-radius: 6px; max-height: 450px; overflow-y: auto; padding: 10px; }
.file-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-bottom: 1px solid #29292e; background: #202024; margin-bottom: 6px; border-radius: 4px; }
.file-item:last-child { border-bottom: none; margin-bottom: 0; }
.file-item input[type="checkbox"] { transform: scale(1.2); margin-top: 4px; cursor: pointer; }
.file-details { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.file-name { font-weight: bold; color: #00e676; font-size: 14px; }
.file-path { font-family: 'Fira Code', monospace; font-size: 12px; color: #a6adc8; word-break: break-all; background: #121214; padding: 6px 10px; border-radius: 4px; border: 1px solid #29292e; margin-top: 4px; }

.action-area { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; background: #18181c; padding: 15px 20px; border-radius: 6px; border: 1px solid #29292e; }
#status { font-style: italic; color: #ffb300; font-weight: bold; font-size: 15px; }
</style>
</head>
<body>
<div class="container">
<h2>File Hunter & Destroyer Dashboard</h2>
<p style="color: #a4a4a8; font-size: 13px; margin-top: -5px;">Lokasi Scan Induk: <code style="color: #3b82f6;">${ROOT_DIR}</code></p>

<div class="search-box">
<label for="search-query">Masukkan Nama File yang Ingin Dicari:</label>
<textarea id="search-query" placeholder="Contoh: index.html, .log, atau nama file spesifik lainnya..."></textarea>
<div style="margin-top: 5px;">
<button class="btn btn-search" onclick="mulaiPenyisiran()">🔍 Mulai Penyisir Folder</button>
</div>
</div>

<div id="preview-section" style="display: none;">
<h3>Kotak Preview Hasil Penyisiran</h3>

<div class="control-group">
<button class="btn btn-control" onclick="pilihSemua(true)">☑ Pilih Semua</button>
<button class="btn btn-control" onclick="pilihSemua(false)">☒ Batalkan Pilihan</button>
</div>

<div class="file-list" id="list-files">
</div>

<div class="action-area">
<button class="btn btn-danger" onclick="eksekusiPenghapusan()">🗑️ Hapus File Terpilih (Permanen)</button>
<div id="status">Status: Standby...</div>
</div>
</div>
</div>

<script>
let fileTerdata = [];

async function mulaiPenyisiran() {
    const query = document.getElementById('search-query').value.trim();
    if (!query) {
        alert("Isi dulu nama filenya di text area, Jal!");
        return;
    }

    const listContainer = document.getElementById('list-files');
    const previewSection = document.getElementById('preview-section');
    const statusDiv = document.getElementById('status');

    listContainer.innerHTML = "Sedang menyisir seluruh isi folder hingga akar subfolder...";
    previewSection.style.display = "block";
    statusDiv.innerText = "Status: Mencari file...";

    try {
        const response = await fetch('/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });

        const data = await response.json();
        fileTerdata = data.files || [];

        if (fileTerdata.length === 0) {
            listContainer.innerHTML = '<p style="color:#888; padding:15px; text-align:center;">Zonk! Tidak ada file yang cocok dengan kata kunci tersebut.</p>';
            statusDiv.innerText = "Status: Selesai (0 ditemukan).";
            return;
        }

        listContainer.innerHTML = fileTerdata.map((file, idx) => \`
        <div class="file-item">
        <input type="checkbox" class="file-chk" data-path="\${encodeURIComponent(file.path)}">
        <div class="file-details">
        <div class="file-name">📄 \${escapeHtml(file.nama)}</div>
        <div class="file-path">\${escapeHtml(file.path)}</div>
        </div>
        </div>
        \`).join('');

        statusDiv.innerText = \`Status: Ditemukan \${fileTerdata.length} file.\`;

    } catch (err) {
        listContainer.innerHTML = '<p style="color:#ef4444; padding:10px;">Gagal terhubung ke server backend Bun.</p>';
        statusDiv.innerText = "Status: Error.";
    }
}

function pilihSemua(status) {
    const checkboxes = document.querySelectorAll('.file-chk');
    checkboxes.forEach(cb => cb.checked = status);
}

async function eksekusiPenghapusan() {
    const checkboxes = document.querySelectorAll('.file-chk:checked');
    const filesToDelete = Array.from(checkboxes).map(cb => decodeURIComponent(cb.getAttribute('data-path')));
    const statusDiv = document.getElementById('status');

    if (filesToDelete.length === 0) {
        alert("Centang dulu file yang mau dihabisi di kotak preview, Jal!");
        return;
    }

    if (!confirm(\`PERINGATAN! Kamu yakin ingin menghapus permanen \${filesToDelete.length} file ini?\`)) {
        return;
    }

    statusDiv.innerText = "Sedang menghapus file target...";

    try {
        const response = await fetch('/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: filesToDelete })
        });

        const data = await response.json();

        if (data.error) {
            alert("Ada kendala: " + data.error);
            statusDiv.innerText = "Status: Gagal menghapus.";
        } else {
            alert(data.message);
            statusDiv.innerText = "Status: Pembersihan sukses!";
            mulaiPenyisiran();
        }
    } catch (err) {
        alert("Koneksi ke backend terputus: " + err);
        statusDiv.innerText = "Status: Error sistem.";
    }
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
</script>
</body>
</html>
`;

// ALUR RUNTIME BACKEND SERVER
Bun.serve({
    port: 5000,
    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === "/" && request.method === "GET") {
            return new Response(htmlTemplate, {
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        }

        if (url.pathname === "/search" && request.method === "POST") {
            try {
                const { query } = await request.json();
                if (!query) {
                    return Response.json({ error: "Query pencarian kosong." }, { status: 400 });
                }

                const filesFound = await sisirSemuaFolder(ROOT_DIR, query);
                return Response.json({ files: filesFound });
            } catch (e: any) {
                return Response.json({ error: `Gagal mencari file: ${e.message}` }, { status: 500 });
            }
        }

        if (url.pathname === "/delete" && request.method === "POST") {
            try {
                const { files } = await request.json();
                let suksesHapus = 0;
                let gagalHapus = 0;

                for (const pathFile of files) {
                    try {
                        await unlink(pathFile);
                        suksesHapus++;
                    } catch (err: any) {
                        console.error(`Gagal menghapus ${pathFile}: ${err.message}`);
                        gagalHapus++;
                    }
                }

                return Response.json({
                    message: `Berhasil memusnahkan ${suksesHapus} file! ${gagalHapus > 0 ? `\n(Gagal menghapus ${gagalHapus} file karena proteksi sistem)` : ''}`
                });
            } catch (e: any) {
                return Response.json({ error: `Gagal mengeksekusi penghapusan: ${e.message}` }, { status: 500 });
            }
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log("🚀 File Hunter & Destroyer Aktif!");
console.log(`Lokasi Induk Tracking: ${ROOT_DIR}`);
console.log("Buka dashboard kamu di: http://localhost:5000");
