import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'node:fs';
import path from 'node:path';

puppeteer.use(StealthPlugin());

// --- CONFIG ---
const JSON_FILE = "artikel.json";
const DATABASE_FILE = "mini/posted-twitter.txt";
const DOMAIN_URL = "https://dalam.web.id";
const COOKIES_PATH = "./twitter_cookies.json"; // Jika lokal, atau dibaca via GitHub Secrets

function slugify(text: string) {
	if (!text) return "";
	return String(text).trim().toLowerCase().replace(/\s+/g, "-");
}

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

			// Lewati agregat
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

	// Sorting Berdasarkan Tanggal Terbaru
	allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	if (allPosts.length === 0) {
		console.log("✅ Tidak ada artikel baru untuk X (Twitter).");
		return;
	}

	const targetPost = allPosts[0];

	// 4. Kalkulasi Format Teks Tahan Banting (Anti Over-character di X)
	// Max 280, URL X selalu dihitung 23 karakter, template teks bawaan memakan ~30 karakter
	const maxTextLength = 280 - 23 - 30;
	let cleanDesc = targetPost.desc;

	if (cleanDesc.length > maxTextLength) {
		cleanDesc = cleanDesc.slice(0, maxTextLength - 3) + "...";
	}

	// Template Postingan Akhir
	const postText = `${cleanDesc} \n${targetPost.url}`;

	console.log(`🚀 Menyiapkan postingan baru ke X: ${targetPost.title}`);

	// 5. Eksekusi Browser Headless via Puppeteer Stealth
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
	});
	const page = await browser.newPage();

	// 6. Ambil Cookies (Mendukung fallback lokal file atau GitHub Secrets)
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

	// SANITASI COOKIES: Bersihkan atribut yang bikin Puppeteer muntah
	const cleanCookies = rawCookies.map((cookie: any) => {
		const sanitized = { ...cookie };

		// Hapus atribut biang kerok
		delete sanitized.partitionKey;

		// Hapus sameSite jika nilainya tidak valid ('no_restriction', dsb)
		// Puppeteer biasanya hanya menerima 'Strict', 'Lax', atau 'None'
		if (sanitized.sameSite && !['Strict', 'Lax', 'None'].includes(sanitized.sameSite)) {
			delete sanitized.sameSite;
		}

		return sanitized;
	});

	// Suntikkan cookies yang sudah bersih
	await page.setCookie(...cleanCookies);

	// 7. Proses Navigasi dan Pengetikan ke Kotak Tweet X
	try {
		await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
		await delay(4000); // Jeda aman tunggu React merender halaman

		const textBoxSelector = '[data-testid="tweetTextarea_0"]';
		await page.waitForSelector(textBoxSelector, { timeout: 15000 });
		await page.click(textBoxSelector);

		// Ngetik lambat biar dikira manusia asli, bukan bot kilat
		await page.type(textBoxSelector, postText, { delay: 100 });
		await delay(2000);

		// Klik tombol post
		const postButtonSelector = '[data-testid="tweetButton"]';
		await page.waitForSelector(postButtonSelector);
		await page.click(postButtonSelector);

		console.log(`🎉 Berhasil mencuitkan: ${targetPost.title}`);
		await delay(5000); // Tunggu jaringan menyelesaikan pengiriman payload

		// 8. Tulis ke Database lokal (mini/posted-twitter.txt)
		const logDir = path.dirname(DATABASE_FILE);
		if (!fs.existsSync(logDir)) {
			fs.mkdirSync(logDir, { recursive: true });
		}
		fs.appendFileSync(DATABASE_FILE, `${targetPost.slug}\n`);

		// Output opsional untuk GitHub Actions pipeline
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