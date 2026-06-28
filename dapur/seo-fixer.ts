import { Glob } from "bun";
import { load } from "cheerio";
import path from "node:path";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// --- KONFIGURASI ---
const BASE_URL      = "https://dalam.web.id";
const TARGET_FOLDER = process.argv[2] || "artikel";
const CHUNK_SIZE    = 10;

// Set Lock untuk mencegah Race Condition (TOCTOU) saat parallel download
const downloadingUrls = new Set<string>();

// --- HELPER UTILS ---
const normalizeText = (text: string): string => {
return String(text || "")
.replace(/\s+/g, " ")
.trim();
};

const prepareDesc = (text: string): string => {
return normalizeText(text);
};

const toWebPath = (value: string): string => {
return String(value || "")
.replace(/\\/g, "/")
.replace(/^\.\//, "")
.replace(/^\/+/, "")
.replace(/\/+$/, "");
};

const getImageMimeType = (imageUrl: string): string => {
try {
const parsed = imageUrl.startsWith("http")
? new URL(imageUrl)
: new URL(imageUrl, BASE_URL);

const ext = path.extname(parsed.pathname).toLowerCase();

if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
if (ext === ".png") return "image/png";
if (ext === ".webp") return "image/webp";
if (ext === ".avif") return "image/avif";
if (ext === ".gif") return "image/gif";
if (ext === ".svg") return "image/svg+xml";

return "image/webp";
} catch {
return "image/webp";
}
};

const toUTCIso = (val: string | undefined, fallback: string): string => {
if (!val) return fallback;
const parsed = new Date(val);
return isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
};

/**
* Ekstraksi Regex Tahan Banting: Menangani urutan property dan content yang tertukar
*/
const extractExistingDate = async (file: string): Promise<string> => {
const content = await Bun.file(file).text();
const match =
content.match(/property="article:published_time"[^>]*content="(\d{4}-\d{2}-\d{2})/i) ||
content.match(/content="(\d{4}-\d{2}-\d{2})[^"]*"[^>]*property="article:published_time"/i);

return match ? match[1] : new Date().toISOString().split("T")[0];
};

/**
* Pre-generate fallback timestamps dengan ms acak
*/
const buildFallbackMap = async (files: string[]): Promise<Map<string, string>> => {
const map = new Map<string, string>();
const dateParts = await Promise.all(files.map(extractExistingDate));
const usedSecondsPerDate = new Map<string, Set<number>>();

for (let i = 0; i < files.length; i++) {
const file = files[i];
const datePart = dateParts[i];

if (!usedSecondsPerDate.has(datePart)) {
usedSecondsPerDate.set(datePart, new Set<number>());
}

const usedSeconds = usedSecondsPerDate.get(datePart)!;
let sec: number;

do {
sec = Math.floor(Math.random() * 86_400);
} while (usedSeconds.has(sec));

usedSeconds.add(sec);

const hh = Math.floor(sec / 3600).toString().padStart(2, "0");
const mm = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
const ss = (sec % 60).toString().padStart(2, "0");

// Minor Fix: Milidetik acak biar natural
const ms = Math.floor(Math.random() * 1000).toString().padStart(3, "0");

map.set(file, `${datePart}T${hh}:${mm}:${ss}.${ms}Z`);
}

return map;
};

// --- CORE FUNCTIONS ---

async function mirrorAndConvert(externalUrl: string, baseUrl: string): Promise<string> {
try {
const url = new URL(externalUrl);
const baseHostname = new URL(baseUrl).hostname;

if (
url.hostname === baseHostname ||
url.hostname === "localhost" ||
url.hostname === "schema.org"
) {
return externalUrl.replace(baseUrl, "");
}

const cleanUrl = externalUrl.split("?")[0];
const fileHash = Bun.hash(cleanUrl).toString(16);

const paramFormat = url.searchParams.get("format");
const pathExt = path.extname(url.pathname).toLowerCase();
const detectedExt = paramFormat ? `.${paramFormat}` : pathExt;

const isSvg = detectedExt === ".svg";
const isGif = detectedExt === ".gif";
const finalExt = (isSvg || isGif) ? detectedExt : ".webp";

const safeHostname = url.hostname.replace(/[^a-z0-9.]/gi, "_");
const localPath = path.join("img", safeHostname, `${fileHash}${finalExt}`);
const fileTarget = Bun.file(localPath);

// Fix Race Condition
if (downloadingUrls.has(cleanUrl)) {
// Tunggu jika ada proses lain yang sedang mendownload gambar yang sama
while (downloadingUrls.has(cleanUrl)) {
await Bun.sleep(100);
}
if (await fileTarget.exists()) {
return `/${localPath.replace(/\\/g, "/")}`;
}
}

downloadingUrls.add(cleanUrl);

try {
if (await fileTarget.exists()) {
return `/${localPath.replace(/\\/g, "/")}`;
}

// Fix Fetch Timeout (15 detik)
const response = await fetch(externalUrl, {
signal: AbortSignal.timeout(15_000),
headers: {
"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
}
});

if (!response.ok) {
throw new Error(`Download Gagal: ${response.status}`);
}

const buffer = Buffer.from(await response.arrayBuffer());
await mkdir(path.dirname(localPath), { recursive: true });

if (isSvg || isGif) {
await Bun.write(localPath, buffer);
} else {
// 🔥 UPDATE SHARP: Mode Infografis (Teks Tajam, Tanpa Blur)
await sharp(buffer)
.rotate()
// Menambahkan sharpen ringan untuk mengembalikan detail yang hilang saat konversi format
.sharpen({ sigma: 0.3 }) 
.webp({ 
quality: 95,            // Kualitas dinaikkan sedikit karena ini master image
preset: 'text',         // Mencegah blur/mbleber pada teks (infografis mode)
smartSubsample: true,   // Mempertahankan kontras warna tajam
effort: 6               // Pencarian kompresi maksimal
})
.toFile(localPath);
}

return `/${localPath.replace(/\\/g, "/")}`;
} finally {
downloadingUrls.delete(cleanUrl);
}
} catch (e) {
return externalUrl; // Fallback ke URL asli jika error/timeout
}
}

async function processFile(file: string, baseUrl: string, fallbackTime: string) {
const rawContent = await Bun.file(file).text();
const baseName = path.basename(file);

console.log(`🚀 SEO Turbo: ${baseName}`);

const $ = load(rawContent, { decodeEntities: false });
const head = $("head");

if (head.length === 0) {
console.warn(`⚠️ File dilewati karena tidak punya <head>: ${file}`);
return;
}

// --- 1A. MIRRORING GAMBAR DALAM <img> ---
const imgElements = $("img").toArray();
await Promise.all(imgElements.map(async (el) => {
const src = $(el).attr("src");
if (src && src.startsWith("http")) {
const localPath = await mirrorAndConvert(src, baseUrl);
if (localPath.startsWith("/img")) {
$(el).attr("src", `${baseUrl}${localPath}`);
}
}
}));

// --- 1B. MIRRORING GAMBAR DALAM <source srcset="..."> ---
const sourceElements = $("source").toArray();
await Promise.all(sourceElements.map(async (el) => {
const srcset = $(el).attr("srcset");
if (srcset) {
// Pisahkan per gambar (URL ukuran)
const parts = srcset.split(",").map(s => s.trim());
const newParts = await Promise.all(parts.map(async (part) => {
const [url, size] = part.split(/\s+/);
if (url && url.startsWith("http")) {
const localUrl = await mirrorAndConvert(url, baseUrl);
return size ? `${baseUrl}${localUrl} ${size}` : `${baseUrl}${localUrl}`;
}
return part;
}));
$(el).attr("srcset", newParts.join(", "));
}
}));

// --- 2. LOGIKA DATA SEO ---
const rawTitle = $("title").text().trim() || "Layar Kosong";
const ogTitle = rawTitle.replace(/\s*-\s*Layar Kosong$/i, "").trim() || "Layar Kosong";
const seoTitle = ogTitle === "Layar Kosong" ? "Layar Kosong" : `${ogTitle} - Layar Kosong`;

const cleanFileName = baseName.replace(/\.html$/i, "");
const canonicalBase = toWebPath(TARGET_FOLDER);
const canonicalPath = canonicalBase ? `${canonicalBase}/${cleanFileName}` : cleanFileName;
const canonicalUrl = `${baseUrl}/${canonicalPath}`.replace(/\/$/, "");

const rawMetaDesc = $('meta[name="description"], meta[property="description"]').attr("content") || "";
const rawOgDesc = $('meta[property="og:description"]').attr("content") || "";
const rawTwitterDesc = $('meta[name="twitter:description"]').attr("content") || "";
const rawNewsKeys = $('meta[name="news_keywords"]').attr("content") || "";
const rawPromphint = $('meta[name="promphint"]').attr("content") || "";

const publishedTime = toUTCIso($('meta[property="article:published_time"]').attr("content"), fallbackTime);

// Fix: modified_time selalu update ke waktu saat proses script berjalan
const modifiedTime = new Date().toISOString();

const existingTags: string[] = [];
$('meta[property="article:tag"]').each((_, el) => {
const tag = $(el).attr("content")?.trim();
if (tag) existingTags.push(tag);
});
const uniqueTags = Array.from(new Set(existingTags));

const firstP = $("p").first().text().trim();
const fallbackDesc = firstP
? prepareDesc(firstP.substring(0, 160))
: "Layar Kosong - Catatan dan Opini.";

const finalMetaDesc = prepareDesc(rawMetaDesc || fallbackDesc);
const finalOgDesc = prepareDesc(rawOgDesc || rawMetaDesc || fallbackDesc);
const finalTwitterDesc = prepareDesc(rawTwitterDesc || rawMetaDesc || fallbackDesc);

const finalNewsKeywords = prepareDesc(
rawNewsKeys ||
uniqueTags.join(", ") ||
`${ogTitle}, Layar Kosong` // Menghilangkan tag kategori dari fallback
);

const finalPromphint = prepareDesc(
rawPromphint ||
`${ogTitle} | ${fallbackDesc}`
);

let metaImgUrl = $('meta[property="og:image"]').attr("content") ||
$('meta[name="twitter:image"]').attr("content") ||
$("img").first().attr("src") ||
"/thumbnail.webp";

if (metaImgUrl && metaImgUrl.startsWith("http")) {
const mirroredPath = await mirrorAndConvert(metaImgUrl, baseUrl);
if (mirroredPath.startsWith("/img")) {
metaImgUrl = `${baseUrl}${mirroredPath}`;
} else {
metaImgUrl = mirroredPath;
}
} else {
metaImgUrl = new URL(metaImgUrl, canonicalUrl).href;
}

const imageMimeType = getImageMimeType(metaImgUrl);

// --- FIX: BACA DIMENSI GAMBAR ASLI UNTUK OG:IMAGE ---
let ogImageWidth = "1024";
let ogImageHeight = "633";

try {
let localImgPathForMeta = "";
if (metaImgUrl.startsWith(baseUrl)) {
localImgPathForMeta = path.join(process.cwd(), metaImgUrl.replace(baseUrl, ""));
} else if (metaImgUrl.startsWith("/img")) {
localImgPathForMeta = path.join(process.cwd(), metaImgUrl);
}

if (localImgPathForMeta && await Bun.file(localImgPathForMeta).exists()) {
const imgMeta = await sharp(localImgPathForMeta).metadata();
ogImageWidth = imgMeta.width?.toString() || "1024";
ogImageHeight = imgMeta.height?.toString() || "633";
}
} catch (err) {
// Abaikan error, tetap pakai fallback 1024x633
}

// --- 3. OPERASI STERILISASI (CLEANUP) ---
$("html")
.attr("lang", "id")
.attr("prefix", "og: https://ogp.me/ns# article: https://ogp.me/ns/article#");

$("title").remove();
$("meta[charset]").remove();
$('meta[name="viewport"]').remove();

$([
'link[rel="canonical"]',
'link[rel="icon"]',
'link[rel="shortcut icon"]',
'link[rel="license"]',
'link[rel="sitemap"]',
'link[rel="search"]',
'link[rel="manifest"]',
'link[rel="alternate"]',
'link[rel="me"]'
].join(", ")).remove();

$('script[src="/ext/data-provider.js"]').remove();

$([
'meta[itemprop="image"]',
'meta[name="application-name"]',
'meta[name="apple-mobile-web-app-title"]',
'meta[name="author"]',
'meta[name="color-scheme"]',
'meta[name="description"]',
'meta[name="googlebot"]',
'meta[name="news_keywords"]',
'meta[name="promphint"]',
'meta[name="referrer"]',
'meta[name="robots"]',
'meta[name="theme-color"]',
'meta[name^="bluesky:"]',
'meta[name^="fediverse:"]',
'meta[name^="twitter:"]',
'meta[property="description"]',
'meta[property="fb:app_id"]',
'meta[property="fb:pages"]',
'meta[property^="article:"]',
'meta[property^="og:"]',
'meta[property^="twitter:"]'
].join(", ")).remove();

// --- 4. PENYUNTIKAN (INJECT) DATA BARU ---
const htmlTag = {
title(text: string) { return $.html($("<title></title>").text(text)); },
metaCharset(charset: string) { return $.html($("<meta>").attr("charset", charset)); },
metaName(name: string, content: string) { return $.html($("<meta>").attr("name", name).attr("content", content)); },
metaProperty(property: string, content: string) { return $.html($("<meta>").attr("property", property).attr("content", content)); },
link(attrs: Record<string, string>) {
const el = $("<link>");
Object.entries(attrs).forEach(([key, value]) => el.attr(key, value));
return $.html(el);
},
script(attrs: Record<string, string>) {
const el = $("<script></script>");
Object.entries(attrs).forEach(([key, value]) => el.attr(key, value));
return $.html(el);
}
};

const metaTags = [
htmlTag.metaCharset("UTF-8"),
htmlTag.metaName("viewport", "width=device-width,initial-scale=1"),
htmlTag.title(seoTitle),
htmlTag.metaName("description", finalMetaDesc),
htmlTag.link({ rel: "canonical", href: canonicalUrl }),
htmlTag.metaName("robots", "index,follow,max-snippet:-1,max-video-preview:-1,max-image-preview:large"),
htmlTag.metaName("googlebot", "index,follow,max-snippet:-1,max-video-preview:-1,max-image-preview:large"),
htmlTag.metaName("author", "Fakhrul Rijal"),
htmlTag.metaName("theme-color", "#00b0ed"),
htmlTag.metaName("color-scheme", "light dark"),
htmlTag.metaName("referrer", "strict-origin-when-cross-origin"),
htmlTag.metaName("application-name", "Layar Kosong"),
htmlTag.metaName("apple-mobile-web-app-title", "Layar Kosong"),
htmlTag.metaName("news_keywords", finalNewsKeywords),
htmlTag.metaName("promphint", finalPromphint),
htmlTag.metaProperty("og:site_name", "Layar Kosong"),
htmlTag.metaProperty("og:locale", "id_ID"),
htmlTag.metaProperty("og:type", "article"),
htmlTag.metaProperty("og:url", canonicalUrl),
htmlTag.metaProperty("og:title", ogTitle),
htmlTag.metaProperty("og:description", finalOgDesc),
htmlTag.metaProperty("og:updated_time", modifiedTime),
htmlTag.metaProperty("og:image", metaImgUrl),
htmlTag.metaProperty("og:image:url", metaImgUrl),
htmlTag.metaProperty("og:image:secure_url", metaImgUrl),
htmlTag.metaProperty("og:image:alt", ogTitle),
htmlTag.metaProperty("og:image:width", ogImageWidth), // Fix Dimensi Dinamis
htmlTag.metaProperty("og:image:height", ogImageHeight), // Fix Dimensi Dinamis
htmlTag.metaProperty("og:image:type", imageMimeType),
htmlTag.metaName("twitter:card", "summary_large_image"),
htmlTag.metaName("twitter:domain", "dalam.web.id"),
htmlTag.metaName("twitter:url", canonicalUrl),
htmlTag.metaName("twitter:title", ogTitle),
htmlTag.metaName("twitter:description", finalTwitterDesc),
htmlTag.metaName("twitter:image", metaImgUrl),
htmlTag.metaName("twitter:image:alt", ogTitle),
htmlTag.metaName("twitter:widgets:new-embed-design", "on"),
htmlTag.metaName("twitter:site", "@responaja"),
htmlTag.metaName("twitter:creator", "@responaja"),
htmlTag.metaName("bluesky:creator", "@dalam.web.id"),
htmlTag.metaName("fediverse:creator", "@frijal@mastodon.social"),
htmlTag.metaProperty("article:author", "https://facebook.com/frijal"),
htmlTag.metaProperty("article:publisher", "https://facebook.com/frijalpage"),
htmlTag.metaProperty("fb:app_id", "175216696195384"),
htmlTag.metaProperty("fb:pages", "917962134736490"),
htmlTag.link({ rel: "icon", href: "/favicon.svg", type: "image/svg+xml", sizes: "any" }),
htmlTag.link({ rel: "manifest", href: "/site.webmanifest" }),
htmlTag.link({ rel: "sitemap", type: "application/xml", href: "/sitemap.xml" }),
htmlTag.link({ rel: "alternate", type: "application/rss+xml", title: "Feed 30 artikel baru bikin.", href: `${baseUrl}/rss.xml` }),
htmlTag.link({ rel: "alternate", type: "application/atom+xml", title: "Atom 30 artikel baru bikin.", href: `${baseUrl}/atom.xml` }),
htmlTag.link({ rel: "search", type: "application/opensearchdescription+xml", title: "Layar Kosong", href: "/opensearch.xml" }),
htmlTag.link({ rel: "license", href: "https://creativecommons.org/licenses/by/4.0/" }),
htmlTag.link({ rel: "me", href: "https://mastodon.social/@frijal" }),
htmlTag.link({ rel: "me", href: "https://github.com/frijal" }),
htmlTag.script({ defer: "", src: "/ext/data-provider.js" })
];

uniqueTags.forEach(tag => {
metaTags.push(htmlTag.metaProperty("article:tag", tag));
});

metaTags.push(htmlTag.metaProperty("article:published_time", publishedTime));
metaTags.push(htmlTag.metaProperty("article:modified_time", modifiedTime));

head.prepend("\n    " + metaTags.join("\n    ") + "\n");

$("img").each((_, el) => {
if (!$(el).attr("alt")) {
$(el).attr("alt", seoTitle);
}
});

const finalHtml = $.html()
.replace(/\u00A0/g, " ")
.replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
.replace(/^\s*[\r\n]/gm, "");

await Bun.write(file, finalHtml);
}

async function fixSEO() {
const baseUrl = BASE_URL;
console.log("🧼 Memulai SEO Fixer (Bun Turbo TS Mode)...");

const startTime = performance.now();
const glob = new Glob(`${TARGET_FOLDER}/*.html`);
const files: string[] = [];

for await (const file of glob.scan(".")) {
files.push(file);
}

if (files.length === 0) {
console.log(`⚠️ Tidak ada file HTML ditemukan di folder: ${TARGET_FOLDER}`);
return;
}

const fallbackMap = await buildFallbackMap(files);
console.log(`📅 ${fallbackMap.size} fallback timestamps di-pre-generate (tanggal asli terkunci, waktu unik).`);

for (let i = 0; i < files.length; i += CHUNK_SIZE) {
const chunk = files.slice(i, i + CHUNK_SIZE);
await Promise.all(
chunk.map(file => processFile(file, baseUrl, fallbackMap.get(file)!))
);
}

const duration = (performance.now() - startTime) / 1000;
console.log(`\n✅ Selesai! ${files.length} artikel diproses dalam ${duration.toFixed(2)} detik.`);
}

fixSEO().catch(err => {
console.error(err);
process.exit(1);
});
