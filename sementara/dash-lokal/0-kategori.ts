import { join } from "path";
import { readdirSync, statSync, existsSync } from "fs";

const PORT = 5000;

console.log(`\n🚀 Dashboard Analisis aktif! Silakan buka: http://localhost:${PORT}\n`);

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // 1. Tampilkan Halaman Utama Dashboard (HTML)
    if (url.pathname === "/" && req.method === "GET") {
      return new Response(getHtmlDashboard(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 2. Endpoint API untuk Memproses Analisis
    if (url.pathname === "/api/analyze" && req.method === "POST") {
      try {
        const body = await req.json();
        const { scriptPath, articlesPath } = body;

        if (!scriptPath || !articlesPath) {
          return Response.json({ error: "Path script dan path artikel wajib diisi!" }, { status: 400 });
        }

        // Tentukan path absolut agar aman luar dalam
        const absoluteScriptPath = join(process.cwd(), scriptPath);
        const absoluteArticlesPath = join(process.cwd(), articlesPath);

        if (!existsSync(absoluteScriptPath)) {
          return Response.json({ error: `File script tidak ditemukan di path: ${scriptPath}` }, { status: 400 });
        }

        if (!existsSync(absoluteArticlesPath)) {
          return Response.json({ error: `File/Folder artikel tidak ditemukan di path: ${articlesPath}` }, { status: 400 });
        }

        // --- BACA ISI FILE SCRIPT UNTUK DITAMPILKAN DI EDITOR ---
        const scriptContentRaw = await Bun.file(absoluteScriptPath).text();

        // --- MENGIMPOR SCRIPT CLASSIFIER SECARA DINAMIS ---
        let titleToCategoryFn: (title: string) => string;
        try {
          const mod = await import(absoluteScriptPath);
          titleToCategoryFn = mod.titleToCategory || mod.default || mod.classify;

          if (!titleToCategoryFn) {
            throw new Error("Fungsi 'titleToCategory' atau default export tidak ditemukan di dalam script.");
          }
        } catch (err: any) {
          return Response.json({ error: `Gagal memuat fungsi dari script: ${err.message}` }, { status: 400 });
        }

        // --- MEMBACA DATA ARTIKEL ---
        let articles: string[] = [];
        try {
          const isDir = statSync(absoluteArticlesPath).isDirectory();
          if (isDir) {
            const files = readdirSync(absoluteArticlesPath).filter(f => f.endsWith(".json"));
            for (const file of files) {
              const content = await Bun.file(join(absoluteArticlesPath, file)).json();
              articles = articles.concat(extractTitles(content));
            }
          } else {
            const content = await Bun.file(absoluteArticlesPath).json();
            articles = extractTitles(content);
          }
        } catch (err: any) {
          return Response.json({ error: `Gagal memproses file JSON artikel: ${err.message}` }, { status: 400 });
        }

        if (articles.length === 0) {
          return Response.json({ error: "Tidak ditemukan judul artikel yang bisa dianalisis." }, { status: 400 });
        }

        // --- PROSES KLASIFIKASI & HITUNG STATISTIK ---
        const categoryDistribution: Record<string, number> = {};
        const uncategorizedTitles: string[] = [];
        let categorizedCount = 0;
        let uncategorizedCount = 0;

        for (const title of articles) {
          try {
            const resCategory = titleToCategoryFn(title);
            const category = resCategory ? resCategory.trim() : "Lainnya";

            if (category.toLowerCase() === "lainnya" || category === "") {
              uncategorizedCount++;
              uncategorizedTitles.push(title);
            } else {
              categorizedCount++;
              categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
            }
          } catch (e) {
            uncategorizedCount++;
            uncategorizedTitles.push(title);
          }
        }

        // --- EKSTRAKSI KATA KUNCI BARU DARI "LAINNYA" ---
        const wordFreq: Record<string, number> = {};

        const STOP_WORDS: string[] = [
          "dan", "atau", "tetapi", "sedangkan", "melainkan", "lalu", "kemudian", "padahal",
          "sesudah", "setelah", "sebelum", "sejak", "ketika", "sementara", "sambil", "selama",
          "sampai", "jika", "kalau", "asalkan", "bila", "andaikan", "sekiranya", "agar",
          "supaya", "biarpun", "meskipun", "walaupun", "seakan-akan", "seolah-olah", "sebab",
          "karena", "sehingga", "bahwa", "dengan", "biarpun demikian", "sekalipun begitu",
          "walaupun demikian", "meskipun begitu", "sesudah itu", "selanjutnya", "tambahan pula",
          "lagi pula", "selain itu", "sebaliknya", "sesungguhnya", "bahwasanya", "malahan",
          "bahkan", "akan tetapi", "namun", "kecuali itu", "dengan demikian", "oleh karena itu",
          "oleh sebab itu", "sebelum itu", "begitu pula", "demikian juga", "tambahan lagi",
          "di samping itu", "kedua", "akhirnya", "bagaimanapun juga", "sebagaimana",
          "sama halnya", "jadi", "akibatnya", "untuk maksud itu", "untuk mencapai hal itu",
          "ringkasnya", "secara singkat", "pada intinya", "sementara itu", "serta", "apabila",
          "bilamana", "guna", "ataupun", "bagai", "ibarat", "serupa", "mula-mula", "biar",
          "yaitu", "yakni", "asal", "maka", "adapun", "kendati", "lantaran", "alhasil",
          "andaikata", "manakala"
        ];

        const stopwords = new Set([
          "the", "of", "and", "a", "to", "in", "is", "you", "that", "it", "for", "on", "are", "as", "with",
          "mengatasi", "solusi", "membuat", "panduan", "lengkap", "terbaru", "tips", "trik", "mengenal", "bagaimana", "kenapa", "mengapa", "vs", "buat",
          "di", "ke", "dari", "yang", "untuk", "ini", "itu", "adalah", "bisa", "cara", "pada", "sebuah",
          "yg", "dalam", "tentang", "paling", "nya", "tidak", "bukan", "tanpa", "lebih"
        ]);

        STOP_WORDS.forEach(phrase => {
          phrase.split(/\s+/).forEach(word => {
            stopwords.add(word);
          });
        });

        for (const title of uncategorizedTitles) {
          const words = title
          .toLowerCase()
          .replace(/[^\p{L}\s]/gu, " ")
          .split(/\s+/);

          for (const word of words) {
            if (word.length > 1 && !stopwords.has(word)) {
              wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
          }
        }

        const topWords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .map(([word, count]) => ({ word, count }));

        return Response.json({
          summary: {
            total: articles.length,
            categorized: categorizedCount,
            uncategorized: uncategorizedCount,
            accuracy: ((categorizedCount / articles.length) * 100).toFixed(1) + "%",
          },
          categoryDistribution,
          topWords,
          uncategorizedSample: uncategorizedTitles.slice(0, 300), // Ditingkatkan krn ruang lebih lega
                             scriptContent: scriptContentRaw
        });

      } catch (globalErr: any) {
        return Response.json({ error: `Server Error: ${globalErr.message}` }, { status: 500 });
      }
    }

    // 3. Endpoint API BARU untuk Menyimpan Perubahan Script
    if (url.pathname === "/api/save-script" && req.method === "POST") {
      try {
        const body = await req.json();
        const { scriptPath, newContent } = body;

        if (!scriptPath || newContent === undefined) {
          return Response.json({ error: "Path script dan konten tidak valid!" }, { status: 400 });
        }

        const absoluteScriptPath = join(process.cwd(), scriptPath);

        // Bun.write super cepat untuk me-replace isi file
        await Bun.write(absoluteScriptPath, newContent);

        return Response.json({ success: true, message: "Perubahan script berhasil disimpan!" });
      } catch (err: any) {
        return Response.json({ error: `Gagal menyimpan file: ${err.message}` }, { status: 500 });
      }
    }

    return new Response("Endpoint tidak ditemukan", { status: 404 });
  },
});

// Helper super-kilat khusus untuk struktur: { "Kategori": [ ["Judul", "url", ...], ... ] }
function extractTitles(json: any): string[] {
  const titles: string[] = [];

  // Pastikan data utamanya adalah Object (bukan null atau array murni)
  if (typeof json === "object" && json !== null && !Array.isArray(json)) {

    // Looping setiap kunci kategori (misal: "Sistem Terbuka", "Warta Tekno")
    for (const category in json) {
      const articlesList = json[category];

      if (Array.isArray(articlesList)) {
        // Looping setiap baris artikel di dalam kategori tersebut
        for (const articleData of articlesList) {

          // Pastikan baris ini adalah array dan index 0 (judul) adalah string
          if (Array.isArray(articleData) && typeof articleData[0] === "string") {
            titles.push(articleData[0].trim()); // .trim() buat ngebersihin spasi nyasar
          }

        }
      }
    }

  }

  return titles;
}

// Komponen Template HTML Dashboard
function getHtmlDashboard() {
  return `<!DOCTYPE html>
  <html lang="id">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Analisis Kata Kunci Artikel</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
  body { font-family: 'Plus Jakarta Sans', sans-serif; }
  /* Custom Scrollbar untuk Textarea biar manis */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #020617; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #475569; }
  </style>
  </head>
  <body class="bg-slate-950 text-slate-100 min-h-screen">

  <div class="container mx-auto px-4 py-8 max-w-[96%]">

  <div class="mb-8 text-center md:text-left md:flex md:items-center md:justify-between border-b border-slate-800 pb-6">
  <div>
  <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">📊 Dashboard Analisis & Strategi Kata Kunci</h1>
  <p class="text-slate-400 mt-1">Saring kata kunci baru untuk 6 kategori utama dari sisa artikel "Lainnya". Edit algoritma langsung dari sini.</p>
  </div>
  <div class="mt-4 md:mt-0">
  <span class="bg-cyan-500/10 text-cyan-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-cyan-500/20 shadow-sm">Bun Serve Localhost:5000</span>
  </div>
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-4 gap-8">

  <div class="xl:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl h-fit">
  <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">⚙️ Parameter Analisis</h2>
  <div class="space-y-4">
  <div>
  <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Path File/Folder Artikel</label>
  <input type="text" id="articlesPath" value="artikel.json" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-mono">
  </div>
  <div>
  <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Path Script titletocategory</label>
  <input type="text" id="scriptPath" value="dapur/titleToCategory.ts" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-mono">
  </div>
  <button id="btnAnalyze" class="w-full mt-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 font-bold text-slate-950 py-3 rounded-xl shadow-lg transition-all transform active:scale-95">
  🚀 Jalankan Analisis Data
  </button>
  </div>
  <div id="errorMessage" class="hidden mt-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs leading-relaxed"></div>
  </div>

  <div class="xl:col-span-3 space-y-6">
  <div id="summaryCards" class="grid grid-cols-2 md:grid-cols-4 gap-4">
  <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center shadow">
  <p class="text-xs text-slate-400 uppercase font-medium">Total Judul</p>
  <h3 id="statTotal" class="text-2xl font-bold text-slate-100 mt-1">-</h3>
  </div>
  <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center shadow">
  <p class="text-xs text-emerald-400 uppercase font-medium">Terkategorikan</p>
  <h3 id="statCategorized" class="text-2xl font-bold text-emerald-400 mt-1">-</h3>
  </div>
  <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center shadow">
  <p class="text-xs text-amber-400 uppercase font-medium">Masuk "Lainnya"</p>
  <h3 id="statUncategorized" class="text-2xl font-bold text-amber-400 mt-1">-</h3>
  </div>
  <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center shadow">
  <p class="text-xs text-cyan-400 uppercase font-medium">Cakupan Klasifikasi</p>
  <h3 id="statAccuracy" class="text-2xl font-bold text-cyan-400 mt-1">-</h3>
  </div>
  </div>

  <div id="resultsContainerTop" class="hidden grid grid-cols-1 md:grid-cols-2 gap-6">
  <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow">
  <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">📊 Distribusi Kategori</h3>
  <div class="relative w-full h-64 flex items-center justify-center">
  <canvas id="categoryChart"></canvas>
  </div>
  </div>

  <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow flex flex-col h-76">
  <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">🔑 Rekomendasi Kata Kunci Baru</h3>
  <p class="text-[11px] text-slate-400 mb-4">Tambahkan kata ini ke file script di bawah, lalu klik "Simpan" & jalankan ulang analisis.</p>
  <div id="topWordsList" class="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs max-h-52"></div>
  </div>
  </div>

  <div id="placeholderState" class="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-2xl text-slate-600">
  <span class="text-4xl mb-2">📊</span>
  <p class="text-sm">Klik tombol **Jalankan Analisis Data** di sebelah kiri</p>
  </div>
  </div>
  </div>

  <div id="resultsContainerBottom" class="hidden mt-8 space-y-6">

  <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow w-full">
  <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex justify-between items-center">
  <span>📋 Judul Artikel Kategori "Lainnya" (Butuh Kata Kunci Baru)</span>
  <span id="sampleCount" class="text-[10px] bg-slate-800 px-2.5 py-0.5 rounded-full text-slate-400"></span>
  </h3>
  <div id="titlesSampleContainer" class="max-h-60 overflow-y-auto space-y-2 text-xs text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
  </div>
  </div>

  <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow w-full">
  <div class="flex justify-between items-center mb-3">
  <div>
  <h3 class="text-xs font-bold text-cyan-400 uppercase tracking-wider">
  📄 Live Editor: Script titleToCategory
  </h3>
  <p class="text-[11px] text-slate-400 mt-1">Kamu bisa langsung mengedit array keywords di sini tanpa perlu membuka teks editor lain.</p>
  </div>
  <div class="flex items-center gap-3">
  <span id="saveStatusMsg" class="text-xs font-bold hidden"></span>
  <button id="btnSaveScript" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-6 rounded-lg shadow-lg transition-all transform active:scale-95 flex items-center gap-2">
  💾 Simpan Perubahan
  </button>
  </div>
  </div>
  <textarea id="scriptContentEditor" spellcheck="false" class="w-full h-[500px] bg-[#0d1117] p-5 rounded-xl border border-slate-700 text-[13px] text-slate-300 font-mono focus:outline-none focus:border-cyan-500 resize-y leading-relaxed shadow-inner"></textarea>
  </div>

  </div>

  </div>

  <script>
  let categoryChartInstance = null;

  // --- LOGIKA TOMBOL ANALISIS ---
  document.getElementById('btnAnalyze').addEventListener('click', async () => {
    const scriptPath = document.getElementById('scriptPath').value;
    const articlesPath = document.getElementById('articlesPath').value;
    const btn = document.getElementById('btnAnalyze');
    const errorDiv = document.getElementById('errorMessage');

    errorDiv.classList.add('hidden');
    btn.disabled = true;
    btn.innerText = '⏳ Memproses Klasifikasi...';

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptPath, articlesPath })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Terjadi galat sistem.');

    document.getElementById('placeholderState').classList.add('hidden');
    document.getElementById('resultsContainerTop').classList.remove('hidden');
    document.getElementById('resultsContainerBottom').classList.remove('hidden');

    // Isi Metrik Ringkasan
    document.getElementById('statTotal').innerText = data.summary.total;
    document.getElementById('statCategorized').innerText = data.summary.categorized;
    document.getElementById('statUncategorized').innerText = data.summary.uncategorized;
    document.getElementById('statAccuracy').innerText = data.summary.accuracy;

    // Tampilkan Isi Script ke dalam Textarea Live Editor
    document.getElementById('scriptContentEditor').value = data.scriptContent;

    // Tampilkan Rekomendasi Kata Kunci Baru
    const wordsList = document.getElementById('topWordsList');
    wordsList.innerHTML = '';
  if(data.topWords.length === 0) {
    wordsList.innerHTML = '<p class="text-slate-500 italic text-center pt-8">Tidak ada pola kata kunci dominan.</p>';
  } else {
    data.topWords.forEach((item, index) => {
      wordsList.innerHTML += \`
      <div class="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-amber-500/40 transition-colors">
      <div class="flex items-center gap-2">
      <span class="text-slate-500 font-bold w-4 text-right">\${index + 1}.</span>
      <span class="font-bold text-amber-300">"\${item.word}"</span>
      </div>
      <span class="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">\${item.count} artikel</span>
      </div>\`;
    });
  }

  // Tampilkan Daftar Judul "Lainnya"
  const sampleContainer = document.getElementById('titlesSampleContainer');
  document.getElementById('sampleCount').innerText = \`Total: \${data.summary.uncategorized} judul\`;
  sampleContainer.innerHTML = '';
  if(data.uncategorizedSample.length === 0) {
    sampleContainer.innerHTML = '<p class="text-emerald-400 italic text-center py-2">Luar biasa! Semua judul sudah masuk ke 6 kategori utama! 🎉</p>';
  } else {
    data.uncategorizedSample.forEach(title => {
      sampleContainer.innerHTML += \`<div class="py-1 border-b border-slate-900 last:border-0 hover:text-amber-200 transition-colors">⚠️ \${title}</div>\`;
    });
  }

  // Gambar Grafik Distribusi Kategori
  const labels = Object.keys(data.categoryDistribution);
  const counts = Object.values(data.categoryDistribution);
  if(data.summary.uncategorized > 0) {
    labels.push('Lainnya');
    counts.push(data.summary.uncategorized);
  }

  if (categoryChartInstance) categoryChartInstance.destroy();
  const ctx = document.getElementById('categoryChart').getContext('2d');
    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: ['#06b6d4', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b'],
          borderWidth: 1,
          borderColor: '#0f172a'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 } } }
        }
      }
    });

  } catch (err) {
    errorDiv.innerText = err.message;
    errorDiv.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerText = '🚀 Jalankan Analisis Data';
  }
  });

  // --- LOGIKA TOMBOL SIMPAN SCRIPT ---
  document.getElementById('btnSaveScript').addEventListener('click', async () => {
    const btn = document.getElementById('btnSaveScript');
    const msg = document.getElementById('saveStatusMsg');
    const scriptPath = document.getElementById('scriptPath').value;
    const newContent = document.getElementById('scriptContentEditor').value;

    btn.disabled = true;
    btn.innerText = '⏳ Menyimpan...';
  msg.classList.add('hidden');

  try {
    const response = await fetch('/api/save-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptPath, newContent })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Terjadi galat saat menyimpan.');

    // Pesan Sukses
    msg.innerText = '✅ ' + data.message;
    msg.className = 'text-xs font-bold text-emerald-400 block';
  } catch (err) {
    // Pesan Error
    msg.innerText = '❌ ' + err.message;
    msg.className = 'text-xs font-bold text-rose-400 block';
  } finally {
    btn.disabled = false;
    btn.innerText = '💾 Simpan Perubahan';

  // Sembunyikan pesan sukses setelah 4 detik
  setTimeout(() => {
    msg.classList.add('hidden');
  }, 4000);
  }
  });

  </script>
  </body>
  </html>`;
}
