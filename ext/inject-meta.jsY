// ext/inject-meta.js
// CI-safe HTML enricher for artikelx/*.html
// Node >= 20, ESM

import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "artikelx");
const IMG_BASE = "https://dalam.web.id/img";

function fixImageRecursive(obj, img) {
  if (!obj || typeof obj !== "object") return;

  if (
    !obj.image ||
    obj.image === "" ||
    (Array.isArray(obj.image) && obj.image.length === 0)
  ) {
    obj.image = img;
  }

  for (const v of Object.values(obj)) {
    fixImageRecursive(v, img);
  }
}

async function processFile(filePath) {
  let html = await fs.readFile(filePath, "utf8");

  const base = path.basename(filePath, ".html");
  const img = `${IMG_BASE}/${base}.webp`;

  // fallback alt dari <title>
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const altText = titleMatch ? titleMatch[1].trim() : base;

  /* ========= 2) META TAGS ========= */
  const meta = [];

  if (!/<meta[^>]+property=["']og:image["']/i.test(html))
    meta.push(`<meta property="og:image" content="${img}">`);

  if (!/<meta[^>]+property=["']og:image:alt["']/i.test(html))
    meta.push(
      `<meta property="og:image:alt" content="${altText}">`,
    );

  if (!/<meta[^>]+name=["']twitter:card["']/i.test(html))
    meta.push(
      `<meta name="twitter:card" content="summary_large_image">`,
    );

  if (!/<meta[^>]+name=["']twitter:image["']/i.test(html))
    meta.push(`<meta name="twitter:image" content="${img}">`);

  if (!/<meta[^>]+itemprop=["']image["']/i.test(html))
    meta.push(`<meta itemprop="image" content="${img}">`);

  if (meta.length) {
    html = html.replace(
      /<\/head>/i,
      `${meta.join("\n  ")}\n</head>`,
    );
  }

  await fs.writeFile(filePath, html, "utf8");
  console.log(`✔ enriched: ${path.basename(filePath)}`);
}

async function main() {
  try {
    const files = (await fs.readdir(SRC_DIR))
    .filter((f) => f.endsWith(".html"))
    .map((f) => path.join(SRC_DIR, f));

    if (!files.length) {
      console.log("ℹ️ Tidak ada HTML di artikelx/");
      return;
    }

    for (const f of files) {
      await processFile(f);
    }

    console.log("::notice::HTML enrichment selesai");
  } catch (err) {
    console.error("❌ CI enrich gagal:", err);
    process.exit(1);
  }
}

main();
