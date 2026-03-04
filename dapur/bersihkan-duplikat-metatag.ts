import { Glob } from "bun";
import * as cheerio from "cheerio";

// Ambil folder dari argumen terminal (misal: bun run cleaner.ts folder-ku)
// Jika tidak ada argumen, default ke folder saat ini "./"
const targetArg = Bun.argv[2] || "./";

async function processFile(filePath: string) {
  const html = await Bun.file(filePath).text();
  const $ = cheerio.load(html, { decodeEntities: false });

  const seen = new Set<string>();
  let removedCount = 0;

  // Fokus hanya pada elemen teknis yang sering duplikat secara tidak sengaja
  // Kita abaikan div, span, section, dll agar desain visual aman.
  $("meta, head > link, script[src], link[rel='stylesheet'], link[rel='alternate']").each((_, el) => {
    const $el = $(el);

    // Buat "sidik jari" unik berdasarkan atribut penting, bukan cuma outerHTML
    // Misal: <script src="/js.js"> kuncinya adalah "/js.js"
    let signature = "";
    if (el.tagName === "meta") {
      signature = $el.attr("name") || $el.attr("property") || $el.attr("itemprop") || "";
    } else if (el.tagName === "script") {
      signature = $el.attr("src") || "";
    } else if (el.tagName === "link") {
      signature = $el.attr("href") || "";
    }

    // Jika sidik jari kosong (elemen tanpa src/href/name), pakai outerHTML sebagai fallback
    const finalKey = signature ? `${el.tagName}:${signature}` : $.html(el).trim();

    if (seen.has(finalKey)) {
      $el.remove(); // Hapus yang muncul belakangan
      removedCount++;
    } else {
      seen.add(finalKey);
    }
  });

  if (removedCount > 0) {
    await Bun.write(filePath, $.html());
    console.log(`✔ Berhasil membuang ${removedCount} sampah teknis di: ${filePath}`);
  } else {
    console.log(`– Aman, tidak ada duplikasi: ${filePath}`);
  }
}

async function main() {
  // Gunakan targetArg untuk scanning
  const glob = new Glob(`${targetArg}/**/*.html`);

  console.log(`🚀 Memulai pembersihan di folder: ${targetArg}`);

  for await (const file of glob.scan()) {
    await processFile(file);
  }

  console.log(`✨ Selesai! Semua file di ${targetArg} sudah glowing.`);
}

main();
