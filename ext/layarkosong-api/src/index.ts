/**
 * Worker API untuk Pencarian Layar Kosong (FTS5)
 * Lokasi: ext/layarkosong-api/src/index.ts
 */

export interface Env {
	// Binding ini harus sama dengan "binding" di wrangler.jsonc
	DB: D1Database;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// 1. Setup Header CORS agar bisa dipanggil dari domain blogmu
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*", // Kamu bisa ganti ke "https://dalam.web.id" nanti
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
			"Content-Type": "application/json",
		};

		// 2. Handle Preflight Request (CORS)
		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		// 3. Ambil parameter pencarian 'q' dari URL
		const url = new URL(request.url);
		const query = url.searchParams.get("q")?.trim();

		// Validasi: Jika query kosong atau terlalu pendek, kirim hasil kosong
		if (!query || query.length < 2) {
			return new Response(JSON.stringify({ results: [], info: "Ketik minimal 2 karakter" }), {
				headers: corsHeaders,
			});
		}

		try {
			/**
			 * 4. Eksekusi Query FTS5
			 * - snippet(): Mengambil potongan teks di sekitar kata kunci.
			 * - bm25(): Mengurutkan hasil berdasarkan relevansi (terbaik).
			 * - <mark>: Tag HTML untuk menandai kata yang cocok.
			 */
			const { results } = await env.DB.prepare(`
			SELECT
			title,
			id,
			category,
			image,
			date,
			description,
			snippet(articles_fts, 2, '<mark class="bg-yellow-200 text-black">', '</mark>', '...', 25) as snippet_text
			FROM articles_fts
			WHERE articles_fts MATCH ?
			ORDER BY bm25(articles_fts)
			LIMIT 25
			`)
			.bind(query)
			.all();

			// 5. Kirim respon JSON
			return new Response(JSON.stringify({
				results,
				count: results.length,
				query: query
			}), {
				headers: corsHeaders
			});

		} catch (error: any) {
			// Log error ke Cloudflare Observability
			console.error("D1 Search Error:", error.message);

			return new Response(JSON.stringify({
				error: "Gagal menjalankan pencarian",
				details: error.message
			}), {
				status: 500,
				headers: corsHeaders
			});
		}
	},
};
