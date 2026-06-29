import { file, write } from "bun";
import { existsSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const CAT_MAP: Record<string, string> = {
  "Gaya Hidup": "gaya-hidup",
  "Jejak Sejarah": "jejak-sejarah",
  "Lainnya": "lainnya",
  "Olah Media": "olah-media",
  "Opini Sosial": "opini-sosial",
  "Sistem Terbuka": "sistem-terbuka",
  "Warta Tekno": "warta-tekno"
};

async function audit() {
  const data: Record<string, any[][]> = await file("artikel.json").json();
  const allArticles: any[] = [];
  const timeFrequency = new Map<string, number>();

  // 1. Koleksi data dari semua kategori
  for (const [catName, articles] of Object.entries(data)) {
    const folderName = CAT_MAP[catName];
    if (!folderName) continue;

    for (const art of articles) {
      const filename = String(art[1]);
      const htmlPath = path.join(folderName, filename);
      
      if (!existsSync(htmlPath)) continue;

      const html = await file(htmlPath).text();
      const $ = cheerio.load(html);

      const pubHTML = $('meta[property="article:published_time"]').attr("content") || "N/A";
      const modHTML = $('meta[property="article:modified_time"]').attr("content") || "N/A";
      
      // Hitung frekuensi waktu untuk deteksi duplikat
      if (modHTML !== "N/A") {
        timeFrequency.set(modHTML, (timeFrequency.get(modHTML) || 0) + 1);
      }

      allArticles.push({
        slug: filename.replace(".html", ""),
        pub: pubHTML,
        mod: modHTML
      });
    }
  }

  // 2. Sortir berdasarkan Tanggal Modif (Kolom 1)
  allArticles.sort((a, b) => a.mod.localeCompare(b.mod));

  // 3. Generate Markdown
  let mdContent = `# Laporan Audit Tanggal Artikel (Inverted View)\n\n`;
  mdContent += `| Modified Time | Slug | Status |\n`;
  mdContent += `| :--- | :--- | :--- |\n`;

  for (const art of allArticles) {
    const pubTime = new Date(art.pub).getTime();
    const modTime = new Date(art.mod).getTime();
    const count = timeFrequency.get(art.mod) || 0;

    let status = "✅ OK";
    let style = "";

    // Deteksi Anomali:
    // 1. Modifikasi lebih tua dari Publish
    // 2. Waktu modifikasi duplikat (terlalu banyak di detik yang sama)
    if ((Number.isFinite(pubTime) && Number.isFinite(modTime) && modTime < pubTime) || count > 1) {
      status = count > 1 ? "🔴 DUPLIKAT" : "❌ ANOMALI";
      style = 'style="color: red; font-weight: bold;"';
    }

    mdContent += `| <span ${style}>${art.mod}</span> | ${art.slug} | ${status} |\n`;
  }

  await write("laporan-audit.md", mdContent);
  console.log("✅ Laporan audit inverted telah dibuat: laporan-audit.md");
}

audit();
