/**
 * MASTER DATA PROVIDER
 * Pemetaan kolom JSON ke objek UI yang mudah dibaca.
 */

interface FieldMapping {
	[columnName: string]: number;
}

const UI_REQUIREMENTS: { [key: string]: FieldMapping } = {
	'img.html':        { title: 1, url: 2, date: 3 },
	'iposbrowser.ts':  { slug: 1, date: 3 },
	'marquee-url.ts':  { title: 0, id: 1, image: 2, description: 4 },
	'sidebar':         { title: 0, url: 1, img: 2 },
	'homepage':        { title: 0, url: 1, img: 2, date: 3, summary: 4 },
	'sitemap':         { title: 0, url: 1, date: 3 },
	'search':          { title: 0, summary: 4 }
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