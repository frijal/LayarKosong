export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Ambil path, hapus trailing slash, dan hapus ekstensi .html (case-insensitive removal)
  // Tidak ada toLowerCase() sehingga lookup tetap case-sensitive
  const cleanPath = decodeURIComponent(url.pathname).replace(/\/$/, '').replace(/\.html$/i, '');
  const pathSegments = cleanPath.split('/').filter(Boolean);
  const originalSlug = pathSegments[pathSegments.length - 1] || "";

  const response = await next();

  // Hanya proses jika 404 dan ada slug
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

        // Pencarian Case-Sensitive Murni: hanya cocok bila key persis sama
        if (Object.prototype.hasOwnProperty.call(map, originalSlug)) {
          const category = map[originalSlug];
          // Ganti spasi dengan '-' untuk path kategori, tetapi JANGAN ubah case
          const catSlug = String(category).trim().replace(/\s+/g, '-');

          return Response.redirect(`${url.origin}/${catSlug}/${originalSlug}`, 301);
        }
      }
    } catch (err) {
      // silent on error (tetap kembalikan response asli)
    }
  }

  return response;
}
