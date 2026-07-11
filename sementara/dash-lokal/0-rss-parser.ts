import { join } from "path";
import { existsSync } from "fs";
import Parser from "rss-parser";

const PORT = 5000;

console.log(`\n🚀 Dashboard Inspeksi Feed (Powered by rss-parser) aktif! \n👉 Buka: http://localhost:${PORT}\n`);

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

		// --- ENDPOINT INSPEKSI XML DENGAN RSS-PARSER ---
		if (url.pathname === "/api/inspect" && req.method === "POST") {
			try {
				const body = await req.json();
				const { xmlPath } = body;

				if (!xmlPath) {
					return Response.json({ error: "Path file XML wajib diisi!" }, { status: 400 });
				}

				const absolutePath = join(process.cwd(), xmlPath);

				if (!existsSync(absolutePath)) {
					return Response.json({ error: `File XML tidak ditemukan di: ${absolutePath}` }, { status: 400 });
				}

				const xmlData = await Bun.file(absolutePath).text();

				// Inisialisasi RSS Parser
				// Kita tambahkan customFields berjaga-jaga kalau data gambarmu ada di tag khusus
				const parser = new Parser({
					customFields: {
						item: ['media:content', 'media:thumbnail', 'content:encoded'],
					}
				});

				// Parser akan otomatis mengenali apakah ini RSS atau Atom
				const feed = await parser.parseString(xmlData);

				const feedTitle = feed.title || "Tanpa Judul";
				const items = feed.items || [];

				// rss-parser menormalisasi semuanya, jadi formatnya abstrak (bisa RSS/Atom)
				const feedType = "Normalized (RSS/Atom)";

				// Ekstraksi cuplikan judul artikel buat di UI
				const articlesList = items.map(item => {
					return item.title || "Item tanpa judul";
				});

				// Hitung aset gambar WebP dari JSON yang sudah dinormalisasi
				const rawJsonString = JSON.stringify(feed).toLowerCase();
				const webpCount = (rawJsonString.match(/\.webp/g) || []).length;

				return Response.json({
					summary: {
						title: feedTitle,
						type: feedType,
						totalItems: items.length,
						webpDetected: webpCount
					},
					articlesList,
					// Kita tampilkan hasil normalisasi dari rss-parser
					rawJson: JSON.stringify(feed, null, 2)
				});

			} catch (err: any) {
				return Response.json({ error: `Gagal parse XML (mungkin format tidak valid): ${err.message}` }, { status: 500 });
			}
		}

		return new Response("Endpoint tidak ditemukan", { status: 404 });
	},
});

function getHtmlDashboard() {
	return `<!DOCTYPE html>
	<html lang="id">
	<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Dashboard Inspeksi Sindikasi (rss-parser)</title>
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
		height: 500px;
		background: #0d1117;
		border-radius: 0.75rem;
		border: 1px solid #334155;
		overflow: hidden;
	}
	.editor-textarea {
		position: absolute;
		top: 0; left: 0; right: 0; bottom: 0;
		width: 100%; height: 100%;
		margin: 0; padding: 1.25rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 13px;
		line-height: 1.6;
		color: #94a3b8;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		white-space: pre;
		overflow: auto;
	}
	.editor-textarea:focus {
		box-shadow: inset 0 0 0 1px #06b6d4;
	}
	</style>
	</head>
	<body class="bg-slate-950 text-slate-100 min-h-screen">

	<div class="container mx-auto px-4 py-8 max-w-[96%]">
	<div class="mb-8 text-center md:text-left md:flex md:items-center md:justify-between border-b border-slate-800 pb-6">
	<div>
	<h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">📡 Dashboard Inspeksi Feed</h1>
	<p class="text-slate-400 mt-1">Menggunakan rss-parser. Data lebih bersih dan dinormalisasi secara otomatis.</p>
	</div>
	<div class="mt-4 md:mt-0">
	<span class="bg-cyan-500/10 text-cyan-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-cyan-500/20 shadow-sm">Bun Serve Localhost:5000</span>
	</div>
	</div>

	<div class="grid grid-cols-1 xl:grid-cols-4 gap-8">

	<div class="xl:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl h-fit">
	<h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">⚙️ Target Inspeksi</h2>
	<div class="space-y-4">
	<div>
	<label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Path File XML (.xml)</label>
	<input type="text" id="xmlPath" value="feed.xml" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-mono">
	</div>
	<button id="btnInspect" class="w-full mt-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 font-bold text-slate-950 py-3 rounded-xl shadow-lg transition-all transform active:scale-95">
	🔍 Bedah Pakai RSS-Parser
	</button>
	</div>
	<div id="errorMessage" class="hidden mt-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs leading-relaxed"></div>
	</div>

	<div class="xl:col-span-3 space-y-6">
	<div id="summaryCards" class="grid grid-cols-2 md:grid-cols-4 gap-4">
	<div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center shadow">
	<p class="text-xs text-slate-400 uppercase font-medium">Format Sindikasi</p>
	<h3 id="statType" class="text-xl font-bold text-slate-100 mt-1 truncate">-</h3>
	</div>
	<div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center shadow">
	<p class="text-xs text-emerald-400 uppercase font-medium">Total Artikel</p>
	<h3 id="statTotal" class="text-2xl font-bold text-emerald-400 mt-1">-</h3>
	</div>
	<div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center shadow">
	<p class="text-xs text-amber-400 uppercase font-medium">Link WebP Terdeteksi</p>
	<h3 id="statWebp" class="text-2xl font-bold text-amber-400 mt-1">-</h3>
	</div>
	<div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center shadow">
	<p class="text-xs text-cyan-400 uppercase font-medium">Status Parser</p>
	<h3 id="statStatus" class="text-2xl font-bold text-cyan-400 mt-1">-</h3>
	</div>
	</div>

	<div id="placeholderState" class="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-2xl text-slate-600">
	<span class="text-4xl mb-2">📡</span>
	<p class="text-sm">Klik tombol <strong>Bedah Pakai RSS-Parser</strong> di sebelah kiri</p>
	</div>

	<div id="resultsContainer" class="hidden grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 w-full">

	<!-- Kolom Kiri: Daftar Judul -->
	<div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow w-full lg:col-span-1 flex flex-col max-h-[570px]">
	<h3 class="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">📄 Cuplikan Item (<span id="feedTitleLabel"></span>)</h3>
	<div id="articlesListContainer" class="flex-1 overflow-y-auto space-y-2 text-xs text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
	</div>
	</div>

	<!-- Kolom Kanan: Normalized JSON Viewer -->
	<div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow w-full lg:col-span-2">
	<div class="flex justify-between items-center mb-3">
	<div>
	<h3 class="text-xs font-bold text-emerald-400 uppercase tracking-wider">🛠️ Normalized JSON (Hasil rss-parser)</h3>
	<p class="text-[11px] text-slate-400 mt-1">Struktur ini sudah dirapikan. Cari atribut gambar .webp kamu di sini.</p>
	</div>
	</div>
	<div class="editor-wrapper">
	<textarea id="jsonViewer" spellcheck="false" class="editor-textarea" readonly></textarea>
	</div>
	</div>

	</div>

	</div>
	</div>

	<script>
	document.getElementById('btnInspect').addEventListener('click', async () => {
		const xmlPath = document.getElementById('xmlPath').value;
		const btn = document.getElementById('btnInspect');
		const errorDiv = document.getElementById('errorMessage');

		errorDiv.classList.add('hidden');
		btn.disabled = true;
		btn.innerText = '⏳ Memproses Parser...';

	try {
		const response = await fetch('/api/inspect', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ xmlPath })
		});

		const data = await response.json();
		if (!response.ok) throw new Error(data.error || 'Terjadi galat sistem.');

		document.getElementById('placeholderState').classList.add('hidden');
		document.getElementById('resultsContainer').classList.remove('hidden');

		// Update Cards
		document.getElementById('statType').innerText = data.summary.type;
		document.getElementById('statTotal').innerText = data.summary.totalItems;
		document.getElementById('statWebp').innerText = data.summary.webpDetected;
		document.getElementById('statStatus').innerText = "Sukses ✅";
		document.getElementById('feedTitleLabel').innerText = data.summary.title;

		// Update Articles List
		const listContainer = document.getElementById('articlesListContainer');
		listContainer.innerHTML = '';
	if (data.articlesList.length === 0) {
		listContainer.innerHTML = '<p class="text-amber-400 italic py-2">Tidak ada item ditemukan di dalam feed.</p>';
	} else {
		data.articlesList.forEach((title, idx) => {
			listContainer.innerHTML += \`<div class="py-1.5 border-b border-slate-900 last:border-0 hover:text-emerald-300 transition-colors truncate">✨ \${title}</div>\`;
		});
	}

	// Update JSON Viewer
	document.getElementById('jsonViewer').value = data.rawJson;

	} catch (err) {
		errorDiv.innerText = err.message;
		errorDiv.classList.remove('hidden');
		document.getElementById('statStatus').innerText = "Error ❌";
	} finally {
		btn.disabled = false;
		btn.innerText = '🔍 Bedah Pakai RSS-Parser';
	}
	});
	</script>
	</body>
	</html>`;
}