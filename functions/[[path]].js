export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // Ambil slug terakhir, contoh: /kategori/judul-post/ -> judul-post
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const requestedSlug = pathSegments[pathSegments.length - 1];

  // 1. Coba panggil request asli dulu
  const response = await next();

  // 2. Jika 404 dan bukan file aset (seperti .jpg, .css, .js)
  if (response.status === 404 && requestedSlug && !requestedSlug.includes('.')) {
    try {
      // Ambil data artikel.json dari root domain kamu
      const jsonUrl = `${url.origin}/artikel.json`;
      const articlesResponse = await fetch(jsonUrl);
      
      if (!articlesResponse.ok) return response;

      const data = await articlesResponse.json();

      // 3. Cari slug di dalam JSON
      for (const category in data) {
        const match = data[category].find(post => {
          // Normalisasi slug dari JSON (hapus .html dan slash)
          const cleanSlug = post[1].replace('.html', '').replace(/\//g, '');
          return cleanSlug === requestedSlug;
        });

        if (match) {
          // Build URL baru
          const catSlug = category.toLowerCase().replace(/\s+/g, '-');
          const fileSlug = match[1].replace('.html', '').replace(/\//g, '');
          const targetUrl = `${url.origin}/${catSlug}/${fileSlug}/`;
          
          // 4. Redirect 301 (Permanent) untuk SEO
          return Response.redirect(targetUrl, 301);
        }
      }
    } catch (err) {
      console.error("Smart Redirect Error:", err);
    }
  }

  return response;
}
