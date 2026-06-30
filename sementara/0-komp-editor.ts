import { readdir, stat } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import * as cheerio from "cheerio";

// Menyimpan daftar folder yang pernah dikunjungi selama aplikasi aktif
const riwayatFolder = new Set();

/**
 * Memindai satu folder spesifik untuk mencari file backup (*-bak)
 */
async function cariBackupDiFolder(dirPath) {
    let hasil = [];
    try {
        const list = await readdir(dirPath);
        for (const file of list) {
            if (file.endsWith("-bak")) {
                hasil.push(join(dirPath, file));
            }
        }
    } catch (e) {
        console.error(`Gagal memindai folder backup di ${dirPath}: ${e.message}`);
    }
    return hasil;
}

/**
 * Memindai seluruh folder yang ada di riwayatFolder untuk mengumpulkan semua file backup
 */
async function kumpulkanSemuaBackup() {
    let semuaBackup = [];
    for (const folder of riwayatFolder) {
        const backups = await cariBackupDiFolder(folder);
        semuaBackup = semuaBackup.concat(backups);
    }
    return semuaBackup;
}

// TEMPLATE UI (tidak berubah)
const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Dynamic HTML Cleaner Dashboard</title>
<style>
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 24px 32px; background: #121214; color: #e1e1e6; }
.container { width: 100%; max-width: none; background: #202024; padding: 30px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
h2 { color: #00e676; border-bottom: 2px solid #29292e; padding-bottom: 10px; margin-top: 0; }
h3 { margin-top: 30px; color: #3b82f6; border-bottom: 1px solid #29292e; padding-bottom: 5px; }

.path-input-box { display: flex; flex-direction: column; gap: 8px; background: #18181c; padding: 20px; border-radius: 6px; border: 1px solid #29292e; margin-bottom: 25px; }
.path-input-box label { font-size: 14px; color: #a4a4a8; font-weight: bold; }
.path-row { display: flex; gap: 10px; }
.path-row input[type="text"] { flex: 1; padding: 12px; background: #121214; border: 1px solid #45475a; color: #e1e1e6; border-radius: 4px; font-family: monospace; font-size: 14px; }
.path-row input[type="text"]:focus { border-color: #00e676; outline: none; }

.btn { padding: 10px 20px; font-size: 14px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-success { background: #00e676; color: #121214; font-size: 15px; }
.btn-success:hover { background: #00c853; }
.btn-primary { background: #3b82f6; color: white; }
.btn-primary:hover { background: #2563eb; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-secondary { background: #4f46e5; color: white; }
.btn-secondary:hover { background: #4338ca; }

.component-list { margin: 20px 0; background: #18181c; border: 1px solid #29292e; border-radius: 6px; max-height: 400px; overflow-y: auto; padding: 10px; }
.component-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-bottom: 1px solid #29292e; background: #202024; margin-bottom: 6px; border-radius: 4px; }
.component-item:last-child { border-bottom: none; margin-bottom: 0; }
.component-item input[type="checkbox"] { transform: scale(1.2); margin-top: 4px; cursor: pointer; }
.component-details { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.badge { display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 3px; width: fit-content; text-transform: uppercase; }
.badge-div { background: #f38ba8; color: #121214; }
.badge-script { background: #a6e3a1; color: #121214; }
.badge-link { background: #89b4fa; color: #121214; }
.component-code { font-family: 'Fira Code', monospace; font-size: 13px; color: #f2cdcd; white-space: pre-wrap; word-break: break-all; background: #121214; padding: 6px 10px; border-radius: 4px; border: 1px solid #29292e; margin-top: 4px; }

.action-area { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
#status { font-style: italic; color: #ffb300; font-weight: bold; font-size: 15px; }

.restore-box { background: #18181c; padding: 20px; border-radius: 6px; border: 1px solid #29292e; margin-top: 40px; }
.backup-item { background: #202024; padding: 10px 14px; margin: 6px 0; border-radius: 4px; font-size: 13px; display: flex; align-items: center; gap: 10px; border: 1px solid #29292e; }
.backup-item input[type="checkbox"] { transform: scale(1.1); cursor: pointer; }
.backup-item code { color: #a6e3a1; word-break: break-all; }
.restore-actions { margin-top: 15px; display: flex; gap: 10px; }
</style>
</head>
<body>
<div class="container">
<h2>Dynamic HTML Cleaner Dashboard</h2>
<p style="color: #a4a4a8; font-size: 13px; margin-top: -5px;">Scan komponen HTML lintas folder, filter via checkbox, dan bersihkan kode instan.</p>

<div class="path-input-box">
<label for="file-path">Absolute Path File HTML Target:</label>
<div class="path-row">
<input type="text" id="file-path" placeholder="Contoh: ../index.html atau ../../folder-lain/artikel.html">
<button class="btn btn-primary" onclick="scanFileHTML()">🔍 Scan Komponen</button>
</div>
<span style="font-size: 11px; color: #89block; color:#a6adc8;">💡 Tip: Salin alamat path lengkap file dari File Explorer lalu paste di atas untuk beroperasi antar folder.</span>
</div>

<div id="editor-section" style="display: none;">
<h3>Daftar Komponen Terdeteksi</h3>
<p style="font-size: 12px; color: #a6adc8; margin-top: -5px;">Contreng dinonaktifkan (kosongkan) = Komponen tersebut akan <strong>dihapus permanen</strong> dari struktur file saat disimpan.</p>

<div class="component-list" id="list-target">
</div>

<div class="action-area">
<button class="btn btn-success" onclick="eksekusiPembersihan()">🚀 Proses & Simpan File Isi Baru</button>
<div id="status">Status: Menunggu instruksi seleksi...</div>
</div>
</div>

<div class="restore-box">
<h4 style="margin-top: 0; color: #fbbf24; font-size: 16px;">🔄 Automated Restore Manager</h4>
<p style="font-size: 12px; color: #a6adc8; margin-top: -5px;">Menampilkan semua file <code>.html-bak</code> dari seluruh riwayat direktori yang pernah kamu scan sebelumnya di aplikasi ini.</p>

<div id="backup-list">Belum ada riwayat folder yang dikunjungi. Silakan lakukan scan file terlebih dahulu.</div>

<div class="restore-actions">
<button class="btn btn-secondary" onclick="muatUlangBackup()">🔄 Refresh Daftar Backup</button>
<button class="btn btn-danger" onclick="restoreBackupTerpilih()">↩️ Restore File Terpilih</button>
</div>
</div>
</div>

<script>
let komponenTerdata = [];

async function scanFileHTML() {
    const pathValue = document.getElementById('file-path').value.trim();
    if (!pathValue) {
        alert("Silakan isi absolute path filenya dulu, Jal!");
        return;
    }

    const listContainer = document.getElementById('list-target');
    const editorSection = document.getElementById('editor-section');
    const statusDiv = document.getElementById('status');

    listContainer.innerHTML = "Sedang membedah struktur HTML...";
    editorSection.style.display = "block";

    try {
        const response = await fetch('/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: pathValue })
        });

        const data = await response.json();

        if (data.error) {
            listContainer.innerHTML = \`<p style="color:#ef4444; padding:10px;">[ERROR] \${data.error}</p>\`;
            return;
        }

        komponenTerdata = data.components;
        if (komponenTerdata.length === 0) {
            listContainer.innerHTML = '<p style="color:#888; padding:15px; text-align:center;">Semua aman! Tidak ditemukan satupun komponen target di dalam file ini.</p>';
            statusDiv.innerText = "Status: Scan selesai (Kosong).";
            return;
        }

        listContainer.innerHTML = komponenTerdata.map(item => \`
        <div class="component-item">
        <input type="checkbox" id="chk-\${item.index}" checked>
        <div class="component-details">
        <div>
        <span class="badge badge-\${item.tag}">\${item.tag}</span>
        </div>
        <div class="component-code">\${escapeHtml(item.html)}</div>
        </div>
        </div>
        \`).join('');

        statusDiv.innerText = \`Status: Ditemukan \${komponenTerdata.length} komponen siap difilter.\`;
        muatUlangBackup();

    } catch (err) {
        listContainer.innerHTML = '<p style="color:#ef4444; padding:10px;">Gagal terhubung ke server Bun lokal.</p>';
    }
}

async function eksekusiPembersihan() {
    const pathValue = document.getElementById('file-path').value.trim();
    const statusDiv = document.getElementById('status');

    const indexDibuang = [];
    komponenTerdata.forEach(item => {
        const chk = document.getElementById(\`chk-\${item.index}\`);
        if (chk && !chk.checked) {
            indexDibuang.push(item.index);
        }
    });

    statusDiv.innerText = "Sedang mengeksekusi filter DOM & menyimpan...";

    try {
        const response = await fetch('/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: pathValue, removeIndices: indexDibuang })
        });

        const data = await response.json();
        if (data.error) {
            alert("Gagal memproses: " + data.error);
            statusDiv.innerText = "Status: Gagal.";
        } else {
            alert(data.message);
            statusDiv.innerText = "Status: File berhasil diperbarui dengan aman!";
            scanFileHTML();
        }
    } catch (err) {
        alert("Koneksi bermasalah: " + err);
    }
}

async function muatUlangBackup() {
    const el = document.getElementById('backup-list');
    el.innerHTML = "Memindai seluruh riwayat folder...";

    try {
        const res = await fetch('/backups');
        const data = await res.json();

        if (!data.backups || data.backups.length === 0) {
            el.innerHTML = '<p style="color:#888; font-size:13px; margin: 0;">Tidak ditemukan file backup (*.html-bak) di folder-folder aktif saat ini.</p>';
            return;
        }

        el.innerHTML = data.backups.map(b => \`
        <div class="backup-item">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; width:100%;">
        <input type="checkbox" value="\${b}">
        <code>\${b}</code>
        </label>
        </div>
        \`).join('');
    } catch (err) {
        el.innerHTML = '<p style="color:#ef4444; font-size:13px;">Gagal mengambil data riwayat backup.</p>';
    }
}

async function restoreBackupTerpilih() {
    const checkboxes = document.querySelectorAll('#backup-list input:checked');
    const selectedFiles = Array.from(checkboxes).map(cb => cb.value);

    if (selectedFiles.length === 0) {
        alert('Centang dulu file backup di daftar bawah yang mau kamu kembalikan, Jal.');
        return;
    }

    if (!confirm(\`Kamu yakin mau mengembalikan \${selectedFiles.length} file dari backup asli? Isi file sekarang akan ditimpa.\`)) return;

    try {
        const res = await fetch('/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: selectedFiles })
        });
        const data = await res.json();
        alert(data.message);
        muatUlangBackup();

        const currentPath = document.getElementById('file-path').value.trim();
        if (currentPath) scanFileHTML();
    } catch (err) {
        alert('Gagal mengeksekusi restore: ' + err);
    }
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
</script>
</body>
</html>
`;

// ALUR BACKEND ENGINE BUN SERVER
Bun.serve({
    port: 5000,
    async fetch(request) {
        const url = new URL(request.url);

        const TARGET_SELECTOR = 'div[id], script[defer][src], link[href], a#layar-kosong-header, div.search-floating-container, section#related-marquee-section';

if (url.pathname === "/" && request.method === "GET") {
    return new Response(htmlTemplate, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}

if (url.pathname === "/scan" && request.method === "POST") {
    try {
        const { filePath } = await request.json();
        const absolutePath = resolve(filePath);
        const fileTarget = Bun.file(absolutePath);

        if (!(await fileTarget.exists())) {
            return Response.json({ error: "File tidak ditemukan! Periksa kembali penulisan path filenya." }, { status: 404 });
        }

        riwayatFolder.add(dirname(absolutePath));

        const htmlContent = await fileTarget.text();
        const $ = cheerio.load(htmlContent);
        const components = [];

        $(TARGET_SELECTOR).each((index, element) => {
            components.push({
                index: index,
                tag: element.name,
                html: $.html(element)
            });
        });

        return Response.json({ components });
    } catch (e) {
        return Response.json({ error: `Gagal membedah dokumen: ${e.message}` }, { status: 400 });
    }
}

if (url.pathname === "/process" && request.method === "POST") {
    try {
        const { filePath, removeIndices } = await request.json();
        const absolutePath = resolve(filePath);
        const fileTarget = Bun.file(absolutePath);

        if (!(await fileTarget.exists())) {
            return Response.json({ error: "File target mendadak hilang sebelum diproses." }, { status: 404 });
        }

        const originalHtml = await fileTarget.text();
        const $ = cheerio.load(originalHtml);

        $(TARGET_SELECTOR).each((index, element) => {
            if (removeIndices.includes(index)) {
                $(element).remove();
            }
        });

        const backupPath = `${absolutePath}-bak`;
        const fileBackup = Bun.file(backupPath);
        if (!(await fileBackup.exists())) {
            await Bun.write(backupPath, originalHtml);
        }

        const hasilHtmlBersih = $.html();
        await Bun.write(absolutePath, hasilHtmlBersih);

        return Response.json({
            message: `Sukses memotong ${removeIndices.length} komponen! File asli telah diperbarui.\n\n💾 Backup aman tersedia di lokasi yang sama.`
        });
    } catch (e) {
        return Response.json({ error: `Gagal mengedit kode file: ${e.message}` }, { status: 400 });
    }
}

if (url.pathname === "/backups" && request.method === "GET") {
    try {
        const listBackup = await kumpulkanSemuaBackup();
        return Response.json({ backups: listBackup });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}

if (url.pathname === "/restore" && request.method === "POST") {
    try {
        const { files } = await request.json();
        let suksesCount = 0;

        for (const bPath of files) {
            if (!bPath.endsWith("-bak")) continue;

            const fileBackup = Bun.file(bPath);
            if (await fileBackup.exists()) {
                const originalPath = bPath.slice(0, -"-bak".length);
                const dataAsli = await fileBackup.text();

                await Bun.write(originalPath, dataAsli);
                suksesCount++;
            }
        }

        return Response.json({ message: `Berhasil mengembalikan ${suksesCount} file ke kondisi original awal!` });
    } catch (e) {
        return Response.json({ error: `Proses restore gagal: ${e.message}` }, { status: 400 });
    }
}

return new Response("Not Found", { status: 404 });
    },
});

console.log("🚀 Dynamic HTML Cleaner Aktif!");
console.log("Buka browser kamu di: http://localhost:5000");
