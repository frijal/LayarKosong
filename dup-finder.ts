import { readdir, stat } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import * as cheerio from "cheerio";

// Menyimpan daftar folder yang pernah dikunjungi
const riwayatFolder = new Set();

/**
 * Memindai folder secara rekursif untuk mencari SEMUA file HTML
 */
async function dapatkanFileHtml(dir) {
    let hasil = [];
    try {
        const list = await readdir(dir);
        for (const file of list) {
            if (file === "node_modules" || file === ".git") continue;
            const filePath = join(dir, file);
            const fileStat = await stat(filePath);

            if (fileStat.isDirectory()) {
                hasil = hasil.concat(await dapatkanFileHtml(filePath));
            } else if (file.endsWith(".html") || file.endsWith(".htm")) {
                hasil.push(filePath);
            }
        }
    } catch (e) {
        console.error(`Akses ditolak atau gagal membaca ${dir}`);
    }
    return hasil;
}

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
    } catch (e) {}
    return hasil;
}

/**
 * Memindai seluruh folder riwayat untuk mengumpulkan file backup
 */
async function kumpulkanSemuaBackup() {
    let semuaBackup = [];
    for (const folder of riwayatFolder) {
        const backups = await cariBackupDiFolder(folder);
        semuaBackup = semuaBackup.concat(backups);
    }
    return semuaBackup;
}

// TEMPLATE UI UTAMA DASHBOARD DYNAMIC CLEANER (BATCH EDITION - FILTER DUPLIKAT ONLY)
const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Mass HTML Duplicate Cleaner</title>
<style>
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 24px 32px; background: #121214; color: #e1e1e6; }
.container { width: 100%; max-width: none; background: #202024; padding: 30px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
h2 { color: #00e676; border-bottom: 2px solid #29292e; padding-bottom: 10px; margin-top: 0; }
h3 { margin-top: 30px; color: #3b82f6; border-bottom: 1px solid #29292e; padding-bottom: 5px; }

.input-box { background: #18181c; padding: 20px; border-radius: 6px; border: 1px solid #29292e; margin-bottom: 25px; display: flex; flex-direction: column; gap: 15px; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 14px; color: #a4a4a8; font-weight: bold; }
.input-group input[type="text"], .input-group textarea { width: 100%; padding: 12px; background: #121214; border: 1px solid #45475a; color: #e1e1e6; border-radius: 4px; font-family: monospace; font-size: 14px; }
.input-group input[type="text"]:focus, .input-group textarea:focus { border-color: #00e676; outline: none; }
.input-group textarea { resize: vertical; min-height: 80px; }

.btn { padding: 10px 20px; font-size: 14px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-success { background: #00e676; color: #121214; font-size: 15px; }
.btn-success:hover { background: #00c853; }
.btn-primary { background: #3b82f6; color: white; width: fit-content; padding: 12px 24px; font-size: 15px; }
.btn-primary:hover { background: #2563eb; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-secondary { background: #4f46e5; color: white; }
.btn-secondary:hover { background: #4338ca; }

.component-list { margin: 20px 0; background: #18181c; border: 1px solid #29292e; border-radius: 6px; max-height: 500px; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 12px; }
.component-item { display: flex; align-items: flex-start; gap: 12px; padding: 15px; background: #202024; border-radius: 4px; border: 1px solid #29292e; }
.component-item input[type="checkbox"] { transform: scale(1.3); margin-top: 4px; cursor: pointer; }
.component-details { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.badge { display: inline-block; padding: 4px 8px; font-size: 11px; font-weight: bold; border-radius: 4px; width: fit-content; text-transform: uppercase; }
.file-badge { background: #89b4fa; color: #121214; }
.component-code { font-family: 'Fira Code', monospace; font-size: 13px; color: #f2cdcd; white-space: pre-wrap; word-break: break-all; background: #121214; padding: 10px; border-radius: 4px; border: 1px solid #29292e; max-height: 150px; overflow-y: auto; }

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
    <h2>Mass HTML Duplicate Cleaner (Batch Edition)</h2>
    <p style="color: #a4a4a8; font-size: 13px; margin-top: -5px;">Scan duplikasi di banyak file sekaligus. <strong>Hanya menampilkan file yang terjangkit duplikasi.</strong></p>

    <div class="input-box">
        <div class="input-group">
            <label for="file-path">1. Absolute Path (Bisa Folder, File Spesifik, atau *.html):</label>
            <input type="text" id="file-path" placeholder="Contoh: D:/projects/site/ atau D:/projects/site/*.html">
        </div>
        <div class="input-group">
            <label for="search-snippet">2. Potongan Kode / Teks yang Ingin Dicari:</label>
            <textarea id="search-snippet" placeholder="Paste kode HTML, script, atau teks di sini...&#10;Contoh: if('modelContext' in navigator)"></textarea>
        </div>
        <button class="btn btn-primary" onclick="scanFileHTML()">🔍 Scan Massal Sekarang</button>
    </div>

    <div id="editor-section" style="display: none;">
        <h3>Hasil File yang Terdampak Duplikasi</h3>
        <p style="font-size: 12px; color: #a6adc8; margin-top: -5px;">Hanya menampilkan file dengan temuan &gt; 1. Sistem mencentang <strong>instansi pertama tiap file</strong> (dipertahankan) dan mengosongkan duplikatnya (akan dihapus).</p>
        
        <div class="component-list" id="list-target"></div>

        <div class="action-area" id="action-area" style="display: none;">
            <button class="btn btn-success" onclick="eksekusiPembersihan()">🚀 Eksekusi Penghapusan Massal</button>
            <div id="status">Status: Menunggu eksekusi seleksi...</div>
        </div>
    </div>

    <div class="restore-box">
        <h4 style="margin-top: 0; color: #fbbf24; font-size: 16px;">🔄 Automated Restore Manager</h4>
        <p style="font-size: 12px; color: #a6adc8; margin-top: -5px;">Menampilkan semua file <code>.html-bak</code> dari riwayat folder yang discan.</p>
        <div id="backup-list">Belum ada riwayat folder yang dikunjungi.</div>
        <div class="restore-actions">
            <button class="btn btn-secondary" onclick="muatUlangBackup()">🔄 Refresh Daftar Backup</button>
            <button class="btn btn-danger" onclick="restoreBackupTerpilih()">↩️ Restore File Terpilih</button>
        </div>
    </div>
</div>

<script>
// Array global untuk menyimpan data hasil scan dari berbagai file
let komponenTerdata = [];

async function scanFileHTML() {
    const pathValue = document.getElementById('file-path').value.trim();
    const snippetValue = document.getElementById('search-snippet').value.trim();
    
    if (!pathValue || !snippetValue) {
        alert("Path file/folder dan potongan kode wajib diisi, Jal!");
        return;
    }

    const listContainer = document.getElementById('list-target');
    const editorSection = document.getElementById('editor-section');
    const actionArea = document.getElementById('action-area');
    const statusDiv = document.getElementById('status');
    
    listContainer.innerHTML = "Menyisir DOM Tree secara massal... Mohon tunggu.";
    editorSection.style.display = "block";
    actionArea.style.display = "none";

    try {
        const response = await fetch('/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetPath: pathValue, searchSnippet: snippetValue })
        });

        const data = await response.json();
        
        if (data.error) {
            listContainer.innerHTML = \`<p style="color:#ef4444; padding:10px;">[ERROR] \${data.error}</p>\`;
            return;
        }

        komponenTerdata = data.components;
        
        // JIKA KOSONG (Artinya aman, nggak ada yang dobel)
        if (komponenTerdata.length === 0) {
            listContainer.innerHTML = '<p style="color:#a6e3a1; padding:20px; text-align:center; font-weight:bold; font-size:16px;">✨ Konten Aman! Tidak ditemukan file yang mengalami duplikasi elemen tersebut.</p>';
            return;
        }

        // Tampilkan daftar jika ada
        listContainer.innerHTML = komponenTerdata.map(item => \`
            <div class="component-item" style="\${item.isFirst ? 'border-left: 4px solid #00e676;' : 'border-left: 4px solid #ef4444;'}">
                <input type="checkbox" id="chk-\${item.globalId}" \${item.isFirst ? 'checked' : ''}>
                <div class="component-details">
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <span class="badge file-badge">📄 \${item.fileName}</span>
                        <span class="badge" style="\${item.isFirst ? 'background: #a6e3a1; color: #121214;' : 'background: #f38ba8; color: #121214;'}">
                            \${item.isFirst ? '🎯 Instansi Pertama' : '⚠️ Duplikat (Hapus)'}
                        </span>
                        <span style="font-size: 11px; color: #a4a4a8;">Pembungkus: &lt;\${item.tag}&gt;</span>
                    </div>
                    <div class="component-code">\${escapeHtml(item.html)}</div>
                </div>
            </div>
        \`).join('');

        const jumlahFileTerdampak = new Set(komponenTerdata.map(i => i.absolutePath)).size;
        const jumlahDuplikat = komponenTerdata.filter(i => !i.isFirst).length;
        
        actionArea.style.display = "flex";
        statusDiv.innerText = \`Status: \${jumlahDuplikat} duplikat terdeteksi di dalam \${jumlahFileTerdampak} file.\`;
        muatUlangBackup(); 

    } catch (err) {
        listContainer.innerHTML = '<p style="color:#ef4444; padding:10px;">Gagal terhubung ke server Bun lokal.</p>';
    }
}

async function eksekusiPembersihan() {
    const statusDiv = document.getElementById('status');
    const filePayloads = {};
    let totalDibuang = 0;

    komponenTerdata.forEach(item => {
        const chk = document.getElementById(\`chk-\${item.globalId}\`);
        if (chk && !chk.checked) {
            if (!filePayloads[item.absolutePath]) {
                filePayloads[item.absolutePath] = [];
            }
            filePayloads[item.absolutePath].push(item.domIndex);
            totalDibuang++;
        }
    });

    if (totalDibuang === 0) {
        alert("Semua checkbox dicentang. Tidak ada yang akan dihapus.");
        return;
    }

    statusDiv.innerText = "Sedang mengeksekusi penghapusan massal...";

    try {
        const response = await fetch('/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batches: filePayloads })
        });

        const data = await response.json();
        if (data.error) {
            alert("Gagal memproses: " + data.error);
            statusDiv.innerText = "Status: Gagal.";
        } else {
            alert(data.message);
            statusDiv.innerText = "Status: Eksekusi massal selesai & disimpan!";
            scanFileHTML(); // Refresh UI setelah dihapus
        }
    } catch (err) {
        alert("Koneksi bermasalah: " + err);
    }
}

async function muatUlangBackup() {
    const el = document.getElementById('backup-list');
    try {
        const res = await fetch('/backups');
        const data = await res.json();
        
        if (!data.backups || data.backups.length === 0) {
            el.innerHTML = '<p style="color:#888; font-size:13px; margin: 0;">Tidak ada backup .html-bak di riwayat folder.</p>';
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
        el.innerHTML = '<p style="color:#ef4444; font-size:13px;">Gagal memuat daftar backup.</p>';
    }
}

async function restoreBackupTerpilih() {
    const checkboxes = document.querySelectorAll('#backup-list input:checked');
    const selectedFiles = Array.from(checkboxes).map(cb => cb.value);

    if (selectedFiles.length === 0) { alert('Centang file backup yang mau di-restore.'); return; }
    if (!confirm(\`Yakin mau me-restore \${selectedFiles.length} file?\`)) return;

    try {
        const res = await fetch('/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: selectedFiles })
        });
        const data = await res.json();
        alert(data.message);
        muatUlangBackup();
        scanFileHTML();
    } catch (err) {
        alert('Gagal restore: ' + err);
    }
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
</script>
</body>
</html>
`;

// ALUR BACKEND ENGINE BUN
Bun.serve({
    port: 5000,
    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === "/" && request.method === "GET") {
            return new Response(htmlTemplate, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }

        // ENDPOINT SCAN MASSAL (Menampilkan HANYA File dengan Duplikasi)
        if (url.pathname === "/scan" && request.method === "POST") {
            try {
                const { targetPath, searchSnippet } = await request.json();
                
                let cleanPath = resolve(targetPath);
                let targetFiles = [];

                if (targetPath.includes('*')) {
                    const dirPath = dirname(resolve(targetPath.replace(/\*/g, '')));
                    targetFiles = await dapatkanFileHtml(dirPath);
                    riwayatFolder.add(dirPath);
                } else {
                    const stats = await stat(cleanPath).catch(() => null);
                    if (!stats) return Response.json({ error: "Path tidak ditemukan." }, { status: 404 });

                    if (stats.isDirectory()) {
                        targetFiles = await dapatkanFileHtml(cleanPath);
                        riwayatFolder.add(cleanPath);
                    } else {
                        targetFiles = [cleanPath];
                        riwayatFolder.add(dirname(cleanPath));
                    }
                }

                if (targetFiles.length === 0) {
                    return Response.json({ error: "Tidak ada file HTML ditemukan di target tersebut." }, { status: 404 });
                }

                const searchNormalized = searchSnippet.replace(/\s+/g, '');
                let allFinalMatches = [];
                let globalCounter = 0; 

                // LOOPING KE SEMUA FILE HTML YANG DITEMUKAN
                for (const filePath of targetFiles) {
                    const fileTarget = Bun.file(filePath);
                    const htmlContent = await fileTarget.text();
                    const $ = cheerio.load(htmlContent);
                    
                    let mentahMatches = [];

                    $('*').each((index, element) => {
                        const elHtml = $.html(element);
                        const elNormalized = elHtml.replace(/\s+/g, '');
                        if (elNormalized.includes(searchNormalized)) {
                            mentahMatches.push({ index, element, html: elHtml, tag: element.name });
                        }
                    });

                    // Array sementara buat nampung instansi milik HANYA 1 file spesifik ini
                    let tempFileMatches = [];
                    let fileKemunculanCounter = 0;

                    for (let i = 0; i < mentahMatches.length; i++) {
                        let isParent = false;
                        for (let j = 0; j < mentahMatches.length; j++) {
                            if (i === j) continue;
                            if (mentahMatches[i].html.length > mentahMatches[j].html.length && 
                                mentahMatches[i].html.includes(mentahMatches[j].html)) {
                                isParent = true;
                                break;
                            }
                        }
                        
                        if (!isParent) {
                            fileKemunculanCounter++;
                            globalCounter++;
                            tempFileMatches.push({
                                globalId: globalCounter,
                                absolutePath: filePath,
                                fileName: basename(filePath),
                                domIndex: mentahMatches[i].index, 
                                tag: mentahMatches[i].tag,
                                html: mentahMatches[i].html,
                                isFirst: fileKemunculanCounter === 1 
                            });
                        }
                    }

                    // TAMPILKAN HANYA JIKA ADA DUPLIKASI (Lebih dari 1)
                    if (fileKemunculanCounter > 1) {
                        allFinalMatches.push(...tempFileMatches);
                    }
                }

                return Response.json({ components: allFinalMatches });
            } catch (e) {
                return Response.json({ error: `Gagal membedah target: ${e.message}` }, { status: 400 });
            }
        }

        // ENDPOINT PROSES DELETE MASSAL
        if (url.pathname === "/process" && request.method === "POST") {
            try {
                const { batches } = await request.json();
                let fileDiedit = 0;
                let elemenDihapus = 0;

                for (const [filePath, removeIndices] of Object.entries(batches)) {
                    if (!removeIndices || removeIndices.length === 0) continue;

                    const fileTarget = Bun.file(filePath);
                    if (!(await fileTarget.exists())) continue;

                    const originalHtml = await fileTarget.text();
                    const $ = cheerio.load(originalHtml);

                    $('*').each((index, element) => {
                        if (removeIndices.includes(index)) {
                            $(element).remove();
                            elemenDihapus++;
                        }
                    });

                    const backupPath = `${filePath}-bak`;
                    const fileBackup = Bun.file(backupPath);
                    if (!(await fileBackup.exists())) {
                        await Bun.write(backupPath, originalHtml);
                    }

                    const hasilHtmlBersih = $.html();
                    await Bun.write(filePath, hasilHtmlBersih);
                    fileDiedit++;
                }

                return Response.json({ 
                    message: `Berhasil mengeksekusi! ${elemenDihapus} elemen duplikat telah dibasmi dari ${fileDiedit} file.\n\n💾 Backup aman tersedia.` 
                });
            } catch (e) {
                return Response.json({ error: `Gagal menyimpan pembersihan massal: ${e.message}` }, { status: 400 });
            }
        }

        // ENDPOINT GET BACKUPS
        if (url.pathname === "/backups" && request.method === "GET") {
            try {
                const listBackup = await kumpulkanSemuaBackup();
                return Response.json({ backups: listBackup });
            } catch (e) {
                return Response.json({ error: e.message }, { status: 500 });
            }
        }

        // ENDPOINT RESTORE
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
                return Response.json({ message: `Berhasil restore ${suksesCount} file!` });
            } catch (e) {
                return Response.json({ error: `Proses restore gagal: ${e.message}` }, { status: 400 });
            }
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log("🚀 Batch Scanner Aktif! Buka browser di: http://localhost:5000");
