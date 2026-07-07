/**
 * MASTER DATA PROVIDER v3.0 (D1 Edge Core)
 * Jembatan mulus dari array JSON statis ke Cloudflare D1
 */

declare global {
	interface Window {
		siteDataProvider: { getFor: (ui: string) => Promise<Record<string, any[]>> };
	}
}

window.siteDataProvider = {
	// 🧠 Memori Cache: Simpan hasil fetch per UI agar tidak spam request ke D1
	cache: {} as Record<string, Record<string, any[]>>,
	// 🛡️ Promise Tracker: Cegah race condition jika UI yang sama memanggil getFor berbarengan
	promises: {} as Record<string, Promise<Record<string, any[]>>>,

	async getFor(ui: string) {
		// 1. Return dari cache jika sudah ada
		if (this.cache[ui]) return this.cache[ui];

		// 2. Return promise jika sedang dalam proses fetch (mencegah double fetch)
		if (this.promises[ui]) return this.promises[ui];

		// 3. Tarik data dari Cloudflare Pages Function (katalog.js)
		this.promises[ui] = fetch(`/katalog?ui=${ui}`)
		.then(res => {
			if (!res.ok) throw new Error(`Gagal mengambil katalog untuk UI: ${ui}`);
			return res.json();
		})
		.then((flatData: any[]) => {
			// 4. REKONSTRUKSI KELOMPOK KATEGORI
			// Mengubah bentuk array flat dari D1 menjadi Object Grouping { "kategori": [...] }
			// agar kompatibel 100% dengan script UI lama (homepage.ts, sitemap.ts, dll)
			const groupedOut: Record<string, any[]> = {};

			for (let i = 0; i < flatData.length; i++) {
				const item = flatData[i];
				// Gunakan fallback 'Lainnya' jika kategori kosong
				const cat = item.category || 'Lainnya';

		if (!groupedOut[cat]) {
			groupedOut[cat] = [];
		}

		// Pecah objeknya: pisahkan 'category', sisanya kirim ke array UI
		// (Sesuai dengan ekspektasi output mapper lama)
		const { category, ...rest } = item;
		groupedOut[cat].push(rest);
			}

			// 5. Simpan ke cache, bersihkan tracker promise, lalu sajikan ke UI
			this.cache[ui] = groupedOut;
			delete this.promises[ui];

			return groupedOut;
		})
		.catch(err => {
			console.error("D1 Provider Error:", err);
			delete this.promises[ui];
			return {}; // Return objek kosong agar UI tidak crash
		});

		return this.promises[ui];
	}
};