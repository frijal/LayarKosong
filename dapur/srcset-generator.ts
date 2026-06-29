import { file, write } from "bun";
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { load } from "cheerio";
import path, { join } from "node:path";
import sharp from "sharp";

// ========== CONFIG ==========
const BASE_URL = "https://dalam.web.id";
const CACHE_FILE = "mini/srcset-gambar.txt"; // Target sinkronisasi catatan
const ARTIKEL_LITE = "artikel-lite.json"; 
const FORBIDDEN_CHARS = /[*:"<>|?]/g;
const PICTURE_SIGNATURE = "srcset_oleh_Fakhrul_Rijal";

const SKIP_EXTENSIONS = new Set([".svg", ".ico", ".gif"]);
const ALLOWED_CATEGORIES = [
  "gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno",
];

// 🔥 STANDAR CORE WEB VITALS (CWV)
const TARGET_DESKTOP = 1208;
const TARGET_MEDIUM  = 960;
const TARGET_MOBILE  = 720;

// ========== GLOBAL SETS ==========
const activeCache = new Set<string>(); // Untuk menampung daftar fresh

mkdirSync(path.dirname(CACHE_FILE), { recursive: true });

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

// 🔥 HELPER: Ambil gambar untuk -rg dari JSON Lite
function loadRelatedImages() {
  const imageSet = new Set<string>();
  if (!existsSync(ARTIKEL_LITE)) return imageSet;

  try {
    const data = JSON.parse(readFileSync(ARTIKEL_LITE, "utf-8"));
    for (const cat of Object.values(data)) {
      if (Array.isArray(cat)) {
        for (const item of cat) {
          if (Array.isArray(item) && typeof item[2] === "string") {
            const cleanPath = normalizeToRepoPath(item[2]);
            imageSet.add(cleanPath);
            // Daftarkan juga ke cache agar tidak dianggap zombie oleh Tukang Sapu
            activeCache.add(cleanPath); 
          }
        }
      }
    }
  } catch (e) {}
  return imageSet;
}
const relatedImages = loadRelatedImages();

async function generateRgImages() {
  let count = 0;
  for (const cleanPath of relatedImages) { 
    const fullPathSource = path.join(process.cwd(), cleanPath);
    if (!existsSync(fullPathSource)) continue;

    const dirName      = path.dirname(cleanPath);
    const ext          = path.extname(cleanPath);
    const baseNameSafe = path.basename(cleanPath, ext).replace(FORBIDDEN_CHARS, "-");
    
    const rgPath = path.join(dirName, `${baseNameSafe}-rg.webp`);
    const absRgPath = path.join(process.cwd(), rgPath);

    if (!existsSync(absRgPath)) {
      ensureDirForFile(absRgPath);
      try {
        const inputBuffer = await file(fullPathSource).arrayBuffer().then(b => Buffer.from(b));
        await sharp(inputBuffer)
        .rotate()
        .resize(150, null, { withoutEnlargement: true })
        .sharpen({ sigma: 0.4 })
        .webp({ quality: 88, preset: 'text', smartSubsample: true, effort: 6 })
        .toFile(absRgPath);

        count++;
      } catch (e: any) {}
    }
  }
  return count;
}

// ========== CORE ==========
async function processHtmlFile(htmlPath: string): Promise<string> {
  const htmlContent = await file(htmlPath).text();
  const $ = load(htmlContent, { decodeEntities: false });

  // SENSUS GAMBAR: Daftarkan semua img ke activeCache
  const imageCandidates = $("body img").toArray().filter(el => {
    const src = $(el).attr("src");
    if (!src) return false;
    const isLocal = src.startsWith("/") || src.startsWith(BASE_URL) || src.includes("/img/");
    if (!isLocal) return false;
    const ext = path.extname(src.split("?")[0]).toLowerCase();
    if (SKIP_EXTENSIONS.has(ext)) return false;

    // WAJIB: Masukkan ke sensus aktif agar Tukang Sapu tidak salah hapus
    activeCache.add(normalizeToRepoPath(src));
    return true;
  });

  // JIKA HTML SUDAH ADA SIGNATURE, langsung skip tanpa proses ulang, TAPI sensusnya sudah aman di atas.
  if (htmlContent.includes(PICTURE_SIGNATURE)) return "skipped";

  if (imageCandidates.length === 0) return "no-image";

  const pageTitle = $("title").first().text().split(" - ")[0].trim() || "Layar Kosong";
  let isFirstImage = true;
  let imageCounter = 0;
  let fileHasChanged = false;

  function updateImgAttrs(
    $img: Cheerio, webDesktopUrl: string, webMobileUrl: string | null, webMediumUrl: string | null,
    desktopW: number, mediumW: number, mobileW: number, desktopH: number,
    hasMobile: boolean, hasMedium: boolean, isFirst: boolean
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

    if (!existsSync(fullPathSource)) continue;

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

      const needsMobile = actualWidth > TARGET_MOBILE;
      const needsMedium = actualWidth > TARGET_MEDIUM;

      const finalDesktopWidth = actualWidth > TARGET_DESKTOP ? TARGET_DESKTOP : actualWidth;
      const finalMediumWidth  = needsMedium ? TARGET_MEDIUM : actualWidth;
      const finalMobileWidth  = needsMobile ? TARGET_MOBILE : actualWidth;

      const aspectRatio = actualHeight / actualWidth;
      const finalDesktopHeight = Math.round(finalDesktopWidth * aspectRatio);

      const dirName      = path.dirname(cleanPath);
      const ext          = path.extname(cleanPath);
      const baseNameSafe = path.basename(cleanPath, ext).replace(FORBIDDEN_CHARS, "-");

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

      if (!physicalComplete) {
        ensureDirForFile(absDesktopPath);

        // 1. DESKTOP
        await sharp(inputBuffer)
        .rotate()
        .resize(finalDesktopWidth, null, { withoutEnlargement: true })
        .sharpen({ sigma: 0.3 })
        .webp({ quality: 92, preset: 'text', smartSubsample: true, effort: 6 })
        .toFile(absDesktopPath);

        // 2. MEDIUM
        if (needsMedium) {
          ensureDirForFile(absMediumPath);
          await sharp(inputBuffer)
          .rotate()
          .resize(finalMediumWidth, null, { withoutEnlargement: true })
          .sharpen({ sigma: 0.4 })
          .webp({ quality: 90, preset: 'text', smartSubsample: true, effort: 6 })
          .toFile(absMediumPath);
        }

        // 3. MOBILE
        if (needsMobile) {
          ensureDirForFile(absMobilePath);
          await sharp(inputBuffer)
          .rotate()
          .resize(finalMobileWidth, null, { withoutEnlargement: true })
          .sharpen({ sigma: 0.5 })
          .webp({ quality: 88, preset: 'text', smartSubsample: true, effort: 6 })
          .toFile(absMobilePath);
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
        $img, webDesktopUrl, webMobileUrl, webMediumUrl,
        finalDesktopWidth, finalMediumWidth, finalMobileWidth, finalDesktopHeight,
        needsMobile, needsMedium, isFirstImage
      );

      if (changed) {
        isFirstImage   = false;
        fileHasChanged = true;
      }

    } catch (e: any) {}
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
  console.log("🚀 Memulai Srcset & Thumbnail Generator...");
  console.log("🔍 Mengecek dan merekap seluruh data gambar aktif...");

  const allFiles = ALLOWED_CATEGORIES.flatMap(cat => {
    try {
      return readdirSync(cat)
      .filter(f => f.endsWith(".html") && f !== "index.html")
      .map(f => join(cat, f));
    } catch {
      return [];
    }
  });

  const results = { processed: 0, skipped: 0, noImage: 0 };

  for (const htmlPath of allFiles) {
    const result = await processHtmlFile(htmlPath);
    if (result === "processed") results.processed++;
    if (result === "skipped")   results.skipped++;
    if (result === "no-image")  results.noImage++;
  }

  const rgCreatedCount = await generateRgImages();

  // 🔥 UPDATE BUKU CATATAN (Sinkronisasi Penuh) 🔥
  // Mengganti isi lama dengan data fresh hasil sensus, agar Tukang Sapu tidak tertipu!
  const sortedCache = Array.from(activeCache).sort();
  writeFileSync(CACHE_FILE, sortedCache.join("\n") + "\n");

  console.log(`
✅ SELESAI: Generator Selesai & Buku Catatan Diperbarui
-------------------------------------
🖼️  File HTML Diproses  : ${results.processed} (Baru diinjeksi srcset)
⏭️  File HTML Di-skip   : ${results.skipped} (Aman)
📄  HTML Tanpa Gambar   : ${results.noImage}
🎯  Target JSON Lite    : ${relatedImages.size} file -rg
✨  Thumbnail -rg Baru  : ${rgCreatedCount} file dibuat
📝  Catatan Srcset Baru : ${activeCache.size} gambar ditulis ulang ke srcset-gambar.txt
-------------------------------------
Sekarang Tukang Sapu sudah bisa dipanggil untuk merazia zombie! 🧹
`);
}

main();
