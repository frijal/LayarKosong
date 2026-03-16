// functions/[[path]].ts

type NextFunction = () => Promise<Response>;

interface PagesFunctionContext {
  request: Request;
  next: NextFunction;
  // tambahkan env atau binding lain jika perlu
}

export async function onRequest(context: PagesFunctionContext): Promise<Response> {
  const { request, next } = context;
  const url = new URL(request.url);

  // Ambil path mentah dan slug (preserve case)
  const path = decodeURI(url.pathname);
  const parts = path.split('/').filter(Boolean);
  let originalSlug = parts[parts.length - 1] || "";
  if (originalSlug.endsWith('.html')) originalSlug = originalSlug.slice(0, -5);

  // Biarkan handler berikutnya memproses dulu
  const response = await next();

  // Hanya tangani bila 404 dan ada slug
  if (response.status === 404 && originalSlug) {
    try {
      const cache = caches.default;
      const mapUrl = `${url.origin}/redirectmap.json`;

      // Coba ambil dari cache edge dulu
      let mapResponse = await cache.match(mapUrl);

      if (mapResponse) {
        // Gunakan cached map segera
        const map = (await mapResponse.json()) as Record<string, string | undefined>;
        if (Object.prototype.hasOwnProperty.call(map, originalSlug)) {
          const category = map[originalSlug];
          if (typeof category === "string" && category.length > 0) {
            // Revalidate di background: fetch dari origin dengan instruksi caching ke Cloudflare CDN
            context.waitUntil((async () => {
              try {
                const fresh = await fetch(mapUrl, {
                  cf: { cacheTtl: 864000, cacheEverything: true }
                });
                if (fresh.ok) {
                  const toCache = new Response(fresh.body, fresh);
                  if (!toCache.headers.get("Cache-Control")) {
                    toCache.headers.append("Cache-Control", "s-maxage=864000");
                  }
                  await cache.put(mapUrl, toCache.clone());
                }
              } catch {
                // silent
              }
            })());

            // Kembalikan redirect dan beri Cache-Control agar CDN juga menyimpan redirect
            return new Response(null, {
              status: 301,
              headers: {
                Location: `${url.origin}/${category}/${originalSlug}`,
                "Cache-Control": "public, s-maxage=864000, max-age=0"
              }
            });
          }
        }

        // Jika tidak cocok, tetap revalidate di background untuk memperbarui cache
        context.waitUntil((async () => {
          try {
            const fresh = await fetch(mapUrl, {
              cf: { cacheTtl: 864000, cacheEverything: true }
            });
            if (fresh.ok) {
              const toCache = new Response(fresh.body, fresh);
              if (!toCache.headers.get("Cache-Control")) {
                toCache.headers.append("Cache-Control", "s-maxage=864000");
              }
              await cache.put(mapUrl, toCache.clone());
            }
          } catch {
            // silent
          }
        })());
      } else {
        // Tidak ada cache: fetch dari origin dan simpan ke cache
        const fetchRes = await fetch(mapUrl, {
          cf: { cacheTtl: 864000, cacheEverything: true }
        });
        if (fetchRes.ok) {
          mapResponse = new Response(fetchRes.body, fetchRes);
          if (!mapResponse.headers.get("Cache-Control")) {
            mapResponse.headers.append("Cache-Control", "s-maxage=864000");
          }
          context.waitUntil(cache.put(mapUrl, mapResponse.clone()));

          const map = (await mapResponse.json()) as Record<string, string | undefined>;
          if (Object.prototype.hasOwnProperty.call(map, originalSlug)) {
            const category = map[originalSlug];
            if (typeof category === "string" && category.length > 0) {
              return new Response(null, {
                status: 301,
                headers: {
                  Location: `${url.origin}/${category}/${originalSlug}`,
                  "Cache-Control": "public, s-maxage=864000, max-age=0"
                }
              });
            }
          }
        }
        // Jika fetch gagal dan tidak ada cache, kembalikan response asli
      }
    } catch {
      // silent on unexpected error
    }
  }

  return response;
}
