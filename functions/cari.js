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
    // ================================================================
    // 🔥 SULAP QUERY DI SINI BIAR NGGAK KAKU 🔥
    // 1. Bersihkan tanda baca aneh (" ' * ^ dll) biar FTS5 nggak error
    // 2. Pecah per kata, lalu tempelin bintang (*) di buntut tiap kata
    // ================================================================
    const cleanQuery = query.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();

    // Kalau setelah dibersihkan ternyata kosong, lempar emptyResponse
    if (!cleanQuery) return emptyResponse;

    const ftsQuery = cleanQuery.split(/\s+/).map(word => `${word}*`).join(' ');

    const { results } = await env.DB.prepare(`
    SELECT title, id, category, image, date,
    snippet(articles_fts, 1, '<mark>', '</mark>', '...', 20) as snippet_text
    FROM articles_fts
    WHERE articles_fts MATCH ?
    ORDER BY rank
    LIMIT ? OFFSET ?
    `).bind(ftsQuery, limit, offset).all();

    return new Response(JSON.stringify({ results }), { headers });
  } catch (e) {
    // Kalau database error gara-gara input aneh, lempar template yang sama
    console.error("FTS5 Error:", e.message); // Kasih log biar kalau error gampang nge-debug-nya
    return emptyResponse;
  }
}
