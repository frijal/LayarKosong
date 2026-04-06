export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  // Header untuk keamanan dan format JSON
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // Agar tetap bisa dipanggil secara client-side
  };

  // Jika query kosong, berikan hasil kosong (agar tidak error di frontend)
  if (!query || query.length < 3) {
    return new Response(JSON.stringify({ results: [] }), { headers });
  }

  try {
    // Pastikan binding 'DB' sudah diset di Settings -> Functions -> D1 Database Bindings di Dashboard Pages
    const { results } = await env.DB.prepare(`
      SELECT 
        title, 
        id, 
        category, 
        image, 
        date,
        snippet(articles_fts, 2, '<mark>', '</mark>', '...', 20) as snippet_text
      FROM articles_fts 
      WHERE articles_fts MATCH ? 
      ORDER BY rank 
      LIMIT 12
    `).bind(query).all();

    return new Response(JSON.stringify({ results }), { headers });
  } catch (e) {
    // Jika ada error (misal binding belum diset), kirim pesan error
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
