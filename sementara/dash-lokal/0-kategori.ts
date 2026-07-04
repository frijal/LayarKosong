import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const PORT = 5000;

const DEFAULT_STOPWORDS =
"dan, atau, tetapi, sedangkan, melainkan, lalu, kemudian, padahal, sesudah, setelah, sebelum, sejak, ketika, sementara, sambil, selama, sampai, jika, kalau, asalkan, bila, andaikan, sekiranya, agar, supaya, biarpun, meskipun, walaupun, seakan-akan, seolah-olah, sebab, karena, sehingga, bahwa, dengan, biarpun demikian, sekalipun begitu, walaupun demikian, meskipun begitu, sesudah itu, selanjutnya, tambahan pula, lagi pula, selain itu, sebaliknya, sesungguhnya, bahwasanya, malahan, bahkan, akan tetapi, namun, kecuali itu, dengan demikian, oleh karena itu, oleh sebab itu, sebelum itu, begitu pula, demikian juga, tambahan lagi, di samping itu, kedua, akhirnya, bagaimanapun juga, sebagaimana, sama halnya, jadi, akibatnya, untuk maksud itu, untuk mencapai hal itu, ringkasnya, secara singkat, pada intinya, sementara itu, serta, apabila, bilamana, guna, ataupun, bagai, ibarat, serupa, mula-mula, biar, yaitu, yakni, asal, maka, adapun, kendati, lantaran, alhasil, andaikata, manakala, the, of, and, a, to, in, is, you, that, it, for, on, are, as, with, mengatasi, solusi, membuat, panduan, lengkap, terbaru, tips, trik, mengenal, bagaimana, kenapa, mengapa, vs, buat, di, ke, dari, yang, untuk, ini, itu, adalah, bisa, cara, pada, sebuah, yg, dalam, tentang, paling, nya, tidak, bukan, tanpa, lebih, baru, jangan, hari, kita, tak, masa, menjadi, hingga, al, era, dunia, makna";

console.log(`\n🚀 Dashboard Analisis aktif! Silakan buka: http://localhost:${PORT}\n`);

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // --- HALAMAN UTAMA ---
    if (url.pathname === "/" && req.method === "GET") {
      return new Response(getHtmlDashboard(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // --- ENDPOINT ANALISIS ---
    if (url.pathname === "/api/analyze" && req.method === "POST") {
      try {
        const body = await req.json();
        const { scriptPath, articlesPath } = body;

        if (!scriptPath || !articlesPath) {
          return Response.json({ error: "Path script dan path artikel wajib diisi!" }, { status: 400 });
        }

        const absoluteScriptPath = join(process.cwd(), scriptPath);
        const absoluteArticlesPath = join(process.cwd(), articlesPath);

        if (!existsSync(absoluteScriptPath)) {
          return Response.json({ error: `File script tidak ditemukan di path: ${scriptPath}` }, { status: 400 });
        }

        if (!existsSync(absoluteArticlesPath)) {
          return Response.json({ error: `File/Folder artikel tidak ditemukan di path: ${articlesPath}` }, { status: 400 });
        }

        const stopwordDir = join(process.cwd(), "mini");
        const stopwordPath = join(stopwordDir, "stopwordkategori.txt");

        if (!existsSync(stopwordDir)) mkdirSync(stopwordDir, { recursive: true });
        if (!existsSync(stopwordPath)) await Bun.write(stopwordPath, DEFAULT_STOPWORDS);

        const scriptContentRaw = await Bun.file(absoluteScriptPath).text();
        const stopwordContentRaw = await Bun.file(stopwordPath).text();

        let titleToCategoryFn: (title: string) => string;
        try {
          // Cache-bust: Bun.serve hidup sebagai satu proses panjang, jadi ES module
          // di-cache berdasarkan path. Tanpa query unik ini, edit + simpan script
          // tidak akan pernah terbaca ulang sampai server di-restart manual.
          const mod = await import(`${absoluteScriptPath}?update=${Date.now()}`);
          titleToCategoryFn = mod.titleToCategory || mod.default || mod.classify;
          if (!titleToCategoryFn) throw new Error("Fungsi 'titleToCategory' tidak ditemukan.");
        } catch (err: any) {
          return Response.json({ error: `Gagal memuat script: ${err.message}` }, { status: 400 });
        }

        let articles: string[] = [];
        try {
          const content = await Bun.file(absoluteArticlesPath).json();
          articles = extractTitles(content);
        } catch (err: any) {
          return Response.json({ error: `Gagal memproses file JSON: ${err.message}` }, { status: 400 });
        }

        if (articles.length === 0) {
          return Response.json({ error: "Tidak ditemukan judul artikel." }, { status: 400 });
        }

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
          } catch {
            uncategorizedCount++;
            uncategorizedTitles.push(title);
          }
        }

        // Regex kata disamakan dengan frontend: huruf + angka (biar "web3", "2026" dkk ikut terhitung)
        const wordFreq: Record<string, number> = {};
        const stopwords = new Set<string>();

        stopwordContentRaw.split(/[\s,]+/).forEach((word) => {
          if (word.trim().length > 0) stopwords.add(word.trim().toLowerCase());
        });

          for (const title of uncategorizedTitles) {
            const words = title.toLowerCase().replace(/[^\p{L}0-9\s]/gu, " ").split(/\s+/);
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
            uncategorizedSample: uncategorizedTitles.slice(0, 300),
                               scriptContent: scriptContentRaw,
                               stopwordContent: stopwordContentRaw,
          });
      } catch (globalErr: any) {
        return Response.json({ error: `Server Error: ${globalErr.message}` }, { status: 500 });
      }
    }

    // --- ENDPOINT SIMPAN SCRIPT ---
    if (url.pathname === "/api/save-script" && req.method === "POST") {
      try {
        const { scriptPath, newContent } = await req.json();
        const absoluteScriptPath = join(process.cwd(), scriptPath);
        await Bun.write(absoluteScriptPath, newContent);
        return Response.json({ success: true, message: "Script berhasil disimpan!" });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // --- ENDPOINT SIMPAN STOPWORD ---
    if (url.pathname === "/api/save-stopword" && req.method === "POST") {
      try {
        const { newContent } = await req.json();
        const absoluteStopwordPath = join(process.cwd(), "mini/stopwordkategori.txt");
        await Bun.write(absoluteStopwordPath, newContent);
        return Response.json({ success: true, message: "Stopwords berhasil disimpan!" });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    return new Response("Endpoint tidak ditemukan", { status: 404 });
  },
});

function extractTitles(json: any): string[] {
  const titles: string[] = [];
  if (typeof json === "object" && json !== null && !Array.isArray(json)) {
    for (const category in json) {
      const articlesList = json[category];
      if (Array.isArray(articlesList)) {
        for (const articleData of articlesList) {
          if (Array.isArray(articleData) && typeof articleData[0] === "string") {
            titles.push(articleData[0].trim());
          }
        }
      }
    }
  }
  return titles;
}

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
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #020617; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #475569; }

  .editor-wrapper {
    position: relative;
    width: 100%;
    height: 450px;
    background: #0d1117;
    border-radius: 0.75rem;
    border: 1px solid #334155;
    overflow: hidden;
  }
  .editor-backdrop, .editor-textarea {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    width: 100%; height: 100%;
    margin: 0; padding: 1.25rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-y: auto;
  }
  .editor-textarea {
    color: transparent;
    background: transparent;
    caret-color: #e2e8f0;
    resize: none;
    z-index: 2;
    outline: none;
    border: none;
  }
  .editor-backdrop {
    color: #94a3b8;
    z-index: 1;
    pointer-events: none;
  }
  .editor-textarea:focus {
    box-shadow: inset 0 0 0 1px #06b6d4;
  }
  .hl-duplicate {
    background-color: rgba(225, 29, 72, 0.4);
    color: #f1f5f9;
    border-radius: 3px;
    padding: 0 2px;
    margin: 0 -2px;
  }
  .hl-conflict {
    background-color: rgba(245, 158, 11, 0.4);
    color: #f1f5f9;
    border: 1px solid #d97706;
    border-radius: 3px;
    padding: 0 2px;
    margin: 0 -2px;
  }
  </style>
  </head>
  <body class="bg-slate-950 text-slate-100 min-h-screen">

  <div class="container mx-auto px-4 py-8 max-w-[96%]">
  <div class="mb-8 text-center md:text-left md:flex md:items-center md:justify-between border-b border-slate-800 pb-6">
  <div>
  <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">📊 Dashboard Analisis & Strategi Kata Kunci</h1>
  <p class="text-slate-400 mt-1">Saring kata kunci baru dari sisa artikel "Lainnya" & kelola aturan algoritma langsung di sini.</p>
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
  <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Path File JSON Artikel</label>
  <input type="text" id="articlesPath" value="artikel.json" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-mono">
  </div>
  <div>
  <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Path Script titleToCategory</label>
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
  <p class="text-[11px] text-slate-400 mb-4">Tambahkan kata ini ke file di bawah (kiri/kanan), lalu jalankan ulang analisis.</p>
  <div id="topWordsList" class="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs max-h-52"></div>
  </div>
  </div>

  <div id="placeholderState" class="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-2xl text-slate-600">
  <span class="text-4xl mb-2">📊</span>
  <p class="text-sm">Klik tombol <strong>Jalankan Analisis Data</strong> di sebelah kiri</p>
  </div>
  </div>
  </div>

  <div id="resultsContainerMiddle" class="hidden mt-8">
  <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow w-full">
  <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex justify-between items-center">
  <span>📋 Judul Artikel Kategori "Lainnya" (Butuh Kata Kunci Baru)</span>
  <span id="sampleCount" class="text-[10px] bg-slate-800 px-2.5 py-0.5 rounded-full text-slate-400"></span>
  </h3>
  <div id="titlesSampleContainer" class="max-h-60 overflow-y-auto space-y-2 text-xs text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
  </div>
  </div>
  </div>

  <div id="resultsContainerBottom" class="hidden mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">

  <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow w-full">
  <div class="flex justify-between items-center mb-3">
  <div>
  <h3 class="text-xs font-bold text-cyan-400 uppercase tracking-wider">📄 Editor: titleToCategory.ts</h3>
  <p class="text-[11px] text-slate-400 mt-1">Aturan klasifikasi utama. <span class="text-rose-400">Blok merah = duplikat terdeteksi.</span></p>
  </div>
  <div class="flex items-center gap-3">
  <span id="saveStatusMsg1" class="text-xs font-bold hidden"></span>
  <button id="btnSaveScript" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-lg transition-all transform active:scale-95 flex items-center gap-2">
  💾 Simpan Script
  </button>
  </div>
  </div>
  <div class="editor-wrapper">
  <div id="scriptBackdrop" class="editor-backdrop"></div>
  <textarea id="scriptContentEditor" spellcheck="false" class="editor-textarea"></textarea>
  </div>
  </div>

  <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow w-full">
  <div class="flex justify-between items-center mb-3">
  <div>
  <h3 class="text-xs font-bold text-rose-400 uppercase tracking-wider">⛔ Editor: stopwordkategori.txt</h3>
  <p class="text-[11px] text-slate-400 mt-1">Kata generik yang diabaikan. <span class="text-rose-400">Blok merah = duplikat terdeteksi.</span></p>
  </div>
  <div class="flex items-center gap-3">
  <span id="saveStatusMsg2" class="text-xs font-bold hidden"></span>
  <button id="btnSaveStopword" class="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-lg transition-all transform active:scale-95 flex items-center gap-2">
  💾 Simpan Stopwords
  </button>
  </div>
  </div>
  <div class="editor-wrapper">
  <div id="stopwordBackdrop" class="editor-backdrop"></div>
  <textarea id="stopwordContentEditor" spellcheck="false" class="editor-textarea"></textarea>
  </div>
  </div>

  </div>

  </div>

  <script>
  let categoryChartInstance = null;

  // --- LOGIKA HIGHLIGHTER DUPLIKASI & KONFLIK (satu fungsi, tidak ada duplikasi definisi) ---
  function extractWords(text) {
    return (text.match(/[\\p{L}0-9]{2,}/gu) || []).map(function (w) { return w.toLowerCase(); });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Salin kata kunci dalam format siap-tempel array: "keyword",
  function copyKeyword(word, btnEl) {
    const textToCopy = '"' + word + '",';
    const originalIcon = btnEl.innerHTML;

    navigator.clipboard.writeText(textToCopy).then(function () {
      btnEl.innerHTML = '✅';
    btnEl.disabled = true;
    setTimeout(function () {
      btnEl.innerHTML = originalIcon;
      btnEl.disabled = false;
    }, 1200);
    }).catch(function (err) {
      console.error('Gagal menyalin ke clipboard:', err);
      btnEl.innerHTML = '⚠️';
    setTimeout(function () { btnEl.innerHTML = originalIcon; }, 1200);
    });
  }

  function processHighlight(text, otherWordsSet) {
    const html = escapeHtml(text);
    const lowerText = text.toLowerCase();
    const regex = /([\\p{L}0-9]{2,})/gu;

    return html.replace(regex, function (match) {
      const lower = match.toLowerCase();
      const internalCount = (lowerText.match(new RegExp("\\\\b" + lower + "\\\\b", "gu")) || []).length;

      if (internalCount > 1) {
        return '<mark class="hl-duplicate">' + match + '</mark>';
      }
      if (otherWordsSet.has(lower)) {
        return '<mark class="hl-conflict">' + match + '</mark>';
      }
      return match;
    });
  }

  function applyHighlighting() {
    const elScript = document.getElementById('scriptContentEditor');
    const elStopword = document.getElementById('stopwordContentEditor');
    const bdScript = document.getElementById('scriptBackdrop');
    const bdStopword = document.getElementById('stopwordBackdrop');

    const wordsScript = new Set(extractWords(elScript.value));
    const wordsStopword = new Set(extractWords(elStopword.value));

    bdScript.innerHTML = processHighlight(elScript.value, wordsStopword);
    bdStopword.innerHTML = processHighlight(elStopword.value, wordsScript);
  }

  const textareas = ['scriptContentEditor', 'stopwordContentEditor'];
  textareas.forEach(function (id) {
    const el = document.getElementById(id);
    el.addEventListener('input', applyHighlighting);
    el.addEventListener('scroll', function () {
      const backdrop = document.getElementById(id.replace('ContentEditor', 'Backdrop'));
      backdrop.scrollTop = el.scrollTop;
      backdrop.scrollLeft = el.scrollLeft;
    });
  });

  // --- LOGIKA TOMBOL ANALISIS ---
  document.getElementById('btnAnalyze').addEventListener('click', async () => {
    const scriptPath = document.getElementById('scriptPath').value;
    const articlesPath = document.getElementById('articlesPath').value;
    const btn = document.getElementById('btnAnalyze');
    const errorDiv = document.getElementById('errorMessage');

    errorDiv.classList.add('hidden');
    btn.disabled = true;
    btn.innerText = '⏳ Memproses...';

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
    document.getElementById('resultsContainerMiddle').classList.remove('hidden');
    document.getElementById('resultsContainerBottom').classList.remove('hidden');

    document.getElementById('statTotal').innerText = data.summary.total;
    document.getElementById('statCategorized').innerText = data.summary.categorized;
    document.getElementById('statUncategorized').innerText = data.summary.uncategorized;
    document.getElementById('statAccuracy').innerText = data.summary.accuracy;

    document.getElementById('scriptContentEditor').value = data.scriptContent;
    document.getElementById('stopwordContentEditor').value = data.stopwordContent;
    applyHighlighting();

    const wordsList = document.getElementById('topWordsList');
    wordsList.innerHTML = '';
  if (data.topWords.length === 0) {
    wordsList.innerHTML = '<p class="text-slate-500 italic text-center pt-8">Tidak ada pola kata kunci dominan.</p>';
  } else {
    data.topWords.forEach((item, index) => {
      wordsList.innerHTML += \`
      <div class="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-amber-500/40 transition-colors">
      <div class="flex items-center gap-2 min-w-0">
      <span class="text-slate-500 font-bold w-4 text-right shrink-0">\${index + 1}.</span>
      <span class="font-bold text-amber-300 truncate">"\${item.word}"</span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
      <span class="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">\${item.count} artikel</span>
      <button onclick="copyKeyword('\${item.word}', this)" title="Salin sebagai &quot;\${item.word}&quot;," class="bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white text-[11px] w-6 h-6 flex items-center justify-center rounded transition-colors">📋</button>
      </div>
      </div>\`;
    });
  }

  const sampleContainer = document.getElementById('titlesSampleContainer');
  document.getElementById('sampleCount').innerText = \`Total: \${data.summary.uncategorized} judul\`;
  sampleContainer.innerHTML = '';
  if (data.uncategorizedSample.length === 0) {
    sampleContainer.innerHTML = '<p class="text-emerald-400 italic text-center py-2">Luar biasa! Semua judul sudah masuk ke kategori utama! 🎉</p>';
  } else {
    data.uncategorizedSample.forEach(title => {
      sampleContainer.innerHTML += \`<div class="py-1 border-b border-slate-900 last:border-0 hover:text-amber-200 transition-colors">⚠️ \${title}</div>\`;
    });
  }

  const labels = Object.keys(data.categoryDistribution);
  const counts = Object.values(data.categoryDistribution);
  if (data.summary.uncategorized > 0) {
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
          borderWidth: 1, borderColor: '#0f172a'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 } } } }
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

  // --- LOGIKA TOMBOL SIMPAN SCRIPT KIRI ---
  document.getElementById('btnSaveScript').addEventListener('click', async () => {
    const btn = document.getElementById('btnSaveScript');
    const msg = document.getElementById('saveStatusMsg1');
    const scriptPath = document.getElementById('scriptPath').value;
    const newContent = document.getElementById('scriptContentEditor').value;

    btn.disabled = true; btn.innerText = '⏳ Menyimpan...'; msg.classList.add('hidden');
    try {
      const response = await fetch('/api/save-script', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptPath, newContent })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      msg.innerText = '✅ ' + data.message; msg.className = 'text-xs font-bold text-emerald-400 block';
    } catch (err) {
      msg.innerText = '❌ ' + err.message; msg.className = 'text-xs font-bold text-rose-400 block';
    } finally {
      btn.disabled = false; btn.innerText = '💾 Simpan Script';
  setTimeout(() => msg.classList.add('hidden'), 4000);
    }
  });

  // --- LOGIKA TOMBOL SIMPAN STOPWORD KANAN ---
  document.getElementById('btnSaveStopword').addEventListener('click', async () => {
    const btn = document.getElementById('btnSaveStopword');
    const msg = document.getElementById('saveStatusMsg2');
    const newContent = document.getElementById('stopwordContentEditor').value;

    btn.disabled = true; btn.innerText = '⏳ Menyimpan...'; msg.classList.add('hidden');
    try {
      const response = await fetch('/api/save-stopword', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newContent })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      msg.innerText = '✅ ' + data.message; msg.className = 'text-xs font-bold text-emerald-400 block';
    } catch (err) {
      msg.innerText = '❌ ' + err.message; msg.className = 'text-xs font-bold text-rose-400 block';
    } finally {
      btn.disabled = false; btn.innerText = '💾 Simpan Stopwords';
  setTimeout(() => msg.classList.add('hidden'), 4000);
    }
  });
  </script>
  </body>
  </html>`;
}
