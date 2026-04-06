export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  // LOGIKA PENTING:
  // Jika tidak ada parameter 'q', atau 'q' kosong,
  // STOP jalankan kode API dan berikan kendali ke Cloudflare Pages 
  // untuk menampilkan file /search/index.html kamu.
  if (!query || query.trim() === "") {
    return context.next(); 
  }

  // Jika ADA parameter 'q', barulah kita kirim JSON
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const { results } = await env.DB.prepare(`
      SELECT title, id, category, image, date,
      snippet(articles_fts, 2, '<mark>', '</mark>', '...', 20) as snippet_text
      FROM articles_fts 
      WHERE articles_fts MATCH ? 
      ORDER BY rank LIMIT 12
    `).bind(query).all();

    return new Response(JSON.stringify({ results }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
