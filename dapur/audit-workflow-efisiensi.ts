import { readdir, exists } from "node:fs/promises";
import { join, extname } from "node:path";
import { BunFile } from "bun";

const WORKFLOW_DIR = "./.github/workflows";
const SCRIPT_DIR = "./dapur";

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

  if (!(await exists(WORKFLOW_DIR))) return console.error("❌ Folder workflow tidak ditemukan.");

  const workflowFiles = (await readdir(WORKFLOW_DIR)).filter(f => f.endsWith(".yml") || f.endsWith(".yaml"));
  
  console.log(`| Workflow File | Script .ts | Status Bun Install | Rekomendasi |`);
  console.log(`| :--- | :--- | :--- | :--- |`);

  for (const wf of workflowFiles) {
    const wfContent = await Bun.file(join(WORKFLOW_DIR, wf)).text();
    const hasInstall = wfContent.includes("bun install");
    
    // Cari pemanggilan script .ts (misal: bun run dapur/xxx.ts)
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
        const isExternal = imports.some(imp => !imp.startsWith("node:") && imp !== "bun" && !imp.startsWith("./") && !imp.startsWith("../"));

        if (!isExternal && hasInstall) {
          recommendation = "⚡ **Hapus bun install!** (Hanya pakai internal API)";
        } else if (isExternal && !hasInstall) {
          recommendation = "🚨 **Butuh bun install!** (Pakai library eksternal)";
        }
      } else {
        recommendation = "❓ Script tidak ditemukan di /dapur";
      }

      console.log(`| ${wf} | ${scriptName} | ${statusInstall} | ${recommendation} |`);
    }
  }
  console.log("\n💡 *Tips: Script tanpa dependensi eksternal (hanya node: atau bun) tidak membutuhkan step bun install di GitHub Actions.*");
}

audit();
