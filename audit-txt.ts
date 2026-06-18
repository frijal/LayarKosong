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

// TEMPLATE UI BROWSER DENGAN INTEGRASI CSV & LAYOUT STACKED
const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>AdSense Safety Audit Dashboard</title>
    <style>
        * { box-sizing: border-box; }
        html, body { width: 100%; min-height: 100vh; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 24px 32px; background: #121214; color: #e1e1e6; }
        .container { width: 100%; max-width: none; margin: 0; background: #202024; padding: 30px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        h2 { color: #00e676; border-bottom: 2px solid #29292e; padding-bottom: 10px; margin-top: 0; }
        h3 { margin-top: 30px; color: #3b82f6; }
        
        .top-controls { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; background: #18181c; padding: 15px; border-radius: 6px; border: 1px solid #29292e; }
        .top-controls label { font-size: 14px; color: #a4a4a8; }
        
        table { width: 100%; border-collapse: collapse; margin: 10px 0 20px 0; font-size: 14px; }
        th, td { border: 1px solid #29292e; padding: 15px; text-align: left; vertical-align: middle; }
        th { background: #29292e; color: #00e676; }
        tr:nth-child(even) { background: #18181c; }
        
        /* CSS Baru untuk layout bersusun (stacked) */
        .aturan-box { display: flex; flex-direction: column; gap: 8px; }
        .label-cari { color: #f38ba8; font-size: 13px; font-weight: bold; }
        .label-ganti { color: #a6e3a1; font-size: 13px; font-weight: bold; margin-top: 8px; }
        
        .aturan-box textarea { width: 100%; padding: 10px; background: #121214; border: 1px solid #45475a; color: #e1e1e6; border-radius: 4px; resize: vertical; min-height: 50px; font-family: inherit; font-size: 14px; line-height: 1.4; }
        .aturan-box textarea:focus { border-color: #00e676; outline: none; background: #18181c; }
        
        input[type="number"] { width: 60px; padding: 8px; background: #121214; border: 1px solid #45475a; color: #e1e1e6; border-radius: 4px; text-align: center; font-weight: bold; }
        
        .btn { padding: 10px 20px; font-size: 14px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        .btn-success { background: #00e676; color: #121214; font-size: 16px; padding: 12px 24px; }
        .btn-success:hover { background: #00c853; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; }
        .btn-danger { background: #ef4444; color: white; padding: 8px 16px; font-size: 13px; }
        .btn-danger:hover { background: #dc2626; }
        .btn-secondary { background: #4f46e5; color: white; }
        .btn-secondary:hover { background: #4338ca; }
        
        .action-area { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
        #status { font-style: italic; color: #ffb300; font-weight: bold; font-size: 15px; }
        #logs { background: #121214; color: #00e676; padding: 20px; margin-top: 20px; height: 300px; overflow-y: auto; font-family: 'Fira Code', monospace; border-radius: 5px; border: 1px solid #29292e; white-space: pre-wrap; font-size: 13px; }
        
        /* CSV Box CSS */
        .csv-box { background: #18181c; padding: 20px; border-radius: 6px; border: 1px solid #29292e; margin-top: 40px; }
        #csv-input { width: 100%; height: 120px; background: #121214; color: #a6e3a1; border: 1px solid #45475a; border-radius: 4px; padding: 10px; font-family: monospace; font-size: 12px; resize: vertical; }
    </style>
</head>
<body>
    <div class="container">
        <h2>AdSense Safety Audit - Bun Dashboard</h2>
        <p>Target Direktori File HTML: <strong>${resolve(TARGET_DIR)}</strong></p>
        
        <h3>Atur Pasangan Kata (Pekerjaan Saat Ini)</h3>
        
        <div class="top-controls">
            <label for="jumlah-baris">Tambah sebanyak:</label>
            <input type="number" id="jumlah-baris" value="1" min="1" max="100">
            <label>baris kosong</label>
            <button class="btn btn-primary" onclick="tambahBanyakBaris()">+ Tambah Baris</button>
            <button class="btn btn-danger" onclick="bersihkanSemuaTabel()" style="margin-left: auto;">Kosongkan Semua Aturan</button>
        </div>

        <table id="tabel-kamus">
            <thead>
                <tr>
                    <th style="width: 90%;">Detail Aturan Pembersihan (Cari & Ganti)</th>
                    <th style="width: 10%; text-align: center;">Aksi</th>
                </tr>
            </thead>
            <tbody id="kamus-body">
                </tbody>
        </table>
        
        <div class="action-area">
            <button class="btn btn-success" onclick="jalankanProses()">Jalankan Semua Pembersihan</button>
            <div id="status">Status: Standby. Siap dieksekusi.</div>
        </div>
        
        <div id="logs">Log aktivitas pembersihan akan muncul di sini...</div>

        <div class="csv-box">
            <h4 style="margin-top: 0; color: #f38ba8;">💡 Impor Massal via Raw Data CSV</h4>
            <p style="font-size: 12px; color: #a6adc8; margin-top: -5px;">Punya data mentah CSV lagi? Tempel teks CSV utuh di bawah (termasuk baris header), sistem akan otomatis mendeteksi kolom Kutipan dan Saran Pengganti.</p>
<textarea id="csv-input" placeholder='Paste data CSV kamu di sini...&#10;Contoh:&#10;"No","Judul Artikel","Kutipan Bermasalah","Jenis Pelanggaran AdSense","Saran Kalimat Pengganti"&#10;"1","Judul A","Kata Jelek","Pelanggaran","Kata Baik"'></textarea>            <div style="margin-top: 10px;">
                <button class="btn btn-secondary" onclick="imporDataCSV()">⚡ Impor Masuk ke Tabel</button>
            </div>
        </div>
    </div>

    <script>
        const tbody = document.getElementById('kamus-body');

        // FUNGSI MENAMBAH BARIS DENGAN FORMAT STACKED (ATAS BAWAH)
        function tambahBaris(cariText = "", gantiText = "") {
            const tr = document.createElement('tr');
            tr.innerHTML = \`
                <td>
                    <div class="aturan-box">
                        <div class="label-cari">Kutipan Bermasalah (Cari):</div>
                        <textarea class="input-cari" rows="2" placeholder="Kutipan pemicu...">\${escapeHtml(cariText)}</textarea>
                        
                        <div class="label-ganti">Saran Kalimat Pengganti (Ganti):</div>
                        <textarea class="input-ganti" rows="2" placeholder="Kalimat alternatif aman...">\${escapeHtml(gantiText)}</textarea>
                    </div>
                </td>
                <td style="text-align: center;">
                    <button class="btn btn-danger" onclick="hapusBaris(this)">Hapus</button>
                </td>
            \`;
            tbody.appendChild(tr);
            updateStatusText();
        }

        function tambahBanyakBaris() {
            const inputJumlah = document.getElementById('jumlah-baris');
            const jumlah = parseInt(inputJumlah.value) || 1;
            for (let i = 0; i < jumlah; i++) tambahBaris("", "");
        }

        function hapusBaris(btn) {
            const row = btn.parentNode.parentNode;
            row.parentNode.removeChild(row);
            updateStatusText();
        }

        function bersihkanSemuaTabel() {
            if(confirm("Apakah Anda yakin ingin mengosongkan semua daftar aturan di tabel?")) {
                tbody.innerHTML = "";
                updateStatusText();
            }
        }

        function escapeHtml(text) {
            return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }

        function updateStatusText() {
            const total = tbody.querySelectorAll('tr').length;
            document.getElementById('status').innerText = \`Status: Standby. \${total} data pemicu siap dieksekusi.\`;
        }

        // ENGINE PENGURAI TEXT CSV MENTAH SECARA AKURAT
        function imporDataCSV() {
            const rawCSV = document.getElementById('csv-input').value.trim();
            if(!rawCSV) {
                alert("Silakan paste data teks CSV terlebih dahulu di kotak!");
                return;
            }

            const lines = rawCSV.split(/\\r?\\n/);
            let barisBerhasil = 0;
            let barisDilewati = [];

            const csvRegex = /"([^"]*(?:""[^"]*)*)"|([^",\\n]+)/g;

            lines.forEach((line, index) => {
                if (index === 0 && (line.toLowerCase().includes("kutipan") || line.toLowerCase().includes("judul"))) return;
                if (!line.trim()) return;

                try {
                    const lineAman = line.replace(/\\\\"/g, '""');
                    let matches = [];
                    let match;
                    csvRegex.lastIndex = 0; 

                    while ((match = csvRegex.exec(lineAman)) !== null) {
                        matches.push(match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2]);
                    }

                    if (matches.length >= 5) {
                        const cari = (matches[2] || "").trim();
                        const ganti = (matches[4] || "").trim();
                        tambahBaris(cari, ganti);
                        barisBerhasil++;
                    } else {
                        barisDilewati.push(index + 1);
                    }
                } catch (err) {
                    console.error("Gagal mengurai baris ke-" + (index + 1) + ":", err);
                    barisDilewati.push(index + 1);
                }
            });

            if(barisBerhasil > 0) {
                let pesan = "Sukses mengurai! " + barisBerhasil + " aturan baru ditambahkan ke tabel.";
                if (barisDilewati.length > 0) {
                    pesan += "\\n\\n⚠️ " + barisDilewati.length + " baris dilewati (cek formatnya): baris ke-" + barisDilewati.join(", ") + ".";
                }
                alert(pesan);
                document.getElementById('csv-input').value = ""; 
            } else {
                alert("Gagal membaca struktur data CSV. Pastikan format kolom sesuai.");
            }
        }

        async function jalankanProses() {
            const logsDiv = document.getElementById('logs');
            const statusDiv = document.getElementById('status');
            
            const rows = tbody.querySelectorAll('tr');
            const rules = [];
            
            rows.forEach(row => {
                const cari = row.querySelector('.input-cari').value.trim();
                const ganti = row.querySelector('.input-ganti').value.trim();
                if(cari) rules.push({ cari, ganti });
            });

            if (rules.length === 0) {
                alert("Tabel kosong! Isi atau impor kata terlebih dahulu.");
                return;
            }

            logsDiv.innerHTML = "Memindai file HTML di folder aktif dan mencocokkan " + rules.length + " aturan AdSense...\\n";
            statusDiv.innerHTML = "Status: Sedang memproses audit konten...";

            try {
                const response = await fetch('/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rules })
                });
                
                const data = await response.json();
                logsDiv.innerHTML = data.results.join('\\n');
                
                const jumlahBerhasil = data.results.filter(line => line.indexOf('[BERHASIL]') === 0).length;
                statusDiv.innerHTML = \`Status: Selesai! \${jumlahBerhasil} file berhasil diproses.\`;
                
            } catch (err) {
                logsDiv.innerHTML += "\\n[ERROR] Koneksi ke backend Bun terputus: " + err;
                statusDiv.innerHTML = "Status: Gagal.";
            }
        }
    </script>
</body>
</html>
`;

// LIVE SERVER BUN
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
          logBersih.push("[INFO] Pemindaian selesai. Konten aman, tidak ditemukan kecocokan pelanggaran AdSense.");
        }
        
        return Response.json({ results: logBersih });
      } catch (e) {
        return Response.json({ results: [`[ERROR] Kegagalan sistem: ${e.message}`] }, { status: 400 });
      }
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

console.log("🚀 Engine Bun Aktif! Jalankan browser di: http://localhost:5000");
