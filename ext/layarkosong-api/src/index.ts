export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const query = url.searchParams.get("q");

		if (!query) return new Response(JSON.stringify({ error: "Query is required" }), { status: 400 });

		const results = await env.DB.prepare(
			"SELECT * FROM articles_fts WHERE articles_fts MATCH ? ORDER BY rank LIMIT 10"
		).bind(query).all();

		return new Response(JSON.stringify(results), {
			headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
		});
	}
};
