export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  // JIKA TIDAK ADA QUERY: Biarkan Cloudflare menampilkan file HTML asli
  if (!query) {
    return context.next(); 
  }

  // JIKA ADA QUERY: Kirim data JSON (seperti sebelumnya)
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const { results } = await env.DB.prepare(`
      SELECT title, id, category, image, date,
      snippet(articles_fts, 2, '<mark>', '</mark>', '...', 60) as snippet_text
      FROM articles_fts 
      WHERE articles_fts MATCH ? 
      ORDER BY rank LIMIT 12
    `).bind(query).all();

    return new Response(JSON.stringify({ results }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
