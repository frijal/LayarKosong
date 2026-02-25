import fs from "node:fs";
import path from "node:path";

// -------------------- CONFIG & CLI --------------------
const args = Bun.argv.slice(2);
const QUIET = args.includes("--quiet");
const NO_BACKUP = args.includes("--no-backup");
const DRY_RUN = args.includes("--dry-run");

// 1. Daftar file CSS untuk Regex Dinamis (Fast Match)
const cssFiles = [
"atom-one-dark.min.css", "atom-one-light.min.css", "default.min.css", "highlight.js", "fontawesome.css", "github-dark-dimmed.css", "github-dark-dimmed.min.css", "github-dark.css", "github-dark.min.css", "github.css", "github.min.css", "leaflet.css", "monokai.min.css", "prism-okaidia.min.css", "prism-tomorrow.min.css", "prism-toolbar.min.css", "prism.min.css", "vs-dark.min.css", "vs.min.css"
];

// 2. Mapping Manual untuk pola yang tidak standar (Regex Specific)
const MANUAL_MAP = [
	{ rx: /https?:\/\/.*?prism-vsc-dark-plus\.min\.css/gi, repl: "/ext/vs-dark.min.css" },
{ rx: /https?:\/\/.*?prism-twilight\.min\.css/gi, repl: "/ext/vs-dark.min.css" },
{ rx: /https?:\/\/.*?prism-coy\.min\.css/gi, repl: "/ext/default.min.css" },
{ rx: /https?:\/\/use\.fontawesome\.com\/releases\/v[\d\.\-a-z]+\/css\/all\.css/gi, repl: "/ext/fontawesome.css" },
];

// Regex Otomatis berdasarkan daftar cssFiles
const autoPattern = new RegExp(`https?:\\/\\/[^\\s"'<>]+?\\/(${cssFiles.join("|").replace(/\./g, "\\.")})`, "gi");

// Regex untuk membersihkan atribut integritas/crossorigin
const attrRegex = /\s+(?:integrity\s*=\s*(['"])[^'"]*?\1|crossorigin\s*=\s*(['"])[^'"]*?\2|referrertarget\s*=\s*(['"])[^'"]*?\3|referrerpolicy\s*=\s*(['"])[^'"]*?\4|crossorigin\b|referrerpolicy\b)/gi;

// -------------------- HELPERS --------------------
function log(...parts) {
	if (!QUIET) console.log(...parts);
}

async function processFile(filePath) {
	// Skip index.html demi keamanan
	if (filePath.endsWith("index.html")) return;

	const file = Bun.file(filePath);
	let content = await file.text();
	let changed = false;
	let replaceCount = 0;
	let cleanCount = 0;

	// A. Jalankan Manual Mapping dulu
	for (const m of MANUAL_MAP) {
		const attrPattern = /(\b(?:href|src)\b)(\s*=\s*)(['"])([^'"]+?)\3/gi;
		content = content.replace(attrPattern, (match, attrName, eq, quote, url) => {
			if (m.rx.test(url)) {
				changed = true;
				replaceCount++;
				m.rx.lastIndex = 0;
				return `${attrName}${eq}${quote}${m.repl}${quote}`;
			}
			m.rx.lastIndex = 0;
			return match;
		});
	}

	// B. Jalankan Auto Mapping (Daftar File)
	if (autoPattern.test(content)) {
		autoPattern.lastIndex = 0;
		content = content.replace(autoPattern, (match, fileName) => {
			changed = true;
			replaceCount++;
			return `/ext/${fileName}`;
		});
	}

	// C. Jika ada perubahan, bersihkan atribut sampah
	if (changed) {
		content = content.replace(attrRegex, () => {
			cleanCount++;
			return "";
		});

		const summary = `(${replaceCount} ganti, ${cleanCount} bersih)`;

		if (DRY_RUN) {
			log(`🧪 [DRY-RUN] ${filePath} -> ${summary}`);
			return;
		}

		if (!NO_BACKUP) {
			await Bun.write(`${filePath}.bak`, file);
		}

		await Bun.write(filePath, content);
		log(`✅ Fixed: ${filePath} ${summary}`);
	}
}

async function scanRecursive(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "node_modules" && entry.name !== ".git") {
				await scanRecursive(fullPath);
			}
		} else if (entry.isFile() && entry.name.endsWith(".html")) {
			await processFile(fullPath);
		}
	}
}

// -------------------- RUN --------------------
log("🔍 Memulai pemindaian recursive assets di seluruh folder...");
scanRecursive("./").then(() => {
	log("✨ Selesai! Semua link CDN sekarang sudah lokal ke /ext/.");
});