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

      // Cek apakah data sudah ada di cache
      let mapResponse = await cache.match(mapUrl);

      if (!mapResponse) {
        // Jika tidak ada di cache, fetch langsung
        const fetchRes = await fetch(mapUrl);

        if (fetchRes.ok) {
          // Buat respon baru agar bisa di-cache
          mapResponse = new Response(fetchRes.body, fetchRes);

          // Set Cache-Control ke 10 hari (864000 detik)
          mapResponse.headers.append("Cache-Control", "s-maxage=864000");

          // Simpan ke cache Cloudflare
          context.waitUntil(cache.put(mapUrl, mapResponse.clone()));
        }
      }

      if (mapResponse && mapResponse.ok) {
        // Karena respon di-clone atau dari cache, kita perlu baca kembali JSON-nya
        const map = await mapResponse.json();

        // Cek eksak (Case-Sensitive)
        if (map.hasOwnProperty(originalSlug)) {
          const category = map[originalSlug];
          return Response.redirect(`${url.origin}/${category}/${originalSlug}`, 301);
        }
      }
    } catch (err) {
      // Tetap silent agar tidak merusak flow website
    }
  }

  return response;
}
