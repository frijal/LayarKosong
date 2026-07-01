import { readdir, stat } from "node:fs/promises";
import { join, resolve, extname } from "node:path";
import { exec } from "node:child_process";
import { platform } from "node:os";

// ============================================================================
// 1. TEMPLATE UI (HTML + CSS + Frontend JS)
// ============================================================================
const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>HTML Sequence Anomaly Detector</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 24px 32px; background: #121214; color: #e1e1e6; }
        .container { width: 100%; max-width: 1000px; margin: 0 auto; background: #202024; padding: 30px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        h2 { color: #f9e2af; border-bottom: 2px solid #29292e; padding-bottom: 10px; margin-top: 0; }
        h3 { margin-top: 30px; color: #89b4fa; border-bottom: 1px solid #29292e; padding-bottom: 5px; }

        .input-box { background: #18181c; padding: 20px; border-radius: 6px; border: 1px solid #29292e; margin-bottom: 25px; }
        .input-box label { font-size: 14px; color: #a4a4a8; font-weight: bold; display: block; margin-bottom: 8px; }
        
        .path-row { display: flex; gap: 10px; margin-bottom: 15px; }
        input[type="text"] { flex: 1; padding: 12px; background: #121214; border: 1px solid #45475a; color: #e1e1e6; border-radius: 4px; font-family: monospace; font-size: 14px; }
        input[type="text"]:focus { border-color: #89b4fa; outline: none; }

        .sequence-grid { display: flex; gap: 10px; flex-wrap: wrap; }
        .sequence-item { flex: 1; min-width: 150px; display: flex; align-items: center; gap: 8px; }
        .sequence-item span { font-weight: bold; color: #f38ba8; }

        .btn { padding: 12px 20px; font-size: 14px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        .btn-primary { background: #89b4fa; color: #121214; width: 100%; font-size: 16px; margin-top: 20px;}
        .btn-primary:hover { background: #74c7ec; }
        .btn-open { background: #a6e3a1; color: #121214; padding: 8px 12px; font-size: 12px; }
        .btn-open:hover { background: #94e2d5; }

        .result-list { margin-top: 20px; display: flex; flex-direction: column; gap: 12px; }
        .result-item { background: #18181c; border: 1px solid #f38ba8; border-left: 5px solid #f38ba8; padding: 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
        .result-info { display: flex; flex-direction: column; gap: 5px; }
        .file-path { font-family: monospace; color: #cdd6f4; font-size: 14px; }
        .error-msg { font-size: 13px; color: #f38ba8; font-weight: bold; }
        .sequence-found { font-size: 12px; color: #a6adc8; font-family: monospace; }

        #status { text-align: center; font-style: italic; color: #f9e2af; margin-top: 15px; font-weight: bold; }
        
        .success-box { background: #a6e3a1; color: #121214; padding: 15px; border-radius: 6px; text-align: center; font-weight: bold; display: none; }
    </style>
</head>
<body>

<div class="container">
    <h2>🕵️ HTML Sequence Anomaly Detector</h2>
    <p style="color: #a4a4a8; font-size: 13px; margin-top: -5px;">Pindai folder secara rekursif dan temukan file HTML yang urutan blok <code>&lt;div id="..."&gt;</code>-nya keliru.</p>

    <div class="input-box">
        <label for="folder-path">📁 Absolute Path Folder Target:</label>
        <div class="path-row">
            <input type="text" id="folder-path" placeholder="Contoh: /home/user/proyek-layar-kosong/artikel">
        </div>

        <label>🧩 Susunan ID yang Diharapkan (Maksimal 5, isi berurutan):</label>
        <div class="sequence-grid">
            <div class="sequence-item"><span>1.</span><input type="text" id="seq-1" value="related-articles-grid" placeholder="ID pertama"></div>
            <div class="sequence-item"><span>2.</span><input type="text" id="seq-2" value="response" placeholder="ID kedua"></div>
            <div class="sequence-item"><span>3.</span><input type="text" id="seq-3" placeholder="(Opsional)"></div>
            <div class="sequence-item"><span>4.</span><input type="text" id="seq-4" placeholder="(Opsional)"></div>
            <div class="sequence-item"><span>5.</span><input type="text" id="seq-5" placeholder="(Opsional)"></div>
        </div>

        <button class="btn btn-primary" onclick="scanFolder()">🚀 Mulai Pemindaian Rekursif</button>
    </div>

    <div id="status"></div>
    <div id="success-message" class="success-box">🎉 Luar Biasa! Semua file memiliki susunan yang sempurna.</div>

    <div class="result-list" id="result-container">
        </div>
</div>

<script>
    async function scanFolder() {
        const folderPath = document.getElementById('folder-path').value.trim();
        const statusEl = document.getElementById('status');
        const resultContainer = document.getElementById('result-container');
        const successBox = document.getElementById('success-message');

        // Kumpulkan ID dari input 1 sampai 5
        const targetSequence = [];
        for(let i = 1; i <= 5; i++) {
            const val = document.getElementById(\`seq-\${i}\`).value.trim();
            if(val) targetSequence.push(val);
        }

        if (!folderPath) return alert("Path folder tidak boleh kosong, Jal!");
        if (targetSequence.length === 0) return alert("Minimal isi 1 target ID untuk dicari!");

        statusEl.innerText = "⏳ Sedang memindai folder dan menganalisis struktur HTML...";
        resultContainer.innerHTML = "";
        successBox.style.display = "none";

        try {
            const response = await fetch('/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderPath, targetSequence })
            });

            const data = await response.json();

            if (data.error) {
                statusEl.innerHTML = \`<span style="color:#f38ba8;">❌ ERROR: \${data.error}</span>\`;
                return;
            }

            if (data.anomalies.length === 0) {
                statusEl.innerText = "";
                successBox.style.display = "block";
            } else {
                statusEl.innerText = \`⚠️ Ditemukan \${data.anomalies.length} file dengan susunan anomali!\`;
                
                resultContainer.innerHTML = data.anomalies.map(item => \`
                    <div class="result-item">
                        <div class="result-info">
                            <div class="file-path">📄 \${item.file}</div>
                            <div class="error-msg">\${item.reason}</div>
                            <div class="sequence-found">Ditemukan: [\${item.found.join(', ')}]</div>
                        </div>
                        <button class="btn btn-open" onclick="openFileInEditor('\${item.file.replace(/\\\\/g, '\\\\\\\\')}')">
                            📝 Buka File
                        </button>
                    </div>
                \`).join('');
            }
        } catch (err) {
            statusEl.innerHTML = \`<span style="color:#f38ba8;">❌ Koneksi ke server gagal: \${err.message}</span>\`;
        }
    }

    async function openFileInEditor(filePath) {
        try {
            const response = await fetch('/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath })
            });
            const data = await response.json();
            if (data.error) alert("Gagal membuka file: " + data.error);
        } catch (err) {
            alert("Gagal mengirim perintah buka file.");
        }
    }
</script>
</body>
</html>
`;

// ============================================================================
// 2. BACKEND ENGINE (API & Logika Pemindaian)
// ============================================================================

/**
 * Membaca semua file HTML secara rekursif
 */
async function getHtmlFilesRecursive(dir: string): Promise<string[]> {
    let results: string[] = [];
    const list = await readdir(dir, { withFileTypes: true });

    for (const entry of list) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
            // Hindari folder sistem agar tidak berat
            if (entry.name !== "node_modules" && entry.name !== ".git") {
                const subResults = await getHtmlFilesRecursive(fullPath);
                results = results.concat(subResults);
            }
        } else if (extname(entry.name).toLowerCase() === ".html") {
            results.push(fullPath);
        }
    }
    return results;
}

/**
 * Membuka file menggunakan default editor OS (VS Code, TextEdit, Notepad, dll)
 */
function openFileInOsDefault(filePath: string) {
    let cmd = '';
    switch (platform()) {
        case 'darwin': cmd = `open "${filePath}"`; break; // Mac
        case 'win32': cmd = `start "" "${filePath}"`; break; // Windows
        default: cmd = `xdg-open "${filePath}"`; break; // Linux
    }
    exec(cmd);
}

// ============================================================================
// 3. BUN SERVER ROUTING
// ============================================================================
Bun.serve({
    port: 5000,
    async fetch(request) {
        const url = new URL(request.url);

        // Serve UI Dashboard
        if (url.pathname === "/" && request.method === "GET") {
            return new Response(htmlTemplate, {
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        }

        // Endpoint: Scan Folder
        if (url.pathname === "/scan" && request.method === "POST") {
            try {
                const { folderPath, targetSequence } = await request.json();
                const absolutePath = resolve(folderPath);
                
                try {
                    const stats = await stat(absolutePath);
                    if (!stats.isDirectory()) throw new Error("Path bukan sebuah folder.");
                } catch {
                    return Response.json({ error: "Folder tidak ditemukan atau path salah!" }, { status: 404 });
                }

                const htmlFiles = await getHtmlFilesRecursive(absolutePath);
                const anomalies = [];

                for (const file of htmlFiles) {
                    const content = await Bun.file(file).text();
                    
                    // Regex ini menangkap SEMUA id yang ada di dalam elemen <div>
                    const matches = [...content.matchAll(/<div[^>]*id="([^"]+)"/gi)];
                    
                    // Filter: Hanya ambil ID yang ada di dalam daftar target input user
                    const foundIds = matches.map(m => m[1]).filter(id => targetSequence.includes(id));

                    // Abaikan jika file ini sama sekali tidak mengandung ID target
                    if (foundIds.length === 0) continue;

                    // Bandingkan susunan yang ditemukan dengan susunan target (Stringify Array Check)
                    if (JSON.stringify(foundIds) !== JSON.stringify(targetSequence)) {
                        
                        let reason = "Susunan acak atau berantakan.";
                        if (foundIds.length < targetSequence.length) {
                            reason = "Ada blok target yang hilang dari urutan.";
                        } else if (foundIds.length > targetSequence.length) {
                            reason = "Terdapat duplikasi blok target.";
                        } else if (foundIds.length === targetSequence.length) {
                            reason = "Posisinya terbalik (salah urutan).";
                        }

                        anomalies.push({
                            file: file,
                            found: foundIds,
                            reason: reason
                        });
                    }
                }

                return Response.json({ anomalies });
            } catch (e: any) {
                return Response.json({ error: e.message }, { status: 400 });
            }
        }

        // Endpoint: Open File
        if (url.pathname === "/open" && request.method === "POST") {
            try {
                const { filePath } = await request.json();
                openFileInOsDefault(filePath);
                return Response.json({ success: true });
            } catch (e: any) {
                return Response.json({ error: e.message }, { status: 500 });
            }
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log("🚀 HTML Sequence Scanner GUI Aktif!");
console.log("Buka browser kamu di: http://localhost:5000");
