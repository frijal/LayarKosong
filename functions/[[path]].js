export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // 1. Ambil path, decode karakter spesial (misal %20 jadi spasi), 
  // lalu ubah ke huruf kecil semua agar case-insensitive.
  const decodedPath = decodeURIComponent(url.pathname).toLowerCase();

  // 2. Pecah path dan ambil segmen terakhir (slug)
  const pathSegments = decodedPath.split('/').filter(Boolean);
  let requestedSlug = pathSegments[pathSegments.length - 1] || "";

  // 3. Bersihkan slug dari ekstensi .html dan trailing slashes
  requestedSlug = requestedSlug.replace('.html', '').trim();

  const response = await next();

  // Hanya proses jika 404 dan slug tidak kosong
  if (response.status === 404 && requestedSlug) {
    try {
      const mapRes = await fetch(`${url.origin}/redirectmap.json`);
      if (!mapRes.ok) return response;

      const map = await mapRes.json();

      // 4. Cek kecocokan di map
      // Karena kunci di JSON sudah kita buat kecil & bersih di script Bun,
      // maka pencocokan akan selalu akurat.
      if (map[requestedSlug]) {
        const category = map[requestedSlug];
        
        // Redirect 301 ke URL tujuan yang bersih
        // Menggunakan url.origin agar tetap di domain yang sama
        return Response.redirect(`${url.origin}/${category}/${requestedSlug}`, 301);
      }
    } catch (err) {
      console.error("Smart Redirect Error:", err);
    }
  }

  return response;
}
