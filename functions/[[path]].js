export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // 1. Ambil path, hilangkan trailing slash, dan hapus ekstensi .html
  // Kita tidak menggunakan toLowerCase() di sini agar tetap Case-Sensitive
  const cleanPath = decodeURIComponent(url.pathname).replace(/\/$/, '').replace(/\.html$/, '');
  const pathSegments = cleanPath.split('/').filter(Boolean);
  const originalSlug = pathSegments[pathSegments.length - 1] || "";

  const response = await next();

  // 2. Hanya proses jika 404
  if (response.status === 404 && originalSlug) {
    try {
      const cache = caches.default;
      const mapUrl = `${url.origin}/redirectmap.json`;
      
      let mapResponse = await cache.match(mapUrl);
      if (!mapResponse) {
        const fetchRes = await fetch(mapUrl);
        if (fetchRes.ok) {
          mapResponse = new Response(fetchRes.body, fetchRes);
          mapResponse.headers.append("Cache-Control", "s-maxage=864000");
          context.waitUntil(cache.put(mapUrl, mapResponse.clone()));
        }
      }

      if (mapResponse && mapResponse.ok) {
        const map = await mapResponse.json();
        
        // 3. Pencarian Case-Sensitive Murni
        // Menggunakan slug yang sudah dibersihkan dari .html dan /
        if (map.hasOwnProperty(originalSlug)) {
          const category = map[originalSlug];
          const catSlug = category.trim().replace(/\s+/g, '-');
          
          // Redirect ke URL tujuan
          return Response.redirect(`${url.origin}/${catSlug}/${originalSlug}`, 301);
        }
      }
    } catch (err) {
      // Menjaga agar script tetap silent jika terjadi error fetch
    }
  }

  return response;
}
