import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { Glob } from 'bun';

// Folder induk tempat script dieksekusi
const ROOT_DIR = process.cwd();

// ============================================================================
// 1. TEMPLATE UI DASHBOARD (TANGGAL REPAIR + RUQYAH + GENERATOR PRO)
// ============================================================================
const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard Layar Kosong</title>
<style>
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 24px; background: #121214; color: #e1e1e6; }
/* Lebar dashboard diperbesar hampir 100% dari layar untuk kenyamanan baca log */
.container { width: 96%; max-width: 1600px; margin: 0 auto; background: #202024; padding: 30px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
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

.btn-ruqyah { background: #9333ea; color: white; width: 100%; font-size: 16px; margin-top: 10px; }
.btn-ruqyah:hover { background: #7e22ce; transform: translateY(-2px); }
.btn-ruqyah:disabled { background: #4b5563; cursor: not-allowed; transform: none; }

.btn-gen { background: #10b981; color: white; width: 100%; font-size: 16px; margin-top: 10px; border: 1px solid #059669; }
.btn-gen:hover { background: #059669; transform: translateY(-2px); }
.btn-gen:disabled { background: #374151; color: #9ca3af; cursor: not-allowed; transform: none; border-color: #374151; }

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

/* Terminal Log */
.terminal { background: #0d0d10; color: #34d399; padding: 15px; border-radius: 6px; border: 1px solid #29292e; font-family: 'Fira Code', monospace; font-size: 14px; max-height: 400px; overflow-y: auto; margin-top: 15px; display: none; white-space: pre-wrap; line-height: 1.5; }

.action-area { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; background: #18181c; padding: 15px 20px; border-radius: 6px; border: 1px solid #29292e; }
#status { font-style: italic; color: #ffb300; font-weight: bold; font-size: 14px; flex: 1; }
#log-link { display: none; color: #ff3e3e; text-decoration: none; font-weight: bold; font-size: 14px; border: 1px solid #ff3e3e; padding: 5px 12px; border-radius: 4px; }
#log-link:hover { background: rgba(255, 62, 62, 0.1); }
</style>
</head>
<body>
<div class="container">
<h2>🛠️ Pusat Komando Layar Kosong</h2>
<p style="color: #a4a4a8; font-size: 13px; margin-top: -5px;">Lokasi Akar: <code style="color: #facc15;">\${ROOT_DIR}</code></p>

<div class="folder-panel">
<label>Tentukan target folder (bisa dipisah koma, contoh: artikel, artikelx):</label>

<div class="input-group">
<input type="text" id="folder-input" placeholder="Ketik nama folder di sini..." autocomplete="off">
<button class="btn btn-add" onclick="tambahFolder()">➕ Tambahkan</button>
</div>

<div class="folder-list" id="folder-list">
</div>

<button id="btn-sync" class="btn btn-sync" onclick="mulaiSinkronisasi()">🔄 1. Cocokkan Tanggal (artikel.json)</button>
<button id="btn-ruqyah" class="btn btn-ruqyah" onclick="jalankanRuqyahFront()">🧹 2. Ruqyah HTML (Hapus Injeksi DOM)</button>
<button id="btn-gen" class="btn btn-gen" onclick="jalankanGeneratorPro()" disabled>🚀 3. Lanjutkan ke Generator Pro</button>
</div>

<div class="stats-grid">
<div class="stat-box">
<h3 id="stat-sukses" class="color-success">0</h3>
<p>Publish Di-fix</p>
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

<div class="terminal" id="terminal-box"></div>

<div class="action-area">
<div id="status">Status: Menunggu instruksi...</div>
<a id="log-link" href="/log" target="_blank">📄 Buka Log Gagal</a>
</div>
</div>

<script>
let folderArray = ['artikel'];

const folderInput = document.getElementById('folder-input');
const folderListEl = document.getElementById('folder-list');
const btnGen = document.getElementById('btn-gen');
const btnRuqyah = document.getElementById('btn-ruqyah');
const terminalBox = document.getElementById('terminal-box');

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

// Mendukung pemisahan tag berbasis koma (,)
function tambahFolder() {
    let rawVal = folderInput.value;
    let parts = rawVal.split(',').map(s => s.trim().replace(/^\\/+/, '').replace(/\\/+$/, '')).filter(s => s);
    
    let added = false;
    parts.forEach(val => {
        if (!folderArray.includes(val)) {
            folderArray.push(val);
            added = true;
        }
    });

    if (added) {
        folderInput.value = '';
        renderFolders();
    } else if (parts.length > 0) {
        alert("Foldernya udah ada di daftar semua, Jal!");
    }
}

function hapusFolder(index) {
    folderArray.splice(index, 1);
    renderFolders();
}

function periksaFolderKosong() {
    if (folderArray.length === 0) {
        alert("Masukkan minimal satu folder dulu sebelum mulai proses!");
        return true;
    }
    return false;
}

// ================= ACTION: SINKRONISASI =================
async function mulaiSinkronisasi() {
    if (periksaFolderKosong()) return;

    const btn = document.getElementById('btn-sync');
    const statusDiv = document.getElementById('status');
    const logLink = document.getElementById('log-link');

    btn.disabled = true; btnRuqyah.disabled = true; btnGen.disabled = true;
    btn.innerHTML = "⏳ Bersih-bersih & Membedah HTML...";
    statusDiv.innerText = "Status: Mengosongkan sitemap & mencari file...";
    logLink.style.display = 'none';
    terminalBox.style.display = 'none';

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
            document.getElementById('stat-sukses').innerText = data.sukses;
            document.getElementById('stat-skip').innerText = data.skip;
            document.getElementById('stat-error').innerText = data.errorCount;

            statusDiv.innerText = data.message;
            statusDiv.style.color = "#00e676";
            
            if (data.adaLog) logLink.style.display = 'block';
        }
    } catch (err) {
        statusDiv.innerText = "Koneksi terputus: " + err;
        statusDiv.style.color = "#ef4444";
    } finally {
        btn.disabled = false; btnRuqyah.disabled = false; btnGen.disabled = false;
        btn.innerHTML = "🔄 1. Cocokkan Tanggal (artikel.json)";
    }
}

// ================= ACTION: RUQYAH HTML =================
async function jalankanRuqyahFront() {
    if (periksaFolderKosong()) return;

    const statusDiv = document.getElementById('status');
    btnRuqyah.disabled = true;
    btnRuqyah.innerHTML = "⏳ Sedang Meruqyah File HTML...";
    statusDiv.innerText = "Status: Mencabut elemen injeksi dari DOM...";
    statusDiv.style.color = "#a855f7";
    
    terminalBox.style.display = 'block';
    terminalBox.style.color = "#e1e1e6";
    terminalBox.innerText = "Memulai proses pembersihan masal...";

    try {
        const response = await fetch('/run-ruqyah', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetFolders: folderArray })
        });
        const data = await response.json();

        terminalBox.innerText = "📢 [OUTPUT RUQYAH HTML]:\\n" + data.output;
        statusDiv.innerText = "Status: Ruqyah Selesai!";
        statusDiv.style.color = "#00e676";
        btnGen.disabled = false; // Buka kunci generator setelah ruqyah
        
    } catch (err) {
        statusDiv.innerText = "Gagal memanggil fungsi Ruqyah: " + err;
        statusDiv.style.color = "#ef4444";
    } finally {
        btnRuqyah.disabled = false;
        btnRuqyah.innerHTML = "🧹 2. Ruqyah HTML (Hapus Injeksi DOM)";
    }
}

// ================= ACTION: GENERATOR PRO =================
async function jalankanGeneratorPro() {
    const statusDiv = document.getElementById('status');
    btnGen.disabled = true;
    btnGen.innerHTML = "⚡ Mengompilasi Sitemap & Feed...";
    statusDiv.innerText = "Status: Menjalankan bun dapur/generator-pro.ts...";
    statusDiv.style.color = "#ffb300";

    try {
        const response = await fetch('/run-generator', { method: 'POST' });
        const data = await response.json();

        terminalBox.style.display = 'block';

        if (data.success) {
            terminalBox.style.color = "#34d399";
            terminalBox.innerText = "📢 [OUTPUT GENERATOR PRO]:\\n" + data.output;
            statusDiv.innerText = "Status: Generator Pro Berhasil Dieksekusi! 😎";
            statusDiv.style.color = "#00e676";
        } else {
            terminalBox.style.color = "#f87171";
            terminalBox.innerText = "❌ [ERROR GENERATOR PRO]:\\n" + data.output;
            statusDiv.innerText = "Status: Generator Pro Gagal!";
            statusDiv.style.color = "#ef4444";
        }
    } catch (err) {
        statusDiv.innerText = "Gagal mengontak mesin generator: " + err;
        statusDiv.style.color = "#ef4444";
    } finally {
        btnGen.disabled = false;
        btnGen.innerHTML = "🚀 3. Lanjutkan ke Generator Pro";
    }
}

renderFolders();
</script>
</body>
</html>
`;

// ============================================================================
// 2A. LOGIKA RUQYAH (PEMBASMI INJEKSI DOM)
// ============================================================================

const INJECTED_SELECTORS = [
    'link[href*="navigator.css"]',
    '#iposbrowser',
    '#progress',
    '#layar-kosong-header',
    '.search-floating-container',
    '#internal-nav',
    'script[src*="/ext/navigator.js"]',
    'script[src*="/ext/iposbrowser.js"]',
    'script[src*="/ext/lightbox.js"]',
    'script[src*="/ext/response.js"]',
    'script[src*="/ext/balon-cf.js"]',
    'script[src*="/ext/highlight.js"]'
];

const FOOTER_EMOJIS = ["☕", "🛡️", "⚠️", "📝", "📚", "🔰", "⚔️"];
const INLINE_SCRIPT_SNIPPETS = ["modelContext' in navigator", "hljs.highlightAll()"];

function ruqyahHtmlCore(rawHtml: string): { html: string; changes: number } {
    const $ = cheerio.load(rawHtml);
    let changes = 0;

    for (const selector of INJECTED_SELECTORS) {
        const $el = $(selector);
        if ($el.length > 0) {
            changes += $el.length;
            $el.remove();
        }
    }

    if ($("footer").length > 0) {
        $("footer a").each((_, el) => {
            const text = $(el).text().trim();
            if (FOOTER_EMOJIS.includes(text)) {
                $(el).remove();
                changes++;
            }
        });
    }

    $("script:not([src])").each((_, el) => {
        const scriptContent = $(el).html() || "";
        for (const snippet of INLINE_SCRIPT_SNIPPETS) {
            if (scriptContent.includes(snippet)) {
                $(el).remove();
                changes++;
                break;
            }
        }
    });

    return {
        html: changes > 0 ? $.html({ _useHtmlParser2: true } as cheerio.CheerioOptions) : rawHtml,
        changes,
    };
}

async function jalankanProsesRuqyah(targetFolders: string[]) {
    let totalFileBerubah = 0;
    let totalItemDicabut = 0;
    let logOutput = "";

    for (const folder of targetFolders) {
        const fullFolderPath = path.join(ROOT_DIR, folder);
        try {
            const stat = await fs.stat(fullFolderPath);
            if (!stat.isDirectory()) continue;

            const glob = new Glob("*.html");
            for await (const file of glob.scan({ cwd: fullFolderPath, absolute: true })) {
                const htmlContent = await fs.readFile(file, 'utf-8');
                const { html, changes } = ruqyahHtmlCore(htmlContent);
                
                if (changes > 0) {
                    await fs.writeFile(file, html, 'utf-8');
                    totalFileBerubah++;
                    totalItemDicabut += changes;
                    const baseName = path.basename(file);
                    logOutput += `🧹 Bersih: ${folder}/${baseName} (${changes} item dicabut)\n`;
                }
            }
        } catch (e) {
            logOutput += `❌ Lewati folder ${folder} (tidak ditemukan atau error memindai)\n`;
        }
    }
    
    if (totalFileBerubah === 0) {
        logOutput += `\n✨ Mantap! Semua file di folder terpilih sudah suci dari injeksi.\n`;
    } else {
        logOutput += `\n📊 RINGKASAN RUQYAH: ${totalFileBerubah} file berhasil dibersihkan, ${totalItemDicabut} elemen parasit dicabut.\n`;
    }

    return { success: true, output: logOutput };
}

// ============================================================================
// 2B. LOGIKA SINKRONISASI TANGGAL (TETAP SAMA SEPERTI SEBELUMNYA)
// ============================================================================
type ArtikelData = [string, string, string, string, string];

function getRandomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function jalankanSinkronisasi(targetFolders: string[]) {
    const jsonPath = path.join(ROOT_DIR, 'artikel.json');
    const logPath = path.join(ROOT_DIR, 'laporan-gagal.txt');
    const sitemapPath = path.join(ROOT_DIR, 'sitemap.txt');
    const editedTodayPath = path.join(ROOT_DIR, 'mini', 'edited-today.txt');

    let suksesPublish = 0, modifDiedit = 0, modifOriginal = 0, skip = 0, errorCount = 0;
    const daftarGagal: string[] = [];
    const now = new Date();

    try {
        await fs.writeFile(sitemapPath, '', 'utf-8');
        await fs.mkdir(path.dirname(editedTodayPath), { recursive: true });
        await fs.writeFile(editedTodayPath, '', 'utf-8');

        const rawData = await fs.readFile(jsonPath, 'utf-8');
        const parsedData = JSON.parse(rawData);
        const daftarArtikel: ArtikelData[] = Object.values(parsedData).flat() as ArtikelData[];

        if (daftarArtikel.length === 0) return { error: "Data artikel.json kosong!" };

        const fileMap = new Map<string, string>();
        for (const folder of targetFolders) {
            const fullFolderPath = path.join(ROOT_DIR, folder);
            try {
                const stat = await fs.stat(fullFolderPath);
                if (!stat.isDirectory()) continue;

                const glob = new Glob("*.html");
                for await (const file of glob.scan({ cwd: fullFolderPath, absolute: true })) {
                    const baseName = path.basename(file);
                    if (!baseName.startsWith('-')) fileMap.set(baseName, file);
                }
            } catch (e) {}
        }

        for (const artikel of daftarArtikel) {
            if (!Array.isArray(artikel) || artikel.length < 4) continue;
            const fileName = artikel[1];
            const tanggalKebenaranStr = artikel[3];
            const filePath = fileMap.get(fileName);
            if (!filePath) continue;

            try {
                const htmlContent = await fs.readFile(filePath, 'utf-8');
                const $ = cheerio.load(htmlContent, { xmlMode: false });
                const $pubMeta = $('meta[property="article:published_time"]');
                const $modMeta = $('meta[property="article:modified_time"]');

                if ($pubMeta.length > 0) {
                    const tanggalLama = $pubMeta.attr('content');
                    if (tanggalLama !== tanggalKebenaranStr) {
                        $pubMeta.attr('content', tanggalKebenaranStr);
                        suksesPublish++;
                    } else { skip++; }

                    const pubDate = new Date(tanggalKebenaranStr);
                    if (isNaN(pubDate.getTime())) {
                        daftarGagal.push(`⚠️ [INVALID DATE] Format ngaco di JSON untuk file: ${filePath}`);
                        errorCount++; continue;
                    }

                    const isEdited = Math.random() > 0.4;
                    const newModDate = isEdited ? getRandomDate(pubDate, now) : pubDate;
                    const newModStr = newModDate.toISOString();

                    if (isEdited) modifDiedit++; else modifOriginal++;

                    if ($modMeta.length > 0) {
                        $modMeta.attr('content', newModStr);
                    } else {
                        $pubMeta.after(`\n    <meta property="article:modified_time" content="${newModStr}">`);
                    }

                    await fs.writeFile(filePath, $.html(), 'utf-8');
                    await fs.utimes(filePath, newModDate, newModDate);
                } else {
                    daftarGagal.push(`⚠️ [NO META] Tag publish nihil di ${filePath}`);
                    errorCount++;
                }
            } catch (fileErr: any) {
                daftarGagal.push(`❌ [ERROR] Gagal membedah ${filePath}: ${fileErr.message}`);
                errorCount++;
            }
        }

        let adaLog = false;
        if (daftarGagal.length > 0) {
            const waktuEksekusi = new Date().toLocaleString('id-ID');
            const isiLog = `Laporan Kegagalan\nWaktu: ${waktuEksekusi}\n\nRincian:\n` + daftarGagal.join('\n');
            await fs.writeFile(logPath, isiLog, 'utf-8');
            adaLog = true;
        }

        return { sukses: suksesPublish, skip, errorCount, adaLog, message: `🧹 Bersih-bersih kelar! Modif Random: ${modifDiedit} | Modif Ori: ${modifOriginal}` };
    } catch (err: any) { return { error: `Gagal memproses sinkronisasi: ${err.message}` }; }
}

// ============================================================================
// 3. RUNTIME SERVER (BUN.SERVE)
// ============================================================================
Bun.serve({
    port: 5000,
    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === "/" && request.method === "GET") {
            return new Response(htmlTemplate, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }

        if (url.pathname === "/sync" && request.method === "POST") {
            try {
                const body = await request.json();
                return Response.json(await jalankanSinkronisasi(body.targetFolders || []));
            } catch (e) { return Response.json({ error: "Gagal memproses data sinkronisasi." }); }
        }

        // ENDPOINT BARU: RUQYAH HTML
        if (url.pathname === "/run-ruqyah" && request.method === "POST") {
            try {
                const body = await request.json();
                return Response.json(await jalankanProsesRuqyah(body.targetFolders || []));
            } catch (e) { return Response.json({ success: false, output: "Error memproses Ruqyah." }); }
        }

        if (url.pathname === "/run-generator" && request.method === "POST") {
            try {
                const scriptPath = path.join(ROOT_DIR, "dapur", "generator-pro.ts");
                const proc = Bun.spawn(["bun", scriptPath], { stdout: "pipe", stderr: "pipe" });
                const stdoutText = await new Response(proc.stdout).text();
                const stderrText = await new Response(proc.stderr).text();
                await proc.exited;

                const statusSukses = proc.exitCode === 0;
                return Response.json({ success: statusSukses, output: statusSukses ? stdoutText : stderrText });
            } catch (err: any) { return Response.json({ success: false, output: `Gagal memanggil subprocess: ${err.message}` }); }
        }

        if (url.pathname === "/log" && request.method === "GET") {
            try {
                const logPath = path.join(ROOT_DIR, 'laporan-gagal.txt');
                const logContent = await fs.readFile(logPath, 'utf-8');
                return new Response(logContent, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
            } catch (e) { return new Response("Semua aman terkendali.", { status: 404 }); }
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log("🚀 Dashboard Super Otomatis Aktif!");
console.log(`Lokasi Kerja: ${ROOT_DIR}`);
console.log("Gas buka: http://localhost:5000");
