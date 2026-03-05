// build-semester-aggregation.ts
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUTPUT_DIR = "artikelx";
const LOG_DIR = "mini";
const LOG_FILE = join(LOG_DIR, "posted-aggregat.txt");
const JSON_FILE = "artikel.json";

/** --- Helper Functions --- **/

function cleanMetaText(text: string = ""): string {
	return text.replace(/[^\w\s\-\.\,]/g, "");
}

function slugifyCategory(name: string): string {
	return name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-]/g, "");
}

async function getPostedUrls(): Promise<Set<string>> {
	const file = Bun.file(LOG_FILE);
	if (!(await file.exists())) return new Set();
	const content = await file.text();
	return new Set(content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
}

async function savePostedUrls(urls: string[]): Promise<void> {
	if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
	const data = urls.map((u) => `${u}\n`).join("");
	// Bun.write mendukung mode append dengan cara manual atau menggunakan fs.appendFileSync
	// Namun untuk performa di Bun, kita bisa gunakan cara ini:
	const existing = await Bun.file(LOG_FILE).text().catch(() => "");
	await Bun.write(LOG_FILE, existing + data);
}

function getSemesterRange(targetDate: Date) {
	const year = targetDate.getFullYear();
	// 0-5 = Jan-Jun (S1), 6-11 = Jul-Des (S2)
	const isS1 = targetDate.getMonth() <= 5;
	return {
		start: new Date(year, isS1 ? 0 : 6, 1),
		end: new Date(year, isS1 ? 5 : 11, isS1 ? 30 : 31),
		label: isS1 ? "Semester 1" : "Semester 2"
	};
}

function formatDateId(d: Date, options?: Intl.DateTimeFormatOptions) {
	return d.toLocaleString("id-ID", options);
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (m) => ({
		"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
	}[m] || m));
}

/** --- Main Logic --- **/

async function buildSemesterAggregation(): Promise<void> {
	if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

	const jsonFile = Bun.file(JSON_FILE);
	if (!(await jsonFile.exists())) {
		console.log(`❌ File ${JSON_FILE} tidak ditemukan.`);
		return;
	}

	const data: Record<string, any[][]> = await jsonFile.json();
	const postedUrls = await getPostedUrls();
	let allPendingArticles = [];

	// 1. Parsing & Flattening
	for (const [categoryRaw, articlesList] of Object.entries(data)) {
		const categorySlug = slugifyCategory(categoryRaw);
		for (const art of articlesList) {
			if (postedUrls.has(art[1])) continue;

			const datePart = art[3]?.substring(0, 10) || "";
			const dtObj = datePart ? new Date(datePart + "T00:00:00") : new Date();

			allPendingArticles.push({
				title: art[0],
				slug: art[1],
				thumb: art[2],
				date: dtObj,
				date_raw: art[3],
				content: art[4],
				category_name: categoryRaw,
				category_slug: categorySlug,
			});
		}
	}

	if (allPendingArticles.length === 0) {
		console.log("☕ Tidak ada artikel baru.");
		return;
	}

	// 2. Sort by date ascending
	allPendingArticles.sort((a, b) => a.date.getTime() - b.date.getTime());

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// 3. Semester Batching
	while (allPendingArticles.length > 0) {
		const first = allPendingArticles[0];
		const { start, end, label } = getSemesterRange(first.date);

		if (today <= end) {
			console.log(`⏳ Semester ${start.getFullYear()} (${start.getMonth() === 0 ? "Jan-Jun" : "Jul-Des"}) belum berakhir.`);
			break;
		}

		const currentBatch = allPendingArticles.filter(a => a.date >= start && a.date <= end);
		if (currentBatch.length === 0) {
			allPendingArticles.shift();
			continue;
		}

		const fileName = `agregat-${start.getFullYear()}-${label.replace(/\s+/g, "").toLowerCase()}.html`;
		const pageUrl = `https://dalam.web.id/artikel/${fileName}`;
		const mainCover = currentBatch[0].thumb;
		const titlePage = `Arsip Layar Kosong: ${label} ${start.getFullYear()}`;
		const descPage = `Kumpulan artikel blog Layar Kosong periode ${formatDateId(start, { month: "long" })} - ${formatDateId(end, { month: "long" })} ${start.getFullYear()}.`;

		// 4. Build HTML
		let articlesHtml = "";
		const batchSlugs: string[] = [];

		for (const a of currentBatch) {
			const cleanSlug = a.slug.replace(/\.html$/i, "");
			const baseLink = `https://dalam.web.id/${a.category_slug}/${cleanSlug}`;
			articlesHtml += `
			<section class="article-block">
			<div class="meta">
			<i class="fa-solid fa-folder-open"></i> ${a.category_name} |
			<i class="fa-solid fa-calendar"></i> ${a.date_raw}
			</div>
			<h2><a href="${baseLink}" style="text-decoration: none;">${a.title}</a></h2>
			<a href="${baseLink}"><img src="${a.thumb}" alt="${escapeHtml(cleanMetaText(a.title))}" class="main-img" loading="lazy"></a>
			<div class="content">${a.content}</div>
			<p><a href="${baseLink}" class="read-more">Baca selengkapnya &rarr;</a></p>
			<hr class="separator">
			</section>\n`;
			batchSlugs.push(a.slug);
		}

		const fullHtml = `<!DOCTYPE html>
		<html lang="id">
		<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>${escapeHtml(titlePage)}</title>
		<meta name="description" content="${escapeHtml(descPage)}">
		<meta name="author" content="Fakhrul Rijal">
		<meta name="theme-color" content="#00b0ed">
		<link rel="canonical" href="${pageUrl}">
		<meta property="og:type" content="article">
		<meta property="og:url" content="${pageUrl}">
		<meta property="og:title" content="${escapeHtml(titlePage)}">
		<meta property="og:description" content="${escapeHtml(descPage)}">
		<meta property="og:image" content="${mainCover}">
		<meta name="twitter:card" content="summary_large_image">
		<meta name="twitter:site" content="@responaja">
		<meta property="article:published_time" content="${end.toISOString().slice(0,10)}T23:59:59+08:00">
		<link rel="stylesheet" href="/ext/fontawesome.css">
		<style>
		:root { --bg: #ffffff; --text: #1a1a1a; --accent: #00b0ed; }
		@media (prefers-color-scheme: dark) { :root { --bg: #0d1117; --text: #c9d1d9; --accent: #58a6ff; } }
		body { font-family: 'Inter', sans-serif; line-height: 1.8; background: var(--bg); color: var(--text); padding: 20px; }
		.container { max-width: 1000px; margin: auto; }
		header { text-align: center; border-bottom: 5px solid var(--accent); padding-bottom: 30px; margin-bottom: 50px; }
		.main-img { width: 100%; border-radius: 12px; margin: 20px 0; }
		h2 { font-size: 1.8rem; color: var(--accent); }
		.meta { font-size: 0.85rem; opacity: 0.7; font-weight: bold; }
		.separator { border: 0; border-top: 1px dashed #444; margin: 50px 0; }
		footer { text-align: center; margin-top: 60px; padding: 40px 0; border-top: 1px solid #333; font-size: 0.9rem; }
		</style>
		</head>
		<body>
		<div class="container">
		<header>
		<h1>${label} (${start.getFullYear()})</h1>
		<p>Arsip periode ${formatDateId(start, { day: "2-digit", month: "long" })} s/d ${formatDateId(end, { day: "2-digit", month: "long", year: "numeric" })}</p>
		</header>
		${articlesHtml}
		<footer>
		<p>Dihasilkan secara otomatis oleh sistem kurasi Frijal | Balikpapan</p>
		<p><a href="https://dalam.web.id" style="color:var(--accent); text-decoration:none;">Layar Kosong</a></p>
		</footer>
		</div>
		</body>
		</html>`;

		await Bun.write(join(OUTPUT_DIR, fileName), fullHtml);
		await savePostedUrls(batchSlugs);
		console.log(`✅ File '${fileName}' berhasil dibuat.`);

		allPendingArticles = allPendingArticles.filter(a => !batchSlugs.includes(a.slug));
	}

	console.log("\n✨ Proses Agregasi Selesai!");
}

if (import.meta.main) {
	buildSemesterAggregation().catch(console.error);
}