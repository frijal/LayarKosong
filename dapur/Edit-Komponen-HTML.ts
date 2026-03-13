// -------------------------------------------------------
// FILE: Edit-Komponen-HTML.ts
// Pengganti langkah Perl + Sed di GitHub Actions
// Jalankan: bun run Edit-Komponen-HTML.ts
// -------------------------------------------------------

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const artikelDir = join(import.meta.dir, "artikelx/");

if (!existsSync(artikelDir)) {
  console.error(`❌ Folder tidak ditemukan: ${artikelDir}`);
  process.exit(1);
}

const files = readdirSync(artikelDir).filter((f) => f.endsWith(".html"));

if (files.length === 0) {
  console.warn("⚠️  Tidak ada file .html di folder artikelx/");
  process.exit(0);
}

// -------------------------------------------------------
// STEP 1: Replace Content (setara Perl)
// -------------------------------------------------------
function replaceContent(html: string): string {
  return html
    // URL icon
    .replaceAll("https://dalam[.]web[.]id/assets/apple-touch-icon.png", "https://dalam.web.id/ext/icons/apple-touch-icon.png")
    .replaceAll("https://dalam[.]web[.]id/apple-touch-icon.png", "https://dalam.web.id/ext/icons/apple-touch-icon.png")

    // copyright symbol
    .replaceAll("&copy;", "🄯")
    .replaceAll("©", "🄯")

    // Font Awesome version
    .replaceAll("Font Awesome 5 Free", "Font Awesome 7 Free")
    .replaceAll("Font Awesome 6 Free", "Font Awesome 7 Free")

    // branding title
    .replaceAll(" - Layar Kosong", "")

    // hapus anchor branding
    .replace(/<a[^>]*>\s*Dalam Web\s*<\/a>/g, "")
    .replace(/<a[^>]*>\s*Jaga Data Pribadi Tetap Aman\s*<\/a>/g, "")

    // ganti teks anchor dalam.web.id
    .replace(/(<a[^>]*>)\s*dalam\.web\.id\s*(<\/a>)/g, "$1Jaga Data Pribadi Tetap Aman$2")

    // branding teks lainnya
    .replaceAll("Dalam Web Artikel", "Jaga Data Pribadi Tetap Aman")
    .replaceAll("Redaksi Dalam Web", "Jaga Data Pribadi Tetap Aman")
    .replaceAll("Dalam.web.id", "Jaga Data Pribadi Tetap Aman")
    .replace(/\b dalam\.web\.id /g, " Jaga Data Pribadi Tetap Aman ")
    .replace(/\b Dalam\.web\.id /g, " Jaga Data Pribadi Tetap Aman ")

    // twitter -> x
    .replaceAll("twitter.com", "x.com")

    // SEO fluff
    .replaceAll("Analisis mendalam ", "")
    .replaceAll("Analisis tajam ", "")
    .replaceAll("Artikel mendalam ", "")
    .replaceAll("Panduan lengkap ", "")
    .replaceAll("Panduan mendalam ", "")
    .replaceAll("Penjelasan lengkap ", "")
    .replaceAll("Penjelasan mendalam ", "")
    .replaceAll("Simak ulasan mendalam ", "")
    .replaceAll('content="Analisis kritis ', 'content="')
    .replaceAll('content="Mengapa ', 'content="')
    .replaceAll('content="Pelajari ', 'content="')
    .replaceAll('content="Simak ', 'content="')
    .replaceAll('content="Temukan ', 'content="')

    // Font Awesome class mapping
    .replaceAll("far fa-copyright", "fa-brands fa-creative-commons-zero")
    .replaceAll("fas fa-copyright", "fa-brands fa-creative-commons-zero")
    .replace(/\bfab /g, "fa-brands ")
    .replace(/\bfar /g, "fa-regular ")
    .replace(/\bfas /g, "fa-solid ");
}

// -------------------------------------------------------
// STEP 2: Add HTML Elements (setara Sed)
// -------------------------------------------------------
function addElements(html: string): string {
  // 1. CSS & RSS di Head
  if (!html.includes("marquee-url.css")) {
    html = html.replace(
      "</head>",
      `<link rel="stylesheet" href="/ext/marquee-url.css"><link rel="alternate" type="application/rss+xml" title="30 artikel baru bikin." href="https://dalam.web.id/rss.xml"></head>`
    );
  }

  // 2. Footer links
  if (!html.includes('href="/data-deletion"')) {
    const footerLinks = [
      `<a target="_blank" href="/about">☕</a>`,
      `<a target="_blank" href="/data-deletion">🛡️</a>`,
      `<a target="_blank" href="/data-deletion-form">📝</a>`,
      `<a target="_blank" href="/disclaimer">⚠️</a>`,
      `<a target="_blank" href="/lisensi">📚</a>`,
      `<a target="_blank" href="/privacy">🔰</a>`,
      `<a target="_blank" href="/security-policy">⚔️</a>`,
    ].join(" ");
    html = html.replace("</footer>", `${footerLinks}</footer>`);
  }

  // 3. IPosBrowser Container setelah H1
  if (!html.includes('id="iposbrowser"')) {
    html = html.replace("</h1>", `</h1><div id="iposbrowser"></div>`);
  }

  // 4. Gabungkan semua elemen Body
  if (!html.includes('class="search-floating-container"')) {
    const elements = [
      `<div id="progress"></div>`,
      `<a id="layar-kosong-header" href="https://dalam.web.id/"></a>`,
      `<div class="search-floating-container">`,
      `<input type="text" id="floatingSearchInput" placeholder="cari artikel..." autocomplete="off">`,
      `<span id="floatingSearchClear" class="clear-button"></span>`,
      `<div id="floatingSearchResults" class="floating-results-container"></div>`,
      `</div>`,
      `<div id="dynamic-nav-container" class="floating-nav"></div>`,
      `<div id="internal-nav"></div>`,
    ].join("");

    const section = `<section id="related-marquee-section"><div id="related-marquee-container"></div></section>`;

    const scripts = [
      `<script defer src="/ext/markdown.js"></script>`,
      `<script defer src="/ext/marquee-url.js"></script>`,
      `<script defer src="/ext/lightbox.js"></script>`,
      `<script defer src="/ext/iposbrowser.js"></script>`,
      `<script defer src="/ext/response.js"></script>`,
    ].join("");

    html = html.replace("</body>", `${elements}${section}${scripts}</body>`);
  }

  return html;
}

// -------------------------------------------------------
// EKSEKUSI
// -------------------------------------------------------
let sukses = 0;
let gagal = 0;

for (const filename of files) {
  const filePath = join(artikelDir, filename);
  try {
    let html = readFileSync(filePath, "utf-8");
    html = replaceContent(html);
    html = addElements(html);
    writeFileSync(filePath, html, "utf-8");
    console.log(`✅ ${filename}`);
    sukses++;
  } catch (err) {
    console.error(`❌ Gagal proses ${filename}:`, err);
    gagal++;
  }
}

console.log(`\n📊 Selesai: ${sukses} sukses, ${gagal} gagal dari ${files.length} file.`);
