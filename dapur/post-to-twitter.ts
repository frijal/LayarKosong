import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'node:fs';
import path from 'node:path';

puppeteer.use(StealthPlugin());

// --- CONFIG ---
const JSON_FILE = "artikel.json";
const DATABASE_FILE = "mini/posted-twitter.txt";
const DOMAIN_URL = "https://dalam.web.id";
const COOKIES_PATH = "./twitter_cookies.json";

function slugify(text: string) {
	if (!text) return "";
	return String(text).trim().toLowerCase().replace(/\s+/g, "-");
}

// --- LOGIKA HASHTAG ---
const cleanHashtag = (str: string) =>
"#" + str
.replace(/&/g, "dan")
.replace(/[^\w\s]/g, "")
.replace(/\s+/g, "");

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
	// 1. Validasi File Artikel
	if (!fs.existsSync(JSON_FILE)) {
		console.error("❌ Error: artikel.json tidak ditemukan");
		process.exit(1);
	}

	// 2. Load Data menggunakan Bun.file
	const data = await Bun.file(JSON_FILE).json();

	let postedDatabase = "";
	if (fs.existsSync(DATABASE_FILE)) {
		postedDatabase = await Bun.file(DATABASE_FILE).text();
	}

	// 3. Filter Artikel Baru
	const allPosts = [];
	for (const [categoryName, posts] of Object.entries(data || {})) {
		const catSlug = slugify(categoryName);
		if (!Array.isArray(posts)) continue;

		for (const post of posts) {
			const fileName = String(post[1] ?? "").trim();
			const fileSlug = fileName.replace(/\.html$/i, "").replace(/\//g, "");

			if (fileSlug.startsWith("agregat-20")) continue;

			const fullUrl = `${DOMAIN_URL}/${catSlug}/${fileSlug}`;

			if (!postedDatabase.includes(fileSlug)) {
				allPosts.push({
					title: post[0] ?? "Untitled",
					slug: fileSlug,
					url: fullUrl,
					image_url: post[2] ?? "",
					date: post[3] ?? "",
					desc: post[4] ?? "Archive.",
					category: categoryName,
				});
			}
		}
	}

	allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	if (allPosts.length === 0) {
		console.log("✅ Tidak ada artikel baru untuk X (Twitter).");
		return;
	}

	const targetPost = allPosts[0];

	// ==========================================
	// 4. HASHTAG & KALKULASI LIMIT TWITTER (280)
	// ==========================================
	const hashtags = new Set<string>();

	// a. Kategori jadi hashtag
	if (targetPost.category) {
		hashtags.add(cleanHashtag(targetPost.category));
	}

	// b. Ekstrak dari judul
	targetPost.title
	.split(/\s+/)
	.filter((w: string) => w.length > 4)
	.slice(0, 3)
	.forEach((w: string) => hashtags.add(cleanHashtag(w)));

	const hashtagString = [...hashtags].join(" ");

	// c. Kalkulasi Sisa Karakter
	const TWITTER_MAX = 280;
	const URL_LENGTH = 24; // X menghitung URL sebagai 23 karakter + 1 spasi
	const SPACING = 4; // Untuk 2x Enter (\n\n)

	// Sisa jatah buat deskripsi
	const availableDescSpace = TWITTER_MAX - URL_LENGTH - hashtagString.length - SPACING;
	let cleanDesc = targetPost.desc;

	// d. Pemotongan Pintar
	if (availableDescSpace < 15) {
		// Kalau judulnya panjang banget sampai hashtagnya makan tempat, hapus deskripsi
		cleanDesc = "";
	} else if (cleanDesc.length > availableDescSpace) {
		// Potong deskripsi lalu tambah "..." biar nggak over-limit
		cleanDesc = cleanDesc.slice(0, availableDescSpace - 3) + "...";
	}

	// e. Template Postingan Akhir
	let postText = `${cleanDesc}\n\n${hashtagString}\n\n${targetPost.url}`;

	// Bersihkan enter berlebih kalau misal deskripsinya kosong
	postText = postText.replace(/^\n+/, '').trim();

	console.log(`🚀 Menyiapkan postingan baru ke X: ${targetPost.title}`);
	console.log(`📝 Preview Tweet (${postText.length}/280 chars):\n${postText}`);

	// ==========================================
	// 5. EKSEKUSI PUPPETEER STEALTH
	// ==========================================
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
	});
	const page = await browser.newPage();

	let rawCookies;
	if (Bun.env.TWITTER_COOKIES) {
		rawCookies = JSON.parse(Bun.env.TWITTER_COOKIES);
	} else if (fs.existsSync(COOKIES_PATH)) {
		const cookiesString = fs.readFileSync(COOKIES_PATH, 'utf-8');
		rawCookies = JSON.parse(cookiesString);
	} else {
		console.error("❌ Error: Tidak ada cookies Twitter yang ditemukan!");
		process.exit(1);
	}

	const cleanCookies = rawCookies.map((cookie: any) => {
		const sanitized = { ...cookie };
		delete sanitized.partitionKey;
		if (sanitized.sameSite && !['Strict', 'Lax', 'None'].includes(sanitized.sameSite)) {
			delete sanitized.sameSite;
		}
		return sanitized;
	});

	await page.setCookie(...cleanCookies);

	try {
		await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
		await delay(4000);

		const textBoxSelector = '[data-testid="tweetTextarea_0"]';
		await page.waitForSelector(textBoxSelector, { timeout: 15000 });
		await page.click(textBoxSelector);

		// Ngetik lambat + dukung enter otomatis dari \n
		await page.type(textBoxSelector, postText, { delay: 100 });
		await delay(2000);

		const postButtonSelector = '[data-testid="tweetButton"]';
		await page.waitForSelector(postButtonSelector);
		await page.click(postButtonSelector);

		console.log(`🎉 Berhasil mencuitkan: ${targetPost.title}`);
		await delay(5000);

		// 6. Tulis ke Database lokal
		const logDir = path.dirname(DATABASE_FILE);
		if (!fs.existsSync(logDir)) {
			fs.mkdirSync(logDir, { recursive: true });
		}
		fs.appendFileSync(DATABASE_FILE, `${targetPost.slug}\n`);

		if (Bun.env.GITHUB_OUTPUT) {
			fs.appendFileSync(Bun.env.GITHUB_OUTPUT, `x_url=${targetPost.url}\n`);
		}

	} catch (err: any) {
		console.error("❌ Gagal mengirim ke X:", err.message);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

main();