export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  const decodedPath = decodeURIComponent(url.pathname).toLowerCase();
  const pathSegments = decodedPath.split('/').filter(Boolean);
  let requestedSlug = pathSegments[pathSegments.length - 1] || "";
  requestedSlug = requestedSlug.replace('.html', '').trim();

  const response = await next();

  if (response.status === 404 && requestedSlug) {
    try {
      const cache = caches.default;
      const mapUrl = `${url.origin}/redirectmap.json`;
      
      // 1. Coba cari di Cache terlebih dahulu
      let mapResponse = await cache.match(mapUrl);

      // 2. Jika tidak ada di cache (Cache Miss), lakukan fetch manual
      if (!mapResponse) {
        const fetchRes = await fetch(mapUrl);
        
        if (fetchRes.ok) {
          // Buat salinan response karena kita perlu menyimpan ke cache
          // dan juga menggunakannya (parsing JSON)
          mapResponse = new Response(fetchRes.body, fetchRes);
          
          // Set durasi cache (misal: simpan selama 1 jam agar tetap update)
          mapResponse.headers.append("Cache-Control", "s-maxage=864000");
          
          // Simpan ke cache secara background (jangan ditunggu/waitUntil)
          context.waitUntil(cache.put(mapUrl, mapResponse.clone()));
        }
      }

      if (mapResponse && mapResponse.ok) {
        const map = await mapResponse.json();

        if (map[requestedSlug]) {
          const category = map[requestedSlug];
          return Response.redirect(`${url.origin}/${category}/${requestedSlug}`, 301);
        }
      }
    } catch (err) {
      console.error("Smart Redirect Cache Error:", err);
    }
  }

  return response;
}
