import { file, write } from "bun";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

// Konfigurasi
const C = {
  root: process.cwd(),
  art: path.join(process.cwd(), "artikel")
};

interface ArticleData {
  title: string;
  file: string;
  img: string;
  lastmod: string; // Master Date dari artikel.json
  desc: string;
  category: string;
  loc: string;
  finalModTime: string;
}

async function audit() {
  const data: Record<string, any[][]> = await file("artikel.json").json();
  let mdContent = `# Laporan Audit Tanggal Artikel (Master vs HTML)\n\n`;
  mdContent += `| Slug | Publish (Source) | Modified (HTML) | Status |\n`;
  mdContent += `| :--- | :--- | :--- | :--- |\n`;

  for (const [category, articles] of Object.entries(data)) {
    for (const art of articles) {
      const [title, filename] = art;
      const htmlPath = path.join(category, String(filename).replace(/^\//, ""));
      
      if (!existsSync(htmlPath)) continue;

      const html = await file(htmlPath).text();
      const $ = cheerio.load(html);

      // Ambil dari HTML
      const pubHTML = $('meta[property="article:published_time"]').attr("content") || "N/A";
      const modHTML = $('meta[property="article:modified_time"]').attr("content") || "N/A";
      const slug = filename.replace(".html", "");

      // Logika Warna
      // Merah jika: Tanggal publish == modif, ATAU modif lebih tua dari publish
      let status = "✅ OK";
      let style = "";

      const pubTime = new Date(pubHTML).getTime();
      const modTime = new Date(modHTML).getTime();

      if (pubHTML === modHTML || (modTime < pubTime)) {
        status = "❌ ANOMALI";
        style = 'style="color: red; font-weight: bold;"';
      }

      mdContent += `| ${slug} | ${pubHTML} | <span ${style}>${modHTML}</span> | ${status} |\n`;
    }
  }

  await write("laporan-audit.md", mdContent);
  console.log("✅ Audit selesai. Cek laporan-audit.md");
}

audit();
