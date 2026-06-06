export const onRequest = async (context) => {
  const request = context.request;
  const accept = request.headers.get("Accept") || "";

  // Deteksi jika yang datang adalah bot AI spesifik yang meminta Markdown
  if (accept.includes("text/markdown")) {
    const url = new URL(request.url);
    
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

  // Kalau pengunjung manusia, biarkan melintas normal ke halaman HTML
  return context.next();
};
