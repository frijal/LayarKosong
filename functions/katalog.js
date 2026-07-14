// File: functions/katalog.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Ambil parameter '?ui=' dari URL, default ke 'semua'
  const ui = url.searchParams.get("ui") || "default";

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    // Instruksi Cache: Browser simpan 1 jam, Edge simpan 1 hari
    "Cache-Control": "public, max-age=3600, s-maxage=86400"
  };

  // Default kolom
  let cols = "title, id, image, date, description, category";

  // 🎭 SQL ALIASING: Menyesuaikan output sesuai UI yang meminta
  switch (ui) {
    case 'homepage.ts':
      // Mengambil semua pilar utama untuk Grid, Filter, dan Hero Slider
      cols = "title, id, image, date, description, category";
      break;
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
      // 🔥 JALUR BARU KHUSUS UNTUK LITE GRID
    case 'related-grid':
      cols = "title, id, image, category";
      break;
  }

  try {
    const { results } = await env.DB.prepare(`
    SELECT ${cols}
    FROM articles_fts
    ORDER BY date DESC
    `).all();

    let finalResults = results;

    // ✂️ REPLIKASI ARTIKEL-LITE: Potong maksimal 30 artikel per kategori khusus
    if (ui === 'related-grid') {
      const categoryCounters = {};
      finalResults = results.filter(item => {
        const cat = item.category || 'lainnya';
        if (!categoryCounters[cat]) categoryCounters[cat] = 0;
        categoryCounters[cat]++;
        return categoryCounters[cat] <= 30;
      });
    }

    return new Response(JSON.stringify(finalResults), { headers });
  } catch (e) {
    console.error("Katalog D1 Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
