export default {
  // =================================================================
  // 🚪 FUNGSI BACA: Melayani Pengunjung (Bisa artikel / total domain)
  // =================================================================
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    let pageSlug = url.searchParams.get("url");

    if (!pageSlug) {
      return new Response(JSON.stringify({ error: "Missing URL parameter" }), { 
        status: 400, headers: { "content-type": "application/json" }
      });
    }

    // Tarik data dari D1
    const stmt = env.DB.prepare("SELECT views as v, visitors as t FROM page_stats WHERE path = ?").bind(pageSlug);
    const result = await stmt.first();

    const stats = result || { v: 0, t: 0 };

    return new Response(JSON.stringify(stats), {
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      }
    });
  },

  // =================================================================
  // ⏰ FUNGSI TULIS: Cron Job Inkremental 1 Jam Sekali
  // =================================================================
  async scheduled(event: any, env: any, ctx: any): Promise<void> {
    ctx.waitUntil(runCronSync(env));
  }
};

// --- FUNGSI UTAMA SINKRONISASI INCREMENTAL (D1 COUNTER DB) ---
async function runCronSync(env: any): Promise<void> {
  const graphqlEndpoint = "https://api.cloudflare.com/client/v4/graphql";
  
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dateStart = oneHourAgo.toISOString();
  const dateEnd = now.toISOString();

  // 🎯 QUERY DOUBLE STRIKE: Mengambil data artikel DAN total domain secara absolut
  const query = `
    query GetBlogStats($zoneTag: String!, $dateStart: String!, $dateEnd: String!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          # 1. Ambil data pecahan per halaman/artikel
          perArtikel: httpRequestsAdaptiveGroups(
            limit: 1000
            filter: { datetime_geq: $dateStart, datetime_leq: $dateEnd, clientRequestHTTPStatus: 200 }
            orderBy: [count_DESC]
          ) {
            dimensions { clientRequestPath }
            uniq { uniques }
            count
          }
          # 2. Ambil total global domain tanpa dipecah berdasarkan path
          totalDomain: httpRequestsAdaptiveGroups(
            limit: 1
            filter: { datetime_geq: $dateStart, datetime_leq: $dateEnd, clientRequestHTTPStatus: 200 }
          ) {
            uniq { uniques }
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
        variables: { zoneTag: env.CF_ZONE_ID, dateStart, dateEnd }
      })
    });

    const result: any = await response.json();
    const zoneData = result?.data?.viewer?.zones?.[0];
    
    const articleGroups = zoneData?.perArtikel;
    const domainGroups = zoneData?.totalDomain;

    const sqlStatements = [];

    // ─── PROSES DATA PER ARTIKEL ───
    if (articleGroups && Array.isArray(articleGroups)) {
      for (const group of articleGroups) {
        const path = group.dimensions.clientRequestPath;
        const newPageviews = group.count;
        const newUniqueVisitors = group.uniq.uniques;

        // Filter bot nakal
        const isTrash = 
          path.includes("__") || 
          path.includes(".php") || 
          /^\/(b_dt2|c_dt2|d1|de1|enc\d|g1)\//i.test(path);

        if (isTrash) continue; 

        sqlStatements.push(
          env.DB.prepare(`
            INSERT INTO page_stats (path, views, visitors) VALUES (?, ?, ?) 
            ON CONFLICT(path) DO UPDATE SET views = views + excluded.views, visitors = visitors + excluded.visitors
          `).bind(path, newPageviews, newUniqueVisitors)
        );
      }
    }

    // ─── PROSES DATA GLOBAL TOTAL DOMAIN ───
    if (domainGroups && domainGroups.length > 0) {
      const globalViews = domainGroups[0].count;
      const globalVisitors = domainGroups[0].uniq.uniques;

      // Masukkan ke baris khusus bernama 'TOTAL_DOMAIN'
      sqlStatements.push(
        env.DB.prepare(`
          INSERT INTO page_stats (path, views, visitors) VALUES ('TOTAL_DOMAIN', ?, ?) 
          ON CONFLICT(path) DO UPDATE SET views = views + excluded.views, visitors = visitors + excluded.visitors
        `).bind(globalViews, globalVisitors)
      );
    }
    
    // Eksekusi masal ke D1
    if (sqlStatements.length > 0) {
      await env.DB.batch(sqlStatements);
      console.log(`⚡ Cron sukses! Menambahkan data inkremental untuk artikel dan total domain.`);
    }

  } catch (error) {
    console.error("❌ Eror pada sistem Cron Incremental:", error);
  }
}
