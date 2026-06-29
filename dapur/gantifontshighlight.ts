#!/usr/bin/env bun
/**
 * gantifontshighlight.ts - Cheerio Edition (Strict pre-code + General Guard)
 * Usage: bun run gantifontshighlight.ts [--quiet] [--no-backup] [--dry-run]
 */

import fs from "fs/promises";
import { readdirSync } from "fs";
import path from "path";
import * as cheerio from "cheerio";

// -------------------- CLI OPTIONS --------------------
const args = process.argv.slice(2);
const quiet    = args.includes("--quiet");
const noBackup = args.includes("--no-backup");
const dryRun   = args.includes("--dry-run");

// -------------------- DATA STRUCTURES --------------------
type MapItem = { rx: RegExp; repl: string; isHljs?: boolean };

const MAP: MapItem[] = [
  // --- GENG HIGHLIGHT.JS & PRISM (isHljs: true) ---
  { rx: /https:\/\/.*\/github-dark-dimmed\.min\.css/i,              repl: "/ext/github-dark-dimmed.min.css", isHljs: true },
  { rx: /https:\/\/.*\/github-dark-dimmed\.css/i,                   repl: "/ext/github-dark-dimmed.css", isHljs: true },
  { rx: /https:\/\/.*\/github-dark\.min\.css/i,                     repl: "/ext/github-dark.min.css", isHljs: true },
  { rx: /https:\/\/.*\/github-dark\.css/i,                          repl: "/ext/github-dark.css", isHljs: true },
  { rx: /https:\/\/.*\/github\.min\.css/i,                          repl: "/ext/github.min.css", isHljs: true },
  { rx: /https:\/\/.*\/github\.css/i,                               repl: "/ext/github.css", isHljs: true },

  { rx: /https:\/\/.*\/atom-one-dark\.min\.css/i,                   repl: "/ext/atom-one-dark.min.css", isHljs: true },
  { rx: /https:\/\/.*\/atom-one-light\.min\.css/i,                  repl: "/ext/atom-one-light.min.css", isHljs: true },

  { rx: /https:\/\/.*\/prism-okaidia\.min\.css/i,                   repl: "/ext/prism-okaidia.min.css", isHljs: true },
  { rx: /https:\/\/.*\/prism-tomorrow\.min\.css/i,                  repl: "/ext/prism-tomorrow.min.css", isHljs: true },
  { rx: /https:\/\/.*\/prism-toolbar\.min\.css/i,                   repl: "/ext/prism-toolbar.min.css", isHljs: true },
  { rx: /https:\/\/.*\/prism\.min\.css/i,                           repl: "/ext/prism.min.css", isHljs: true },
  { rx: /https:\/\/.*\/(prism-vsc-dark-plus|vs-dark)\.min\.css/i,   repl: "/ext/vs-dark.min.css", isHljs: true },

  { rx: /https:\/\/.*\/vs\.min\.css/i,                              repl: "/ext/vs.min.css", isHljs: true },
  { rx: /https:\/\/.*\/monokai\.min\.css/i,                         repl: "/ext/monokai.min.css", isHljs: true },
  { rx: /https:\/\/.*\/(styles\/default|prism-coy)\.min\.css/i,     repl: "/ext/default.min.css", isHljs: true },
  { rx: /https?:\/\/.*\/highlight\.min\.js/i,                       repl: "/ext/highlight.js", isHljs: true },

  // --- LIBRARY LAIN (isHljs tidak diset / false) ---
  { rx: /https:\/\/.*\/leaflet\.css/i,                              repl: "/ext/leaflet.css" },

  { rx: /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/[\d.\-a-z]+\/css\/all(?:\.min)?\.css/i, repl: "/ext/fontawesome.css" },
  { rx: /https:\/\/use\.fontawesome\.com\/releases\/v[\d.\-a-z]+\/css\/all(?:\.min)?\.css/i, repl: "/ext/fontawesome.css" },
  { rx: /https:\/\/cdn\.jsdelivr\.net\/npm\/@fortawesome\/fontawesome-free@[\d.\-a-z]+\/css\/all(?:\.min)?\.css/i, repl: "/ext/fontawesome.css" },
  { rx: /https:\/\/unpkg\.com\/@fortawesome\/fontawesome-free@[\d.\-a-z]+\/css\/all(?:\.min)?\.css/i, repl: "/ext/fontawesome.css" },

  { rx: /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/html2canvas\/[\d.]+\/html2canvas\.min\.js/i,             repl: "/ext/html2canvas.min.js" },
  { rx: /https:\/\/html2canvas\.hertzen\.com\/dist\/html2canvas\.min\.js/i,                                     repl: "/ext/html2canvas.min.js" },
  { rx: /https:\/\/cdn\.jsdelivr\.net\/npm\/html2canvas@[\d.]+\/dist\/html2canvas\.min\.js/i,                   repl: "/ext/html2canvas.min.js" },
  { rx: /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/html2pdf\.js\/[\d.]+\/html2pdf\.bundle\.min\.js/i,       repl: "/ext/html2pdf.bundle.min.js" },
  { rx: /https?:\/\/.*\/qrcode\.min\.js/i,                          repl: "/ext/qrcode.min.js" },
];

const STALE_ATTRS = ["integrity", "crossorigin", "referrertarget", "referrerpolicy"];
const HLJS_SRC_REGEX = /highlight(?:\.min)?\.js/i;
const HLJS_TRIGGER_REGEX = /highlightAll/i; // Diperlonggar biar gampang kedetect

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

type ProcessResult = {
  file: string;
  replaced: number;
  cleaned: number;
  injected: number;
  libFixed: number;
  removedHljs: number; 
};

// -------------------- CORE PROCESSING --------------------
async function processFile(file: string): Promise<ProcessResult | null> {
  if (/index\.html$/i.test(file)) return null;

  const content = await fs.readFile(file, "utf8");
  let replaced = 0, cleaned = 0, injected = 0, libFixed = 0, removedHljs = 0;

  const $ = cheerio.load(content);

  // PENGECEKAN UTAMA
  const hasPreCode = $("pre code").length > 0;

  // ---- Step 1 & 2: URL Replacement atau Penghapusan Bloatware ----
  $("link[href], script[src]").each((_, el) => {
    const $el      = $(el);
    const attrName = $el.is("link") ? "href" : "src";
    const url      = $el.attr(attrName);
    if (!url) return;

    for (const m of MAP) {
      if (m.rx.test(url)) {
        if (m.isHljs && !hasPreCode) {
          $el.remove();
          removedHljs++;
          break; 
        }

        $el.attr(attrName, m.repl);
        replaced++;
        for (const a of STALE_ATTRS) {
          if ($el.attr(a) !== undefined) {
            $el.removeAttr(a);
            cleaned++;
          }
        }
        break; 
      }
    }
  });

  // CLEANUP EKSTRA: Kalau tidak ada <pre><code>, basmi juga inline script trigger-nya!
  if (!hasPreCode) {
    $("script:not([src])").each((_, el) => {
      const inlineScript = $(el).html() ?? "";
      if (HLJS_TRIGGER_REGEX.test(inlineScript)) {
        $(el).remove();
        removedHljs++;
      }
    });
  }

  // ---- Step 3: Validasi & Injeksi highlight.js DENGAN GENERAL GUARD ----
  if (hasPreCode) {
    // 1. Cek jejak keberadaan tag (Pendeteksi)
    const hljsScriptEls = $("script[src]").filter((_, el) => HLJS_SRC_REGEX.test($(el).attr("src") ?? ""));
    const hasHljsScript = hljsScriptEls.length > 0;

    const triggerScriptEls = $("script:not([src])").filter((_, el) => HLJS_TRIGGER_REGEX.test($(el).html() ?? ""));
    const hasTrigger = triggerScriptEls.length > 0;

    // 2. GENERAL GUARD (Pengecekan String Persis)
    // Pastikan persis string ini belum ada sebelum disuntik!
    const isLibraryAlreadyInjected = $('script[src="/ext/highlight.js"]').length > 0;
    
    let isTriggerAlreadyInjected = false;
    $("script:not([src])").each((_, el) => {
      if (($(el).html() ?? "").includes("hljs.highlightAll()")) {
        isTriggerAlreadyInjected = true;
      }
    });

    // 3. Eksekusi dengan Guard
    if (hasHljsScript && !hasTrigger && !isTriggerAlreadyInjected) {
      // Library ada, trigger belum -> suntik trigger
      hljsScriptEls.first().after("\n<script>hljs.highlightAll();</script>");
      injected = 1;
    } 
    else if (!hasHljsScript && hasTrigger && !isLibraryAlreadyInjected) {
      // Trigger ada, library kosong -> suntik library
      triggerScriptEls.first().before('<script defer src="/ext/highlight.js"></script>\n');
      libFixed = 1;
    } 
    else if (!hasHljsScript && !hasTrigger && !isLibraryAlreadyInjected && !isTriggerAlreadyInjected) {
      // Keduanya tidak ada sama sekali! Injeksi utuh di bagian paling bawah <body>
      $("body").append(
        `\n<script defer src="/ext/highlight.js"></script>\n<script>hljs.highlightAll();</script>\n`
      );
      injected = 1;
      libFixed = 1;
    }
  }

  // ---- Step 4: Simpan jika ada perubahan ----
  if (replaced > 0 || cleaned > 0 || injected > 0 || libFixed > 0 || removedHljs > 0) {
    const newContent = $.html({ _useHtmlParser2: true } as cheerio.CheerioOptions);

    if (!dryRun) {
      if (!noBackup) await fs.copyFile(file, `${file}.bak`);
      await fs.writeFile(file, newContent, "utf8");
    }
    return { file, replaced, cleaned, injected, libFixed, removedHljs };
  }

  return null;
}

// -------------------- EXECUTION & REPORTING --------------------
const files = expandGlobs(["*.html", "artikelx/*.html", "artikel/*.html"]);
if (files.length === 0) {
  if (!quiet) console.log("⚠️ Tidak ada file HTML ditemukan.");
  process.exit(0);
}

const results      = await Promise.all(files.map(processFile));
const validResults = results.filter((r): r is ProcessResult => r !== null);

const stats = validResults.reduce(
  (acc, curr) => ({
    files: acc.files + 1,
    rep:   acc.rep + curr.replaced,
    cln:   acc.cln + curr.cleaned,
    inj:   acc.inj + curr.injected,
    lib:   acc.lib + curr.libFixed,
    rmv:   acc.rmv + curr.removedHljs, 
  }),
  { files: 0, rep: 0, cln: 0, inj: 0, lib: 0, rmv: 0 }
);

if (!quiet) {
  console.log(`\n---------------------------------------------------------`);
  console.log(`🎯 Operasi "Layar Kosong Bersih" Selesai! (Strict Guard Edition)`);
  console.log(`---------------------------------------------------------`);
  console.log(`✅ File diperbarui                 : ${stats.files}`);
  console.log(`🔗 URL CDN diganti                 : ${stats.rep}`);
  console.log(`🧹 Atribut dibersihkan             : ${stats.cln}`);
  console.log(`🗑️ Hljs tak terpakai dibasmi       : ${stats.rmv}`);
  console.log(`🚀 Trigger baru disuntik           : ${stats.inj}`);
  console.log(`🛠️ Library highlight.js dipulihkan : ${stats.lib}`);
  console.log(`---------------------------------------------------------`);

  const statusMessage =
    stats.files > 0
      ? "Semua artikel sudah ramping, SEO ready, dan anti double inject!"
      : "Tidak ada perubahan, blog sudah sangat bersih!";

  console.log(`🏁 ${statusMessage}`);
  console.log(`---------------------------------------------------------`);
}
