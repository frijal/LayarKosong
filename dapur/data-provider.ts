/**
 * MASTER DATA PROVIDER (Ultra Fast & Tiny)
 */

declare global {
	interface Window {
		siteDataProvider: { getFor: (ui: string) => Promise<any> };
	}
}

type Row = any[];
type DB = Record<string, Row[]>;

const ALL = { title:0,id:1,image:2,date:3,description:4 };

const UI: Record<string, Record<string,number>> = {
	"homepage.ts": ALL,
	"sitemap.ts": ALL,
	"halaman-pencarian.ts": ALL,
	"img.html": { title:1,url:2,date:3 },
	"iposbrowser.ts": { slug:1,date:3 },
	"marquee-url.ts": { title:0,id:1,image:2,description:4 }
};

const mapperCache: Record<string,Function> = {};

function mapper(schema:Record<string,number>){

	const k = JSON.stringify(schema);
	if(mapperCache[k]) return mapperCache[k];

	const f = Object.entries(schema)
	.map(([n,i])=>`"${n}":r[${i}]`)
	.join(",");

	return mapperCache[k] = new Function("r",`return{${f}}`);
}

window.siteDataProvider = {

	c:null as DB|null,
	p:null as Promise<DB>|null,

	async getData(){

		if(this.c) return this.c;
		if(this.p) return this.p;

		this.p = fetch("/artikel.json")
		.then(r=>r.json())
		.then((d:DB)=> (this.c=d,this.p=null,d));

		return this.p;
	},

	async getFor(ui:string){

		const db = await this.getData();
		const s = UI[ui];

		if(!s) return db;

		const m = mapper(s);
		const out:Record<string,any[]> = {};

		for(const k in db){

			const rows = db[k];
			const arr = new Array(rows.length);

			for(let i=0;i<rows.length;i++)
				arr[i] = m(rows[i]);

			out[k] = arr;
		}

		return out;
	}
};