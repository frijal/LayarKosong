export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const query = url.searchParams.get("q")?.trim();
  const page = parseInt(url.searchParams.get("page")) || 1;
  const limit = parseInt(url.searchParams.get("limit")) || 36;
  const offset = (page - 1) * limit;
  
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // 📦 Bikin template "Jawaban Kosong" di awal
  const emptyResponse = new Response(JSON.stringify({ results: [] }), { headers });
  
  // Kalau query kosong, lempar template tadi
  if (!query) return emptyResponse;
  
  try {
    const { results } = await env.DB.prepare(`
      SELECT title, id, category, image, date,
             snippet(articles_fts, 1, '<mark>', '</mark>', '...', 20) as snippet_text
      FROM articles_fts
      WHERE articles_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `).bind(query, limit, offset).all();
    
    return new Response(JSON.stringify({ results }), { headers });
  } catch (e) {
    // Kalau database error gara-gara input aneh, lempar template yang sama
    return emptyResponse;
  }
}
