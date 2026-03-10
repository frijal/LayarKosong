/**
 * MASTER DATA PROVIDER
 * Pemetaan kolom JSON ke objek UI yang mudah dibaca.
 */

declare global {
	interface Window {
		siteDataProvider: {
			getFor: (uiName: string) => Promise<any>;
		};
	}
}

interface FieldMapping {[columnName: string]: number;}

// 2. Definisikan struktur default (Single Source of Truth)
const SEMUANYA: FieldMapping = {
	title: 0,
	id: 1,
	image: 2,
	date: 3,
	description: 4
};

// 3. Gabungkan semuanya ke dalam satu objek utama
const UI_REQUIREMENTS: { [key: string]: FieldMapping } = {
	// Menggunakan SEMUANYA untuk yang butuh semua data
	'homepage.ts':            SEMUANYA,
	'sitemap.ts':             SEMUANYA,
	'halaman-pencarian.ts':   SEMUANYA,

	// Menggunakan kustomisasi untuk yang butuh data spesifik
	'img.html':               { title: 1, url: 2, date: 3 },
	'iposbrowser.ts':         { slug: 1, date: 3 },
	'marquee-url.ts':         { title: 0, id: 1, image: 2, description: 4 },
};

(window as any).siteDataProvider = {
	cache: null,
	promise: null,

	async getData(): Promise<any> {
		if (this.cache) return this.cache;
		if (!this.promise) {
			this.promise = fetch('/artikel.json')
			.then(res => res.ok ? res.json() : Promise.reject('Gagal memuat DB'))
			.then(data => { this.cache = data; return data; })
			.catch(err => { console.error(err); this.promise = null; return {}; });
		}
		return this.promise;
	},

	async getFor(uiName: string): Promise<any> {
		const rawData = await this.getData();
		const schema = UI_REQUIREMENTS[uiName];
		if (!schema) return rawData;

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