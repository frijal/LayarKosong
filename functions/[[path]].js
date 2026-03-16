export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Ambil path mentah dan slug (preserve case)
  const path = decodeURI(url.pathname);
  const parts = path.split('/').filter(Boolean);
  let originalSlug = parts[parts.length - 1] || "";
  if (originalSlug.endsWith('.html')) originalSlug = originalSlug.slice(0, -5);

  const response = await next();

  if (response.status === 404 && originalSlug) {
    try {
      const cache = caches.default;
      const mapUrl = `${url.origin}/redirectmap.json`;

      // Coba ambil dari cache dulu
      let mapResponse = await cache.match(mapUrl);

      if (mapResponse) {
        // Gunakan cached map segera
        const map = await mapResponse.json();
        if (Object.prototype.hasOwnProperty.call(map, originalSlug)) {
          const category = map[originalSlug];
          if (typeof category === "string" && category.length > 0) {
            // Trigger background revalidation (fetch & update cache) but don't await
            context.waitUntil((async () => {
              try {
                const fresh = await fetch(mapUrl);
                if (fresh.ok) {
                  const toCache = new Response(fresh.body, fresh);
                  if (!toCache.headers.get("Cache-Control")) {
                    toCache.headers.append("Cache-Control", "s-maxage=864000");
                  }
                  await cache.put(mapUrl, toCache.clone());
                }
              } catch (e) {
                // silent
              }
            })());
            return Response.redirect(`${url.origin}/${category}/${originalSlug}`, 301);
          }
        }

        // Jika tidak cocok, tetap lakukan revalidation in background (untuk update cache)
        context.waitUntil((async () => {
          try {
            const fresh = await fetch(mapUrl);
            if (fresh.ok) {
              const toCache = new Response(fresh.body, fresh);
              if (!toCache.headers.get("Cache-Control")) {
                toCache.headers.append("Cache-Control", "s-maxage=864000");
              }
              await cache.put(mapUrl, toCache.clone());
            }
          } catch (e) {
            // silent
          }
        })());
      } else {
        // Tidak ada cache: fetch dari origin dan simpan ke cache
        const fetchRes = await fetch(mapUrl);
        if (fetchRes.ok) {
          mapResponse = new Response(fetchRes.body, fetchRes);
          if (!mapResponse.headers.get("Cache-Control")) {
            mapResponse.headers.append("Cache-Control", "s-maxage=864000");
          }
          context.waitUntil(cache.put(mapUrl, mapResponse.clone()));

          const map = await mapResponse.json();
          if (Object.prototype.hasOwnProperty.call(map, originalSlug)) {
            const category = map[originalSlug];
            if (typeof category === "string" && category.length > 0) {
              return Response.redirect(`${url.origin}/${category}/${originalSlug}`, 301);
            }
          }
        }
        // Jika fetch gagal dan tidak ada cache, lanjutkan kembalikan response asli
      }
    } catch (err) {
      // silent on any unexpected error
    }
  }

  return response;
}
