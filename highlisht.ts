#!/usr/bin/env bun
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const targetDir = "."; // Sesuaikan dengan folder proyekmu
const reportFile = "LAPORAN_HIGHLIGHT_JS.md";

function scanFiles(dir: string, fileList: string[] = []): string[] {
  readdirSync(dir).forEach(file => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory()) {
      if (file !== "node_modules" && file !== ".git") scanFiles(filePath, fileList);
    } else if (file.endsWith(".html")) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const htmlFiles = scanFiles(targetDir);
const both: string[] = [];
const onlyHljs: string[] = [];
const onlyTrigger: string[] = [];

htmlFiles.forEach(file => {
  const content = readFileSync(file, "utf8");
  const hasHljs = /highlight\.js/i.test(content);
  const hasTrigger = /highlightAll/i.test(content);

  if (hasHljs && hasTrigger) both.push(file);
  else if (hasHljs) onlyHljs.push(file);
  else if (hasTrigger) onlyTrigger.push(file);
});

// Generate Markdown
let mdContent = `# Audit Status Highlight.js\n\n`;
mdContent += `### ✅ Memiliki Keduanya (Library + Trigger)\n${both.map(f => `- \`${f}\``).join("\n") || "Tidak ada"}\n\n`;
mdContent += `### ⚠️ Hanya Library (Tanpa Trigger)\n${onlyHljs.map(f => `- \`${f}\``).join("\n") || "Tidak ada"}\n\n`;
mdContent += `### ⚠️ Hanya Trigger (Tanpa Library)\n${onlyTrigger.map(f => `- \`${f}\``).join("\n") || "Tidak ada"}\n`;

Bun.write(reportFile, mdContent);
console.log(`🚀 Laporan berhasil dibuat: ${reportFile}`);
