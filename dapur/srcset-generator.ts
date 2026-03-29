import { file, write } from "bun";
import { existsSync, readFileSync, appendFileSync, mkdirSync, readdirSync } from "node:fs";
import { load } from "cheerio";
import path, { join } from "node:path";
import sharp from "sharp";

// ========== CONFIG ==========
const BASE_URL = "https://dalam.web.id";
const SITEMAP_FILE = "sitemap.txt";
const CACHE_FILE = "mini/srcset-gambar.txt";
const FORBIDDEN_CHARS = /[*:"<>|?]/g;
const PICTURE_SIGNATURE = "srcset_oleh_Fakhrul_Rijal";

const SKIP_EXTENSIONS = new Set([".svg", ".ico", ".gif"]);
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

// ========== CORE ==========
async function processHtmlFile(htmlPath: string): Promise<string> {
  const htmlContent = await file(htmlPath).text();
  const $ = load(htmlContent, { decodeEntities: false });

  // Skip jika sudah ada signature — artikel sudah pernah diproses
  if (htmlContent.includes(PICTURE_SIGNATURE)) return "skipped";

  // Kumpulkan kandidat gambar — lokal atau BASE_URL, bukan skip ext
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

  /**
   * updateImgAttrs
   * - Hanya bertanggung jawab untuk menambahkan/menyesuaikan srcset dan sizes
   * - Tidak mengubah style, width, height, atau atribut presentasi lainnya
   * - Jika hanya ada satu kandidat (desktop saja), tidak menambahkan srcset (menghindari single-entry)
   * - Jika parent adalah <picture>, menambahkan <source type="image/webp"> secara idempotent
   * - Mengembalikan true jika ada perubahan pada atribut srcset/sizes atau pada <picture> sources
   */
  function updateImgAttrs($img: Cheerio, webDesktopUrl: string, webMobileUrl: string | null, meta: any, isFirst: boolean) {
    const desktopWidth = meta.width > 1000 ? 1000 : meta.width;
    const mobileWidth = 480;
    const hasMobile = !!webMobileUrl && meta.width > mobileWidth;

    // Hanya buat srcset jika ada mobile + desktop (lebih dari 1 kandidat)
    const willHaveSrcset = hasMobile;

    // Siapkan nilai srcset dan sizes (hanya relevan bila multi-candidate)
    const srcsetValue = willHaveSrcset ? `${webMobileUrl} ${mobileWidth}w, ${webDesktopUrl} ${desktopWidth}w` : "";
    const sizesValue = willHaveSrcset ? "(max-width: 640px) 100vw, 1000px" : "";

    let changed = false;

    // Jika parent adalah <picture>, tambahkan <source type="image/webp"> (idempotent)
    const parent = $img.parent();
    if (parent.is("picture")) {
      // Hapus source webp lama agar idempotent
      const existingWebpSources = parent.find('source[type="image/webp"]');
      if (existingWebpSources.length > 0) {
        existingWebpSources.remove();
        changed = true;
      }

      // Tambahkan sources sesuai kandidat (mobile dulu agar media query bekerja)
      if (willHaveSrcset) {
        parent.prepend(`<source type="image/webp" media="(max-width:500px)" srcset="${webMobileUrl}">`);
        parent.prepend(`<source type="image/webp" srcset="${webDesktopUrl}">`);
        changed = true;
      } else {
        // hanya desktop source
        parent.prepend(`<source type="image/webp" srcset="${webDesktopUrl}">`);
        changed = true;
      }
    }

    // --- Update atribut pada <img> ---
    const currentSrcset = $img.attr("srcset") || "";
    const currentSizes = $img.attr("sizes") || "";

    if (!willHaveSrcset) {
      // Jika tidak perlu srcset (hanya desktop), hapus srcset/sizes lama jika ada
      if (currentSrcset || currentSizes) {
        $img.removeAttr("srcset");
        $img.removeAttr("sizes");
        changed = true;
      }
      // Jangan mengubah src, width, height, style, loading, decoding, fetchpriority
      return changed;
    }

    // Jika sudah identik, tidak perlu mengubah
    if (currentSrcset === srcsetValue && currentSizes === sizesValue) {
      return changed;
    }

    // Terapkan hanya srcset dan sizes — jangan sentuh atribut lain
    $img.attr("srcset", srcsetValue);
    $img.attr("sizes", sizesValue);
    changed = true;

    return changed;
  }

  // Loop kandidat gambar
  for (const el of imageCandidates) {
    const $img = $(el);
    const originalSrc = $img.attr("src") || "";
    imageCounter++;

    // Normalize path ke repo-relative
    const cleanPath = normalizeToRepoPath(originalSrc);
    const fullPathSource = path.join(process.cwd(), cleanPath);

    // Debug log (bisa dihapus jika tidak perlu)
    console.log(`Processing image: original=${originalSrc} clean=${cleanPath} full=${fullPathSource}`);

    if (!existsSync(fullPathSource)) {
      console.warn(`⚠️  Gambar tidak ditemukan: ${fullPathSource}`);
      continue;
    }

    try {
      const inputBuffer = await file(fullPathSource).arrayBuffer().then(b => Buffer.from(b));
      const meta = await sharp(inputBuffer).metadata();
      if (!meta?.width || !meta?.height) continue;

      const dirName = path.dirname(cleanPath);
      const ext = path.extname(cleanPath);
      const baseNameSafe = path.basename(cleanPath, ext).replace(FORBIDDEN_CHARS, "-");

      const desktopPath = path.join(dirName, `${baseNameSafe}.webp`);
      const mobilePath = path.join(dirName, `${baseNameSafe}-sm.webp`);
      const absDesktopPath = path.join(process.cwd(), desktopPath);
      const absMobilePath = path.join(process.cwd(), mobilePath);
      const needsMobile = meta.width > 480;
      const physicalComplete = existsSync(absDesktopPath) && (!needsMobile || existsSync(absMobilePath));

      // Generate .webp jika belum ada
      if (!optimizedCache.has(cleanPath) || !physicalComplete) {
        if (!physicalComplete) {
          ensureDirForFile(absDesktopPath);
          const targetWidth = meta.width > 1000 ? 1000 : meta.width;
          await sharp(inputBuffer)
          .rotate()
          .resize(targetWidth, null, { withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(absDesktopPath);

          if (needsMobile) {
            ensureDirForFile(absMobilePath);
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

      // Transformasi HTML — hanya update srcset/sizes dan <picture> sources
      const originalAlt = $img.attr("alt")?.trim();
      let finalAlt = originalAlt || pageTitle;
      if (!originalAlt && imageCounter > 1) finalAlt = `${pageTitle} - ${imageCounter}`;
      if (!originalAlt) $img.attr("alt", finalAlt.replace(/"/g, "&quot;"));

      const webDesktopUrl = `${BASE_URL}/${desktopPath.replace(/\\/g, "/")}`;
      const webMobileUrl = needsMobile ? `${BASE_URL}/${mobilePath.replace(/\\/g, "/")}` : null;

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
    if (result === "skipped") results.skipped++;
    if (result === "no-image") results.noImage++;
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
