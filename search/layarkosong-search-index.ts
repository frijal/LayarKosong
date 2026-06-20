interface Env {
  DB: D1Database;
  LAYARKOSONG_INDEX: any;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    console.log("🗄️ Mengambil data dari D1...");
    
    const { results } = await context.env.DB.prepare(
      "SELECT id, title, category, content FROM articles_fts ORDER BY date DESC"
    ).all();

    if (!results || results.length === 0) {
      return new Response(JSON.stringify({ error: "Tabel kosong, Jal!" }), { status: 404 });
    }

    const ROWS_PER_PART = 150; 

    for (let i = 0; i < results.length; i += ROWS_PER_PART) {
      const chunk = results.slice(i, i + ROWS_PER_PART);
      
      let markdownContent = `# LLM Index Part ${Math.floor(i / ROWS_PER_PART) + 1}\n\n`;
      for (const row of chunk) {
        const fileName = String(row.id).replace(".html", "");
        const url = `https://dalam.web.id/${row.category}/${fileName}`;
        const summary = String(row.content).substring(0, 150).trim() + "...";
        markdownContent += `- [${row.title}](${url}) : ${summary}\n`;
      }

      const encoder = new TextEncoder();
      const buffer = encoder.encode(markdownContent).buffer;
      const fileName = `llms_d1_part_${Math.floor(i / ROWS_PER_PART) + 1}.md`;

      await context.env.LAYARKOSONG_INDEX.items.upload(fileName, buffer);
      console.log(`✅ Sukses mengindeks ${fileName} (${chunk.length} artikel)`);
    }

    return new Response(JSON.stringify({ success: true, message: "Sinkronisasi D1 ke AI Search sukses!" }));
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
