/**
 * MASTER DATA PROVIDER (Optimized)
 * Menggunakan Singleton Pattern & Memory Caching untuk menghindari Fetch berulang.
 */

declare global {
	interface Window {
		siteDataProvider: {
			getFor: (uiName: string) => Promise<any>;
		};
	}
}

interface FieldMapping { [columnName: string]: number; }

const SEMUANYA: FieldMapping = { title: 0, id: 1, image: 2, date: 3, description: 4 };

const UI_REQUIREMENTS: { [key: string]: FieldMapping } = {
	'homepage.ts': SEMUANYA,
	'sitemap.ts': SEMUANYA,
	'halaman-pencarian.ts': SEMUANYA,
	'img.html': { title: 1, url: 2, date: 3 },
	'iposbrowser.ts': { slug: 1, date: 3 },
	'marquee-url.ts': { title: 0, id: 1, image: 2, description: 4 },
};

(window as any).siteDataProvider = {
	cache: null, // In-memory cache
	promise: null,

	async getData(): Promise<any> {
		// Jika sudah ada di RAM (memory), langsung kembalikan
		if (this.cache) return this.cache;

		// Jika request sedang berjalan, kembalikan promise yang sama (mencegah duplikasi fetch)
		if (this.promise) return this.promise;

		// Fetch baru
		this.promise = fetch('/artikel.json')
		.then(res => res.ok ? res.json() : Promise.reject('Gagal memuat DB'))
		.then(data => {
			this.cache = data; // Simpan di RAM
			this.promise = null; // Reset promise agar bisa di-fetch ulang jika perlu
			return data;
		})
		.catch(err => {
			console.error('Data Provider Error:', err);
			this.promise = null;
			return {};
		});

		return this.promise;
	},

	async getFor(uiName: string): Promise<any> {
		const rawData = await this.getData();
		const schema = UI_REQUIREMENTS[uiName];

		// Jika tidak ada skema, kembalikan data mentah
		if (!schema) return rawData;

		// Transformasi data sesuai kebutuhan UI
		const transformed: any = {};
		for (const category in rawData) {
			transformed[category] = rawData[category].map((item: any[]) => {
				const obj: any = {};
				for (const key in schema) {
					obj[key] = item[schema[key]];
				}
				return obj;
			});
		}
		return transformed;
	}
};