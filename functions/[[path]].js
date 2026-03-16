export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // 1. Ambil path dari URL. 
  // decodeURIComponent memastikan karakter unik (jika ada) terbaca apa adanya.
  const path = decodeURIComponent(url.pathname);
  
  // 2. Ambil slug terakhir. 
  // Kita split berdasarkan '/', ambil elemen terakhir, 
  // dan hilangkan .html hanya jika ia berada tepat di akhir string.
  const pathSegments = path.split('/').filter(Boolean);
  let originalSlug = pathSegments[pathSegments.length - 1] || "";
  originalSlug = originalSlug.replace(/\.html$/, '');

  const response = await next();

  // 3. Hanya proses jika 404 (tidak ditemukan halaman aslinya)
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
        
        // 4. Pencarian Murni (Eksak/Case-Sensitive)
        // Jika ada di map, kita ambil nilai kategorinya
        if (Object.prototype.hasOwnProperty.call(map, originalSlug)) {
          const category = map[originalSlug];
          
          // Redirect ke path yang benar (asli dari JSON + slug asli)
          return Response.redirect(`${url.origin}/${category}/${originalSlug}`, 301);
        }
      }
    } catch (err) {
      // Tetap silent
    }
  }

  return response;
}
