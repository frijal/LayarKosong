import { file, write } from "bun";
import { existsSync, readFileSync, appendFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { load } from "cheerio";
import path, { join } from "node:path";
import sharp from "sharp";

// ========== CONFIG ==========
const BASE_URL = "https://dalam.web.id";
const SITEMAP_FILE = "sitemap.txt";
const CACHE_FILE = "mini/srcset-gambar.txt";
const ARTIKEL_LITE = "artikel-lite.json"; 
const FORBIDDEN_CHARS = /[*:"<>|?]/g;
const PICTURE_SIGNATURE = "srcset_oleh_Fakhrul_Rijal";

const SKIP_EXTENSIONS = new Set([".svg", ".ico", ".gif"]);
const ALLOWED_CATEGORIES = [
  "gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno",
];

// 🔥 STANDAR CORE WEB VITALS (CWV) - UPDATE RESOLUSI
const TARGET_DESKTOP = 1208;
const TARGET_MEDIUM  = 960;
const TARGET_MOBILE  = 720;

// ========== CACHE (AUTO-RESET) ==========
let optimizedCache = new Set<string>();

mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
writeFileSync(CACHE_FILE, "");

// ========== HELPERS ==========
function normalizeToRepoPath(src: string): string {
  if (!src) return "";
  const noQuery = src.split("?")[0].split("#")[0];
  if (noQuery.startsWith(BASE_URL)) {
    return noQuery.slice(BASE_URL.length).replace(/^\/+/, "");
  }
  const hostPattern = /^https?:\/\/(?:www\.)?dalam\.web\.id(\/.*)?$/i;
  const m = noQuery.match(hostPattern);
  if (m) return (m[1] || "").replace(/^\/+/, "");
  return noQuery.replace(/^\/+/, "");
}

function ensureDirForFile(filePath: string) {
  const dir = path.dirname(filePath);
  try { mkdirSync(dir, { recursive: true }); } catch {}
}

// 🔥 HELPER: Ambil semua gambar dari artikel-lite.json
function loadRelatedImages(): Set<string> {
  const imageSet = new Set<string>();
  if (!existsSync(ARTIKEL_LITE)) {
    console.warn(`⚠️ File ${ARTIKEL_LITE} tidak ditemukan, -rg akan dilewati.`);
    return imageSet;
  }

  try {
    const data = JSON.parse(readFileSync(ARTIKEL_LITE, "utf-8"));

    const extractImages = (obj: any) => {
      if (Array.isArray(obj)) {
        obj.forEach(extractImages);
      } else if (obj !== null && typeof obj === "object") {
        if (obj.image && typeof obj.image === "string") {
          imageSet.add(normalizeToRepoPath(obj.image));
        }
        Object.values(obj).forEach(extractImages);
      }
    };

    extractImages(data);
    console.log(`📚 Berhasil memuat ${imageSet.size} target gambar untuk thumbnail -rg dari artikel-lite.json`);
    return imageSet;
  } catch (e) {
    console.error(`❌ Gagal mem-parsing ${ARTIKEL_LITE}:`, e);
    return imageSet;
  }
}
const relatedImages = loadRelatedImages();

// 🔥 FUNGSI MANDIRI: Pabrik khusus -rg
// Tidak peduli artikelnya di-skip atau tidak, kalau ada di JSON, sikat!
async function generateRgImages() {
  if (relatedImages.size === 0) return;
  console.log(`\n🚀 Memulai pabrik -rg untuk ${relatedImages.size} gambar...`);
  
  let count = 0;
  for (const cleanPath of relatedImages) {
    const fullPathSource = path.join(process.cwd(), cleanPath);
    
    if (!existsSync(fullPathSource)) {
      console.warn(`⚠️  Sumber asli hilang untuk -rg: ${fullPathSource}`);
      continue;
    }

    const dirName      = path.dirname(cleanPath);
    const ext          = path.extname(cleanPath);
    const baseNameSafe = path.basename(cleanPath, ext).replace(FORBIDDEN_CHARS, "-");
    
    const rgPath = path.join(dirName, `${baseNameSafe}-rg.webp`);
    const absRgPath = path.join(process.cwd(), rgPath);

    // Cek and Skip: Cuma bikin kalau belum ada
    if (!existsSync(absRgPath)) {
      ensureDirForFile(absRgPath);
      try {
        const inputBuffer = await file(fullPathSource).arrayBuffer().then(b => Buffer.from(b));
        
        await sharp(inputBuffer)
        .rotate()
        .resize(150, null, { withoutEnlargement: true }) // Lebar 150px, tinggi proporsional
        .sharpen({ sigma: 0.4 })
        .webp({
          quality: 88,
          preset: 'text',
          smartSubsample: true,
          effort: 6
        })
        .toFile(absRgPath);

        console.log(`  ✨ RG Thumb Dibuat: ${rgPath}`);
        count++;
      } catch (e: any) {
        console.error(`❌ Sharp Error saat membuat -rg untuk ${cleanPath}: ${e?.message || e}`);
      }
    }
  }
  console.log(`✅ Pabrik -rg selesai. Dibuat baru: ${count} file.\n`);
}

// ========== CORE ==========
async function processHtmlFile(htmlPath: string): Promise<string> {
  const htmlContent = await file(htmlPath).text();
  const $ = load(htmlContent, { decodeEntities: false });

  if (htmlContent.includes(PICTURE_SIGNATURE)) return "skipped";

  const imageCandidates = $("body img").toArray().filter(el => {
    const src = $(el).attr("src");
    if (!src) return false;
    const isLocal = src.startsWith("/") || src.startsWith(BASE_URL) || src.includes("/img/");
    if (!isLocal) return false;
    const ext = path.extname(src.split("?")[0]).toLowerCase();
    if (SKIP_EXTENSIONS.has(ext)) return false;
    return true;
  });

  if (imageCandidates.length === 0) return "no-image";

  const pageTitle = $("title").first().text().split(" - ")[0].trim() || "Layar Kosong";
  let isFirstImage = true;
  let imageCounter = 0;
  let fileHasChanged = false;

  function updateImgAttrs(
    $img: Cheerio,
    webDesktopUrl: string,
    webMobileUrl: string | null,
    webMediumUrl: string | null,
    desktopW: number,
    mediumW: number,
    mobileW: number,
    desktopH: number,
    hasMobile: boolean,
    hasMedium: boolean,
    isFirst: boolean
  ) {
    const willHaveSrcset = hasMobile;
    let changed = false;

    const currentW = $img.attr("width");
    const currentH = $img.attr("height");
    if (currentW !== desktopW.toString() || currentH !== desktopH.toString()) {
      $img.attr("width", desktopW.toString());
      $img.attr("height", desktopH.toString());
      changed = true;
    }

    const srcsetCandidates: string[] = [];
    if (hasMobile) srcsetCandidates.push(`${webMobileUrl} ${mobileW}w`);
    if (hasMedium) srcsetCandidates.push(`${webMediumUrl} ${mediumW}w`);
    srcsetCandidates.push(`${webDesktopUrl} ${desktopW}w`);

    const srcsetValue = willHaveSrcset ? srcsetCandidates.join(", ") : "";
    const sizesValue  = willHaveSrcset
    ? `(max-width: ${desktopW + 40}px) calc(100vw - 40px), ${desktopW}px`
    : "";

    const parent = $img.parent();
    if (parent.is("picture")) {
      const existingWebpSources = parent.find('source[type="image/webp"]');
      if (existingWebpSources.length > 0) {
        existingWebpSources.remove();
        changed = true;
      }

      if (willHaveSrcset) {
        const mediumSource = hasMedium
        ? `\n  <source type="image/webp" media="(min-width: ${mobileW + 1}px) and (max-width: ${mediumW}px)" srcset="${webMediumUrl}">`
        : "";
        parent.prepend(
          `<source type="image/webp" media="(max-width: ${mobileW}px)" srcset="${webMobileUrl}">${mediumSource}\n  <source type="image/webp" srcset="${webDesktopUrl}">`
        );
        changed = true;
      } else {
        parent.prepend(`<source type="image/webp" srcset="${webDesktopUrl}">`);
        changed = true;
      }
    }

    const currentSrcset = $img.attr("srcset") || "";
    const currentSizes  = $img.attr("sizes")  || "";

    if (!willHaveSrcset) {
      if (currentSrcset || currentSizes) {
        $img.removeAttr("srcset");
        $img.removeAttr("sizes");
        changed = true;
      }
      return changed;
    }

    if (currentSrcset === srcsetValue && currentSizes === sizesValue) {
      return changed;
    }

    $img.attr("srcset", srcsetValue);
    $img.attr("sizes",  sizesValue);
    changed = true;

    return changed;
  }

  for (const el of imageCandidates) {
    const $img        = $(el);
    const originalSrc = $img.attr("src") || "";
    imageCounter++;

    const cleanPath      = normalizeToRepoPath(originalSrc);
    const fullPathSource = path.join(process.cwd(), cleanPath);

    if (!existsSync(fullPathSource)) {
      console.warn(`⚠️  Gambar tidak ditemukan: ${fullPathSource}`);
      continue;
    }

    try {
      const inputBuffer = await file(fullPathSource).arrayBuffer().then(b => Buffer.from(b));
      const meta = await sharp(inputBuffer).metadata();
      if (!meta?.width || !meta?.height) continue;

      let actualWidth = meta.width;
      let actualHeight = meta.height;
      if (meta.orientation && meta.orientation >= 5) {
        actualWidth = meta.height;
        actualHeight = meta.width;
      }

      const dirName      = path.dirname(cleanPath);
      const ext          = path.extname(cleanPath);
      const baseNameSafe = path.basename(cleanPath, ext).replace(FORBIDDEN_CHARS, "-");

      const needsMobile = actualWidth > TARGET_MOBILE;
      const needsMedium = actualWidth > TARGET_MEDIUM;

      const finalDesktopWidth = actualWidth > TARGET_DESKTOP ? TARGET_DESKTOP : actualWidth;
      const finalMediumWidth  = needsMedium ? TARGET_MEDIUM : actualWidth;
      const finalMobileWidth  = needsMobile ? TARGET_MOBILE : actualWidth;

      const aspectRatio = actualHeight / actualWidth;
      const finalDesktopHeight = Math.round(finalDesktopWidth * aspectRatio);

      const desktopPath = path.join(dirName, `${baseNameSafe}.webp`);
      const mediumPath  = path.join(dirName, `${baseNameSafe}-md.webp`);
      const mobilePath  = path.join(dirName, `${baseNameSafe}-sm.webp`);

      const absDesktopPath = path.join(process.cwd(), desktopPath);
      const absMediumPath  = path.join(process.cwd(), mediumPath);
      const absMobilePath  = path.join(process.cwd(), mobilePath);

      const physicalComplete =
      existsSync(absDesktopPath) &&
      (!needsMedium || existsSync(absMediumPath)) &&
      (!needsMobile || existsSync(absMobilePath));

      if (!optimizedCache.has(cleanPath) || !physicalComplete) {
        if (!physicalComplete) {
          ensureDirForFile(absDesktopPath);

          // 1. DESKTOP
          await sharp(inputBuffer)
          .rotate()
          .resize(finalDesktopWidth, null, { withoutEnlargement: true })
          .sharpen({ sigma: 0.3 })
          .webp({ quality: 92, preset: 'text', smartSubsample: true, effort: 6 })
          .toFile(absDesktopPath);

          if (needsMedium) {
            ensureDirForFile(absMediumPath);
            // 2. MEDIUM
            await sharp(inputBuffer)
            .rotate()
            .resize(finalMediumWidth, null, { withoutEnlargement: true })
            .sharpen({ sigma: 0.4 })
            .webp({ quality: 90, preset: 'text', smartSubsample: true, effort: 6 })
            .toFile(absMediumPath);
          }

          if (needsMobile) {
            ensureDirForFile(absMobilePath);
            // 3. MOBILE
            await sharp(inputBuffer)
            .rotate()
            .resize(finalMobileWidth, null, { withoutEnlargement: true })
            .sharpen({ sigma: 0.5 })
            .webp({ quality: 88, preset: 'text', smartSubsample: true, effort: 6 })
            .toFile(absMobilePath);
          }

          console.log(`  ✨ WebP OK (Infografis Mode): ${cleanPath} (Max: ${finalDesktopWidth}px)`);
        }

        if (!optimizedCache.has(cleanPath)) {
          optimizedCache.add(cleanPath);
          appendFileSync(CACHE_FILE, `${cleanPath}\n`);
        }
      }

      const originalAlt = $img.attr("alt")?.trim();
      let finalAlt = originalAlt || pageTitle;
      if (!originalAlt && imageCounter > 1) finalAlt = `${pageTitle} - ${imageCounter}`;
      if (!originalAlt) $img.attr("alt", finalAlt.replace(/"/g, "&quot;"));

      const webDesktopUrl = `${BASE_URL}/${desktopPath.replace(/\\/g, "/")}`;
      const webMediumUrl  = needsMedium ? `${BASE_URL}/${mediumPath.replace(/\\/g, "/")}` : null;
      const webMobileUrl  = needsMobile ? `${BASE_URL}/${mobilePath.replace(/\\/g, "/")}` : null;

      const changed = updateImgAttrs(
        $img,
        webDesktopUrl, webMobileUrl, webMediumUrl,
        finalDesktopWidth, finalMediumWidth, finalMobileWidth, finalDesktopHeight,
        needsMobile, needsMedium, isFirstImage
      );

      if (changed) {
        isFirstImage   = false;
        fileHasChanged = true;
      }

    } catch (e: any) {
      console.error(`❌ Sharp Error pada ${cleanPath}: ${e?.message || e}`);
    }
  }

  if (!fileHasChanged) return "no-change";

  let finalHtml   = $.html();
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

  // 🔥 EKSEKUSI PABRIK -RG DI SINI! (Dijalankan secara independen)
  await generateRgImages();

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
      continue; // Nah ini dia biang keroknya sebelumnya!
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
  ⏭️ Di-skip      : ${results.skipped}
  🖼️ Tanpa gambar : ${results.noImage}
  ❌ File hilang  : ${results.missing}

  🖼️ Output WebP  → img/            (akan di-commit ke repo)
  📄 HTML         → folder kategori  (runner only, tidak di-commit)
  `);
}

main();
