/**
 * MASTER DATA PROVIDER (Ultra-Performance & Flicker-Free)
 * Menggunakan Pre-fetching agar data siap SEBELUM UI diproses.
 */

declare global {
	interface Window {
		siteDataProvider: { getFor: (uiName: string) => Promise<any>; };
	}
}

type RawRow = any[];
type RawData = Record<string, RawRow[]>;

const SEMUANYA = { title: 0, id: 1, image: 2, date: 3, description: 4 };
const UI_REQUIREMENTS: Record<string, any> = {
	"homepage.ts": SEMUANYA,
	"sitemap.ts": SEMUANYA,
	"halaman-pencarian.ts": SEMUANYA,
	"img.html": { title: 1, url: 2, date: 3 },
	"iposbrowser.ts": { slug: 1, date: 3 },
	"marquee-url.ts": { title: 0, id: 1, image: 2, description: 4 }
};

const mapperCache: Record<string, Function> = {};

// Menggunakan generator untuk memetakan data dengan efisiensi tinggi
function getMapper(schema: any) {
	const key = JSON.stringify(schema);
	if (mapperCache[key]) return mapperCache[key];

	return mapperCache[key] = new Function("r", "return {" +
	Object.entries(schema).map(([k, i]) => `"${k}":r[${i}]`).join(",") +
	"}");
}

const Provider = {
	cache: null as RawData | null,

	// PRE-FETCHING: Request dimulai detik ini juga, tanpa menunggu dipanggil
	promise: fetch("/artikel.json")
	.then(r => r.json())
	.then(d => {
		Provider.cache = d;
		return d;
	}),

	async getData(): Promise<RawData> {
		// Jika sudah ada di memori, kembalikan instan
		if (this.cache) return this.cache;
		// Jika belum, join ke promise yang sudah jalan
		return this.promise;
	},

	async getFor(uiName: string) {
		const rawData = await this.getData();
		const schema = UI_REQUIREMENTS[uiName];
		if (!schema) return rawData;

		const mapper = getMapper(schema);
		const result: Record<string, any[]> = {};

		for (const cat in rawData) {
			const rows = rawData[cat];
			const len = rows.length;
			const mapped = new Array(len);
			for (let i = 0; i < len; i++) {
				mapped[i] = mapper(rows[i]);
			}
			result[cat] = mapped;
		}
		return result;
	}
};

(window as any).siteDataProvider = Provider;