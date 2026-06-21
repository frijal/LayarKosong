#!/usr/bin/env bun
/**
 * gantifontshighlight.ts - Cheerio Edition (DOM-aware, lebih aman dari regex)
 * Usage: bun run gantifontshighlight.ts [--quiet] [--no-backup] [--dry-run]
 *
 * Catatan migrasi ke Cheerio:
 * - Sebelumnya semua manipulasi pakai regex string-matching di atas raw HTML text.
 *   Sekarang HTML di-parse jadi DOM beneran lewat Cheerio, jadi pencarian & penggantian
 *   elemen (link/script CDN, atribut basi, tag highlight.js) berbasis STRUKTUR DOM,
 *   bukan tebak-tebakan pola teks. Ini menghilangkan kelas bug seperti regex yang
 *   ke-trigger di tempat yang gak diniatkan -- misalnya kalau ada teks
 *   "href=...all.min.css" nongol di dalam komentar HTML atau di dalam contoh kode
 *   <pre><code>, regex lama bisa salah ganti karena dia gak ngerti konteks DOM,
 *   cuma cocokin string. Cheerio cuma akan nyentuh elemen <link>/<script> beneran.
 * - Bonus: pembersihan atribut (integrity/crossorigin/dst) sekarang SCOPED per elemen
 *   yang beneran kena ganti URL-nya -- bukan blanket cleanup ke seluruh dokumen kayak
 *   versi regex lama (yang bisa kebablasan bersihin atribut di tag lain yang gak
 *   ada hubungannya, asal ada >=1 replacement di file itu).
 * - Bonus lain: logika injeksi trigger/library highlight.js jadi lebih simpel & robust.
 *   Pakai `.after()` / `.before()` Cheerio, jadi gak perlu lagi 2 jalur regex
 *   (presisi /ext/highlight.js vs fallback </body>) -- sekarang cukup satu jalur,
 *   karena Cheerio selalu tau persis di mana elemen itu berada di DOM, apapun isi src-nya.
 * - Konsekuensi yang perlu diwaspadai: Cheerio nge-render ULANG seluruh dokumen pas
 *   di-serialize balik lewat $.html(), jadi gaya kutip atribut / closing tag void element
 *   bisa sedikit berubah formatnya walau gak ada perubahan semantik. <!DOCTYPE html>
 *   dipastikan tetap dipertahankan secara manual karena Cheerio kadang tidak
 *   menyertakannya otomatis saat serialize.
 *   SARAN: jalankan --dry-run dulu, lalu diff manual 1-2 file sampel sebelum nge-run
 *   massal ke semua artikel.
 *
 * Dependency: bun add cheerio
 */

import fs from "fs/promises";
import { readdirSync } from "fs";
import path from "path";
import * as cheerio from "cheerio";

// -------------------- CLI OPTIONS --------------------
const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const noBackup = args.includes("--no-backup");
const dryRun = args.includes("--dry-run");

// -------------------- DATA STRUCTURES --------------------
type MapItem = { rx: RegExp; repl: string };

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
  { rx: /https?:\/\/.*\/qrcode\.min\.js/i, repl: "/ext/qrcode.min.js" },
];

// Atribut yang jadi mubazir begitu URL-nya udah lokal -- gak perlu lagi integrity-check
// resource pihak ketiga kalau filenya udah self-hosted di server sendiri.
const STALE_ATTRS = ["integrity", "crossorigin", "referrertarget", "referrerpolicy"];

// -------------------- VALIDASI HIGHLIGHT.JS --------------------
// Cek tag <script src="..."> yang nge-load highlight.js / highlight.min.js -- baik yang
// masih CDN (kebetulan belum ke-cover MAP) maupun yang sudah lokal (/ext/highlight.js).
const HLJS_SCRIPT_SRC_REGEX = /highlight(?:\.min)?\.js/i;

// Cek pemanggilan trigger di dalam script inline. Toleran spasi (hljs . highlightAll ( ))
// dan toleran method chaining sebelum highlightAll, mis. hljs.configure({...}).highlightAll()
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

  // 1 & 2. Ganti URL CDN -> lokal, lalu bersihkan atribut basi HANYA pada elemen yang
  // beneran kena replace (bukan blanket cleanup ke seluruh dokumen kayak versi regex lama).
  $("link[href], script[src]").each((_, el) => {
    const $el = $(el);
    const attrName = $el.is("link") ? "href" : "src";
    const url = $el.attr(attrName);
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

  // 3. Validasi & Injeksi Trigger highlight.js -- sekarang berbasis DOM, bukan regex posisi teks.
  const hasCodeElements = $("pre, code").length > 0 || /```/.test(content);

  const hljsScriptEls = $("script[src]").filter((_, el) => HLJS_SCRIPT_SRC_REGEX.test($(el).attr("src") || ""));
  const hasHljsScript = hljsScriptEls.length > 0;

  const triggerScriptEls = $("script:not([src])").filter((_, el) => HLJS_TRIGGER_REGEX.test($(el).html() || ""));
  const hasTrigger = triggerScriptEls.length > 0;

  if (hasCodeElements) {
    if (hasHljsScript && !hasTrigger) {
      // Library ada, trigger belum -> taro trigger TEPAT SETELAH tag script library,
      // di mana pun posisi tag itu di dokumen.
      hljsScriptEls.first().after("<script>hljs.highlightAll();</script>");
      injected = 1;
    } else if (!hasHljsScript && hasTrigger) {
      // Trigger ada, library kosong -> taro tag library TEPAT SEBELUM script trigger.
      triggerScriptEls.first().before('<script defer src="/ext/highlight.js"></script>');
      libFixed = 1;
    }
    // else: sudah lengkap, atau dua-duanya kosong -> tidak ada aksi
  }

  // 4. Simpan jika ada perubahan
  if (replaced > 0 || cleaned > 0 || injected > 0 || libFixed > 0) {
    let newContent = $.html();

    // Cheerio kadang tidak menyertakan <!DOCTYPE> saat serialize ulang -> pastikan tetap ada.
    const doctypeMatch = content.match(/^<!DOCTYPE[^>]*>/i);
    if (doctypeMatch && !/^<!DOCTYPE/i.test(newContent)) {
      newContent = `${doctypeMatch[0]}\n${newContent}`;
    }

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

const results = await Promise.all(files.map(processFile));
const validResults = results.filter((r): r is ProcessResult => r !== null);

const stats = validResults.reduce((acc, curr) => ({
  files: acc.files + 1,
  rep: acc.rep + curr.replaced,
  cln: acc.cln + curr.cleaned,
  inj: acc.inj + curr.injected,
  lib: acc.lib + curr.libFixed,
}), { files: 0, rep: 0, cln: 0, inj: 0, lib: 0 });

if (!quiet) {
  console.log(`\n---------------------------------------------------------`);
  console.log(`🎯 Operasi "Layar Kosong Bersih" Selesai! (Cheerio Edition)`);
  console.log(`---------------------------------------------------------`);
  console.log(`✅ File diperbarui        : ${stats.files}`);
  console.log(`🔗 URL CDN diganti        : ${stats.rep}`);
  console.log(`🧹 Atribut dibersihkan    : ${stats.cln}`);
  console.log(`🚀 Trigger baru disuntik  : ${stats.inj}`);
  console.log(`🛠️  Library highlight.js dipulihkan : ${stats.lib}`);
  console.log(`---------------------------------------------------------`);

  const statusMessage = stats.files > 0
    ? "Semua artikel sudah ramping & SEO ready!"
    : "Tidak ada perubahan, blog sudah sangat bersih!";

  console.log(`🏁 ${statusMessage}`);
  console.log(`---------------------------------------------------------`);
}
