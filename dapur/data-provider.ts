/**
 * MASTER DATA PROVIDER (Ultra-Performance)
 * Menghapus validasi runtime, fokus pada kecepatan eksekusi.
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

function getMapper(schema: any) {
	const key = JSON.stringify(schema);
	return mapperCache[key] ||= new Function("r", "return {" + Object.entries(schema).map(([k, i]) => `"${k}":r[${i}]`).join(",") + "}");
}

(window as any).siteDataProvider = {
	cache: null as RawData | null,
	promise: null as Promise<RawData> | null,

	async getData(): Promise<RawData> {
		return this.cache || (this.promise ||= fetch("/artikel.json").then(r => r.json()).then(d => this.cache = d));
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
			for (let i = 0; i < len; i++) mapped[i] = mapper(rows[i]);
			result[cat] = mapped;
		}
		return result;
	}
};