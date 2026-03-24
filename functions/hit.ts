export async function onRequest(context: { request: Request; env: any; ctx: any }) {
    const { request, env, ctx } = context;
    const pageSlug = new URL(request.url).searchParams.get("url");

    const pageKey = `view:${pageSlug}`;
    const globalKey = "view:__total_domain__";

    // 1. Ambil data lama (tetap pakai await karena kita butuh nilainya sekarang)
    const [oldPage, oldTotal] = await Promise.all([
        env.COUNTS_KV.get(pageKey),
                                                  env.COUNTS_KV.get(globalKey)
    ]);

    const v = (parseInt(oldPage) || 0) + 1;
    const t = (parseInt(oldTotal) || 0) + 1;

    // 2. Gunakan ctx.waitUntil agar proses simpan berjalan di background
    // Tanpa menahan kecepatan response ke pengunjung.
    if (ctx && ctx.waitUntil) {
        ctx.waitUntil(Promise.all([
            env.COUNTS_KV.put(pageKey, v.toString()),
                                  env.COUNTS_KV.put(globalKey, t.toString())
        ]));
    } else {
        // Fallback jika dijalankan di environment yang tidak mendukung ctx
        await Promise.all([
            env.COUNTS_KV.put(pageKey, v.toString()),
                          env.COUNTS_KV.put(globalKey, t.toString())
        ]);
    }

    // 3. Respon dikirim seketika!
    return new Response(JSON.stringify({ v, t }), {
        headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*"
        }
    });
}