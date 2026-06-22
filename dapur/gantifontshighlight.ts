#!/usr/bin/env bun
/**
 * gantifontshighlight.ts - Cheerio Edition
 * Usage: bun run gantifontshighlight.ts [--quiet] [--no-backup] [--dry-run]
 *
 * Dependency: bun add cheerio
 *
 * Catatan serialisasi:
 * - Load pakai parse5 (default Cheerio) — presisi parse struktur HTML5, tidak
 *   mengubah encoding teks di dalam <pre><code>.
 * - Serialize pakai dom-serializer (hp2) via $.html({ _useHtmlParser2: true }) —
 *   menghasilkan atribut boolean bersih (defer, tidak defer=""), tanpa perlu
 *   regex post-processing. Efek formatting lain yang diterapkan Cheerio (seperti
 *   penghapusan self-closing slash XHTML /> pada void elements, dan penggabungan
 *   <!DOCTYPE>/<html>/<head> ke satu baris) dibiarkan terjadi secara natural —
 *   ini adalah normalisasi ke format HTML5 standar yang valid.
 *
 * Keunggulan vs versi regex lama:
 * - Pencocokan URL CDN hanya menyentuh elemen <link>/<script> sungguhan di DOM,
 *   tidak bisa salah match di dalam komentar HTML atau konten <pre><code>.
 * - Pembersihan atribut basi (crossorigin, referrerpolicy, dll) di-scope per
 *   elemen yang beneran kena replace URL — bukan blanket cleanup ke seluruh file.
 * - Deteksi & injeksi highlight.js berbasis query DOM, bukan regex atas raw text.
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
type MapItem = { rx: RegExp; repl: string };

const MAP: MapItem[] = [
  { rx: /https:\/\/.*\/github-dark-dimmed\.min\.css/i,              repl: "/ext/github-dark-dimmed.min.css" },
{ rx: /https:\/\/.*\/github-dark-dimmed\.css/i,                   repl: "/ext/github-dark-dimmed.css" },
{ rx: /https:\/\/.*\/github-dark\.min\.css/i,                     repl: "/ext/github-dark.min.css" },
{ rx: /https:\/\/.*\/github-dark\.css/i,                          repl: "/ext/github-dark.css" },
{ rx: /https:\/\/.*\/github\.min\.css/i,                          repl: "/ext/github.min.css" },
{ rx: /https:\/\/.*\/github\.css/i,                               repl: "/ext/github.css" },

{ rx: /https:\/\/.*\/atom-one-dark\.min\.css/i,                   repl: "/ext/atom-one-dark.min.css" },
{ rx: /https:\/\/.*\/atom-one-light\.min\.css/i,                  repl: "/ext/atom-one-light.min.css" },

{ rx: /https:\/\/.*\/prism-okaidia\.min\.css/i,                   repl: "/ext/prism-okaidia.min.css" },
{ rx: /https:\/\/.*\/prism-tomorrow\.min\.css/i,                  repl: "/ext/prism-tomorrow.min.css" },
{ rx: /https:\/\/.*\/prism-toolbar\.min\.css/i,                   repl: "/ext/prism-toolbar.min.css" },
{ rx: /https:\/\/.*\/prism\.min\.css/i,                           repl: "/ext/prism.min.css" },
{ rx: /https:\/\/.*\/(prism-vsc-dark-plus|vs-dark)\.min\.css/i,   repl: "/ext/vs-dark.min.css" },

{ rx: /https:\/\/.*\/vs\.min\.css/i,                              repl: "/ext/vs.min.css" },
{ rx: /https:\/\/.*\/monokai\.min\.css/i,                         repl: "/ext/monokai.min.css" },
{ rx: /https:\/\/.*\/(styles\/default|prism-coy)\.min\.css/i,     repl: "/ext/default.min.css" },

{ rx: /https:\/\/.*\/leaflet\.css/i,                              repl: "/ext/leaflet.css" },

// Font Awesome - dibuat spesifik agar tidak salah menangkap file all.css lain
{
  rx: /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/[\d.\-a-z]+\/css\/all(?:\.min)?\.css/i,
  repl: "/ext/fontawesome.css"
},
{
  rx: /https:\/\/use\.fontawesome\.com\/releases\/v[\d.\-a-z]+\/css\/all(?:\.min)?\.css/i,
  repl: "/ext/fontawesome.css"
},
{
  rx: /https:\/\/cdn\.jsdelivr\.net\/npm\/@fortawesome\/fontawesome-free@[\d.\-a-z]+\/css\/all(?:\.min)?\.css/i,
  repl: "/ext/fontawesome.css"
},
{
  rx: /https:\/\/unpkg\.com\/@fortawesome\/fontawesome-free@[\d.\-a-z]+\/css\/all(?:\.min)?\.css/i,
  repl: "/ext/fontawesome.css"
},

{ rx: /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/html2canvas\/[\d.]+\/html2canvas\.min\.js/i,              repl: "/ext/html2canvas.min.js" },
{ rx: /https:\/\/html2canvas\.hertzen\.com\/dist\/html2canvas\.min\.js/i,                                     repl: "/ext/html2canvas.min.js" },
{ rx: /https:\/\/cdn\.jsdelivr\.net\/npm\/html2canvas@[\d.]+\/dist\/html2canvas\.min\.js/i,                    repl: "/ext/html2canvas.min.js" },

{ rx: /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/html2pdf\.js\/[\d.]+\/html2pdf\.bundle\.min\.js/i,        repl: "/ext/html2pdf.bundle.min.js" },

{ rx: /https?:\/\/.*\/highlight\.min\.js/i,                       repl: "/ext/highlight.js" },
{ rx: /https?:\/\/.*\/qrcode\.min\.js/i,                          repl: "/ext/qrcode.min.js" },
];

// Atribut yang mubazir setelah resource dipindah ke lokal (tidak butuh SRI check lagi)
const STALE_ATTRS = ["integrity", "crossorigin", "referrertarget", "referrerpolicy"];

// Cek <script src="..."> yang nge-load highlight.js (CDN maupun lokal /ext/highlight.js)
const HLJS_SRC_REGEX = /highlight(?:\.min)?\.js/i;

// Cek pemanggilan trigger di script inline. Toleran spasi & method chaining,
// mis. hljs.configure({...}).highlightAll()
const HLJS_TRIGGER_REGEX = /hljs\s*(?:\.\s*[\w]+\s*\([^)]*\)\s*)*\.\s*highlightAll\s*\(\s*\)/i;

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
};

// -------------------- CORE PROCESSING --------------------
async function processFile(file: string): Promise<ProcessResult | null> {
  if (/index\.html$/i.test(file)) return null;

  const content = await fs.readFile(file, "utf8");
  let replaced = 0, cleaned = 0, injected = 0, libFixed = 0;

  const $ = cheerio.load(content);

  // ---- Step 1 & 2: Ganti URL CDN -> lokal, bersihkan atribut basi per elemen ----
  // Scoped: atribut hanya dibuang dari elemen yang beneran kena replace URL-nya,
  // bukan blanket cleanup ke seluruh dokumen seperti versi regex lama.
  $("link[href], script[src]").each((_, el) => {
    const $el      = $(el);
    const attrName = $el.is("link") ? "href" : "src";
    const url      = $el.attr(attrName);
    if (!url) return;

    for (const m of MAP) {
      if (m.rx.test(url)) {
        $el.attr(attrName, m.repl);
        replaced++;
        for (const a of STALE_ATTRS) {
          if ($el.attr(a) !== undefined) {
            $el.removeAttr(a);
            cleaned++;
          }
        }
        break; // satu elemen cukup cocok satu pola
      }
    }
  });

  // ---- Step 3: Validasi & injeksi highlight.js ----
  const hasCodeElements = $("pre, code").length > 0 || /```/.test(content);

  const hljsScriptEls = $("script[src]").filter(
    (_, el) => HLJS_SRC_REGEX.test($(el).attr("src") ?? "")
  );
  const hasHljsScript = hljsScriptEls.length > 0;

  const triggerScriptEls = $("script:not([src])").filter(
    (_, el) => HLJS_TRIGGER_REGEX.test($(el).html() ?? "")
  );
  const hasTrigger = triggerScriptEls.length > 0;

  if (hasCodeElements) {
    if (hasHljsScript && !hasTrigger) {
      // Library ada, trigger belum -> suntik trigger tepat setelah tag script library
      hljsScriptEls.first().after("\n<script>hljs.highlightAll();</script>");
      injected = 1;
    } else if (!hasHljsScript && hasTrigger) {
      // Trigger ada, library kosong -> suntik library tepat sebelum tag script trigger
      triggerScriptEls.first().before('<script defer src="/ext/highlight.js"></script>\n');
      libFixed = 1;
    }
    // else: keduanya sudah ada -> tidak ada aksi
    // else: keduanya kosong -> tidak ada aksi (mungkin kode plaintext, tidak perlu highlight)
  }

  // ---- Step 4: Simpan jika ada perubahan ----
  if (replaced > 0 || cleaned > 0 || injected > 0 || libFixed > 0) {
    // Serialize dengan dom-serializer: atribut boolean bersih (defer, bukan defer=""),
    // isi <pre><code> tidak di-encode ulang.
    const newContent = $.html({ _useHtmlParser2: true } as cheerio.CheerioOptions);

    if (!dryRun) {
      if (!noBackup) await fs.copyFile(file, `${file}.bak`);
      await fs.writeFile(file, newContent, "utf8");
    }
    return { file, replaced, cleaned, injected, libFixed };
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
  }),
  { files: 0, rep: 0, cln: 0, inj: 0, lib: 0 }
);

if (!quiet) {
  console.log(`\n---------------------------------------------------------`);
  console.log(`🎯 Operasi "Layar Kosong Bersih" Selesai! (Cheerio Edition)`);
  console.log(`---------------------------------------------------------`);
  console.log(`✅ File diperbarui                 : ${stats.files}`);
  console.log(`🔗 URL CDN diganti                 : ${stats.rep}`);
  console.log(`🧹 Atribut dibersihkan             : ${stats.cln}`);
  console.log(`🚀 Trigger baru disuntik           : ${stats.inj}`);
  console.log(`🛠️ Library highlight.js dipulihkan : ${stats.lib}`);
  console.log(`---------------------------------------------------------`);

  const statusMessage =
    stats.files > 0
      ? "Semua artikel sudah ramping & SEO ready!"
      : "Tidak ada perubahan, blog sudah sangat bersih!";

  console.log(`🏁 ${statusMessage}`);
  console.log(`---------------------------------------------------------`);
}
