export async function onRequest(context: { request: Request; env: any; ctx: any }) {
    const { request, env, ctx } = context;
    const url = new URL(request.url);
    const pageSlug = url.searchParams.get("url");
    const userAgent = request.headers.get("user-agent") || "";

    // =================================================================
    // 🛡️ BENTENG PERTAHANAN ULTRABREAKABLE (REGEX ANTI-BOT)
    // =================================================================
    
    // 1. Jika parameter ?url= kosong, langsung reject
    if (!pageSlug) {
        return new Response(JSON.stringify({ error: "Missing URL parameter" }), { 
            status: 400, 
            headers: { "content-type": "application/json" } 
        });
    }

    // 2. DETEKSI SAMPAH: Sekali tebas menggunakan pola khas si bot
    const isTrash = 
        pageSlug.includes("__") ||                             // Menangkap semua double/triple underscore bot (__PKSM, ___dalam)
        pageSlug.includes(".php") ||                           // Menangkap fuzzer PHP (_a.php, _f.php)
        /^\/(b_dt2|c_dt2|d1|de1|enc\d|g1)\//i.test(pageSlug) || // Menangkap semua folder ghaib (/b_dt2, /c_dt2, /d1, /de1, /enc1, /enc3, /g1)
        pageSlug.includes("..") ||                             // Mencegah path traversal
        !pageSlug.startsWith("/");                             // URL valid wajib diawali dengan '/'

    if (isTrash) {
        return new Response(JSON.stringify({ message: "Nice try, Bot! Standardized defense active." }), { 
            status: 400,
            headers: { 
                "content-type": "application/json",
                "access-control-allow-origin": "*"
            }
        });
    }
    // =================================================================

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
