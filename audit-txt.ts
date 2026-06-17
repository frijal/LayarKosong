import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const TARGET_DIR = "."; 

/**
 * Memindai folder secara rekursif untuk mencari file HTML
 */
async function dapatkanFileHtml(dir) {
  let hasil = [];
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
  return hasil;
}

/**
 * Memproses file berdasarkan kamus dinamis
 */
async function prosesFile(filePath, kamusKustom) {
  try {
    const file = Bun.file(filePath);
    let content = await file.text();
    let adaPerubahan = false;
    let rincianPerubahan = [];

    for (const item of kamusKustom) {
      if (!item.cari) continue; 
      
      if (content.includes(item.cari)) {
        content = content.replaceAll(item.cari, item.ganti || "");
        rincianPerubahan.push(`"${item.cari}" ➔ "${item.ganti}"`);
        adaPerubahan = true;
      }
    }
    
    if (adaPerubahan) {
      await Bun.write(filePath, content);
      return `[BERHASIL] ${filePath}\n   ➔ Perubahan: ${rincianPerubahan.join(", ")}`;
    }
    
    return null; 
  } catch (error) {
    return `[GAGAL] Error pada ${filePath}: ${error.message}`;
  }
}

// TEMPLATE UI BROWSER
const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Dynamic Content Audit Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 40px; background: #121214; color: #e1e1e6; }
        .container { max-width: 950px; margin: 0 auto; background: #202024; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        h2 { color: #00e676; border-bottom: 2px solid #29292e; padding-bottom: 10px; margin-top: 0; }
        
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
        th, td { border: 1px solid #29292e; padding: 10px; text-align: left; }
        th { background: #29292e; color: #00e676; }
        tr:nth-child(even) { background: #18181c; }
        
        input[type="text"] { width: 93%; padding: 8px; background: #121214; border: 1px solid #45475a; color: #e1e1e6; border-radius: 4px; }
        input[type="text"]:focus { border-color: #00e676; outline: none; }
        
        .btn { padding: 10px 20px; font-size: 14px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s; margin-right: 5px; }
        .btn-success { background: #00e676; color: #121214; font-size: 16px; padding: 12px 24px; }
        .btn-success:hover { background: #00c853; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; }
        .btn-danger { background: #ef4444; color: white; padding: 6px 12px; font-size: 12px; }
        .btn-danger:hover { background: #dc2626; }
        
        .action-area { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
        #status { font-style: italic; color: #ffb300; font-weight: bold; font-size: 15px; }
        #logs { background: #121214; color: #00e676; padding: 20px; margin-top: 20px; height: 300px; overflow-y: auto; font-family: 'Fira Code', monospace; border-radius: 5px; border: 1px solid #29292e; white-space: pre-wrap; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Content Safety Audit - Dynamic Dashboard</h2>
        <p>Target Direktori: <strong>${resolve(TARGET_DIR)}</strong></p>
        
        <h3>Atur Pasangan Kata (Pekerjaan)</h3>
        <table id="tabel-kamus">
            <thead>
                <tr>
                    <th style="width: 45%;">Teks yang Dicari (Cari)</th>
                    <th style="width: 45%;">Teks Pengganti (Ganti)</th>
                    <th style="width: 10%;">Aksi</th>
                </tr>
            </thead>
            <tbody id="kamus-body">
                </tbody>
        </table>
        
        <button class="btn btn-primary" onclick="tambahBaris()">+ Tambah Baris Pekerjaan</button>
        
        <hr style="border: 0; border-top: 1px solid #29292e; margin: 30px 0;">
        
        <div class="action-area">
            <button class="btn btn-success" onclick="jalankanProses()">Jalankan Semua Pekerjaan di Atas</button>
            <div id="status">Status: Standby. Siap memproses.</div>
        </div>
        
        <div id="logs">Log aktivitas pembersihan akan muncul di sini...</div>
    </div>

    <script>
        const dataAwal = [
            { cari: "peretasan tingkat tinggi yang dilakukan oleh para hacker", ganti: "modifikasi sistem tingkat tinggi yang dilakukan oleh oknum tak bertanggung jawab" },
            { cari: "brengsek", ganti: "kurang tepat" },
            { cari: "bajingan", ganti: "tidak etis" }
        ];

        const tbody = document.getElementById('kamus-body');

        function tambahBaris(cariText = "", gantiText = "") {
            const tr = document.createElement('tr');
            tr.innerHTML = \`
                <td><input type="text" class="input-cari" value="\${cariText}" placeholder="Contoh: hacker"></td>
                <td><input type="text" class="input-ganti" value="\${gantiText}" placeholder="Contoh: ahli IT"></td>
                <td><button class="btn btn-danger" onclick="hapusBaris(this)">Hapus</button></td>
            \`;
            tbody.appendChild(tr);
        }

        function hapusBaris(btn) {
            const row = btn.parentNode.parentNode;
            row.parentNode.removeChild(row);
        }

        dataAwal.forEach(item => tambahBaris(item.cari, item.ganti));

        async function jalankanProses() {
            const logsDiv = document.getElementById('logs');
            const statusDiv = document.getElementById('status');
            
            const rows = tbody.querySelectorAll('tr');
            const rules = [];
            
            rows.forEach(row => {
                const cari = row.querySelector('.input-cari').value.trim();
                const ganti = row.querySelector('.input-ganti').value.trim();
                if(cari) {
                    rules.push({ cari, ganti });
                }
            });

            if (rules.length === 0) {
                alert("Isi minimal satu pekerjaan (kata) terlebih dahulu!");
                return;
            }

            logsDiv.innerHTML = "Memindai berkas dan menerapkan aturan kustom...\\n";
            statusDiv.innerHTML = "Status: Sedang memproses konten...";

            try {
                const response = await fetch('/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rules })
                });
                
                const data = await response.json();
                logsDiv.innerHTML = data.results.join('\\n');
                
                // MENGHITUNG JUMLAH YANG BERHASIL SECARA REALTIME
                const jumlahBerhasil = data.results.filter(function(line) {
                    return line.indexOf('[BERHASIL]') === 0;
                }).length;
                
                // MENAMPILKAN JUMLAH PADA BARIS STATUS
                statusDiv.innerHTML = "Status: Selesai! " + jumlahBerhasil + " file berhasil diproses.";
                
            } catch (err) {
                logsDiv.innerHTML += "\\n[ERROR] Hubungan ke server terputus: " + err;
                statusDiv.innerHTML = "Status: Gagal.";
            }
        }
    </script>
</body>
</html>
`;

// SERVER HTTP BUN
Bun.serve({
  port: 5000,
  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(htmlTemplate, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    
    if (url.pathname === "/run" && request.method === "POST") {
      try {
        const body = await request.json();
        const kamusKustom = body.rules || [];
        
        const semuaFile = await dapatkanFileHtml(TARGET_DIR);
        
        if (semuaFile.length === 0) {
          return Response.json({ results: ["[INFO] Tidak ditemukan file .html atau .htm di folder ini."] });
        }
        
        const janjiProses = semuaFile.map(file => prosesFile(file, kamusKustom));
        const hasilProses = await Promise.all(janjiProses);
        
        const logBersih = hasilProses.filter(log => log !== null);
        
        if (logBersih.length === 0) {
          logBersih.push("[INFO] Pemindaian selesai. Semua file sudah bersih, tidak ada teks pemicu yang ditemukan.");
        }
        
        return Response.json({ results: logBersih });
      } catch (e) {
        return Response.json({ results: [`[ERROR] Gagal membaca data input: ${e.message}`] }, { status: 400 });
      }
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

console.log("🚀 Engine Bun aktif! Jalankan di: http://localhost:5000");
