/**
 * MASTER DATA PROVIDER (Ultra Fast & Flicker-Free)
 */

declare global {
	interface Window {
		siteDataProvider: { getFor: (ui: string) => Promise<any> };
	}
}

type Row = any[];
type DB = Record<string, Row[]>;

const SEMUANYA = { title: 0, id: 1, image: 2, date: 3, description: 4 };
const UI: Record<string, Record<string, number>> = {
	"homepage.ts": SEMUANYA,
	"sitemap.ts": SEMUANYA,
	"halaman-pencarian.ts": SEMUANYA,
	"img.html": { title: 1, url: 2, date: 3 },
	"iposbrowser.ts": { slug: 1, date: 3 },
	"marquee-url.ts": { title: 0, id: 1, image: 2, description: 4 }
};

const mapperCache: Record<string, Function> = {};

// Mapper dengan caching yang lebih ringkas
const getMapper = (schema: Record<string, number>) => {
	const k = JSON.stringify(schema);
	return mapperCache[k] ??= new Function("r", `return{${Object.entries(schema).map(([n, i]) => `"${n}":r[${i}]`)}}`);
};

// EAGER LOADING: Fetch dimulai SEGERA saat skrip dimuat (tanpa menunggu method dipanggil)
const dataPromise: Promise<DB> = fetch("/artikel.json")
.then(r => r.json())
.catch(() => ({})); // Fallback aman jika gagal

window.siteDataProvider = {
	c: null as DB | null,

	async getData(): Promise<DB> {
		return this.c ??= await dataPromise;
	},

	async getFor(ui: string) {
		const db = await this.getData();
		const s = UI[ui];
		if (!s) return db;

		const m = getMapper(s);
		const out: Record<string, any[]> = {};

		// Loop performa tinggi dengan cache length
		for (const k in db) {
			const rows = db[k];
			const len = rows.length;
			const arr = new Array(len);
			for (let i = 0; i < len; i++) arr[i] = m(rows[i]);
			out[k] = arr;
		}
		return out;
	}
};