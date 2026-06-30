import { glob } from "glob";
import * as cheerio from "cheerio";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const REPORT_DIR = "mini";
const REPORT_FILE = path.join(REPORT_DIR, "title-report.md");
const BRAND_NAME = "Layar Kosong";

async function generateTitleReport() {
  console.log("🔍 Memulai pemindaian HTML (Audit Metadata)...");

  try {
    await mkdir(REPORT_DIR, { recursive: true });

    const htmlFiles = await glob("**/*.html", {
      ignore: ["node_modules/**", "dist/**", "ext/**", "dapur/**", ".git/**", "sementara/**", "mini/**"]
    });

    if (htmlFiles.length === 0) {
      console.log("⚠️ Tidak ada file HTML.");
      return;
    }

    const sortedFiles = htmlFiles.sort((a, b) => {
      const depthA = a.split(path.sep).length;
      const depthB = b.split(path.sep).length;
      return depthA !== depthB ? depthA - depthB : a.localeCompare(b);
    });

    let reportLines: string[] = [
      "# Website Metadata Audit Report",
      `Generated on: ${new Date().toLocaleString()}`,
      "",
      "| File Path | Page Title (SEO) | OG Title (Social) | OG Site Name | Status |",
      "| :--- | :--- | :--- | :--- | :--- |"
    ];

    for (const filePath of sortedFiles) {
      const html = await readFile(filePath, "utf-8");

      // Menggunakan konfigurasi agar lebih tangguh terhadap HTML minified
      const $ = cheerio.load(html, {
        xmlMode: false,
        decodeEntities: true
      });

      const title = $("title").first().text().trim() || "*(Missing)*";
      const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || "*(Missing)*";
      const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim() || "*(Missing)*";

      // 1. Cek SEO Title: Harus mengandung Brand
      const hasBrandInTitle = title.toLowerCase().includes(BRAND_NAME.toLowerCase());

      // 2. Cek OG Title: Harus ada (bukan Missing) DAN tidak mengandung brand
      const hasOGTitle = ogTitle !== "*(Missing)*";
      const hasNoBrandInOGTitle = hasOGTitle && !ogTitle.toLowerCase().includes(BRAND_NAME.toLowerCase());

      // 3. Cek OG Site Name: Harus persis sama dengan BRAND_NAME
      const hasBrandInOGSite = ogSiteName.toLowerCase() === BRAND_NAME.toLowerCase();

      // Logika Status
      let status = "❌ Check Failed";

      // Perfect: Semua kondisi terpenuhi
      if (hasBrandInTitle && hasNoBrandInOGTitle && hasBrandInOGSite) {
        status = "✅ Perfect";
      }
      // Partial: Jika ada elemen yang benar tapi belum lengkap/sempurna
      else if (hasBrandInTitle || hasBrandInOGSite || hasOGTitle) {
        status = "⚠️ Partial";
      }

      // Kecualikan file teknis dari kewajiban brand
      const isCritical = !filePath.startsWith("google") && !filePath.includes("404.html");
      const finalStatus = isCritical ? status : "-";

      reportLines.push(`| \`${filePath}\` | ${title} | ${ogTitle} | ${ogSiteName} | ${finalStatus} |`);
    }

    await writeFile(REPORT_FILE, reportLines.join("\n"));

    console.log(`\n✅ Audit Selesai!`);
    console.log(`Laporan terbaru: ${REPORT_FILE}`);

  } catch (error) {
    console.error("❌ Kesalahan:", error);
    process.exit(1);
  }
}

generateTitleReport();