/**
 * MASTER DATA PROVIDER (High Performance)
 * Shared Promise + Memory Cache + Compiled Mapper
 */

declare global {
	interface Window {
		siteDataProvider: {
			getFor: (uiName: string) => Promise<any>;
		};
	}
}

type RawRow = any[];
type RawData = Record<string, RawRow[]>;

interface FieldMapping {
	[key: string]: number;
}

const SEMUANYA: FieldMapping = {
	title: 0,
	id: 1,
	image: 2,
	date: 3,
	description: 4
};

const UI_REQUIREMENTS: Record<string, FieldMapping> = {
	"homepage.ts": SEMUANYA,
	"sitemap.ts": SEMUANYA,
	"halaman-pencarian.ts": SEMUANYA,
	"img.html": { title: 1, url: 2, date: 3 },
	"iposbrowser.ts": { slug: 1, date: 3 },
	"marquee-url.ts": { title: 0, id: 1, image: 2, description: 4 }
};

/* compile mapper sekali saja */
const mapperCache: Record<string, Function> = {};

function getMapper(schema: FieldMapping) {

	const key = JSON.stringify(schema);

	if (mapperCache[key]) return mapperCache[key];

	const fields = Object.entries(schema);

	const fn = new Function(
		"row",
		"return {" +
		fields.map(([k, i]) => `"${k}":row[${i}]`).join(",") +
		"}"
	);

	mapperCache[key] = fn;

	return fn;
}

(window as any).siteDataProvider = {

	cache: null as RawData | null,
	promise: null as Promise<RawData> | null,

	async getData(): Promise<RawData> {

		if (this.cache) return this.cache;

		if (this.promise) return this.promise;

		this.promise = fetch("/artikel.json")
		.then(r => {

			if (!r.ok) throw new Error("Gagal memuat DB");

			return r.json();

		})
		.then((data: RawData) => {

			this.cache = data;
			this.promise = null;

			return data;

		})
		.catch(err => {

			console.error("Data Provider Error:", err);

			this.promise = null;

			return this.cache || {};
		});

		return this.promise;
	},

	async getFor(uiName: string) {

		const rawData = await this.getData();
		const schema = UI_REQUIREMENTS[uiName];

		if (!schema) return rawData;

		const mapper = getMapper(schema);

		const result: Record<string, any[]> = {};

		for (const category of Object.keys(rawData)) {

			const rows = rawData[category];

			const mapped = new Array(rows.length);

			for (let i = 0; i < rows.length; i++) {
				mapped[i] = mapper(rows[i]);
			}

			result[category] = mapped;
		}

		return result;
	}
};