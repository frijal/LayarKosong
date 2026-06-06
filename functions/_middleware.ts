export const onRequest = async (context) => {
  const request = context.request;
  const accept = request.headers.get("Accept") || "";
  const url = new URL(request.url);

  // 🛑 PENGECUALIAN: Jangan bajak request kalau bot memang sedang mencari file asli (.md, .txt, .json)
  if (url.pathname.endsWith('.md') || url.pathname.endsWith('.txt') || url.pathname.endsWith('.json')) {
    return context.next();
  }

  // Deteksi jika yang datang adalah bot AI spesifik yang meminta Markdown (di halaman HTML)
  if (accept.includes("text/markdown")) {
    // Alih-alih merender HTML, lempar bot tersebut ke file arsip raksasa llms.md kita
    const markdownResponse = await context.env.ASSETS.fetch(new Request(`${url.origin}/llms.md`));
    
    // Pastikan Content-Type yang dikembalikan sesuai standar AI
    return new Response(markdownResponse.body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "x-markdown-tokens": "true",
        "Cache-Control": "public, max-age=3600"
      }
    });
  }

  // Kalau pengunjung manusia (atau tidak minta markdown), biarkan melintas normal
  return context.next();
};
