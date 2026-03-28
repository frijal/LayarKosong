export async function onRequest(context: { request: Request; env: any; ctx: any }) {
    const { request, env, ctx } = context;
    const url = new URL(request.url);
    const pageSlug = url.searchParams.get("url");
    const userAgent = request.headers.get("user-agent") || "";

    const pageKey = `view:${pageSlug}`;
    const globalKey = "view:__total_domain__";

    // 1. FILTER BOT: Menghemat kuota dari crawler yang tidak perlu dihitung
    const isBot = /bot|spider|crawl|lighthouse|facebook|twitter|whatsapp|telegram|discord/i.test(userAgent);

    // Ambil data dari KV
    const [oldPage, oldTotal] = await Promise.all([
        env.COUNTS_KV.get(pageKey),
        env.COUNTS_KV.get(globalKey)
    ]);

    let v = parseInt(oldPage) || 0;
    let t = parseInt(oldTotal) || 0;

    // 2. SAMPLING STRATEGY: Update KV setiap ~10 kunjungan manusia
    const samplingRate = 10; 
    const shouldUpdate = !isBot && (Math.random() < (1 / samplingRate));

    if (shouldUpdate) {
        // Tambahkan 10 sekaligus ke database agar angka tetap sinkron secara statistik
        v += samplingRate;
        t += samplingRate;

        if (ctx && ctx.waitUntil) {
            ctx.waitUntil(Promise.all([
                env.COUNTS_KV.put(pageKey, v.toString()),
                env.COUNTS_KV.put(globalKey, t.toString())
            ]));
        } else {
            await Promise.all([
                env.COUNTS_KV.put(pageKey, v.toString()),
                env.COUNTS_KV.put(globalKey, t.toString())
            ]);
        }
    } else {
        // Jika bukan bot tapi tidak kena jadwal update KV, 
        // kita tampilkan angka +1 secara visual saja ke user
        if (!isBot) {
            v += 1;
            t += 1;
        }
    }

    // 3. Respon JSON instan
    return new Response(JSON.stringify({ v, t }), {
        headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*"
        }
    });
}
