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

  // 3. Proses jika 404
  if (response.status === 404 && originalSlug) {
    try {
      const mapUrl = `${url.origin}/redirectmap.json`;
      const mapResponse = await fetch(mapUrl);
      
      if (mapResponse.ok) {
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
