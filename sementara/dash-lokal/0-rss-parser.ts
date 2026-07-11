import { join } from "path";
import { existsSync } from "fs";
import { XMLParser } from "fast-xml-parser";

const PORT = 5000;

console.log(`\n🚀 Dashboard Inspeksi Feed (fast-xml-parser) aktif! \n👉 Buka: http://localhost:${PORT}\n`);

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

		// --- ENDPOINT INSPEKSI XML DENGAN FAST-XML-PARSER ---
		if (url.pathname === "/api/inspect" && req.method === "POST") {
			try {
				const body = await req.json();
				const { xmlPath, xmlContent } = body;

				let xmlData = "";

				// 1. Ambil data dari Browse File atau Input Path
				if (xmlContent) {
					xmlData = xmlContent;
				} else if (xmlPath) {
					const absolutePath = join(process.cwd(), xmlPath);
					if (!existsSync(absolutePath)) {
						return Response.json({ error: `File XML tidak ditemukan di: ${absolutePath}` }, { status: 400 });
					}
					xmlData = await Bun.file(absolutePath).text();
				} else {
					return Response.json({ error: "Pilih file dari laptop atau isi path-nya!" }, { status: 400 });
				}

				// 2. Inisialisasi X-Ray Parser
				const parser = new XMLParser({
					ignoreAttributes: false, // INI KUNCI UTAMANYA! Biar atribut 'href' & 'url' nggak dibuang
					attributeNamePrefix: "@_",
					textNodeName: "#text", // Jaga-jaga kalau ada tag yang punya atribut dan teks sekaligus
				});

				const result = parser.parse(xmlData);

				// 3. Deteksi Format dan Ambil Daftar Artikel
				let feedType = "Tidak Diketahui";
				let items: any[] = [];
				let feedTitle = "Tanpa Judul";

				if (result.rss && result.rss.channel) {
					feedType = "RSS";
					const titleData = result.rss.channel.title;
					feedTitle = typeof titleData === 'string' ? titleData : (titleData?.['#text'] || "Tanpa Judul");
					items = result.rss.channel.item || [];
				} else if (result.feed) {
					feedType = "Atom";
					const titleData = result.feed.title;
					feedTitle = typeof titleData === 'string' ? titleData : (titleData?.['#text'] || "Tanpa Judul");
					items = result.feed.entry || [];
				}

				// Normalisasi items jadi array (kalau artikel cuma 1, kadang jadi object)
				if (!Array.isArray(items)) {
					items = items ? [items] : [];
				}

				// Ekstraksi judul untuk ditampilkan di List UI
				const articlesList = items.map(item => {
					if (typeof item.title === 'string') return item.title;
					if (item.title && item.title['#text']) return item.title['#text'];
					return "Item tanpa judul";
				});

				// 4. Hitung keberadaan file .webp langsung dari JSON hasil parser
				const rawJsonString = JSON.stringify(result);
				const webpCount = (rawJsonString.toLowerCase().match(/\.webp/g) || []).length;

				return Response.json({
					summary: {
						title: feedTitle,
						type: feedType,
						totalItems: items.length,
						webpDetected: webpCount
					},
					articlesList,
					rawJson: JSON.stringify(result, null, 2)
				});

			} catch (err: any) {
				return Response.json({ error: `Gagal parse XML: ${err.message}` }, { status: 500 });
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
	<title>Dashboard Inspeksi Sindikasi (fast-xml-parser)</title>
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
	<p class="text-slate-400 mt-1">Menggunakan <b>fast-xml-parser</b>. Atribut XML tidak akan dibuang, aman untuk cek gambar!</p>
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
	<label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pilih File dari Laptop</label>
	<input type="file" id="fileInput" accept=".xml,.rss,.atom" class="block w-full text-sm text-slate-400
	file:mr-4 file:py-2.5 file:px-4
	file:rounded-xl file:border-0
	file:text-xs file:font-bold
	file:bg-cyan-500/10 file:text-cyan-400
	hover:file:bg-cyan-500/20 cursor-pointer">
	</div>

	<div class="flex items-center gap-2 py-1">
	<hr class="flex-1 border-slate-700">
	<span class="text-[10px] font-bold text-slate-500 tracking-wider">ATAU PATH SERVER</span>
	<hr class="flex-1 border-slate-700">
	</div>

	<div>
	<input type="text" id="xmlPath" placeholder="Contoh: feed.xml" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-mono">
	</div>

	<button id="btnInspect" class="w-full mt-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 font-bold text-slate-950 py-3 rounded-xl shadow-lg transition-all transform active:scale-95">
	🔍 Bedah Pakai X-Ray
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
	<p class="text-sm">Pilih file lalu klik <strong>Bedah Pakai X-Ray</strong> di sebelah kiri</p>
	</div>

	<div id="resultsContainer" class="hidden grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 w-full">

	<div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow w-full lg:col-span-1 flex flex-col max-h-[570px]">
	<h3 class="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">📄 Cuplikan Item (<span id="feedTitleLabel"></span>)</h3>
	<div id="articlesListContainer" class="flex-1 overflow-y-auto space-y-2 text-xs text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
	</div>
	</div>

	<div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow w-full lg:col-span-2">
	<div class="flex justify-between items-center mb-3">
	<div>
	<h3 class="text-xs font-bold text-emerald-400 uppercase tracking-wider">🛠️ Raw JSON (Struktur XML Utuh)</h3>
	<p class="text-[11px] text-slate-400 mt-1">Coba cari atribut <span class="text-amber-400 font-mono">@_href</span> atau <span class="text-amber-400 font-mono">@_url</span> untuk melihat link gambarmu.</p>
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
		const xmlPathInput = document.getElementById('xmlPath');
		const fileInput = document.getElementById('fileInput');
		const btn = document.getElementById('btnInspect');
		const errorDiv = document.getElementById('errorMessage');

		errorDiv.classList.add('hidden');
		btn.disabled = true;
		btn.innerText = '⏳ Memproses Parser...';

	try {
		let payload = {};

		if (fileInput.files.length > 0) {
			const file = fileInput.files[0];
			const xmlContent = await file.text();
			payload = { xmlContent: xmlContent };
		} else if (xmlPathInput.value.trim() !== '') {
			payload = { xmlPath: xmlPathInput.value.trim() };
		} else {
			throw new Error("Pilih file dari Browse atau isi Path Server!");
		}

		const response = await fetch('/api/inspect', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		const data = await response.json();
		if (!response.ok) throw new Error(data.error || 'Terjadi galat sistem.');

		document.getElementById('placeholderState').classList.add('hidden');
		document.getElementById('resultsContainer').classList.remove('hidden');

		document.getElementById('statType').innerText = data.summary.type;
		document.getElementById('statTotal').innerText = data.summary.totalItems;
		document.getElementById('statWebp').innerText = data.summary.webpDetected;
		document.getElementById('statStatus').innerText = "Sukses ✅";
		document.getElementById('feedTitleLabel').innerText = data.summary.title;

		const listContainer = document.getElementById('articlesListContainer');
		listContainer.innerHTML = '';
	if (data.articlesList.length === 0) {
		listContainer.innerHTML = '<p class="text-amber-400 italic py-2">Tidak ada item ditemukan di dalam feed.</p>';
	} else {
		data.articlesList.forEach((title, idx) => {
			listContainer.innerHTML += \`<div class="py-1.5 border-b border-slate-900 last:border-0 hover:text-emerald-300 transition-colors truncate">✨ \${title}</div>\`;
		});
	}

	document.getElementById('jsonViewer').value = data.rawJson;

	} catch (err) {
		errorDiv.innerText = err.message;
		errorDiv.classList.remove('hidden');
		document.getElementById('statStatus').innerText = "Error ❌";
	} finally {
		btn.disabled = false;
		btn.innerText = '🔍 Bedah Pakai X-Ray';
	}
	});

	document.getElementById('fileInput').addEventListener('change', function() {
		if (this.files.length > 0) {
			document.getElementById('xmlPath').value = '';
		}
	});

	document.getElementById('xmlPath').addEventListener('input', function() {
		if (this.value.trim() !== '') {
			document.getElementById('fileInput').value = '';
		}
	});
	</script>
	</body>
	</html>`;
}