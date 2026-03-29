import { file, write } from "bun";
import { existsSync, readFileSync, appendFileSync, mkdirSync, readdirSync } from "node:fs";
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
const SKIP_EXTENSIONS   = new Set([".svg", ".ico", ".gif"]);

const ALLOWED_CATEGORIES = [
  "gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno",
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

  // Kumpulkan kandidat gambar — hanya yang berada di /img/ dan bukan svg/gif
  const imageCandidates = $("body img").toArray().filter(el => {
    const src = $(el).attr("src");
    if (!src) return false;

    // Hanya proses gambar lokal di folder /img/ (sesuaikan bila perlu)
    if (!src.includes("/img/") && !src.startsWith("/") && !src.startsWith(BASE_URL)) return false;

    const ext = path.extname(src.split("?")[0]).toLowerCase();
    if (SKIP_EXTENSIONS.has(ext)) return false;

    return true;
  });

  if (imageCandidates.length === 0) return "no-image";

  const pageTitle  = $("title").first().text().split(" - ")[0].trim() || "Layar Kosong";
  let isFirstImage = true;
  let imageCounter = 0;
  let fileHasChanged = false;

  // Helper: safe update attributes on <img> without changing classes/structure
  function updateImgAttrs($img: Cheerio, webDesktopUrl: string, webMobileUrl: string | null, meta: any, isFirst: boolean) {
    const desktopWidth = meta.width > 1000 ? 1000 : meta.width;
    const mobileWidth  = 480;
    const needsMobile  = !!webMobileUrl && meta.width > mobileWidth;

    const srcsetParts: string[] = [];
    if (needsMobile && webMobileUrl) srcsetParts.push(`${webMobileUrl} ${mobileWidth}w`);
    srcsetParts.push(`${webDesktopUrl} ${desktopWidth}w`);
    const srcsetValue = srcsetParts.join(", ");

    const sizesValue = needsMobile ? "(max-width: 500px) 480px, 1000px" : "1000px";
    const heightValue = Math.round(desktopWidth * (meta.height / meta.width));

    const parent = $img.parent();

    if (parent.is("picture")) {
      // Remove existing webp sources to avoid duplicates (idempotent)
      parent.find('source[type="image/webp"]').remove();

      if (needsMobile && webMobileUrl) {
        parent.prepend(`<source type="image/webp" media="(max-width:500px)" srcset="${webMobileUrl}">`);
      }
      parent.prepend(`<source type="image/webp" srcset="${webDesktopUrl}">`);

      // Update only necessary attributes on <img>
      $img.attr({
        src: webDesktopUrl,
        srcset: srcsetValue,
        sizes: sizesValue,
        width: `${desktopWidth}`,
        height: `${heightValue}`,
        loading: isFirst ? "eager" : "lazy",
        decoding: "async",
      });
      if (isFirst) $img.attr("fetchpriority", "high");
    } else {
      // Parent bukan picture: update <img> saja, preserve class/style/data-*
      const currentSrc = $img.attr("src") || "";
      const currentSrcset = $img.attr("srcset") || "";

      // Skip if already set to same values (idempotensi)
      if (currentSrc === webDesktopUrl && currentSrcset === srcsetValue) {
        return false;
      }

      $img.attr({
        src: webDesktopUrl,
        srcset: srcsetValue,
        sizes: sizesValue,
        width: `${desktopWidth}`,
        height: `${heightValue}`,
        loading: isFirst ? "eager" : "lazy",
        decoding: "async",
      });
      if (isFirst) $img.attr("fetchpriority", "high");
    }

    return true;
  }

  for (const el of imageCandidates) {
    const $img        = $(el);
    const originalSrc = $img.attr("src")!;

    // Normalize path to repo-relative
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
      const physicalComplete =
        existsSync(absDesktopPath) && (!needsMobile || existsSync(absMobilePath));

      // Generate .webp ke img/ — ini yang akan di-commit ke repo
      if (!optimizedCache.has(cleanPath) || !physicalComplete) {
        if (!physicalComplete) {
          const targetWidth = meta.width > 1000 ? 1000 : meta.width;

          await sharp(inputBuffer)
            .rotate()
            .resize(targetWidth, null, { withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(absDesktopPath);

          if (needsMobile) {
            await sharp(inputBuffer)
              .rotate()
              .resize(480, null, { withoutEnlargement: true })
              .webp({ quality: 75 })
              .toFile(absMobilePath);
          }
          console.log(`  ✨ WebP OK: ${cleanPath}`);
        }

        if (!optimizedCache.has(cleanPath)) {
          optimizedCache.add(cleanPath);
          appendFileSync(CACHE_FILE, `${cleanPath}\n`);
        }
      }

      // Transformasi HTML — TIDAK membungkus <img>, hanya menambahkan atribut / <source> jika parent sudah <picture>
      imageCounter++;
      const originalAlt = $img.attr("alt")?.trim();
      let finalAlt = originalAlt || pageTitle;
      if (!originalAlt && imageCounter > 1) finalAlt = `${pageTitle} - ${imageCounter}`;

      // Set alt only if missing or empty (preserve existing alt)
      if (!originalAlt) {
        $img.attr("alt", finalAlt.replace(/"/g, "&quot;"));
      }

      const webDesktopUrl = `${BASE_URL}/${desktopPath.replace(/\\/g, "/")}`;
      const webMobileUrl  = needsMobile ? `${BASE_URL}/${mobilePath.replace(/\\/g, "/")}` : null;

      const changed = updateImgAttrs($img, webDesktopUrl, webMobileUrl, meta, isFirstImage);
      if (changed) {
        isFirstImage = false;
        fileHasChanged = true;
      }

    } catch (e: any) {
      console.error(`❌ Sharp Error pada ${cleanPath}: ${e?.message || e}`);
    }
  }

  if (!fileHasChanged) return "no-change";

  // Injeksi signature di akhir file — sama polanya dengan inject-schema.ts
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

  // Pastikan folder cache ada
  mkdirSync(path.dirname(CACHE_FILE), { recursive: true });

  // Baca sitemap.txt lama (sebelum bikin-sitemap-txt.ts jalan)
  // → berisi URL artikel yang SUDAH pernah diproses sebelumnya
  const sitemapUrls = existsSync(SITEMAP_FILE)
    ? new Set(
        readFileSync(SITEMAP_FILE, "utf-8")
          .split("\n").map(l => l.trim()).filter(Boolean)
      )
    : new Set<string>();

  console.log(`📄 sitemap.txt lama : ${sitemapUrls.size} URL terdaftar\n`);

  // Kumpulkan semua .html dari folder kategori (kecuali index.html)
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
    // Konversi path → URL untuk dicocokkan ke sitemap
    const url = `${BASE_URL}/${htmlPath.replace(/\\/g, "/").replace(/\.html$/, "")}`;

    // Artikel lama → URL ada di sitemap → skip (cepat!)
    if (sitemapUrls.has(url)) {
      results.skipped++;
      continue;
    }

    // Artikel baru → URL tidak ada di sitemap → proses
    const result = await processHtmlFile(htmlPath);

    if (result === "processed") { results.processed++; console.log(`✅ Processed: ${htmlPath}`); }
    if (result === "skipped")   results.skipped++;
    if (result === "no-image")  results.noImage++;
  }

  console.log(`
  📊 RINGKASAN:
  ------------------
  ✅ Diproses     : ${results.processed}
  ⏭️ Di-skip      : ${results.skipped}
  🖼️ Tanpa gambar : ${results.noImage}
  ❌ File hilang  : ${results.missing}

  🖼️ Output WebP  → img/            (akan di-commit ke repo)
  📄 HTML         → folder kategori  (runner only, tidak di-commit)
  `);
}

main();
