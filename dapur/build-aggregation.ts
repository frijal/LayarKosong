import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";

// --- Konfigurasi ---
const OUTPUT_DIR = "artikelx";
const LOG_DIR = "mini";
const LOG_FILE = join(LOG_DIR, "posted-aggregat.txt");
const JSON_FILE = "artikel.json";

// --- Interfaces ---
interface Article {
	title: string;
	slug: string;
	thumb: string;
	date: Date;
	date_raw: string;
	content: string;
	category_name: string;
	category_slug: string;
}

// --- Helper Functions ---

function cleanMetaText(text: string): string {
	if (!text) return "";
	// Identik dengan re.sub(r'[^\w\s\-\.\,]', '', text)
	return text.replace(/[^\w\s\-\.\,]/g, "");
}

function slugifyCategory(name: string): string {
	return name
	.toLowerCase()
	.replace(/\s+/g, "-")
	.replace(/[^\w\-]/g, "");
}

async function getPostedUrls(): Promise<Set<string>> {
	const file = Bun.file(LOG_FILE);
	if (!(await file.exists())) {
		return new Set();
	}
	const content = await file.text();
	return new Set(content.split("\n").map((line) => line.trim()).filter(Boolean));
}

function savePostedUrls(urls: string[]): void {
	if (!existsSync(LOG_DIR)) {
		mkdirSync(LOG_DIR, { recursive: true });
	}
	const data = urls.join("\n") + "\n";
	appendFileSync(LOG_FILE, data, "utf-8");
}

function getSemesterRange(targetDate: Date) {
	const year = targetDate.getFullYear();
	// Python: month <= 6 (Jan-Jun)
	// JS: getMonth() is 0-indexed, so 0-5 is Jan-Jun
	if (targetDate.getMonth() <= 5) {
		return {
			start: new Date(year, 0, 1),
			end: new Date(year, 5, 30),
			label: "Semester 1"
		};
	} else {
		return {
			start: new Date(year, 6, 1),
			end: new Date(year, 11, 31),
			label: "Semester 2"
		};
	}
}

// --- Main Logic ---

async function buildSemesterAggregation() {
	if (!existsSync(OUTPUT_DIR)) {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	const jsonFile = Bun.file(JSON_FILE);
	if (!(await jsonFile.exists())) {
		console.error(`❌ File ${JSON_FILE} tidak ditemukan.`);
		return;
	}

	const data: Record<string, any[][]> = await jsonFile.json();
	const postedUrls = await getPostedUrls();
	let allPendingArticles: Article[] = [];

	// Parsing JSON
	for (const [categoryRaw, articlesList] of Object.entries(data)) {
		const urlCategory = slugifyCategory(categoryRaw);

		for (const art of articlesList) {
			const slug = art[1];
			if (!postedUrls.has(slug)) {
				const dateRaw = art[3];
				// Mengambil YYYY-MM-DD
				const dtObj = new Date(dateRaw.substring(0, 10));

				allPendingArticles.push({
					title: art[0],
					slug,
					thumb: art[2],
					date: dtObj,
					date_raw: dateRaw,
					content: art[4],
					category_name: categoryRaw,
					category_slug: urlCategory,
				});
			}
		}
	}

	if (allPendingArticles.length === 0) {
		console.log("☕ Tidak ada artikel baru.");
		return;
	}

	// Sort Ascending (Identik dengan Python sort)
	allPendingArticles.sort((a, b) => a.date.getTime() - b.date.getTime());

	const today = new Date();
	today.setHours(0, 0, 0, 0); // Pastikan perbandingan tanggal murni

	const monthNames = [
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"
	];

	while (allPendingArticles.length > 0) {
		const firstArt = allPendingArticles[0];
		const { start, end, label } = getSemesterRange(firstArt.date);

		// Cek apakah hari ini sudah melewati akhir semester
		if (today <= end) {
			const semStatus = start.getMonth() === 0 ? "Jan-Jun" : "Jul-Des";
			console.log(`⏳ Semester ${start.getFullYear()} (${semStatus}) belum berakhir.`);
			break;
		}

		const currentBatch = allPendingArticles.filter(
			(a) => a.date >= start && a.date <= end
		);

		if (currentBatch.length === 0) {
			allPendingArticles.shift();
			continue;
		}

		const fileName = `agregat-${start.getFullYear()}-${label.replace(/\s+/g, "").toLowerCase()}.html`;
		const pageUrl = `https://dalam.web.id/artikel/${fileName}`;
		const mainCover = currentBatch[0].thumb;
		const titlePage = `Arsip Layar Kosong: ${label} ${start.getFullYear()}`;
		const descPage = `Kumpulan artikel blog Layar Kosong periode ${monthNames[start.getMonth()]} - ${monthNames[end.getMonth()]} ${start.getFullYear()}.`;

		let articlesHtml = "";
		const batchSlugs: string[] = [];

		for (const a of currentBatch) {
			const cleanSlug = a.slug.replace(".html", "");
			const baseLink = `https://dalam.web.id/${a.category_slug}/${cleanSlug}`;

			articlesHtml += `
			<section class="article-block">
			<div class="meta">
			<i class="fa-solid fa-folder-open"></i> ${a.category_name} |
			<i class="fa-solid fa-calendar"></i> ${a.date_raw}
			</div>
			<h2><a href="${baseLink}" style="text-decoration: none;">${a.title}</a></h2>
			<a href="${baseLink}"><img src="${a.thumb}" alt="${cleanMetaText(a.title)}" class="main-img" loading="lazy"></a>
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
		<title>${titlePage}</title>
		<meta name="description" content="${descPage}">
		<meta name="author" content="Fakhrul Rijal">
		<meta name="robots" content="index, follow, max-image-preview:large">
		<meta name="theme-color" content="#00b0ed">
		<link rel="canonical" href="${pageUrl}">
		<link rel="icon" href="/favicon.ico">
		<link rel="manifest" href="/site.webmanifest">
		<link rel="license" href="https://creativecommons.org/publicdomain/zero/1.0/">

		<meta property="og:type" content="article">
		<meta property="og:url" content="${pageUrl}">
		<meta property="og:title" content="${titlePage}">
		<meta property="og:description" content="${descPage}">
		<meta property="og:image" content="${mainCover}">
		<meta property="og:image:alt" content="${titlePage}">
		<meta property="og:image:width" content="1200">
		<meta property="og:image:height" content="675">
		<meta property="og:locale" content="id_ID">
		<meta property="og:site_name" content="Layar Kosong">
		<meta property="fb:app_id" content="175216696195384">
		<meta property="article:author" content="https://facebook.com/frijal">
		<meta property="article:publisher" content="https://facebook.com/frijalpage">

		<meta name="twitter:card" content="summary_large_image">
		<meta name="twitter:site" content="@responaja">
		<meta name="twitter:creator" content="@responaja">
		<meta property="twitter:url" content="${pageUrl}">
		<meta property="twitter:domain" content="https://dalam.web.id">
		<meta name="twitter:title" content="${titlePage}">
		<meta name="twitter:description" content="${descPage}">
		<meta name="twitter:image" content="${mainCover}">

		<meta name="bluesky:creator" content="@dalam.web.id">
		<meta name="fediverse:creator" content="@frijal@mastodon.social">
		<meta name="googlebot" content="max-image-preview:large">
		<meta itemprop="image" content="${mainCover}">
		<meta property="article:published_time" content="${end.toISOString().split("T")[0]}T23:59:59+08:00">

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
		<p>Arsip periode ${start.getDate()} ${monthNames[start.getMonth()]} s/d ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}</p>
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
		savePostedUrls(batchSlugs);

		console.log(`✅ File '${fileName}' berhasil dibuat dengan meta tags lengkap.`);
		allPendingArticles = allPendingArticles.filter((a) => !batchSlugs.includes(a.slug));
	}

	console.log("\n✨ Proses Agregasi Selesai!");
}

buildSemesterAggregation();