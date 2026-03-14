import { write, file, readdir } from "bun";
import { join, dirname } from "node:path";

// ========== CONFIG ==========
const WORKFLOW_DIR = "./.github/workflows";
const SCRIPT_DIR = "./dapur";
const OUTPUT_FILE = "./mini/workflow-efisiensi.md";

/**
 * Mengambil daftar import eksternal menggunakan Bun
 */
async function getExternalPackages(filePath: string): Promise<string[]> {
  const content = await file(filePath).text();
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  const externalPkgs: string[] = [];

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const pkg = match[1];
    // Filter paket internal
    if (!pkg.startsWith("node:") && pkg !== "bun" && !pkg.startsWith("./") && !pkg.startsWith("../")) {
      externalPkgs.push(pkg);
    }
  }
  return externalPkgs;
}

async function audit() {
  console.log("🚀 MEMULAI AUDIT EFISIENSI WORKFLOW (Bun-Native)...\n");

  // Bun.readdir mengembalikan array string langsung, lebih simpel
  const workflowFiles = (await readdir(WORKFLOW_DIR)).filter(
    (f) => f.endsWith(".yml") || f.endsWith(".yaml")
  );

  const auditResults: { wf: string; script: string; status: string; pkgs: string; rec: string }[] = [];

  for (const wf of workflowFiles) {
    const wfContent = await file(join(WORKFLOW_DIR, wf)).text();
    const hasInstall = wfContent.includes("bun install");

    const scriptRegex = /dapur\/([\w-]+\.ts)/g;
    let match;
    const detectedScripts = new Set<string>();

    while ((match = scriptRegex.exec(wfContent)) !== null) {
      detectedScripts.add(match[1]);
    }

    for (const scriptName of detectedScripts) {
      const scriptPath = join(SCRIPT_DIR, scriptName);
      const scriptFile = file(scriptPath);

      let recommendation = "✅ Sudah Optimal";
      let statusInstall = hasInstall ? "🟡 Ada" : "⚪ Tidak Ada";
      let externalList = "-";

      // Cek eksistensi file dengan Bun.file
      if (await scriptFile.exists()) {
        const externalPkgs = await getExternalPackages(scriptPath);

        if (externalPkgs.length > 0) {
          externalList = externalPkgs.map(p => `\`${p}\``).join(", ");
          if (!hasInstall) recommendation = "🚨 **Butuh bun install!**";
        } else if (hasInstall) {
          recommendation = "⚡ **Hapus bun install!**";
        }
      } else {
        recommendation = "❓ Script tidak ditemukan";
      }

      auditResults.push({ wf, script: scriptName, status: statusInstall, pkgs: externalList, rec: recommendation });
    }
  }

  // Sorting
  auditResults.sort((a, b) => a.wf.localeCompare(b.wf));

  // Build Markdown
  let report = "# ⚡ Laporan Efisiensi Workflow Layar Kosong\n\n";
  report += `> **Audit Terakhir:** ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Makassar", dateStyle: "full", timeStyle: "long" })}\n\n`;
  report += `| Workflow File | Script .ts | Status Install | Paket Eksternal | Rekomendasi |\n| :--- | :--- | :--- | :--- | :--- |\n`;

  auditResults.forEach(res => {
    report += `| ${res.wf} | ${res.script} | ${res.status} | ${res.pkgs} | ${res.rec} |\n`;
  });

  report += "\n\n---\n💡 **Info:** Jika kolom **Paket Eksternal** kosong, script hanya menggunakan API internal dan tidak butuh `bun install`.";

  // Penulisan File dengan Bun.write (otomatis membuat file jika belum ada)
  await write(OUTPUT_FILE, report);

  console.log(`✅ Laporan detail berhasil disimpan di: ${OUTPUT_FILE}`);
}

audit();
