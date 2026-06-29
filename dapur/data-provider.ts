/**
 * MASTER DATA PROVIDER (Ultra Fast & Tiny)
 * v2.0 - Dual Core Fetching (Full & Lite)
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
	"halaman-pencarian.ts": SEMUANYA, // (Sebagai fallback jika tidak pakai D1)
	"homepage.ts": SEMUANYA,
	"img.html": { title: 1, url: 2, date: 3 },
	"iposbrowser.ts": { slug: 1, date: 3 },
	"pemandu.ts": { title: 0, id: 1, image: 2, description: 4 },
	"sitemap.ts": { title: 0, id: 1, date: 3, description: 4 }
};

// 🎯 DAFTAR UI YANG CUKUP PAKAI DATA "DIET" (artikel-lite.json)
const LITE_UIS = ["pemandu.ts"];

const mapperCache: Record<string, Function> = {};

function mapper(schema: Record<string, number>) {
	const k = JSON.stringify(schema);
	if (mapperCache[k]) return mapperCache[k];

	const f = Object.entries(schema)
	.map(([n, i]) => `"${n}":r[${i}]`)
	.join(",");

	return mapperCache[k] = new Function("r", `return{${f}}`);
}

window.siteDataProvider = {
	// State untuk Data Full (artikel.json)
	c: null as DB | null,
	p: null as Promise<DB> | null,

	// State untuk Data Diet (artikel-lite.json)
	cLite: null as DB | null,
	pLite: null as Promise<DB> | null,

	// 📦 FETCH DATA FULL (Untuk keperluan berat)
	async getData() {
		if (this.c) return this.c;
		if (this.p) return this.p;

		this.p = fetch("/artikel.json")
		.then(r => r.json())
		.then((d: DB) => (this.c = d, this.p = null, d));

		return this.p;
	},

	// 🚀 FETCH DATA DIET (Untuk Marquee & Navigasi Cepat)
	async getLiteData() {
		if (this.cLite) return this.cLite;
		if (this.pLite) return this.pLite;

		this.pLite = fetch("/artikel-lite.json")
		.then(r => r.json())
		.then((d: DB) => (this.cLite = d, this.pLite = null, d));

		return this.pLite;
	},

	async getFor(ui: string) {
		// Cek apakah UI yang memanggil butuh data ringan atau berat
		const isLite = LITE_UIS.includes(ui);

		// Panggil fungsi fetch yang sesuai
		const db = await (isLite ? this.getLiteData() : this.getData());

		const s = UI[ui];
		if (!s) return db;

		const m = mapper(s);
		const out: Record<string, any[]> = {};

		for (const k in db) {
			const rows = db[k];
			const arr = new Array(rows.length);

			for (let i = 0; i < rows.length; i++)
				arr[i] = m(rows[i]);

			out[k] = arr;
		}

		return out;
	}
};
