export async function onRequest(context: { request: Request; env: any }) {
    const { request, env } = context;
    const pageSlug = new URL(request.url).searchParams.get("url");
    
    // Key identitas untuk KV
    const pageKey = `view:${pageSlug}`;
    const globalKey = "view:__total_domain__";

    // Ambil data lama (asumsikan 0 jika belum ada)
    const [oldPage, oldTotal] = await Promise.all([
        env.COUNTS_KV.get(pageKey),
        env.COUNTS_KV.get(globalKey)
    ]);

    const v = (parseInt(oldPage) || 0) + 1;
    const t = (parseInt(oldTotal) || 0) + 1;

    // FIRE AND FORGET: Simpan ke KV di background tanpa await
    // Ini membuat respons JSON sampai ke browser pengunjung lebih cepat
    env.COUNTS_KV.put(pageKey, v.toString());
    env.COUNTS_KV.put(globalKey, t.toString());

    return new Response(JSON.stringify({ v, t }), {
        headers: { 
            "content-type": "application/json",
            "access-control-allow-origin": "*" 
        }
    });
}
