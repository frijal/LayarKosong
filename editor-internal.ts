/** * EDITOR & CLEANER HTML - FULL FEATURED (TS)
 * Fitur: Scan, Edit, Auto-Backup, & Restore Manager
 */

import { readdir } from "node:fs/promises";
import { join } from "node:path";

const HTML_UI = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>HTML Cleaner & Restore</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #121214; color: #e1e1e6; padding: 20px; }
        .container { max-width: 900px; margin: auto; display: grid; grid-template-columns: 250px 1fr; gap: 20px; }
        .panel { background: #202024; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .file-item { cursor: pointer; padding: 5px; color: #a6e3a1; font-size: 13px; }
        .file-item:hover { color: #00e676; }
        .item { background: #18181c; padding: 10px; margin: 8px 0; border-radius: 4px; display: flex; align-items: center; gap: 10px; }
        .restore-item { background: #29292e; padding: 8px; margin: 5px 0; border-radius: 4px; font-size: 12px; }
        button { background: #00e676; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; font-weight: bold; width: 100%; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="panel">
            <h3>Pilih File:</h3>
            <div id="fileTree">Memuat...</div>
        </div>
        <div class="panel">
            <h3 id="fileName">Pilih file untuk diedit</h3>
            <div id="elementList"></div>
            <button id="saveBtn" style="display:none" onclick="saveFile()">Simpan Perubahan & Backup</button>
        </div>
    </div>
    
    <div class="panel" style="grid-column: span 2;">
        <h3>🔄 Restore Manager (Dari File Backup)</h3>
        <div id="backupList">Memuat data backup...</div>
        <button style="background: #ef4444;" onclick="restoreFiles()">Restore File Terpilih</button>
    </div>

    <script>
        // Load daftar file dan backup
        async function init() {
            const res = await fetch('/list');
            const data = await res.json();
            document.getElementById('fileTree').innerHTML = data.files.map(f => \`<div class="file-item" onclick="scanFile('\${f}')">\${f}</div>\`).join('');
            document.getElementById('backupList').innerHTML = data.backups.map(b => \`
                <div class="restore-item"><input type="checkbox" value='\${b}'> <code>\${b}</code></div>
            \`).join('');
        }

        async function scanFile(path) {
            const res = await fetch('/scan', { method: 'POST', body: JSON.stringify({ path }) });
            const data = await res.json();
            document.getElementById('fileName').innerText = "Target: " + path;
            document.getElementById('elementList').innerHTML = data.elements.map((el, i) => \`
                <div class="item"><input type="checkbox" checked value='\${i}'><code>\${el.raw.replace(/</g, '&lt;')}</code></div>
            \`).join('');
            document.getElementById('saveBtn').style.display = 'block';
        }

        async function saveFile() { /* ... fungsi sebelumnya ... */ }

        async function restoreFiles() {
            const selected = Array.from(document.querySelectorAll('.restore-item input:checked')).map(i => i.value);
            const res = await fetch('/restore', { method: 'POST', body: JSON.stringify({ files: selected }) });
            const result = await res.json();
            alert(result.message); location.reload();
        }
        init();
    </script>
</body>
</html>
`;

async function getFiles(dir: string = "."): Promise<{files: string[], backups: string[]}> {
    let files: string[] = [], backups: string[] = [];
    const items = await readdir(dir, { withFileTypes: true });
    for (const item of items) {
        if (item.isDirectory() && !["node_modules", ".git"].includes(item.name)) {
            const sub = await getFiles(join(dir, item.name));
            files = files.concat(sub.files);
            backups = backups.concat(sub.backups);
        } else if (item.name.endsWith(".html")) {
            files.push(join(dir, item.name));
        } else if (item.name.endsWith("-bak")) {
            backups.push(join(dir, item.name));
        }
    }
    return { files, backups };
}

Bun.serve({
    port: 5000,
    async fetch(req: Request) {
        const url = new URL(req.url);
        if (url.pathname === "/") return new Response(HTML_UI, { headers: { "Content-Type": "text/html" } });
        if (url.pathname === "/list") return Response.json(await getFiles());
        
        if (url.pathname === "/restore" && req.method === "POST") {
            const { files } = await req.json();
            for (const bPath of (files as string[])) {
                const originalPath = bPath.replace("-bak", "");
                const content = await Bun.file(bPath).text();
                await Bun.write(originalPath, content);
            }
            return Response.json({ message: "Restore berhasil!" });
        }
        // ... (sisipkan logika scan & save dari sebelumnya)
        return new Response("Not Found", { status: 404 });
    },
});