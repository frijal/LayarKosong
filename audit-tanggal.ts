import { file, write } from "bun";
import { existsSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

// Mapping nama kategori di JSON ke nama folder fisik
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
  let mdContent = `# Laporan Audit Tanggal Artikel (Master vs HTML)\n\n`;
  mdContent += `| Slug | Publish (Source) | Modified (HTML) | Status |\n`;
  mdContent += `| :--- | :--- | :--- | :--- |\n`;

  for (const [catName, articles] of Object.entries(data)) {
    const folderName = CAT_MAP[catName];
    
    if (!folderName) {
      console.warn(`⚠️ Kategori tidak terdaftar di map: ${catName}`);
      continue;
    }

    for (const art of articles) {
      const filename = String(art[1]);
      const htmlPath = path.join(folderName, filename);
      
      if (!existsSync(htmlPath)) {
        console.warn(`⚠️ File tidak ditemukan: ${htmlPath}`);
        continue;
      }

      const html = await file(htmlPath).text();
      const $ = cheerio.load(html);

      const pubHTML = $('meta[property="article:published_time"]').attr("content") || "N/A";
      const modHTML = $('meta[property="article:modified_time"]').attr("content") || "N/A";
      const slug = filename.replace(".html", "");

      // Status Merah jika: 
      // 1. Modifikasi lebih tua dari Publish (Anomali logika)
      // 2. Modifikasi sama persis dengan Publish (Biasanya berarti belum pernah diedit atau stempel rusak)
      const pubTime = new Date(pubHTML).getTime();
      const modTime = new Date(modHTML).getTime();
      
      let status = "✅ OK";
      let style = "";

      if (pubHTML === modHTML || (Number.isFinite(pubTime) && Number.isFinite(modTime) && modTime < pubTime)) {
        status = "❌ ANOMALI";
        style = 'style="color: red; font-weight: bold;"';
      }

      mdContent += `| ${slug} | ${pubHTML} | <span ${style}>${modHTML}</span> | ${status} |\n`;
    }
  }

  await write("laporan-audit.md", mdContent);
  console.log("✅ Audit selesai. Cek laporan-audit.md untuk melihat hasilnya.");
}

audit();
