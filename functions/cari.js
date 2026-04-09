export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. Ambil parameter q, page, dan limit dari URL
  const query = url.searchParams.get("q")?.trim();
  const page = parseInt(url.searchParams.get("page")) || 1;
  const limit = parseInt(url.searchParams.get("limit")) || 36;

  // 2. Hitung OFFSET (Data mana yang harus dilompati)
  // Halaman 1: (1-1) * 24 = 0 (mulai dari data ke-0)
  // Halaman 2: (2-1) * 24 = 24 (mulai dari data ke-24)
  const offset = (page - 1) * limit;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (!query) {
    return new Response(JSON.stringify({ results: [] }), { headers });
  }

  try {
    // 3. Tambahkan LIMIT dan OFFSET ke dalam Query SQL
    // Kita gunakan LIMIT ? OFFSET ? agar dinamis sesuai permintaan frontend
    const { results } = await env.DB.prepare(`
    SELECT title, id, category, image, date,
    snippet(articles_fts, 2, '<mark>', '</mark>', '...', 20) as snippet_text
    FROM articles_fts
    WHERE articles_fts MATCH ?
    ORDER BY rank
    LIMIT ? OFFSET ?
    `).bind(query, limit, offset).all();

    return new Response(JSON.stringify({ results }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}