import { glob } from "glob";
import * as cheerio from "cheerio";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const REPORT_DIR = "mini";
const REPORT_FILE = path.join(REPORT_DIR, "title-report.md");
const BRAND_NAME = "Layar Kosong";

async function generateTitleReport() {
  console.log("🔍 Memulai pemindaian HTML (Title & Open Graph)...");

  try {
    await mkdir(REPORT_DIR, { recursive: true });

    const htmlFiles = await glob("**/*.html", {
      ignore: ["node_modules/**", "dist/**", ".git/**", "mini/**"]
    });

    if (htmlFiles.length === 0) {
      console.log("⚠️ Tidak ada file HTML.");
      return;
    }

    // Urutkan berdasarkan kedalaman folder
    const sortedFiles = htmlFiles.sort((a, b) => {
      const depthA = a.split(path.sep).length;
      const depthB = b.split(path.sep).length;
      return depthA !== depthB ? depthA - depthB : a.localeCompare(b);
    });

    let reportLines: string[] = [
      "# Website Metadata Audit Report",
      `Generated on: ${new Date().toLocaleString()}`,
      "",
      "Laporan ini memeriksa konsistensi Nama Brand pada `<title>` dan `<meta property=\"og:site_name\">`.",
      "",
      "| File Path | Page Title | OG Site Name | Brand Check |",
      "| :--- | :--- | :--- | :--- |"
    ];

    for (const filePath of sortedFiles) {
      const html = await readFile(filePath, "utf-8");
      const $ = cheerio.load(html);
      
      // 1. Ambil Title
      const title = $("title").first().text().trim() || "*(Missing)*";
      
      // 2. Ambil og:site_name
      const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim() || "*(Missing)*";
      
      // 3. Brand Check (Cek apakah Brand ada di Title ATAU di OG Site Name)
      const hasBrandInTitle = title.toLowerCase().includes(BRAND_NAME.toLowerCase());
      const hasBrandInOG = ogSiteName.toLowerCase() === BRAND_NAME.toLowerCase();
      
      let brandStatus = "❌ No Brand";
      if (hasBrandInTitle && hasBrandInOG) {
        brandStatus = "✅ Perfect";
      } else if (hasBrandInTitle || hasBrandInOG) {
        brandStatus = "⚠️ Partial";
      }

      // Kecualikan file teknis/verifikasi dari status brand
      const isCritical = !filePath.startsWith("google") && !filePath.includes("404.html");
      const finalBrandStatus = isCritical ? brandStatus : "-";

      reportLines.push(`| \`${filePath}\` | ${title} | ${ogSiteName} | ${finalBrandStatus} |`);
    }

    await writeFile(REPORT_FILE, reportLines.join("\n"));
    
    console.log(`\n✅ Audit Selesai!`);
    console.log(`Laporan: ${REPORT_FILE}`);

  } catch (error) {
    console.error("❌ Kesalahan:", error);
    process.exit(1);
  }
}

generateTitleReport();
