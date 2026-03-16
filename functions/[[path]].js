export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // 1. Ambil slug asli untuk kebutuhan redirect nantinya
  const pathSegments = decodeURIComponent(url.pathname).split('/').filter(Boolean);
  const originalSlug = (pathSegments[pathSegments.length - 1] || "").replace(/\.html$/, '').trim();

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
        
        // 3. Logika Hybrid: 
        // Cari pakai lowercase agar "kebal", tapi ambil nilai aslinya dari JSON
        const lowerSlug = originalSlug.toLowerCase();
        const mapKeys = Object.keys(map);
        const matchKey = mapKeys.find(k => k.toLowerCase() === lowerSlug);

        if (matchKey) {
          const category = map[matchKey];
          // Redirect ke URL yang sudah ditentukan di map
          return Response.redirect(`${url.origin}/${category}/${matchKey}`, 301);
        }
      }
    } 
  }

  return response;
}
