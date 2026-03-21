import { file, write } from "bun";
import { existsSync, readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { load } from "cheerio";
import path from "node:path";
import sharp from "sharp";

// ========== CONFIG ==========
const BASE_URL        = "https://dalam.web.id";
const SITEMAP_FILE    = "sitemap.txt";
const CACHE_FILE      = "mini/srcset-gambar.txt";
const FORBIDDEN_CHARS = /[*:"<>|?]/g;
const PICTURE_SIGNATURE = "srcset_oleh_Fakhrul_Rijal";

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
    return src && src.includes("/img/");
  });

  if (imageCandidates.length === 0) return "no-image";

  const pageTitle    = $("title").first().text().split(" - ")[0].trim() || "Layar Kosong";
  let isFirstImage   = true;
  let imageCounter   = 0;
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

      // Transformasi HTML — wrap <img> jadi <picture>
      imageCounter++;
      const originalAlt = $img.attr("alt")?.trim();
      let finalAlt = originalAlt || pageTitle;
      if (!originalAlt && imageCounter > 1) finalAlt = `${pageTitle} - ${imageCounter}`;

      const webDesktopUrl = `${BASE_URL}/${desktopPath.replace(/\\/g, "/")}`;
      const webMobileUrl  = `${BASE_URL}/${mobilePath.replace(/\\/g, "/")}`;

      const pictureHtml = `<picture style="display: block; text-align: center;">
      ${needsMobile ? `  <source media="(max-width: 500px)" srcset="${webMobileUrl}">` : ""}
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

  // Injeksi signature di akhir file — sama polanya dengan inject-schema.ts
  let finalHtml = $.html();
  const signature = `<noscript>${PICTURE_SIGNATURE}</noscript>`;

  if (finalHtml.includes("</html>")) {
    finalHtml = finalHtml.replace(/<\/html>\s*$/i, "").trimEnd() + `${signature}</html>`;
  } else {
    finalHtml = finalHtml.trimEnd() + signature;
  }

  await write(htmlPath, finalHtml);
  return "processed";
}

// ========== MAIN ==========
async function main() {
  console.log("🚀 srcset — Membaca sitemap.txt, bekerja di folder kategori...");

  // Pastikan folder cache ada
  mkdirSync(path.dirname(CACHE_FILE), { recursive: true });

  if (!existsSync(SITEMAP_FILE)) {
    console.error(`❌ ${SITEMAP_FILE} tidak ditemukan. Pastikan bikin-sitemap-txt.ts sudah jalan duluan.`);
    process.exit(1);
  }

  // Baca sitemap.txt — ambil hanya URL artikel (ada minimal 2 segmen path)
  const urls = readFileSync(SITEMAP_FILE, "utf-8")
  .split("\n")
  .map(l => l.trim())
  .filter(l => {
    if (!l.startsWith(BASE_URL)) return false;
    const pathname = l.replace(BASE_URL, "").replace(/^\//, "");
    const segments = pathname.split("/").filter(Boolean);
    return segments.length === 2; // hanya URL artikel: kategori/slug
  });

  console.log(`📄 ${urls.length} URL artikel ditemukan di sitemap.txt\n`);

  const results = { processed: 0, skipped: 0, missing: 0, noImage: 0 };

  for (const url of urls) {
    // Konversi URL → path file di folder kategori
    // https://dalam.web.id/warta-tekno/tulisan-a → warta-tekno/tulisan-a.html
    const pathname = url.replace(BASE_URL, "").replace(/^\//, "");
    const htmlPath = `${pathname}.html`;

    if (!existsSync(htmlPath)) {
      results.missing++;
      console.warn(`⚠️  File tidak ditemukan: ${htmlPath}`);
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
  📄 HTML         → folder kategori  (runner only, tidak di-commit)
  `);
}

main();