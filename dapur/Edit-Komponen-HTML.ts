// -------------------------------------------------------
// FILE: proses-artikel.ts
// Arsitektur Baru: Menggunakan Cheerio + Bun Native API
// -------------------------------------------------------
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";

// FIX #11 — Jumlah file yang diproses secara paralel
const CONCURRENCY = 5;

const artikelDir = join(process.cwd(), "artikelx");
if (!existsSync(artikelDir)) {
  console.error(`❌ Folder tidak ditemukan: ${artikelDir}`);
  process.exit(1);
}

const files = readdirSync(artikelDir).filter((f) => f.endsWith(".html"));
if (files.length === 0) {
  console.warn("⚠️ Tidak ada file .html di folder artikelx/");
  process.exit(0);
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

// FIX #9 — Diperlukan untuk build single regex dari array pattern string
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// FIX #2 — Escape HTML entity sebelum text node masuk ke replaceWith()
// Tanpa ini, karakter < > & di teks bisa diinterpretasi sebagai HTML tag
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// FIX #8 — Validasi URL scheme sebelum diinjek ke href attribute
function isSafeUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) return true;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:" || protocol === "mailto:";
  } catch {
    return false;
  }
}

// -------------------------------------------------------
// PRE-PROCESSOR TEKS GLOBAL
// -------------------------------------------------------

const brandingPatterns = [
  " - Layar Kosong", " | Layar Kosong", " - layar kosong", " | layar kosong",
  " - LAYAR KOSONG", " | LAYAR KOSONG", " – Layar Kosong", " — Layar Kosong",
  " - dalam web id", " | dalam web id", " - Dalam web id", " | Dalam web id",
  " - Dalam Web Id", " | Dalam Web Id", " - DALAM WEB ID", " | DALAM WEB ID",
  " - dalam.web.id", " | dalam.web.id", " - Dalam.web.id", " | Dalam.web.id",
  " - Dalam.Web.Id", " | Dalam.Web.Id", " - DALAM.WEB.ID", " | DALAM.WEB.ID",
  " – dalam.web.id", " — dalam.web.id", "-Layar Kosong", "|Layar Kosong",
  "-dalam.web.id",   "|dalam.web.id",
];

// FIX #9 — Satu regex pass gantikan 30+ loop replaceAll terpisah
const brandingRegex = new RegExp(brandingPatterns.map(escapeRegex).join("|"), "g");

function preProcessRawText(html: string): string {
  let out = html;

  // FIX #9 — Single pass
  out = out.replace(brandingRegex, "");

  out = out
    .replaceAll("Dalam Web Artikel", "Jaga Data Pribadi Tetap Aman")
    .replaceAll("Dalam Web Id",      "Jaga Data Pribadi Tetap Aman")
    .replaceAll("Dalam.Web.Id",      "Jaga Data Pribadi Tetap Aman")
    .replaceAll("Redaksi Dalam Web", "Jaga Data Pribadi Tetap Aman")
    .replaceAll("Dalam.web.id",      "Jaga Data Pribadi Tetap Aman")
    .replaceAll("DALAM.WEB.ID",      "Jaga Data Pribadi Tetap Aman")
    .replaceAll("Dalam.Web.ID",      "Jaga Data Pribadi Tetap Aman")
    .replace(/\b dalam\.web\.id /g,  " Jaga Data Pribadi Tetap Aman ")
    .replace(/\b Dalam\.web\.id /g,  " Jaga Data Pribadi Tetap Aman ")
    .replaceAll("twitter.com",        "x.com")
    .replaceAll("&copy;",             "🄯")
    .replaceAll("©",                  "🄯")
    .replaceAll("All Rights Reserved",  "Copyleft, All Rights Reversed")
    .replaceAll("Font Awesome 5 Free",  "Font Awesome 7 Free")
    .replaceAll("Font Awesome 6 Free",  "Font Awesome 7 Free")
    .replaceAll("Ditulis oleh",         "Artikel dari");

  return out;
}

// -------------------------------------------------------
// PARSER STRAY MARKDOWN INLINE
// -------------------------------------------------------

function parseMarkdownInline(text: string): string {
  // Escape dulu sebelum regex markdown berjalan.
  // Karakter seperti < > & di konten asli tidak akan bocor jadi tag HTML.
  let out = escapeHtml(text);

  // --- Bold ---
  // Tambah underscore variant (__text__) selain asterisk (**text**)
  out = out.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
  out = out.replace(/(?<!\w)__(.*?)__(?!\w)/g, "<b>$1</b>");
  // Catatan guard __bold__:
  // (?<!\w) — blok jika diawali huruf/angka/underscore (misal: some__word__ tidak match)
  // (?!\w)  — blok jika diakhiri huruf/angka/underscore

  // --- Italic ---
  // FIX UTAMA — Ganti (?<!\S)/(?!\S) → (?<![*\w])/(?![*\w])
  //
  // Root cause: (?!\S) artinya "karakter sesudah *tutup harus whitespace atau EOL".
  // Tapi tanda baca (koma, titik, tanda seru, kurung tutup, dll.) adalah \S,
  // sehingga *domain*, *maintainer*, dan *kontributor*. semuanya GAGAL dikonversi.
  //
  // Fix: (?![*\w]) hanya memblok jika karakter sesudahnya adalah huruf/angka atau
  // asterisk. Tanda baca apapun dibiarkan lolos — sesuai perilaku CommonMark.
  //
  // Sebelum: /(?<!\S)\*(?!\s|\*)(.*?)(?<!\s|\*)\*(?!\S)/g  ← gagal di *domain*,
  // Sesudah: /(?<![*\w])\*(?!\s|\*)(.*?)(?<!\s|\*)\*(?![*\w])/g  ← lolos semua
  out = out.replace(/(?<![*\w])\*(?!\s|\*)(.*?)(?<!\s|\*)\*(?![*\w])/g, "<em>$1</em>");

  // Tambah underscore variant (_text_) dengan guard yang sama
  // Guard (?<![_\w]) mencegah false positive di nama file/variabel: file_name tidak match
  // karena `_` sebelum `name` didahului `e` yang termasuk \w
  out = out.replace(/(?<![_\w])_(?!\s|_)(.*?)(?<!\s|_)_(?![_\w])/g, "<em>$1</em>");

  // --- Strikethrough & Inline Code ---
  out = out.replace(/~~(.*?)~~/g, "<del>$1</del>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");

  // --- Markdown Link ---
  // FIX #8 — URL hanya diinjek jika scheme-nya aman (https/http/mailto/relative)
  out = out.replace(/\[([^\]]+)\]\((.*?)\)/g, (_, linkText, href) => {
    if (!isSafeUrl(href)) return `[${linkText}](${href})`;
    return `<a href="${href}">${linkText}</a>`;
  });

  return out;
}

// -------------------------------------------------------
// CORE PIPELINE PROCESSOR (CHEERIO POWERED)
// -------------------------------------------------------

function prosesHtmlDenganCheerio(rawHtml: string): string {
  const cleanedTextHtml = preProcessRawText(rawHtml);
  const $ = cheerio.load(cleanedTextHtml);

  // === 1. MANIPULASI ATRIBUT & ELEMEN SPESIFIK ===

  // FIX #1 — Hapus [.] dari string pencarian.
  $('link[rel*="icon"]').each((_, el) => {
    let href = $(el).attr("href");
    if (href) {
      href = href
        .replace(
          "https://dalam.web.id/assets/apple-touch-icon.png",
          "https://dalam.web.id/ext/icons/apple-touch-icon.png"
        )
        .replace(
          "https://dalam.web.id/apple-touch-icon.png",
          "https://dalam.web.id/ext/icons/apple-touch-icon.png"
        );
      $(el).attr("href", href);
    }
  });

  // FIX #4 — Hilangkan "Jaga Data Pribadi Tetap Aman" dari kondisi delete.
  $("a").each((_, el) => {
    const text = $(el).text().trim();
    if (text === "Dalam Web") {
      $(el).remove();
    } else if (text === "dalam.web.id") {
      $(el).text("Jaga Data Pribadi Tetap Aman");
    }
  });

  // FIX #3 — Anchored ke awal string via startsWith + break setelah match pertama.
  $('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').each((_, el) => {
    let content = $(el).attr("content");
    if (content) {
      const fluff = [
        "Analisis kritis ",    "Analisis lengkap ",   "Analisis mendalam ", "Analisis tajam ",
        "Artikel mendalam ",   "Membedah ",            "Bedah mendalam ",    "Mengenal ",
        "Mengupas ",           "Mengupas tuntas ",     "Panduan lengkap ",   "Panduan mendalam ",
        "Panduan santai ",     "Mengapa ",             "Penjelasan lengkap ","Penjelasan santai ",
        "Penjelasan mendalam ","Simak ulasan mendalam ","Ulasan mendalam ",  "Pelajari ",
        "Simak ",              "Temukan ",
      ];
      for (const word of fluff) {
        if (content.startsWith(word)) {
          content = content.slice(word.length);
          break;
        }
      }
      $(el).attr("content", content);
    }
  });

  // FIX #6 — Ganti if-if dengan else-if chain.
  $('[class*="fa"]').each((_, el) => {
    const $el = $(el);
    if ($el.hasClass("far") && $el.hasClass("fa-copyright")) {
      $el.removeClass("far fa-copyright").addClass("fa-brands fa-creative-commons-by");
    } else if ($el.hasClass("fas") && $el.hasClass("fa-copyright")) {
      $el.removeClass("fas fa-copyright").addClass("fa-brands fa-creative-commons-by");
    } else if ($el.hasClass("fab")) {
      $el.removeClass("fab").addClass("fa-brands");
    } else if ($el.hasClass("far")) {
      $el.removeClass("far").addClass("fa-regular");
    } else if ($el.hasClass("fas")) {
      $el.removeClass("fas").addClass("fa-solid");
    }
  });

  // === 2. DETEKSI & PARSING STRAY MARKDOWN ===

  // FIX MD-A — Tambah "span" ke selector.
  // Sebelumnya text node di dalam <span> tidak terproses sama sekali karena
  // contents() tidak rekursif — dia hanya lihat direct children dari <p>, <li>, dll.
  // Dengan menambah span ke sini, find() akan menemukannya dan memprosesnya juga.
  // Tidak ada risiko double-process: text node milik <p> dan <span> tidak tumpang tindih.
  const TEXT_ELEMENTS =
    "p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, figcaption, dt, dd, caption, span";

  $("body").find(TEXT_ELEMENTS).each((_, el) => {
    const $el = $(el);

    // FIX MD-B — Ganti $el.is() (dead code) dengan $el.closest() untuk ancestor check.
    //
    // Bug lama: $el.is("code, pre, script,...") tidak pernah true karena TEXT_ELEMENTS
    // tidak mengandung tag-tag tersebut sama sekali. Jadi kondisi ini adalah dead code murni.
    //
    // Fix: .closest() memeriksa ke atas pohon DOM, bukan elemen itu sendiri.
    // Ini yang memastikan teks di dalam <pre><p>...</p></pre> atau <code><span>...</span></code>
    // (HTML tidak valid tapi bisa ada di artikel lama) tidak ikut diproses.
    if ($el.closest("pre, code, script, style, textarea, noscript, a").length > 0) return;

    $el.contents().each((_, child) => {
      if (child.type === "text") {
        const oldText = child.data || "";
        const parsedHtml = parseMarkdownInline(oldText);

        // FIX #2 — Bandingkan dengan escapeHtml(oldText), bukan oldText mentah.
        if (parsedHtml !== escapeHtml(oldText)) {
          $(child).replaceWith(parsedHtml);
        }
      }
    });
  });

  // === 3. INJEKSI ELEMEN & ASSETS BARU (DENGAN STRICT GUARD) ===
  
  if ($('head link[href*="pemandu.css"]').length === 0) {
      $("head").append(`<link rel="stylesheet" href="/ext/pemandu.css">`);
  }
  
  // FIX #7 — Tambah rel="noopener noreferrer" ke semua target="_blank".
  if ($("footer").length && $('footer a[href="/data-deletion"]').length === 0) {
      const footerLinks = [
          `<a target="_blank" rel="noopener noreferrer" href="/about">☕</a>`,
          `<a target="_blank" rel="noopener noreferrer" href="/data-deletion">🛡️</a>`,
          `<a target="_blank" rel="noopener noreferrer" href="/disclaimer">⚠️</a>`,
          `<a target="_blank" rel="noopener noreferrer" href="/disclosure">📝</a>`,
          `<a target="_blank" rel="noopener noreferrer" href="/lisensi">📚</a>`,
          `<a target="_blank" rel="noopener noreferrer" href="/privacy">🔰</a>`,
          `<a target="_blank" rel="noopener noreferrer" href="/security-policy">⚔️</a>`,
      ].join(" ");
      $("footer").append(` ${footerLinks}`);
  }
  
  if ($("h1").length && $("#iposbrowser").length === 0) {
      $("h1").first().before('<div id="iposbrowser"></div>');
  }
  
  if ($("#progress").length === 0) {
      $("body").append(`<div id="progress"></div>`);
  }
  
  if ($("#layar-kosong-header").length === 0) {
      $("body").append(`<a id="layar-kosong-header" href="https://dalam.web.id/"></a>`);
  }
  
  if ($(".search-floating-container").length === 0) {
      $("body").append(
          `<div class="search-floating-container">` +
          `<input type="text" id="floatingSearchInput" placeholder="cari artikel..." autocomplete="off">` +
          `<span id="floatingSearchClear" class="clear-button"></span>` +
          `<div id="floatingSearchResults" class="floating-results-container"></div>` +
          `</div>`
      );
  }
  
  if ($("#internal-nav").length === 0) {
      $("body").append(`<div id="internal-nav"></div>`);
  }
  
  // --- PEMISAHAN GUARD UNTUK SCRIPT EXTERNAL ---
  
  if ($('script[src="/ext/pemandu.js"]').length === 0) {
      $("body").append(`<script defer src="/ext/pemandu.js"></script>`);
  }
  
  if ($('script[src="/ext/iposbrowser.js"]').length === 0) {
      $("body").append(`<script defer src="/ext/iposbrowser.js"></script>`);
  }
  
  // Guard Lightbox + Pengecekan Ekstensi Gambar
  if ($('script[src="/ext/lightbox.js"]').length === 0) {
      const bodyHtml = $("body").html() || "";
      const hasImage = /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)["']/i.test(bodyHtml);
      if (hasImage) {
          $("body").append(`<script defer src="/ext/lightbox.js"></script>`);
      }
  }
  
  if ($('script[src="/ext/response.js"]').length === 0) {
      $("body").append(`<script defer src="/ext/response.js"></script>`);
  }
  
  if ($('script[src="/ext/balon-cf.js"]').length === 0) {
      $("body").append(`<script defer src="/ext/balon-cf.js"></script>`);
  }
  
  // --- GUARD KHUSUS UNTUK INLINE SCRIPT (LLMs) ---
  let hasLlmsScript = false;
  $("script:not([src])").each((_, el) => {
      const scriptContent = $(el).html() || "";
      if (scriptContent.includes("modelContext' in pemandu")) {
          hasLlmsScript = true;
      }
  });
  
  if (!hasLlmsScript) {
      $("body").append(
          `<script>if('modelContext' in navigator){navigator.modelContext.provideContext({tools:[{name:"baca_llms_index",description:"Mengambil daftar lengkap artikel Layar Kosong",inputSchema:{type:"object",properties:{}},execute:async()=>{const res=await fetch('/llms.txt');return await res.text()}}]})}</script>`
      );
  }
  
  return $.html();
}

// -------------------------------------------------------
// MAIN RUNNER RUNTIME (BUN NATIVE ASYNC + CONCURRENT)
// -------------------------------------------------------

// FIX #11 — Dipisah ke fungsi sendiri agar bisa dipanggil secara concurrent
async function prosesFile(filename: string): Promise<void> {
  const filePath = join(artikelDir, filename);
  const fileLokal = Bun.file(filePath);
  const rawHtml = await fileLokal.text();

  const finalHtml = prosesHtmlDenganCheerio(rawHtml);
  await Bun.write(filePath, finalHtml);
  console.log(`✅ Berhasil: ${filename}`);
}

async function jalankanPipeline() {
  let sukses = 0;
  let gagal  = 0;

  console.log(`📂 Memulai Pembersihan DOM & Markdown (Bun Native) di: ${artikelDir}`);
  console.log(`⚡ Mode: ${CONCURRENCY} file paralel\n`);

  // FIX #11 — Concurrent processing: proses CONCURRENCY file sekaligus per batch
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const chunk = files.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map((f) => prosesFile(f)));

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") {
        sukses++;
      } else {
        console.error(`❌ Gagal proses ${chunk[j]}:`, (results[j] as PromiseRejectedResult).reason);
        gagal++;
      }
    }
  }

  console.log(`\n📊 RINGKASAN: ${sukses} sukses, ${gagal} gagal dari ${files.length} file.`);
}

// Gas eksekusi!
jalankanPipeline();
