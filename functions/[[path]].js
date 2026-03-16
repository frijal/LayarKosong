export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // Ambil path, decode, lalu bersihkan dari trailing slash
  const cleanPath = decodeURIComponent(url.pathname).replace(/\/$/, '');
  
  // Ambil segmen terakhir sebagai slug
  const pathSegments = cleanPath.split('/').filter(Boolean);
  const rawSlug = pathSegments[pathSegments.length - 1] || "";
  
  // Bersihkan .html hanya jika ada di akhir (sama dengan regex di Bun)
  const originalSlug = rawSlug.replace(/\.html$/, '').trim();

  const response = await next();

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
        
        // Pencarian Case-Sensitive Murni
        if (map.hasOwnProperty(originalSlug)) {
          const catSlug = map[originalSlug];
          
          // Redirect ke URL tujuan: /kategori-rapi/Slug-Asli
          return Response.redirect(`${url.origin}/${catSlug}/${originalSlug}`, 301);
        }
      }
    } catch (err) {
      // Silent
    }
  }

  return response;
}
