export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Ambil parameter ?url=, jika tidak ada pakai 'home'
  let pageUrl = url.searchParams.get('url') || 'home';
  
  // Bersihkan slash di akhir agar konsisten
  pageUrl = pageUrl.replace(/\/$/, "") || "home";

  const kv = env.COUNTS_KV;
  if (!kv) {
    return new Response(JSON.stringify({ error: "KV Binding tidak ditemukan" }), { status: 500 });
  }

  const key = `view:${pageUrl}`;

  try {
    let count = parseInt(await kv.get(key)) || 0;
    count++;
    await kv.put(key, count.toString());

    return new Response(JSON.stringify({ views: count }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
