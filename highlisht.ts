#!/usr/bin/env bun
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const targetDir = ".";
const reportFile = "LAPORAN_HIGHLIGHT_JS.md";

function scanFiles(dir: string, fileList: string[] = []): string[] {
  try {
    readdirSync(dir).forEach(file => {
      const filePath = join(dir, file);
      if (statSync(filePath).isDirectory()) {
        if (file !== "node_modules" && file !== ".git" && file !== "dist") {
          scanFiles(filePath, fileList);
        }
      } else if (file.endsWith(".html")) {
        fileList.push(filePath);
      }
    });
  } catch (e) {
    console.error(`❌ Gagal mengakses folder: ${dir}`);
  }
  return fileList;
}

const htmlFiles = scanFiles(targetDir);

const results = htmlFiles.map(file => {
  const content = readFileSync(file, "utf8");

  return {
    path: file,
    // Cek apakah file memang butuh highlight (punya <pre> atau <code>)
    needsHighlight: /<(pre|code)/i.test(content),
                              // Cek komponen yang terpasang
                              hasJs: /highlight\.js|hljs/i.test(content),
                              hasTrigger: /highlightAll|highlightElement/i.test(content),
                              hasCss: /<link.*href=.*(highlight|styles\/.*\.css).*>/i.test(content) || /@import.*highlight/i.test(content)
  };
});

// Kategorisasi Laporan
const perfect: string[] = []; // Butuh & Lengkap
const redundant: string[] = []; // Tidak butuh tapi ADA (Harus Dihapus)
const missingAll: string[] = []; // Butuh tapi TIDAK ADA sama sekali
const incomplete: string[] = []; // Butuh tapi komponen tidak lengkap (misal JS ada, CSS tidak)
const clean: string[] = []; // Tidak butuh & memang tidak ada (Aman)

results.forEach(res => {
  const hasAnything = res.hasJs || res.hasTrigger || res.hasCss;

  if (res.needsHighlight) {
    if (res.hasJs && res.hasTrigger && res.hasCss) {
      perfect.push(res.path);
    } else if (!hasAnything) {
      missingAll.push(res.path);
    } else {
      incomplete.push(res.path);
    }
  } else {
    if (hasAnything) {
      redundant.push(res.path);
    } else {
      clean.push(res.path);
    }
  }
});

// Generate Markdown
let mdContent = `# 🔍 Audit Efisiensi Highlight.js\n\n`;
mdContent += `> Laporan otomatis - ${new Date().toLocaleString('id-ID')}\n\n`;

mdContent += `### 🚮 HARUS DIHAPUS (Redundant)\n`;
mdContent += `> _File ini tidak memiliki tag \`<pre>\` atau \`<code>\`, tapi masih memuat library Highlight.js. Hapus untuk optimasi speed!_\n\n`;
mdContent += redundant.length ? redundant.map(f => `- [ ] \`${f}\``).join("\n") : "_Tidak ada file mubazir._";
mdContent += `\n\n`;

mdContent += `### 🛠️ PERLU DIPERBAIKI (Incomplete)\n`;
mdContent += `> _File butuh highlight tapi komponennya (JS/CSS/Trigger) ada yang kurang._\n\n`;
mdContent += incomplete.length ? incomplete.map(f => `- [ ] \`${f}\``).join("\n") : "_Tidak ada._";
mdContent += `\n\n`;

mdContent += `### 🆘 BELUM TERPASANG (Missing)\n`;
mdContent += `> _File memiliki kode program (\`<pre>\`) tapi belum dipasang Highlight.js sama sekali._\n\n`;
mdContent += missingAll.length ? missingAll.map(f => `- [ ] \`${f}\``).join("\n") : "_Tidak ada._";
mdContent += `\n\n`;

mdContent += `### ✅ SUDAH OPTIMAL\n`;
mdContent += `> _File yang sudah terpasang dengan benar sesuai kebutuhan._\n\n`;
mdContent += perfect.length ? perfect.map(f => `- \`${f}\``).join("\n") : "_Tidak ada._";
mdContent += `\n\n`;

await Bun.write(reportFile, mdContent);
console.log(`🚀 Audit Selesai! Cek file: ${reportFile}`);
