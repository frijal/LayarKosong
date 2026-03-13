import { glob } from "glob";
import * as cheerio from "cheerio";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const REPORT_DIR = "mini";
const REPORT_FILE = path.join(REPORT_DIR, "title-report.md");

async function generateTitleReport() {
  console.log("🔍 Memulai pemindaian file HTML menggunakan Cheerio...");

  try {
   // Menggunakan glob v13+ (mendukung syntax async iterable)
    const htmlFiles = await glob("**/*.html", {
      ignore: ["node_modules/**", "dist/**", ".git/**", "mini/**"]
    });

    if (htmlFiles.length === 0) {
      console.log("⚠️ Tidak ada file HTML yang ditemukan.");
      return;
    }

    let reportLines: string[] = [
      "# Website Title Audit Report",
      `Generated on: ${new Date().toLocaleString()}`,
      "",
      "| File Path | Page Title | Status |",
      "| :--- | :--- | :--- |"
    ];

    for (const filePath of htmlFiles) {
      const html = await readFile(filePath, "utf-8");
      const $ = cheerio.load(html);
      
      const title = $("title").text().trim();
      const status = title ? "✅ OK" : "❌ MISSING";
      const displayTitle = title || "NO TITLE FOUND";

      reportLines.push(`| \`${filePath}\` | ${displayTitle} | ${status} |`);
    }

    await writeFile(REPORT_FILE, reportLines.join("\n"));
    
    console.log(`\n✅ Audit Selesai!`);
    console.log(`Total file: ${htmlFiles.length}`);
    console.log(`Laporan: ${REPORT_FILE}`);

  } catch (error) {
    console.error("❌ Terjadi kesalahan:", error);
    process.exit(1);
  }
}

generateTitleReport();
