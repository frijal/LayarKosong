export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // 1. Ambil path secara mentah
  const path = decodeURI(url.pathname);
  
  // 2. Ambil slug tanpa mengubah karakter sama sekali
  const parts = path.split('/').filter(Boolean);
  let originalSlug = parts[parts.length - 1] || "";
  
  // Hapus .html jika ada
  if (originalSlug.endsWith('.html')) {
    originalSlug = originalSlug.slice(0, -5);
  }

  const response = await next();

  // 3. Proses hanya jika 404
  if (response.status === 404 && originalSlug) {
    try {
      const cache = caches.default;
      const mapUrl = `${url.origin}/redirectmap.json`;
      
      // Cek cache
      let mapResponse = await cache.match(mapUrl);
      
      if (!mapResponse) {
        const fetchRes = await fetch(mapUrl);
        
        if (fetchRes.ok) {
          mapResponse = new Response(fetchRes.body, fetchRes);
          // Tambahkan header cache untuk 10 hari
          mapResponse.headers.append("Cache-Control", "s-maxage=864000");
          context.waitUntil(cache.put(mapUrl, mapResponse.clone()));
        }
      }

      if (mapResponse && mapResponse.ok) {
        const map = await mapResponse.json();
        
        // Cek eksak (Case-Sensitive)
        if (map.hasOwnProperty(originalSlug)) {
          const category = map[originalSlug];
          // Redirect ke URL target
          return Response.redirect(`${url.origin}/${category}/${originalSlug}`, 301);
        }
      }
    } catch (err) {
      // Diamkan
    }
  }

  return response;
}
