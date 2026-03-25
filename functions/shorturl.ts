export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const shortId = url.pathname.replace(/^\/|\/$/g, '');

    // 1. Skip jika root, atau jika request adalah file aset (punya ekstensi)
    if (!shortId || shortId.includes('.')) {
      return fetch(request);
    }

    try {
      // 2. Ambil mapping dari server
      const response = await fetch("https://dalam.web.id/shorturl.json", {
        cf: { 
          cacheTtl: 600, // Naikkan cache ke 10 menit untuk performa lebih baik
          cacheEverything: true 
        }
      });

      if (!response.ok) return fetch(request);

      const shortMap: Record<string, string> = await response.json();

      // 3. Eksekusi Pengalihan
      const targetUrl = shortMap[shortId];
      if (targetUrl) {
        return Response.redirect(targetUrl, 301);
      }
    } catch (error) {
      console.error("Worker Error:", error);
    }

    // 4. Fallback ke routing asli Cloudflare Pages
    return fetch(request);
  }
};
