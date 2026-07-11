const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-pixelfed.txt';
const BASE_URL = 'https://dalam.web.id';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const slugify = (text: string) => text.toLowerCase().trim().replace(/\s+/g, '-');

// --- Logika Hashtag (Adaptasi dari Mastodon) ---
const cleanHashtag = (str: string) =>
"#" + str
.replace(/&/g, "dan")
.replace(/[^\w\s]/g, "")
.replace(/\s+/g, "");

// Helper untuk kirim status (JSON)
async function httpPost(url: string, body: any, headers: Record<string, string> = {}) {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`POST ${url} gagal: ${res.status} - ${await res.text()}`);
	return res.json();
}

async function postToPixelfed() {
	const ACCESS_TOKEN = Bun.env.PIXELFED_TOKEN;

	if (!ACCESS_TOKEN) {
		console.error("❌ Error: PIXELFED_TOKEN belum diset!");
		process.exit(1);
	}

	const jsonFile = Bun.file(JSON_FILE);
	if (!(await jsonFile.exists())) {
		console.log(`❌ File ${JSON_FILE} nggak ketemu.`);
		return;
	}

	const data = await jsonFile.json();
	let allPosts: any[] = [];

	const dbFile = Bun.file(DATABASE_FILE);
	let postedDatabase = (await dbFile.exists()) ? await dbFile.text() : "";

	for (const [cat, posts] of Object.entries<any>(data)) {
		const catSlug = slugify(cat);

		posts.forEach((p: any) => {
			const fileSlug = p[1].replace('.html', '').replace(/^\//, '');
			if (fileSlug.startsWith("agregat-20")) return;

			const fullUrl = `${BASE_URL}/${catSlug}/${fileSlug}`;

			if (!postedDatabase.includes(fileSlug)) {
				allPosts.push({
					title: p[0],
					url: fullUrl,
					slug: fileSlug,
					image: p[2],
					date: p[3],
					desc: p[4] || "Archive.",
					category: cat // Ambil kategori untuk bahan hashtag
				});
			}
		});
	}

	allPosts.sort((a, b) => b.date.localeCompare(a.date));

	if (allPosts.length === 0) {
		console.log("🏁 Pixelfed: Semua artikel udah tayang.");
		return;
	}

	const target = allPosts[0];

	try {
		console.log(`🚀 Menyiapkan postingan Pixelfed: ${target.title}`);

		// STEP 1: DOWNLOAD FILE LANGSUNG JADI BLOB
		console.log(`📥 Mengambil gambar dari: ${target.image}`);
		const imgRes = await fetch(target.image);
		if (!imgRes.ok) throw new Error(`Gagal ngambil gambar: ${imgRes.status}`);

		let blob = await imgRes.blob();

		if (!blob.type || blob.type === 'application/octet-stream') {
			blob = new Blob([blob], { type: 'image/webp' });
		}

		const filename = target.image.split('/').pop() || 'image.webp';
		const formData = new FormData();

		formData.append('file', blob, filename);
		formData.append('description', target.title);

		// STEP 2: UPLOAD GAMBAR KE PIXELFED
		console.log("📤 Mengunggah WebP ke Pixelfed...");
		const uploadRes = await fetch('https://pixelfed.social/api/v1/media', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${ACCESS_TOKEN}`
			},
			body: formData
		});

		if (!uploadRes.ok) {
			throw new Error(`Upload Media Gagal: ${uploadRes.status} - ${await uploadRes.text()}`);
		}

		const mediaId = (await uploadRes.json()).id;

		console.log(`✅ Gambar ter-upload dengan ID: ${mediaId}`);
		console.log("⏳ Tunggu 5 detik biar Pixelfed kelar proses gambar...");
		await delay(5000);

		// STEP 3: HASHTAG GENERATOR (Dari script Mastodon)
		const hashtags = new Set<string>();
		hashtags.add("#pixelfed");
		hashtags.add("#fediverse");
		hashtags.add(cleanHashtag(target.category)); // Bonus: Kategori artikel jadi hashtag

		target.title
		.split(/\s+/)
		.filter((w: string) => w.length > 4)
		.slice(0, 3)
		.forEach((w: string) => hashtags.add(cleanHashtag(w)));

		const hashtagString = [...hashtags].join(" ");

		// STEP 4: POSTING STATUS KE TIMELINE
		console.log("📝 Mempublikasikan status...");

		// Susun caption biar estetik: Judul -> Deskripsi -> Hashtag -> URL
		const caption = `${target.title}\n\n${target.desc}\n\n${hashtagString}\n\nBaca selengkapnya: ${target.url}`;

		await httpPost(
			'https://pixelfed.social/api/v1/statuses',
			{
				status: caption,
				media_ids: [mediaId],
				visibility: 'public'
			},
			{
				'Authorization': `Bearer ${ACCESS_TOKEN}`
			}
		);

		// STEP 5: CATAT KE DATABASE MINI (Pure Bun Write)
		const currentContent = postedDatabase;
		const newContent = currentContent + target.url + "\n";
		await Bun.write(DATABASE_FILE, newContent);

		console.log(`🎉 Sukses! Artikel "${target.title}" udah nangkring di Pixelfed dengan hashtag cakep.`);
	} catch (err: any) {
		console.error('❌ Pixelfed Error:', err.message || err);
		process.exit(1);
	}
}

postToPixelfed();