export default {
  // =================================================================
  // 🚪 PERTAHANAN 1: MELAYANI MANUSIA DI BROWSER (FAST READ-ONLY)
  // =================================================================
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const pageSlug = url.searchParams.get("url");

    // 1. Validasi parameter wajib ada
    if (!pageSlug) {
      return new Response(JSON.stringify({ error: "Missing URL parameter" }), { 
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    // 2. Langsung ambil data matang dari KV
    const pageKey = `view:${pageSlug}`;
    const rawData = await env.COUNTS_KV.get(pageKey);
    
    let stats = { v: 0, t: 0 };
    if (rawData) {
      try {
        stats = JSON.parse(rawData);
      } catch {
        // Antisipasi jika data lama masih berformat string angka biasa
        stats = { v: parseInt(rawData) || 0, t: 1 };
      }
    }

    // 3. Kembalikan respon secepat kilat tanpa proses write database
    return new Response(JSON.stringify(stats), {
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      }
    });
  },

  // =================================================================
  // ⏰ PERTAHANAN 2: CRON JOB SINKRONISASI (GRAPHQL TO KV)
  // =================================================================
  async scheduled(event: any, env: any, ctx: any): Promise<void> {
    ctx.waitUntil(runCronSync(env));
  }
};

// --- FUNGSI UTAMA SINKRONISASI AWANG-AWANG ---
async function runCronSync(env: any): Promise<void> {
  const graphqlEndpoint = "https://api.cloudflare.com/client/v4/graphql";
  
  // Ambil data trafik sejak 30 hari terakhir (Maksimal retensi plan Free di tahun 2026)
  const dateStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Query GraphQL untuk mengelompokkan data berdasarkan Path URL artikel
  const query = `
    query GetBlogStats($zoneTag: String!, $dateStart: String!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            limit: 1000
            filter: { datetime_geq: $dateStart, clientRequestHTTPStatus: 200 }
            orderBy: [count_DESC]
          ) {
            dimensions {
              clientRequestPath
            }
            uniq {
              uniques
            }
            count
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.CF_API_TOKEN}`
      },
      body: JSON.stringify({
        query: query,
        variables: {
          zoneTag: env.CF_ZONE_ID,
          dateStart: dateStart
        }
      })
    });

    const result: any = await response.json();
    const groups = result?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups;

    if (!groups || !Array.isArray(groups)) {
      console.error("Gagal mengambil data trafik dari GraphQL API.");
      return;
    }

    // Lakukan perulangan hasil data dari Cloudflare Analytics
    for (const group of groups) {
      const path = group.dimensions.clientRequestPath;
      const totalPageviews = group.count;
      const uniqueVisitors = group.uniq.uniques;

      // Filter Tambahan: Pastikan path bersih dari sisa-sisa bot nakal
      const isTrash = 
        path.includes("__") || 
        path.includes(".php") || 
        /^\/(b_dt2|c_dt2|d1|de1|enc\d|g1)\//i.test(path);

      if (isTrash) continue; // Skip jika terdeteksi sampah

      // Format data matang menjadi JSON
      const pageKey = `view:${path}`;
      const matangJSON = JSON.stringify({
        v: totalPageviews,
        t: uniqueVisitors
      });

      // Simpan data matang ke KV untuk dibaca manusia di frontend
      await env.COUNTS_KV.put(pageKey, matangJSON);
    }
    
    console.log(`Cron sukses! Berhasil menyinkronkan ${groups.length} data halaman.`);
  } catch (error) {
    console.error("Terjadi kesalahan pada sistem Cron:", error);
  }
}
