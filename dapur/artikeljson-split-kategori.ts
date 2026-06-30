import { file, write } from "bun";

// 1. Fungsi Utility untuk slug (Agar tetap bersih)
const toSlug = (str: string) => str.toLowerCase().replace(/\s+/g, '-');

async function splitArticleData() {
	const sourceFile = "artikel.json";
	const source = file(sourceFile);

	if (!(await source.exists())) {
		console.error("❌ File artikel.json tidak ditemukan!");
		return;
	}

	// Membaca JSON sebagai objek secara langsung
	const data = await source.json();
	const categories = Object.keys(data);
	const manifest: Record<string, any> = {};

	console.log(`🚀 Memulai pemisahan ${categories.length} kategori...`);

	// Gunakan Promise.all agar penulisan file ke disk berjalan paralel
	const writeTasks = categories.map(async (cat) => {
		const catSlug = toSlug(cat);
		const articles = data[cat];

		// 1. Simpan file kategori (format: kat-slug.json)
		const categoryFileName = `kat-${catSlug}.json`;
		await write(categoryFileName, JSON.stringify({ [cat]: articles }));

		// 2. Siapkan data untuk manifest (di memori)
		manifest[cat] = articles.slice(0, 3).map((item: any) => [
			item[0], // Title
			item[1], // Slug/File
			item[2], // Img
			item[3], // Date
			item[4]?.substring(0, 100) ?? "" // Optional chaining untuk keamanan data
		]);

		return `✅ Terbuat: ${categoryFileName} (${articles.length} artikel)`;
	});

	// Jalankan semua penulisan file secara bersamaan
	const results = await Promise.all(writeTasks);
	results.forEach(log => console.log(log));

	// 3. Simpan manifest.json
	await write("manifest.json", JSON.stringify(manifest));

	console.log(`\n✨ SELESAI! manifest.json berhasil diperbarui.`);
}

splitArticleData();
