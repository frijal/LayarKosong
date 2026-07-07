// File: functions/katalog.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Ambil parameter '?ui=' dari URL, default ke 'semua'
  const ui = url.searchParams.get("ui") || "default";

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // 🔥 MAGIC: Default kolom memakai 'description' langsung dari D1
  let cols = "title, id, image, date, description, category";

  // 🎭 SQL ALIASING: Menyesuaikan output sesuai UI yang meminta
  switch (ui) {
    case 'img.html':
      cols = "id AS title, image AS url, date, category";
      break;
    case 'iposbrowser.ts':
      cols = "id AS slug, date, category";
      break;
    case 'pemandu.ts':
      cols = "title, id, image, description, category";
      break;
    case 'sitemap.ts':
      cols = "title, id, date, description, category";
      break;
  }

  try {
    const { results } = await env.DB.prepare(`
      SELECT ${cols} 
      FROM articles_fts 
      ORDER BY date DESC
    `).all();

    return new Response(JSON.stringify(results), { headers });
  } catch (e) {
    console.error("Katalog D1 Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
