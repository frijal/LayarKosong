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
      
      // Cek apakah ada di cache
      let mapResponse = await cache.match(mapUrl);
      
      if (!mapResponse) {
        const fetchRes = await fetch(mapUrl);
        
        if (fetchRes.ok) {
          // KUNCI: Gunakan .clone() agar response bisa dibaca dua kali
          // 1. Untuk dimasukkan ke cache
          // 2. Untuk di-parse menjadi JSON
          mapResponse = new Response(fetchRes.body, fetchRes);
          mapResponse.headers.append("Cache-Control", "s-maxage=864000");
          
          context.waitUntil(cache.put(mapUrl, mapResponse.clone()));
        }
      }

      // Jika ada respon (dari cache atau fetch baru), proses JSON-nya
      if (mapResponse && mapResponse.ok) {
        // Kita gunakan clone() agar stream utama tidak tertutup
        const map = await mapResponse.clone().json();
        
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
