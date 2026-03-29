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

  // Kumpulkan kandidat gambar — hanya yang berada di /img/ atau base URL, dan bukan svg/gif
  const imageCandidates = $("body img").toArray().filter(el => {
    const src = $(el).attr("src");
    if (!src) return false;

    // Proses gambar lokal (relatif atau BASE_URL) atau yang mengandung /img/
    const isLocal = src.startsWith("/") || src.startsWith(BASE_URL) || src.includes("/img/");
    if (!isLocal) return false;

    const ext = path.extname(src.split("?")[0]).toLowerCase();
    if (SKIP_EXTENSIONS.has(ext)) return false;

    return true;
  });

  if (imageCandidates.length === 0) return "no-image";

  const pageTitle  = $("title").first().text().split(" - ")[0].trim() || "Layar Kosong";
  let isFirstImage = true;
  let imageCounter = 0;
  let fileHasChanged = false;

  /**
   * updateImgAttrs
   * - Menentukan entry srcset berdasarkan metadata gambar dan atribut/inline style yang ada
   * - Hanya menulis atribut yang diperlukan (tidak mengubah class/id/style/data-*)
   * - Jika parent adalah <picture>, hanya tambahkan <source type="image/webp"> (idempotent)
   * - Mengembalikan true jika ada perubahan
   */
  function updateImgAttrs($img: Cheerio, webDesktopUrl: string, webMobileUrl: string | null, meta: any, isFirst: boolean) {
    const desktopWidth = meta.width > 1000 ? 1000 : meta.width;
    const mobileWidth  = 480;
    const hasMobile    = !!webMobileUrl && meta.width > mobileWidth;

    // 1) Baca declared width dari atribut width atau inline style
    let declaredWidth: number | null = null;
    const attrWidth = $img.attr("width");
    if (attrWidth) {
      const n = parseInt(String(attrWidth), 10);
      if (!Number.isNaN(n) && n > 0) declaredWidth = n;
    }
    if (declaredWidth === null) {
      const style = $img.attr("style") || "";
      const m = style.match(/(?:^|;)\s*width\s*:\s*(\d+)px/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n) && n > 0) declaredWidth = n;
      }
    }

    // 2) Tentukan apakah include mobile/desktop berdasarkan declaredWidth
    let includeMobile = false;
    let includeDesktop = true;

    if (declaredWidth !== null) {
      if (declaredWidth <= mobileWidth) {
        includeMobile = hasMobile;
        includeDesktop = false;
      } else if (declaredWidth >= desktopWidth) {
        includeMobile = false;
        includeDesktop = true;
      } else {
        // declaredWidth di antara mobile dan desktop: pilih yang paling masuk akal
        const midpoint = mobileWidth + Math.round((desktopWidth - mobileWidth) / 2);
        if (declaredWidth <= midpoint && hasMobile) {
          includeMobile = true;
          includeDesktop = false;
        } else {
          includeMobile = false;
          includeDesktop = true;
        }
      }
    } else {
      // Tidak ada declaredWidth: sertakan mobile+desktop bila tersedia
      includeMobile = hasMobile;
      includeDesktop = true;
    }

    // 3) Bangun srcset hanya dengan entry yang diperlukan (WebP-only)
    const srcsetParts: string[] = [];
    if (includeMobile && webMobileUrl) srcsetParts.push(`${webMobileUrl} ${mobileWidth}w`);
    if (includeDesktop) srcsetParts.push(`${webDesktopUrl} ${desktopWidth}w`);
    const srcsetValue = srcsetParts.join(", ");

    // 4) Tentukan sizes
    let sizesValue = "100vw";
    if (declaredWidth !== null) {
      sizesValue = `${declaredWidth}px`;
    } else {
      // Heuristik: jika ada class thumbnail atau full-width, gunakan responsive sizes
      const classAttr = ($img.attr("class") || "").toLowerCase();
      if (classAttr.includes("thumbnail") || classAttr.includes("hero") || classAttr.includes("figure") || classAttr.includes("full")) {
        sizesValue = "(max-width: 640px) 100vw, 1000px";
      } else {
        sizesValue = "100vw";
      }
    }

    // 5) Hitung height berdasarkan desktopWidth (agar mencegah CLS)
    const chosenWidthForHeight = includeDesktop ? desktopWidth : (includeMobile && webMobileUrl ? mobileWidth : desktopWidth);
    const heightValue = Math.round(chosenWidthForHeight * (meta.height / meta.width));

    // 6) Jika parent adalah <picture>, tambahkan <source type="image/webp"> (idempotent)
    const parent = $img.parent();
    if (parent.is("picture")) {
      parent.find('source[type="image/webp"]').remove();
      if (includeMobile && webMobileUrl) {
        parent.prepend(`<source type="image/webp" media="(max-width:500px)" srcset="${webMobileUrl}">`);
      }
      if (includeDesktop) {
        parent.prepend(`<source type="image/webp" srcset="${webDesktopUrl}">`);
      }
    }

    // 7) Siapkan atribut baru (hanya yang perlu)
    const newAttrs: Record<string, string> = {
      src: webDesktopUrl,
      width: `${desktopWidth}`,
      height: `${heightValue}`,
      loading: isFirst ? "eager" : "lazy",
      decoding: "async",
    };
    if (srcsetValue) newAttrs["srcset"] = srcsetValue;
    if (sizesValue) newAttrs["sizes"] = sizesValue;
    if (isFirst) newAttrs["fetchpriority"] = "high";

    // 8) Idempotensi: cek apakah sudah identik
    const currentSrc = $img.attr("src") || "";
    const currentSrcset = $img.attr("srcset") || "";
    const currentSizes = $img.attr("sizes") || "";
    if (currentSrc === newAttrs.src && currentSrcset === (newAttrs.srcset || "") && currentSizes === (newAttrs.sizes || "")) {
      return false;
    }

    // 9) Terapkan atribut (cheerio .attr hanya menimpa yang disebutkan)
    $img.attr(newAttrs);
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
