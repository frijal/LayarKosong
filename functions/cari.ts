interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // 1. Jika query kosong
  if (!query) {
    return new Response(JSON.stringify({ results: [] }), { 
      status: 200, 
      headers 
    });
  }

  try {
    // 2. Validasi Binding
    if (!env.DB) {
      throw new Error("Database binding 'DB' tidak ditemukan. Periksa konfigurasi di Dashboard Cloudflare.");
    }

    // 3. Eksekusi Query D1
    // Menggunakan FTS5 snippet untuk mengambil potongan konten yang relevan
    const { results } = await env.DB.prepare(
      `SELECT title, id, category, image, date, 
       snippet(articles_fts, 2, '<mark>', '</mark>', '...', 20) as snippet_text 
       FROM articles_fts 
       WHERE articles_fts MATCH ? 
       ORDER BY rank LIMIT 120`
    )
    .bind(query)
    .all();

    // 4. Kirim Respon Sukses
    return new Response(JSON.stringify({ 
      results: results || [],
      count: results?.length || 0 
    }), { 
      status: 200, 
      headers 
    });

  } catch (e: any) {
    // 5. Error Handling
    return new Response(JSON.stringify({ 
      error: e.message,
      success: false
    }), { 
      status: 500, 
      headers 
    });
  }
};
