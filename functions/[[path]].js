export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const requestedSlug = pathSegments[pathSegments.length - 1];

  const response = await next();

  // Hanya memproses jika 404 dan bukan file (punya ekstensi .jpg, .css, dll)
  if (response.status === 404 && requestedSlug && !requestedSlug.includes('.')) {
    try {
      const articlesResponse = await fetch(`${url.origin}/artikel.json`);
      if (!articlesResponse.ok) return response;

      const data = await articlesResponse.json();

      for (const category in data) {
        // Mencari slug yang cocok di indeks 1
        const match = data[category].find(post => {
          const cleanSlug = post[1].replace('.html', '').replace(/\//g, '');
          return cleanSlug === requestedSlug;
        });

        if (match) {
          // Normalisasi kategori agar sama dengan URL di frontend
          const catSlug = category.toLowerCase().trim().replace(/\s+/g, '-');
          const fileSlug = match[1].replace('.html', '').replace(/\//g, '');

          // Redirect 301 Permanent (SEO Friendly)
          return Response.redirect(`${url.origin}/${catSlug}/${fileSlug}`, 301);
        }
      }
    } catch (err) {
      console.error("Smart Redirect Error:", err);
    }
  }

  return response;
}