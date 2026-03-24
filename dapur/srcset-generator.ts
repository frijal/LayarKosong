import { file, write } from "bun";
import { existsSync, readFileSync, appendFileSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { load } from "cheerio";
import path, { join } from "node:path";
import sharp from "sharp";

// ========== CONFIG ==========
const BASE_URL          = "https://dalam.web.id";
const SITEMAP_FILE      = "sitemap.txt";
const CACHE_FILE        = "mini/srcset-gambar.txt";
const FORBIDDEN_CHARS   = /[*:"<>|?]/g;
const PICTURE_SIGNATURE = "srcset_oleh_Fakhrul_Rijal";

// Ekstensi yang TIDAK diproses — biarkan bentuk aslinya
const SKIP_EXTENSIONS   = new Set([".svg", ".gif"]);

const ALLOWED_CATEGORIES = [
  "gaya-hidup", "jejak-sejarah", "lainnya",
"olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno",
];

// ========== CACHE ==========
let optimizedCache = new Set<string>();

if (existsSync(CACHE_FILE)) {
  optimizedCache = new Set(
    readFileSync(CACHE_FILE, "utf-8")
    .split("\n").map(l => l.trim()).filter(Boolean)
  );
}

// ========== CORE ==========
async function processHtmlFile(htmlPath: string): Promise<string> {
  const htmlContent = await file(htmlPath).text();
  const $ = load(htmlContent, { decodeEntities: false });

  // Skip jika sudah ada signature — artikel sudah pernah diproses
  if (htmlContent.includes(PICTURE_SIGNATURE)) return "skipped";

  // Fallback safety: skip jika sudah ada <picture>
  if ($("picture").length > 0) return "skipped";

  const imageCandidates = $("body img").toArray().filter(el => {
    const src = $(el).attr("src");
    if (!src || !src.includes("/img/")) return false;

    // Lewati .svg dan .gif — biarkan pada bentuk aslinya
    const ext = path.extname(src.split("?")[0]).toLowerCase();
    if (SKIP_EXTENSIONS.has(ext)) return false;

    return true;
  });

  if (imageCandidates.length === 0) return "no-image";

  const pageTitle  = $("title").first().text().split(" - ")[0].trim() || "Layar Kosong";
  let isFirstImage = true;
  let imageCounter = 0;
  let fileHasChanged = false;

  for (const el of imageCandidates) {
    const $img        = $(el);
    const originalSrc = $img.attr("src")!;

    const cleanPath = originalSrc
    .replace(BASE_URL, "")
    .replace(/^https?:\/\/dalam\.web\.id/, "")
    .replace(/^\/+/, "");

    const fullPathSource = path.join(process.cwd(), cleanPath);

    if (!existsSync(fullPathSource)) {
      console.warn(`⚠️  Gambar tidak ditemukan: ${fullPathSource}`);
      continue;
    }

    try {
      const inputBuffer = await file(fullPathSource).arrayBuffer().then(b => Buffer.from(b));
      const meta        = await sharp(inputBuffer).metadata();

      if (!meta?.width || !meta?.height) continue;

      const dirName      = path.dirname(cleanPath);
      const ext          = path.extname(cleanPath);
      const baseNameSafe = path.basename(cleanPath, ext).replace(FORBIDDEN_CHARS, "-");

      const desktopPath    = path.join(dirName, `${baseNameSafe}.webp`);
      const mobilePath     = path.join(dirName, `${baseNameSafe}-sm.webp`);
      const absDesktopPath = path.join(process.cwd(), desktopPath);
      const absMobilePath  = path.join(process.cwd(), mobilePath);

      const needsMobile    = meta.width > 480;
      const physicalComplete = existsSync(absDesktopPath) && existsSync(absMobilePath);

      // Generate .webp ke img/ — ini yang akan di-commit ke repo
      if (!optimizedCache.has(cleanPath) || !physicalComplete) {
        if (!physicalComplete) {
          const targetWidth = meta.width > 1000 ? 1000 : meta.width;

          // 1. Proses Desktop WebP
          await sharp(inputBuffer)
          .rotate()
          .resize(targetWidth, null, { withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(absDesktopPath);

          // 2. Proses Mobile WebP
          if (needsMobile) {
            // Jika gambar besar, resize beneran
            await sharp(inputBuffer)
            .rotate()
            .resize(480, null, { withoutEnlargement: true })
            .webp({ quality: 75 })
            .toFile(absMobilePath);
            console.log(`  ✨ WebP + Mobile OK: ${cleanPath}`);
          } else {
            // Jika gambar kecil, DUPLIKASI dari desktop hasil convert tadi
            copyFileSync(absDesktopPath, absMobilePath);
            console.log(`  👯 WebP + Duplicate OK (Small Image): ${cleanPath}`);
          }
        }

        if (!optimizedCache.has(cleanPath)) {
          optimizedCache.add(cleanPath);
          appendFileSync(CACHE_FILE, `${cleanPath}\n`);
        }
      }

      // Transformasi HTML — wrap <img> jadi <picture>
      imageCounter++;
      const originalAlt = $img.attr("alt")?.trim();
      let finalAlt = originalAlt || pageTitle;
      if (!originalAlt && imageCounter > 1) finalAlt = `${pageTitle} - ${imageCounter}`;

      const webDesktopUrl = `${BASE_URL}/${desktopPath.replace(/\\/g, "/")}`;
      const webMobileUrl  = `${BASE_URL}/${mobilePath.replace(/\\/g, "/")}`;

      // Sekarang kita bisa pede selalu pakai <source> karena file -sm.webp PASTI ada (hasil duplikasi)
      const pictureHtml = `<picture style="display: block; text-align: center;">
      <source media="(max-width: 500px)" srcset="${webMobileUrl}">
      <img src="${webDesktopUrl}"
      ${isFirstImage ? 'fetchpriority="high"' : ""}
      alt="${finalAlt.replace(/"/g, "&quot;")}"
      width="${meta.width > 1000 ? 1000 : meta.width}"
      height="${Math.round((meta.width > 1000 ? 1000 : meta.width) * (meta.height / meta.width))}"
      style="max-width: 100%; height: auto; border-radius: 16px; display: inline-block;"
      loading="${isFirstImage ? "eager" : "lazy"}"
      decoding="async">
      </picture>`;

      $img.replaceWith(pictureHtml);
      isFirstImage   = false;
      fileHasChanged = true;

    } catch (e: any) {
      console.error(`❌ Sharp Error pada ${cleanPath}: ${e.message}`);
    }
  }

  if (!fileHasChanged) return "no-change";

  // Injeksi signature di akhir file
  let finalHtml = $.html();
  const signature = `<noscript>${PICTURE_SIGNATURE}</noscript>`;

  if (finalHtml.includes("</body>")) {
    finalHtml = finalHtml.replace(/<\/body>\s*$/i, "").trimEnd() + `${signature}</body>`;
  } else {
    finalHtml = finalHtml.trimEnd() + signature;
  }

  await write(htmlPath, finalHtml);
  return "processed";
}

// ========== MAIN ==========
async function main() {
  console.log("🚀 srcset — Scan folder kategori, proses artikel baru saja...");
  console.log(`🚫 Skip ekstensi    : ${[...SKIP_EXTENSIONS].join(", ")}`);

  mkdirSync(path.dirname(CACHE_FILE), { recursive: true });

  const sitemapUrls = existsSync(SITEMAP_FILE)
  ? new Set(
    readFileSync(SITEMAP_FILE, "utf-8")
    .split("\n").map(l => l.trim()).filter(Boolean)
  )
  : new Set<string>();

  console.log(`📄 sitemap.txt lama : ${sitemapUrls.size} URL terdaftar\n`);

  const allFiles = ALLOWED_CATEGORIES.flatMap(cat => {
    try {
      return readdirSync(cat)
      .filter(f => f.endsWith(".html") && f !== "index.html")
      .map(f => join(cat, f));
    } catch {
      return [];
    }
  });

  const results = { processed: 0, skipped: 0, noImage: 0, missing: 0 };

  for (const htmlPath of allFiles) {
    const url = `${BASE_URL}/${htmlPath.replace(/\\/g, "/").replace(/\.html$/, "")}`;

    if (sitemapUrls.has(url)) {
      results.skipped++;
      continue;
    }

    const result = await processHtmlFile(htmlPath);

    if (result === "processed") { results.processed++; console.log(`✅ Processed: ${htmlPath}`); }
    if (result === "skipped")   results.skipped++;
    if (result === "no-image")  results.noImage++;
  }

  console.log(`
  📊 RINGKASAN:
  ------------------
  ✅ Diproses     : ${results.processed}
  ⏭️  Di-skip      : ${results.skipped}
  🖼️  Tanpa gambar : ${results.noImage}
  ❌ File hilang  : ${results.missing}

  🖼️  Output WebP  → img/            (akan di-commit ke repo)
  📄 HTML          → folder kategori (runner only, tidak di-commit)
  `);
}

main();