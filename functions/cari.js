export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // 1. Jika q kosong, langsung kasih JSON kosong saja (jangan context.next)
  if (!query) {
    return new Response(JSON.stringify({ results: [] }), { headers });
  }

  try {
    // 2. Eksekusi pencarian di D1
    const { results } = await env.DB.prepare(`
      SELECT title, id, category, image, date,
      snippet(articles_fts, 2, '<mark>', '</mark>', '...', 20) as snippet_text
      FROM articles_fts 
      WHERE articles_fts MATCH ? 
      ORDER BY rank LIMIT 12
    `).bind(query).all();

    // 3. Kirim hasil sebagai JSON
    return new Response(JSON.stringify({ results }), { headers });
  } catch (e) {
    // 4. Kirim error sebagai JSON jika ada masalah database
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
