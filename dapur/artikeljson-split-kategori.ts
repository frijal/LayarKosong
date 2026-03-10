// ----------------------------------------------------------
// FILE: split.ts
// Deskripsi: Pemecah artikel.json (Versi Prefix kat-)
// Run: bun run split.ts
// ----------------------------------------------------------

import { file, write } from "bun";

async function splitArticleData() {
	const sourceFile = "artikel.json";

	try {
		const rawFile = file(sourceFile);
		if (!(await rawFile.exists())) {
			console.error("❌ File artikel.json tidak ditemukan!");
			return;
		}

		const data = await rawFile.json();
		const manifest: any = {};
		const categories = Object.keys(data);

		for (const cat of categories) {
			// Slug untuk nama file (Contoh: "Gaya Hidup" -> "kat-gaya-hidup.json")
			const catSlug = cat.toLowerCase().replace(/\s+/g, '-');
			const articles = data[cat];

			// 1. Simpan file kategori dengan prefix 'kat-'
			const categoryFileName = `kat-${catSlug}.json`;
			await write(categoryFileName, JSON.stringify({ [cat]: articles }));

			console.log(`✅ Terbuat: ${categoryFileName} (${articles.length} artikel)`);

			// 2. Isi Manifest (Ringan, hanya metadata dasar)
			// Kita ambil 3 artikel terbaru per kategori untuk pengisian awal UI
			manifest[cat] = articles.slice(0, 3).map((item: any) => [
				item[0], // Title
				item[1], // Slug/File
				item[2], // Img
				item[3], // Date
				item[4] ? item[4].substring(0, 100) + "..." : "" // Summary pendek
			]);
		}

		// 3. Simpan manifest.json di root
		await write(`manifest.json`, JSON.stringify(manifest));
		console.log(`\n✨ SELESAI! Semua file kategori kini berawalan 'kat-'.`);

	} catch (error) {
		console.error("❌ Error saat memproses:", error);
	}
}

splitArticleData();