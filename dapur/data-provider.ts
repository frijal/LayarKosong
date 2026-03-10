/**
 * MASTER DATA PROVIDER
 * Struktur data: [Title(0), Slug(1), URL/Img(2), Date(3), Summary(4)]
 */

const UI_REQUIREMENTS: { [key: string]: any } = {
	'img.html':		{ title: 1, url: 2, date: 3 },
	'iposbrowser':	{ slug: 1, date: 3 },
	'sidebar':   { title: 0, url: 1, img: 2 },
	'homepage':  { title: 0, url: 1, img: 2, date: 3, summary: 4 },
	'sitemap':   { title: 0, url: 1, date: 3 },
	'search':    { title: 0, summary: 4 }

};

(window as any).siteDataProvider = {
	cache: null,
	promise: null,

	async getData() {
		if (this.cache) return this.cache;
		if (!this.promise) {
			this.promise = fetch('/artikel.json')
			.then(res => {
				if (!res.ok) throw new Error('Gagal memuat database');
				return res.json();
			})
			.then(data => {
				this.cache = data;
				return data;
			})
			.catch(err => {
				console.error('Error pada Data Provider:', err);
				this.promise = null; // Reset agar bisa dicoba lagi nanti
				return {}; // Kembalikan objek kosong agar komponen tidak crash
			});
		}
		return this.promise;
	},

	async getFor(uiName: string) {
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