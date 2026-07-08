/**
 * MASTER DATA PROVIDER v3.1 (D1 Edge Core + Lite Support)
 * Jembatan mulus dari array JSON statis ke Cloudflare D1
 */

declare global {
	interface Window {
		siteDataProvider: {
			getFor: (ui: string) => Promise<Record<string, any[]>>;
			getRelatedLiteData: () => Promise<Record<string, any[]>>;
			cache: Record<string, Record<string, any[]>>;
			promises: Record<string, Promise<Record<string, any[]>>>;
		};
	}
}

window.siteDataProvider = {
	cache: {} as Record<string, Record<string, any[]>>,
	promises: {} as Record<string, Promise<Record<string, any[]>>>,

	async getFor(ui: string) {
		if (this.cache[ui]) return this.cache[ui];
		if (this.promises[ui]) return this.promises[ui];

		this.promises[ui] = fetch(`/katalog?ui=${ui}`)
		.then(res => {
			if (!res.ok) throw new Error(`Gagal mengambil katalog untuk UI: ${ui}`);
			return res.json();
		})
		.then((flatData: any[]) => {
			const groupedOut: Record<string, any[]> = {};

			for (let i = 0; i < flatData.length; i++) {
				const item = flatData[i];
				const cat = item.category || 'Lainnya';

		if (!groupedOut[cat]) {
			groupedOut[cat] = [];
		}

		const { category, ...rest } = item;
		groupedOut[cat].push(rest);
			}

			this.cache[ui] = groupedOut;
			delete this.promises[ui];
			return groupedOut;
		})
		.catch(err => {
			console.error("D1 Provider Error:", err);
			delete this.promises[ui];
			return {};
		});

		return this.promises[ui];
	},

	// 🔥 FUNGSI BARU KHUSUS UNTUK RELATED GRID (Diet Payload 30 Artikel)
	async getRelatedLiteData() {
		const uiName = 'related-lite';

		if (this.cache[uiName]) return this.cache[uiName];
		if (this.promises[uiName]) return this.promises[uiName];

		this.promises[uiName] = fetch(`/katalog?ui=related-grid`)
		.then(res => {
			if (!res.ok) throw new Error('Gagal mengambil data lite dari D1');
			return res.json();
		})
		.then((flatData: any[]) => {
			const groupedLite: Record<string, any[]> = {};

			for (let i = 0; i < flatData.length; i++) {
				const item = flatData[i];
				// Gunakan raw slug category untuk kemudahan mapping URL di UI
				const cat = item.category || 'lainnya';

		if (!groupedLite[cat]) {
			groupedLite[cat] = [];
		}

		groupedLite[cat].push(item);
			}

			this.cache[uiName] = groupedLite;
			delete this.promises[uiName];
			return groupedLite;
		})
		.catch(err => {
			console.error("Data Provider Lite Error:", err);
			delete this.promises[uiName];
			return {};
		});

		return this.promises[uiName];
	}
};
