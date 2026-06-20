interface Env {
  LAYARKOSONG_INDEX: any; // Binding AI Search dari wrangler.toml
  INDEXNOW_KEY: string;   // Secret Key yang dipasang di Cloudflare
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const clientToken = url.searchParams.get("token");

  // 🛡️ Satpam Penjaga Gerbang
  if (!clientToken || clientToken !== context.env.INDEXNOW_KEY) {
    return new Response(JSON.stringify({ error: "Mau ngapain, bos? Akses ditolak!" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const targetUrl = "https://dalam.web.id/llms.md";
    
    // 1. Sedot file llms.md 6,3MB yang udah live di web lu
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error("Gagal menarik file llms.md dari server.");
    
    const textData = await response.text();
    const lines = textData.split("\n");

    // 2. Belah tepat di tengah biar ukuran per part di bawah 4MB
    const midPoint = Math.floor(lines.length / 2);
    const part1Text = lines.slice(0, midPoint).join("\n");
    const part2Text = lines.slice(midPoint).join("\n");

    // 3. Konversi teks markdown menjadi ArrayBuffer sesuai titah dokumen Cloudflare
    const encoder = new TextEncoder();
    const buffer1 = encoder.encode(part1Text).buffer;
    const buffer2 = encoder.encode(part2Text).buffer;

    // 4. Suntik langsung ke database vektor via Workers Binding
    await context.env.LAYARKOSONG_INDEX.items.upload("llms_part_1.md", buffer1);
    await context.env.LAYARKOSONG_INDEX.items.upload("llms_part_2.md", buffer2);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Mantap Jal! Database Vektor sukses dilatih ulang secara otomatis." 
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
