import { readdir, exists, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { write } from "bun";

// ========== CONFIG ==========
const WORKFLOW_DIR = "./.github/workflows";
const SCRIPT_DIR = "./dapur";
const OUTPUT_FILE = "./mini/workflow-efisiensi.md";

async function getImports(filePath: string): Promise<string[]> {
  const content = await Bun.file(filePath).text();
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

async function audit() {
  console.log("🚀 MEMULAI AUDIT EFISIENSI WORKFLOW...\n");

  if (!(await exists(WORKFLOW_DIR))) {
    return console.error("❌ Folder workflow tidak ditemukan.");
  }

  const workflowFiles = (await readdir(WORKFLOW_DIR)).filter(
    (f) => f.endsWith(".yml") || f.endsWith(".yaml")
  );

  let report = "# ⚡ Laporan Efisiensi Workflow Layar Kosong\n\n";
  report += `> **Audit Terakhir:** ${new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "full",
    timeStyle: "long",
  })}\n\n`;
  report += `| Workflow File | Script .ts | Status Bun Install | Rekomendasi |\n`;
  report += `| :--- | :--- | :--- | :--- |\n`;

  for (const wf of workflowFiles) {
    const wfContent = await Bun.file(join(WORKFLOW_DIR, wf)).text();
    const hasInstall = wfContent.includes("bun install");

    // Cari pemanggilan script .ts (misal: bun run dapur/xxx.ts atau bun dapur/xxx.ts)
    const scriptRegex = /dapur\/([\w-]+\.ts)/g;
    let match;
    const detectedScripts = new Set<string>();

    while ((match = scriptRegex.exec(wfContent)) !== null) {
      detectedScripts.add(match[1]);
    }

    if (detectedScripts.size === 0) continue;

    for (const scriptName of detectedScripts) {
      const scriptPath = join(SCRIPT_DIR, scriptName);
      let recommendation = "✅ Sudah Optimal";
      let statusInstall = hasInstall ? "🟡 Ada" : "⚪ Tidak Ada";

      if (await exists(scriptPath)) {
        const imports = await getImports(scriptPath);
        const isExternal = imports.some(
          (imp) =>
            !imp.startsWith("node:") &&
            imp !== "bun" &&
            !imp.startsWith("./") &&
            !imp.startsWith("../")
        );

        if (!isExternal && hasInstall) {
          recommendation = "⚡ **Hapus bun install!** (Hanya pakai internal API)";
        } else if (isExternal && !hasInstall) {
          recommendation = "🚨 **Butuh bun install!** (Pakai library eksternal)";
        }
      } else {
        recommendation = "❓ Script tidak ditemukan di /dapur";
      }

      report += `| ${wf} | ${scriptName} | ${statusInstall} | ${recommendation} |\n`;
    }
  }

  report += "\n\n---\n💡 **Info:** Script yang hanya menggunakan API internal (`node:` atau `bun`) bisa berjalan tanpa `bun install`, yang dapat menghemat waktu workflow sekitar 10-20 detik.";

  // Pastikan folder output ada
  const outDir = dirname(OUTPUT_FILE);
  if (!(await exists(outDir))) {
    await mkdir(outDir, { recursive: true });
  }

  // Tulis ke file
  await write(OUTPUT_FILE, report);
  
  console.log(report); // Tetap tampilkan di console untuk preview
  console.log(`\n✅ Laporan berhasil disimpan di: ${OUTPUT_FILE}`);
}

audit();
