export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // Ambil path tanpa mengubah case (menjaga huruf besar/kecil)
  const path = decodeURIComponent(url.pathname);
  const pathSegments = path.split('/').filter(Boolean);
  
  // Ambil slug terakhir, hilangkan .html
  let requestedSlug = pathSegments[pathSegments.length - 1] || "";
  requestedSlug = requestedSlug.replace(/\.html$/, '').trim();

  const response = await next();

  if (response.status === 404 && requestedSlug) {
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

        // Pencarian langsung tanpa .toLowerCase()
        if (map[requestedSlug]) {
          const category = map[requestedSlug];
          return Response.redirect(`${url.origin}/${category}/${requestedSlug}`, 301);
        }
      }
    } catch (err) {
      console.error("Smart Redirect Error:", err);
    }
  }

  return response;
}
