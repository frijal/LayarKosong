#!/usr/bin/env bun
/**
 * gantifontshighlight.ts - High-Performance Version
 * Usage: bun run gantifontshighlight.ts [--quiet] [--no-backup] [--dry-run]
 */

import fs from "fs/promises";
import { existsSync, readdirSync, statSync } from "fs";
import path from "path";

// -------------------- CLI OPTIONS --------------------
const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const noBackup = args.includes("--no-backup");
const dryRun = args.includes("--dry-run");

// -------------------- OPTIMIZED DATA STRUCTURES --------------------
type MapItem = { repl: string; combined: RegExp };

const MAP: MapItem[] = [
  { rx: /https:\/\/.*\/github-dark-dimmed\.min\.css/i, repl: "/ext/github-dark-dimmed.min.css" },
  { rx: /https:\/\/.*\/github-dark-dimmed\.css/i, repl: "/ext/github-dark-dimmed.css" },
  { rx: /https:\/\/.*\/github-dark\.min\.css/i, repl: "/ext/github-dark.min.css" },
  { rx: /https:\/\/.*\/github-dark\.css/i, repl: "/ext/github-dark.css" },
  { rx: /https:\/\/.*\/github\.min\.css/i, repl: "/ext/github.min.css" },
  { rx: /https:\/\/.*\/github\.css/i, repl: "/ext/github.css" },
  { rx: /https:\/\/.*\/atom-one-dark\.min\.css/i, repl: "/ext/atom-one-dark.min.css" },
  { rx: /https:\/\/.*\/atom-one-light\.min\.css/i, repl: "/ext/atom-one-light.min.css" },
  { rx: /https:\/\/.*\/prism-okaidia\.min\.css/i, repl: "/ext/prism-okaidia.min.css" },
  { rx: /https:\/\/.*\/prism-tomorrow\.min\.css/i, repl: "/ext/prism-tomorrow.min.css" },
  { rx: /https:\/\/.*\/prism-toolbar\.min\.css/i, repl: "/ext/prism-toolbar.min.css" },
  { rx: /https:\/\/.*\/prism\.min\.css/i, repl: "/ext/prism.min.css" },
  { rx: /https:\/\/.*\/(prism-vsc-dark-plus|vs-dark)\.min\.css/i, repl: "/ext/vs-dark.min.css" },
  { rx: /https:\/\/.*\/vs\.min\.css/i, repl: "/ext/vs.min.css" },
  { rx: /https:\/\/.*\/monokai\.min\.css/i, repl: "/ext/monokai.min.css" },
  { rx: /https:\/\/.*\/(styles\/default|prism-coy)\.min\.css/i, repl: "/ext/default.min.css" },
  { rx: /https:\/\/.*\/leaflet\.css/i, repl: "/ext/leaflet.css" },
  { rx: /https:\/\/.*\/all(\.min)?\.css/i, repl: "/ext/fontawesome.css" },
  { rx: /https:\/\/use\.fontawesome\.com\/releases\/v[\d\.\-a-z]+\/css\/all\.css/i, repl: "/ext/fontawesome.css" },
  { rx: /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/html2canvas\/[\d\.]+\/html2canvas\.min\.js/i, repl: "/ext/html2canvas.min.js" },
  { rx: /https:\/\/html2canvas\.hertzen\.com\/dist\/html2canvas\.min\.js/i, repl: "/ext/html2canvas.min.js" },
  { rx: /https:\/\/cdn\.jsdelivr\.net\/npm\/html2canvas@[\d\.]+\/dist\/html2canvas\.min\.js/i, repl: "/ext/html2canvas.min.js" },
  { rx: /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/html2pdf\.js\/[\d\.]+\/html2pdf\.bundle\.min\.js/i, repl: "/ext/html2pdf.bundle.min.js" },
  { rx: /https?:\/\/.*\/highlight\.min\.js/i, repl: "/ext/highlight.js" },
].map(item => ({
  repl: item.repl,
  combined: new RegExp(`(\\b(?:href|src)\\b)(\\s*=\\s*)(['"])\\s*(${item.rx.source})\\s*\\3`, "gim")
}));

const ATTR_REGEX = /\s+(?:integrity|crossorigin|referrertarget|referrerpolicy)\s*=\s*(['"])[^'"]*?\1|\s+(?:crossorigin|referrerpolicy)/gim;

// -------------------- UTILS --------------------
function expandGlobs(patterns: string[]): string[] {
  const results = new Set<string>();
  for (const pat of patterns) {
    const [dir, filePat] = pat.includes("/") ? pat.split("/", 2) : [".", pat];
    const escaped = filePat.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\*/g, ".*");
    const re = new RegExp(`^${escaped}$`, "i");
    try {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isFile() && re.test(e.name)) results.add(path.join(dir, e.name));
      }
    } catch {}
  }
  return Array.from(results);
}

// -------------------- CORE PROCESSING --------------------
async function processFile(file: string) {
  if (/index\.html$/i.test(file)) return null;

  let content = await fs.readFile(file, "utf8");
  let replaced = 0, cleaned = 0;

  for (const m of MAP) {
    content = content.replace(m.combined, (_m, p1, p2, p3) => { replaced++; return `${p1}${p2}${p3}${m.repl}${p3}`; });
  }

  if (replaced > 0) {
    content = content.replace(ATTR_REGEX, () => { cleaned++; return ""; });
  }

  if (replaced > 0 || cleaned > 0) {
    if (!dryRun) {
      if (!noBackup) await fs.copyFile(file, `${file}.bak`);
      await fs.writeFile(file, content, "utf8");
    }
    return { file, replaced, cleaned };
  }
  return null;
}

// -------------------- EXECUTION --------------------
const files = expandGlobs(["*.html", "artikelx/*.html", "artikel/*.html"]);
if (files.length === 0) {
  if (!quiet) console.log("⚠️ Tidak ada file HTML ditemukan.");
  process.exit(0);
}

const results = await Promise.all(files.map(processFile));
const stats = results.filter(Boolean).reduce((acc, curr) => ({
  files: acc.files + 1,
  rep: acc.rep + (curr?.replaced || 0),
  cln: acc.cln + (curr?.cleaned || 0)
}), { files: 0, rep: 0, cln: 0 });

if (!quiet) {
  console.log(`\n🎯 Selesai! ${stats.files} file diperbarui. Total URL: ${stats.rep}, Atribut dibersihkan: ${stats.cln}.`);
}
