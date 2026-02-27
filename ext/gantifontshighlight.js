import { Glob } from "bun";

// -------------------- CONFIG & CLI --------------------
const args = Bun.argv.slice(2);
const QUIET = args.includes("--quiet");
const NO_BACKUP = args.includes("--no-backup");
const DRY_RUN = args.includes("--dry-run");

// 1. Daftar file CSS (Sama seperti acuan Perl)
const cssFiles = [
"atom-one-dark.min.css", "atom-one-light.min.css", "default.min.css", "highlight.js", "github-dark-dimmed.css", "github-dark.css", "github.css", "leaflet.css", "monokai.min.css", "prism-okaidia.min.css", "prism-tomorrow.min.css", "prism.min.css", "vs-dark.min.css"
];

// 2. Mapping Manual dengan Pola Regex yang Lebih Aman (Mirip Perl)
const MANUAL_MAP = [
{ rx: /https?:\/\/[^"']+?\/prism(?:\-[\w\-]+)?(?:\.min)?\.css/gi, repl: "/ext/default.min.css" }
{ rx: /https?:\/\/.*?prism-vsc-dark-plus\.min\.css/gi, repl: "/ext/vs-dark.min.css" },
{ rx: /https?:\/\/.*?prism-twilight\.min\.css/gi, repl: "/ext/vs-dark.min.css" },
{ rx: /https?:\/\/.*?prism-coy\.min\.css/gi, repl: "/ext/default.min.css" },


// Regex FontAwesome yang lebih tangguh menangkap v5, v6, dan query strings
{ rx: /https?:\/\/[^"']+?\/(?:font-awesome|fontawesome)\/.*?\/(?:all|fontawesome)(?:\.min)?\.css(?:\?[^"']*)?/gi, repl: "/ext/fontawesome.css" },


{ rx: /https?:\/\/(?:use|kit|cdnjs)\.fontawesome\.com\/.*?\/all(?:\.min)?\.css(?:\?[^"']*)?/gi, repl: "/ext/fontawesome.css" },


// Catch-all untuk file fontawesome yang mungkin cuma bernama all.css di CDN lain
{ rx: /https?:\/\/.*?\/(?:font-awesome|fontawesome)\/.*?\/all(?:\.min)?\.css/gi, repl: "/ext/fontawesome.css" }
];

// Regex Otomatis (Membungkus URL di dalam atribut href/src agar akurat)
const autoPattern = new RegExp(`(\\b(?:href|src)\\b\\s*=\\s*['"])\\s*https?:\\/\\/[^\\s"'<>]+?\\/(${cssFiles.join("|").replace(/\./g, "\\.")})\\s*(['"])`, "gi");

// Regex untuk membersihkan atribut integritas (Sama seperti Perl)
const attrRegex = /\s+(?:integrity|crossorigin|referrertarget|referrerpolicy)(?:\s*=\s*(['"])[^'"]*?\1|(?=\s|>))/gi;

function log(...parts) {
	if (!QUIET) console.log(...parts);
}

async function processFile(filePath) {
	if (filePath.endsWith("index.html")) return;

	const file = Bun.file(filePath);
	let content = await file.text();
	let originalContent = content;
	let replaceCount = 0;
	let cleanCount = 0;

	// A. Manual Mapping (Menerapkan pola substitusi yang aman)
	for (const m of MANUAL_MAP) {
		content = content.replace(m.rx, (match) => {
			replaceCount++;
			return m.repl;
		});
	}

	// B. Auto Mapping (Hanya ganti jika di dalam href/src)
	content = content.replace(autoPattern, (match, head, fileName, tail) => {
		replaceCount++;
		return `${head}/ext/${fileName}${tail}`;
	});

	// C. Pembersihan Atribut (Hanya jika ada yang berubah)
	if (content !== originalContent) {
		content = content.replace(attrRegex, () => {
			cleanCount++;
			return "";
		});

		const summary = `(${replaceCount} ganti, ${cleanCount} atribut bersih)`;

		if (DRY_RUN) {
			log(`🧪 [DRY-RUN] ${filePath} -> ${summary}`);
			return;
		}

		if (!NO_BACKUP) {
			await Bun.write(`${filePath}.bak`, originalContent);
		}

		await Bun.write(filePath, content);
		log(`✅ Fixed: ${filePath} ${summary}`);
	}
}

async function run() {
	log("🔍 Memulai pemindaian Turbo dengan Bun.Glob...");

	// Mencari file .html di root, artikel/, dan artikelx/ (Sama seperti Perl glob)
	const glob = new Glob("{artikelx/*.html}");

	const tasks = [];
	for await (const file of glob.scan(".")) {
		tasks.push(processFile(file));
	}

	await Promise.all(tasks);
	log("✨ Selesai! Semua link CDN Layar Kosong sekarang sudah lokal.");
}

run().catch(console.error);
