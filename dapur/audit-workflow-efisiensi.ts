import { readdir, exists, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { write } from "bun";

// ========== CONFIG ==========
const WORKFLOW_DIR = "./.github/workflows";
const SCRIPT_DIR = "./dapur";
const OUTPUT_FILE = "./mini/workflow-efisiensi.md";

/**
 * Mengambil daftar import eksternal (bukan node:, bun, atau lokal)
 */
async function getExternalPackages(filePath: string): Promise<string[]> {
  const content = await Bun.file(filePath).text();
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  const externalPkgs: string[] = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const pkg = match[1];
    const isInternal = pkg.startsWith("node:") || pkg === "bun" || pkg.startsWith("./") || pkg.startsWith("../");
    
    if (!isInternal) {
      externalPkgs.push(pkg);
    }
  }
  return externalPkgs;
}

async function audit() {
  console.log("🚀 MEMULAI AUDIT EFISIENSI & DEPENDENSI WORKFLOW (Sorted)...\n");

  if (!(await exists(WORKFLOW_DIR))) {
    return console.error("❌ Folder workflow tidak ditemukan.");
  }

  const workflowFiles = (await readdir(WORKFLOW_DIR)).filter(
    (f) => f.endsWith(".yml") || f.endsWith(".yaml")
  );

  // Struktur data untuk sorting
  const auditResults: { wf: string; script: string; status: string; pkgs: string; rec: string }[] = [];

  for (const wf of workflowFiles) {
    const wfContent = await Bun.file(join(WORKFLOW_DIR, wf)).text();
    const hasInstall = wfContent.includes("bun install");

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
      let externalList = "-";

      if (await exists(scriptPath)) {
        const externalPkgs = await getExternalPackages(scriptPath);
        const isExternal = externalPkgs.length > 0;
        
        if (isExternal) {
          externalList = externalPkgs.map(p => `\`${p}\``).join(", ");
        }

        if (!isExternal && hasInstall) {
          recommendation = "⚡ **Hapus bun install!**";
        } else if (isExternal && !hasInstall) {
          recommendation = "🚨 **Butuh bun install!**";
        }
      } else {
        recommendation = "❓ Script tidak ditemukan";
      }

      auditResults.push({
        wf,
        script: scriptName,
        status: statusInstall,
        pkgs: externalList,
        rec: recommendation
      });
    }
  }

  // === PROSES SORTING BERDASARKAN NAMA WORKFLOW ===
  auditResults.sort((a, b) => a.wf.localeCompare(b.wf));

  // Build Markdown Report
  let report = "# ⚡ Laporan Efisiensi Workflow Layar Kosong\n\n";
  report += `> **Audit Terakhir:** ${new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "full",
    timeStyle: "long",
  })}\n\n`;
  report += `| Workflow File | Script .ts | Status Install | Paket Eksternal | Rekomendasi |\n`;
  report += `| :--- | :--- | :--- | :--- | :--- |\n`;

  for (const res of auditResults) {
    report += `| ${res.wf} | ${res.script} | ${res.status} | ${res.pkgs} | ${res.rec} |\n`;
  }

  report += "\n\n---\n💡 **Info:** Jika kolom **Paket Eksternal** kosong (`-`), script hanya menggunakan API internal (`node:` atau `bun`) dan tidak membutuhkan step `bun install`.";

  const outDir = dirname(OUTPUT_FILE);
  if (!(await exists(outDir))) {
    await mkdir(outDir, { recursive: true });
  }

  await write(OUTPUT_FILE, report);
  
  console.log(report);
  console.log(`\n✅ Laporan detail (Sorted) berhasil disimpan di: ${OUTPUT_FILE}`);
}

audit();
