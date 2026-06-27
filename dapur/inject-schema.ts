import { file, write } from "bun";
import { existsSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

// ========== TYPES ==========
type ArticleEntry = [string, string, string, string, string?];
type ArtikelData = Record<string, ArticleEntry[]>;

interface PrimaryImageMeta {
  url: string;
  contentUrl: string;
  width: number;
  height: number;
  caption: string;
  encodingFormat?: string;
}

interface ExtractedMeta {
  articleUrl: string;
  headline: string;
  pageTitle: string;
  description: string;
  siteName: string;
  authorName: string;
  language: string;
  datePublished: string;
  dateModified: string;
  licenseUrl: string;
  articleTags: string[];
  newsKeywords: string[];
  primaryImage: PrimaryImageMeta;
  articleAuthorProfile: string;
  articlePublisherProfile: string;
  twitterCreatorProfile: string;
  twitterSiteProfile: string;
  blueskyProfile: string;
  fediverseProfile: string;
}

// ========== CONFIG ==========
const BASE_URL         = "https://dalam.web.id";
const SITE_NAME        = "Layar Kosong";
const SITE_DESCRIPTION = "Catatan digital tentang teknologi, sejarah, sosial, budaya, dan kehidupan.";
const AUTHOR           = "Fakhrul Rijal";
const LICENSE_URL      = "https://creativecommons.org/licenses/by/4.0/";
const LANGUAGE         = "id-ID";

// Default untuk blog. Kalau mau generik, ganti menjadi "Article".
const SCHEMA_ARTICLE_TYPE = "BlogPosting";

const LOGO_URL    = "https://dalam.web.id/favicon.svg";
const LOGO_WIDTH  = 1024;
const LOGO_HEIGHT = 1024;

const AUTHOR_IMAGE_URL    = "https://dalam.web.id/favicon.svg";
const AUTHOR_IMAGE_WIDTH  = 512;
const AUTHOR_IMAGE_HEIGHT = 512;
const AUTHOR_IMAGE_TYPE   = "image/svg+xml";

const DEFAULT_IMAGE_WIDTH  = 1200;
const DEFAULT_IMAGE_HEIGHT = 630;

const FORCE_RESCHEMA = process.argv.includes("--force");

const ALLOWED_CATEGORIES = new Set([
  "gaya-hidup", "jejak-sejarah", "lainnya",
  "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno",
]);

const SCHEMA_REGEX  = /<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi;
const SIGNATURE_KEY = "schema_oleh_Fakhrul_Rijal";

const STOPWORDS = new Set([
  "yang", "untuk", "dengan", "adalah", "dalam", "dari",
  "pada", "atau", "itu", "dan", "sebuah", "aku", "ke",
  "saya", "ini", "gue", "gua", "elu", "elo"
]);

const PERSON_SAME_AS = [
  "https://facebook.com/frijal",
  "https://github.com/frijal",
  "https://linkedin.com/in/frijal",
  "https://x.com/responaja",
  "https://threads.net/frijal",
  "https://www.youtube.com/@frijal",
  "https://www.tiktok.com/@gibah.dilarang",
  "https://mastodon.social/@frijal",
  "https://www.reddit.com/user/Fearless_Economics69"
];

const ORG_SAME_AS = [
  "https://facebook.com/frijalpage",
  "https://x.com/responaja",
  "https://www.youtube.com/@frijal"
];

const YT_ID_REGEXES = [
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
  /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
  /youtube\.com\/watch\?[^"'\s>]*v=([a-zA-Z0-9_-]{11})/gi,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/gi,
];

// ========== UTILITIES ==========
const cleanBaseUrl      = BASE_URL.replace(/\/+$/, "");
const siteUrl           = cleanBaseUrl;
const searchUrlTemplate = `${cleanBaseUrl}/search/?q={search_term_string}`;

const slugify = (t: unknown): string =>
  String(t).toString().toLowerCase().trim()
    .replace(/^[^\w\s]*/u, "")
    .replace(/ & /g, "-and-")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const categoryNameClean = (c: string): string =>
  String(c).trim()
    .replace(/^[^\w\s]*/u, "")
    .replace(/-+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const cleanText = (value: unknown): string =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeDescription = (text: string): string =>
  cleanText(text).slice(0, 300);

const normalizeLocale = (locale: string): string => {
  const value = cleanText(locale);
  if (!value) return LANGUAGE;

  return value.replace("_", "-");
};

const absoluteUrl = (
  url: string | undefined | null,
  fallback = LOGO_URL
): string => {
  const value = cleanText(url);

  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;

  if (value.startsWith("/")) {
    return `${cleanBaseUrl}${value}`;
  }

  return `${cleanBaseUrl}/${value.replace(/^\.?\//, "")}`;
};

const toInt = (value: unknown, fallback: number): number => {
  const n = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const uniqueClean = (items: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const value = cleanText(item);
    if (!value) continue;

    const key = value.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(value);
  }

  return result;
};

const splitKeywords = (text: string): string[] =>
  cleanText(text)
    .split(",")
    .map(s => cleanText(s))
    .filter(Boolean);

const safeJsonLd = (data: unknown): string =>
  JSON.stringify(data)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/\//g, "\\/");

const stripSchemaSignature = (html: string): string =>
  html.replace(
    new RegExp(`<noscript>\\s*${SIGNATURE_KEY}[^<]*<\\/noscript>\\s*`, "gi"),
    ""
  );

// ========== SOCIAL URL HELPERS ==========
const normalizeXProfile = (value: string): string => {
  const raw = cleanText(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const handle = raw.replace(/^@+/, "").trim();
  if (!handle) return "";

  return `https://x.com/${handle}`;
};

const normalizeBlueskyProfile = (value: string): string => {
  const raw = cleanText(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const handle = raw.replace(/^@+/, "").trim();
  if (!handle) return "";

  return `https://bsky.app/profile/${handle}`;
};

const normalizeFediverseProfile = (value: string): string => {
  const raw = cleanText(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const cleaned = raw.replace(/^@+/, "").trim();
  const atIndex = cleaned.lastIndexOf("@");

  if (atIndex <= 0) return "";

  const username = cleaned.slice(0, atIndex);
  const host     = cleaned.slice(atIndex + 1);

  if (!username || !host) return "";

  return `https://${host}/@${username}`;
};

// ========== CHEERIO META HELPERS ==========
function getMeta($: cheerio.CheerioAPI, attrName: "property" | "name", attrValue: string): string {
  let found = "";
  const wanted = attrValue.toLowerCase();

  $(`meta[${attrName}]`).each((_, el) => {
    if (found) return;

    const key = cleanText($(el).attr(attrName)).toLowerCase();

    if (key === wanted) {
      found = cleanText($(el).attr("content"));
    }
  });

  return found;
}

function getAllMeta($: cheerio.CheerioAPI, attrName: "property" | "name", attrValue: string): string[] {
  const result: string[] = [];
  const wanted = attrValue.toLowerCase();

  $(`meta[${attrName}]`).each((_, el) => {
    const key = cleanText($(el).attr(attrName)).toLowerCase();

    if (key === wanted) {
      const content = cleanText($(el).attr("content"));
      if (content) result.push(content);
    }
  });

  return uniqueClean(result);
}

function getLinkRel($: cheerio.CheerioAPI, relName: string): string {
  let found = "";
  const wanted = relName.toLowerCase();

  $("link[rel]").each((_, el) => {
    if (found) return;

    const rel = cleanText($(el).attr("rel")).toLowerCase();
    const relParts = rel.split(/\s+/);

    if (relParts.includes(wanted)) {
      found = cleanText($(el).attr("href"));
    }
  });

  return found;
}

// ========== CONTENT HELPERS ==========
function buildFallbackKeywords(headline: string, category: string, slug: string): string[] {
  const words = String(headline || "")
    .toLowerCase()
    .split(/[^\w]+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));

  const fromSlug = slug
    .split("-")
    .filter(s => s.length > 2);

  return uniqueClean([
    ...words,
    ...fromSlug,
    category,
    "Layar Kosong"
  ]);
}

function extractYoutubeIds(html: string): string[] {
  const ids = new Set<string>();

  for (const rx of YT_ID_REGEXES) {
    for (const match of html.matchAll(rx)) {
      if (match[1]) ids.add(match[1]);
    }
  }

  return [...ids];
}

function countWordsInText(text: string): number {
  const normalized = cleanText(text)
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[^\p{L}\p{M}\s''-]/gu, " ");

  const words = normalized.match(/[\p{L}\p{M}]+(?:[''-][\p{L}\p{M}]+)*/gu) || [];

  return words
    .filter(word => word.length > 1)
    .length;
}

function extractTagFragment(html: string, tagName: string): string {
  const rx = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, "i");
  return html.match(rx)?.[0] || "";
}

function fragmentToText(fragment: string): string {
  if (!fragment) return "";

  const $ = cheerio.load(fragment, {}, false);

  $(
    [
      "script",
      "style",
      "noscript",
      "svg",
      "canvas",
      "iframe",
      "template",
      "footer",
      "nav",
      "aside",
      "#related-articles-grid",
      "#response",
      "#progress",
      "#internal-nav",
      "#related-marquee-section",
      "#related-marquee-container",
      ".search-floating-container",
      "#floatingSearchResults",
      "#layar-kosong-header"
    ].join(", ")
  ).remove();

  return cleanText($.root().text());
}

function countWordsFromHtml(html: string): number {
  const $ = cheerio.load(html);

  $(
    [
      "script",
      "style",
      "noscript",
      "svg",
      "canvas",
      "iframe",
      "template",
      "footer",
      "nav",
      "aside",
      "#related-articles-grid",
      "#response",
      "#progress",
      "#internal-nav",
      "#related-marquee-section",
      "#related-marquee-container",
      ".search-floating-container",
      "#floatingSearchResults",
      "#layar-kosong-header"
    ].join(", ")
  ).remove();

  const candidates = [
    cleanText($("article").first().text()),
    cleanText($("main article").first().text()),
    cleanText($('[role="main"]').first().text()),
    cleanText($("main").first().text()),
    cleanText($(".container article").first().text()),
    cleanText($(".container").first().text()),
    cleanText($("body").text()),
    cleanText($.root().text()),

    fragmentToText(extractTagFragment(html, "article")),
    fragmentToText(extractTagFragment(html, "main")),
    fragmentToText(extractTagFragment(html, "body"))
  ];

  const counts = candidates.map(countWordsInText);

  return Math.max(0, ...counts);
}

// ========== META EXTRACTOR ==========
function extractMetaFromHtml(
  category: string,
  article: ArticleEntry,
  htmlContent: string
): ExtractedMeta {
  const $ = cheerio.load(htmlContent);

  const [jsonHeadline, filename, jsonImage, isoDate, jsonDesc] = article;

  const catSlug     = slugify(category);
  const fileSlug    = String(filename).replace(/\.html$/i, "").replace(/^\//, "");
  const fallbackUrl = `${cleanBaseUrl}/${catSlug}/${fileSlug}`;

  const canonicalUrl = absoluteUrl(getLinkRel($, "canonical"), "");
  const ogUrl        = absoluteUrl(getMeta($, "property", "og:url"), "");
  const twitterUrl   = absoluteUrl(getMeta($, "property", "twitter:url"), "");

  const articleUrl = canonicalUrl || ogUrl || twitterUrl || fallbackUrl;

  const siteName = getMeta($, "property", "og:site_name") || SITE_NAME;
  const language = normalizeLocale(getMeta($, "property", "og:locale"));

  const authorName = getMeta($, "name", "author") || AUTHOR;

  const ogTitle      = getMeta($, "property", "og:title");
  const twitterTitle = getMeta($, "name", "twitter:title");
  const h1Title      = cleanText($("h1").first().text());
  const titleTag     = cleanText($("title").first().text());

  const headline  = ogTitle || twitterTitle || h1Title || jsonHeadline;
  const pageTitle = titleTag || `${headline} - ${siteName}`;

  const metaDescription    = getMeta($, "name", "description");
  const ogDescription      = getMeta($, "property", "og:description");
  const twitterDescription = getMeta($, "name", "twitter:description");

  const description = normalizeDescription(
    metaDescription ||
    ogDescription ||
    twitterDescription ||
    jsonDesc ||
    headline
  );

  const ogImage      = getMeta($, "property", "og:image");
  const twitterImage = getMeta($, "name", "twitter:image");

  const firstArticleImg = $("article img").first();
  const firstImg        = firstArticleImg.length ? firstArticleImg : $("img").first();
  const firstImgSrc     = firstImg.length ? cleanText(firstImg.attr("src")) : "";

  const imageUrl = absoluteUrl(
    ogImage ||
    twitterImage ||
    jsonImage ||
    firstImgSrc ||
    LOGO_URL,
    LOGO_URL
  );

  const ogImageWidth  = getMeta($, "property", "og:image:width");
  const ogImageHeight = getMeta($, "property", "og:image:height");
  const ogImageAlt    = getMeta($, "property", "og:image:alt");
  const ogImageType   = getMeta($, "property", "og:image:type");

  const imageWidth = toInt(
    ogImageWidth || (firstImg.length ? firstImg.attr("width") : ""),
    DEFAULT_IMAGE_WIDTH
  );

  const imageHeight = toInt(
    ogImageHeight || (firstImg.length ? firstImg.attr("height") : ""),
    DEFAULT_IMAGE_HEIGHT
  );

  const imageCaption =
    ogImageAlt ||
    (firstImg.length ? cleanText(firstImg.attr("alt")) : "") ||
    headline;

  const articleTags  = getAllMeta($, "property", "article:tag");
  const newsKeywords = splitKeywords(getMeta($, "name", "news_keywords"));

  // ========== VALIDASI WAKTU (Time Machine Prevention) ==========
  let datePublished =
    getMeta($, "property", "article:published_time") ||
    isoDate;

  let dateModified =
    getMeta($, "property", "article:modified_time") ||
    datePublished;

  // Guard: jangan sampai dateModified lebih tua dari datePublished
  const tPub = new Date(datePublished).getTime();
  const tMod = new Date(dateModified).getTime();

  if (Number.isFinite(tPub) && Number.isFinite(tMod) && tMod < tPub) {
    dateModified = datePublished;
  }

  const licenseUrl = absoluteUrl(getLinkRel($, "license"), LICENSE_URL);

  const articleAuthorProfile    = absoluteUrl(getMeta($, "property", "article:author"), "");
  const articlePublisherProfile = absoluteUrl(getMeta($, "property", "article:publisher"), "");

  const twitterCreatorProfile = normalizeXProfile(getMeta($, "name", "twitter:creator"));
  const twitterSiteProfile    = normalizeXProfile(getMeta($, "name", "twitter:site"));
  const blueskyProfile        = normalizeBlueskyProfile(getMeta($, "name", "bluesky:creator"));
  const fediverseProfile      = normalizeFediverseProfile(getMeta($, "name", "fediverse:creator"));

  return {
    articleUrl,
    headline,
    pageTitle,
    description,
    siteName,
    authorName,
    language,
    datePublished,
    dateModified,
    licenseUrl,
    articleTags,
    newsKeywords,
    primaryImage: {
      url: imageUrl,
      contentUrl: imageUrl,
      width: imageWidth,
      height: imageHeight,
      caption: imageCaption,
      ...(ogImageType ? { encodingFormat: ogImageType } : {})
    },
    articleAuthorProfile,
    articlePublisherProfile,
    twitterCreatorProfile,
    twitterSiteProfile,
    blueskyProfile,
    fediverseProfile
  };
}

// ========== GLOBAL IMAGE MULTI-RATIO GENERATOR (V4 ULTIMATE) ==========
/**
 * Generate multi-ratio images dengan ALL PROTECTIONS:
 * 1. ✅ Logo detection (skip resize untuk gambar statis)
 * 2. ✅ cdn-cgi path check (prevent double wrapping)
 * 3. ✅ 1000×1000 square ratio (bandwidth optimization)
 * 4. ✅ uniqueClean() (prevent duplicates in array)
 * 5. ✅ Domain filtering (only resize internal domain)
 * 6. ✅ Explicit fallback (external/invalid images)
 * 
 * Ratios:
 * - 16:9 (1200×675) - default/original
 * - 4:3 (1200×900) - standard thumbnail
 * - 1:1 (1000×1000) - square (Pinterest, Rich snippets)
 */
const generateMultiRatioImages = (rawUrl: string): string[] => {
  // ============ STEP 1: Input Validation & Logo Detection ============
  const trimmedUrl = cleanText(rawUrl);
  
  // Fallback jika input kosong
  if (!trimmedUrl) {
    return [LOGO_URL];
  }

  // PROTEKSI: Logo tidak perlu di-resize (gambar statis)
  if (trimmedUrl === LOGO_URL) {
    return [trimmedUrl];
  }

  // ============ STEP 2: Normalize URL (convert relative → absolute) ============
  let fullUrl = trimmedUrl;
  if (trimmedUrl.startsWith("/")) {
    fullUrl = `${cleanBaseUrl}${trimmedUrl}`;
  }

  // ============ STEP 3: Parse & Validate URL ============
  try {
    const urlObj = new URL(fullUrl);

    // ============ STEP 4: Domain Filter (only resize internal images) ============
    if (urlObj.hostname !== "dalam.web.id") {
      // External image: return as-is (no CDN wrapping)
      return [fullUrl];
    }

    // ============ STEP 5: cdn-cgi Path Check (prevent double wrapping) ============
    if (urlObj.pathname.startsWith("/cdn-cgi/image/")) {
      // Already wrapped: return as-is
      return [fullUrl];
    }

    // ============ STEP 6: Generate Multi-Ratio Images ============
    const pathWithQuery = urlObj.pathname + urlObj.search;

    const variants = [
      fullUrl, // Original 16:9 (1200×675)
      `${cleanBaseUrl}/cdn-cgi/image/width=960,height=720,fit=crop${pathWithQuery}`, // 4:3
      `${cleanBaseUrl}/cdn-cgi/image/width=720,height=720,fit=crop${pathWithQuery}` // 1:1 (optimized square)
    ];

    // ============ STEP 7: Deduplicate & Return ============
    return uniqueClean(variants);

  } catch (error) {
    // ============ ERROR FALLBACK: Invalid URL parsing ============
    // Jika URL parse gagal, return gambar asli saja
    return [fullUrl];
  }
};

// ========== SCHEMA BUILDER ==========
function buildSchema(category: string, article: ArticleEntry, htmlContent: string): string {
  const [, filename] = article;

  const catSlug        = slugify(category);
  const fileSlug       = String(filename).replace(/\.html$/i, "").replace(/^\//, "");
  const catDisplayName = categoryNameClean(category);

  const meta       = extractMetaFromHtml(category, article, htmlContent);
  const wordCount  = countWordsFromHtml(htmlContent);
  const youtubeIds = extractYoutubeIds(htmlContent);

  const articleUrl = meta.articleUrl;

  const articleId     = `${articleUrl}#article`;
  const imageId       = `${articleUrl}#primaryimage`;
  const breadcrumbId  = `${articleUrl}#breadcrumb`;
  const websiteId     = `${cleanBaseUrl}/#website`;
  const orgId         = `${cleanBaseUrl}/#organization`;
  const logoId        = `${cleanBaseUrl}/#logo`;
  // ===== PERBAIKAN: Person ID rapi =====
  const personId      = `${cleanBaseUrl}/#fakhrul-rijal`;
  const authorImageId = `${cleanBaseUrl}/#author-image`;

  const keywords = uniqueClean([
    ...meta.articleTags,
    ...meta.newsKeywords,
    ...buildFallbackKeywords(meta.headline, catDisplayName, fileSlug)
  ]).slice(0, 18);

  const personSameAs = uniqueClean([
    ...PERSON_SAME_AS,
    meta.articleAuthorProfile,
    meta.twitterCreatorProfile,
    meta.blueskyProfile,
    meta.fediverseProfile
  ]);

  const orgSameAs = uniqueClean([
    ...ORG_SAME_AS,
    meta.articlePublisherProfile,
    meta.twitterSiteProfile
  ]);

  // ========== GUNAKAN GLOBAL IMAGE GENERATOR (V4 ULTIMATE) ==========
  const multiRatioImages = generateMultiRatioImages(meta.primaryImage.url);

  const graph: any[] = [
    {
      "@type": SCHEMA_ARTICLE_TYPE,
      "@id": articleId,
      "isPartOf": { "@id": articleUrl },
      "author": {
        "name": meta.authorName,
        "@id": personId
      },
      "headline": meta.headline,
      "description": meta.description,
      "datePublished": meta.datePublished,
      "dateModified": meta.dateModified,
      "mainEntityOfPage": { "@id": articleUrl },
      "wordCount": wordCount,
      "publisher": { "@id": orgId },
      "image": multiRatioImages,
      "thumbnailUrl": meta.primaryImage.url,
      "keywords": keywords,
      "articleSection": [catDisplayName],
      "inLanguage": meta.language,
      "license": meta.licenseUrl
    },
    {
      "@type": "WebPage",
      "@id": articleUrl,
      "url": articleUrl,
      "name": meta.pageTitle,
      "isPartOf": { "@id": websiteId },
      "primaryImageOfPage": { "@id": imageId },
      "image": multiRatioImages,
      "thumbnailUrl": meta.primaryImage.url,
      "datePublished": meta.datePublished,
      "dateModified": meta.dateModified,
      "description": meta.description,
      "breadcrumb": { "@id": breadcrumbId },
      "inLanguage": meta.language,
      "potentialAction": [
        {
          "@type": "ReadAction",
          "target": [articleUrl]
        }
      ]
    },
    {
      "@type": "ImageObject",
      "inLanguage": meta.language,
      "@id": imageId,
      "url": meta.primaryImage.url,
      "contentUrl": meta.primaryImage.contentUrl,
      "width": meta.primaryImage.width,
      "height": meta.primaryImage.height,
      "caption": meta.primaryImage.caption,
      ...(meta.primaryImage.encodingFormat
        ? { "encodingFormat": meta.primaryImage.encodingFormat }
        : {})
    },
    {
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Beranda",
          "item": siteUrl
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": catDisplayName,
          "item": `${cleanBaseUrl}/${catSlug}`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": meta.headline,
          "item": articleUrl
        }
      ]
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      "url": siteUrl,
      "name": meta.siteName,
      "description": SITE_DESCRIPTION,
      "publisher": { "@id": orgId },
      "potentialAction": [
        {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": searchUrlTemplate
          },
          "query-input": {
            "@type": "PropertyValueSpecification",
            "valueRequired": true,
            "valueName": "search_term_string"
          }
        }
      ],
      "inLanguage": meta.language
    },
    {
      "@type": "Organization",
      "@id": orgId,
      "name": meta.siteName,
      "url": siteUrl,
      "logo": {
        "@type": "ImageObject",
        "inLanguage": meta.language,
        "@id": logoId,
        "url": LOGO_URL,
        "contentUrl": LOGO_URL,
        "width": LOGO_WIDTH,
        "height": LOGO_HEIGHT,
        "caption": meta.siteName,
        "representativeOfPage": true
      },
      "image": { "@id": logoId },
      "sameAs": orgSameAs
    },
    {
      "@type": "Person",
      "@id": personId,
      "name": meta.authorName,
      "url": `${cleanBaseUrl}/about`,
      "sameAs": personSameAs,
      "image": {
        "@type": "ImageObject",
        "inLanguage": meta.language,
        "@id": authorImageId,
        "url": AUTHOR_IMAGE_URL,
        "contentUrl": AUTHOR_IMAGE_URL,
        "width": AUTHOR_IMAGE_WIDTH,
        "height": AUTHOR_IMAGE_HEIGHT,
        "caption": meta.authorName,
        "encodingFormat": AUTHOR_IMAGE_TYPE
      }
    }
  ];

  youtubeIds.forEach((id, index) => {
    const videoId = `${articleUrl}#video-${index + 1}`;

    graph.push({
      "@type": "VideoObject",
      "@id": videoId,
      "name": youtubeIds.length > 1
        ? `${meta.headline} - Video ${index + 1}`
        : meta.headline,
      "description": meta.description.substring(0, 2048),
      "thumbnailUrl": [
        `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        `https://img.youtube.com/vi/${id}/hqdefault.jpg`
      ],
      "uploadDate": meta.datePublished,
      "embedUrl": `https://www.youtube.com/embed/${id}`,
      "url": `https://www.youtube.com/watch?v=${id}`,
      "publisher": { "@id": orgId },
      "isPartOf": { "@id": articleUrl },
      "inLanguage": meta.language
    });
  });

  const schemaData = {
    "@context": "https://schema.org",
    "@graph": graph
  };

  return `<script type="application/ld+json">${safeJsonLd(schemaData)}</script>\n`;
}

// ========== INJECTION HELPERS ==========
function injectSchema(html: string, schema: string): string {
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${schema}</head>`);
  }

  if (/<body\b/i.test(html)) {
    return html.replace(/<body\b/i, `${schema}<body`);
  }

  return schema + html;
}

function injectSignature(html: string, signature: string): string {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `\n${signature}\n</body>`);
  }

  if (/<\/html>/i.test(html)) {
    return html.replace(/<\/html>/i, `\n${signature}\n</html>`);
  }

  return html.trimEnd() + `\n${signature}`;
}

// ========== MAIN ==========
async function main() {
  try {
    const data: ArtikelData = await file("artikel.json").json();

    const results = {
      changed: 0,
      skipped: 0,
      missing: 0,
      withVideo: 0,
      totalVideos: 0
    };

    const signature = `<noscript>${SIGNATURE_KEY}_${new Date().toISOString().slice(0, 10)}</noscript>`;

    for (const [category, articles] of Object.entries(data)) {
      const catSlug = slugify(category);

      if (!ALLOWED_CATEGORIES.has(catSlug) || !Array.isArray(articles)) {
        continue;
      }

      for (const article of articles) {
        const htmlPath = path.join(catSlug, String(article[1]).replace(/^\//, ""));

        if (!existsSync(htmlPath)) {
          results.missing++;
          console.warn(`⚠️  File tidak ditemukan: ${htmlPath}`);
          continue;
        }

        let html = await file(htmlPath).text();

        if (!FORCE_RESCHEMA && html.includes(SIGNATURE_KEY)) {
          results.skipped++;
          continue;
        }

        // Bersihkan schema dan signature lama agar tidak dobel.
        html = html.replace(SCHEMA_REGEX, "");
        html = stripSchemaSignature(html);

        const ytIds  = extractYoutubeIds(html);
        const schema = buildSchema(category, article, html);

        html = injectSchema(html, schema);
        html = injectSignature(html, signature);

        await write(htmlPath, html);

        results.changed++;

        if (ytIds.length > 0) {
          results.withVideo++;
          results.totalVideos += ytIds.length;
        }

        const videoLabel = ytIds.length > 0 ? ` 🎬 ×${ytIds.length}` : "";
        console.log(`✅ Injected${videoLabel}: ${htmlPath}`);
      }
    }

    console.log(`
🚀 Article/Blog Schema Injection Selesai!
📦 Version: V4 ULTIMATE (All Protections)
🆕 Baru diproses  : ${results.changed}
🎬 Artikel + video: ${results.withVideo} (${results.totalVideos} VideoObject)
⏭️  Di-skip        : ${results.skipped}
❌ File hilang    : ${results.missing}
🔁 Mode force      : ${FORCE_RESCHEMA ? "aktif" : "nonaktif"}
🏷️  Article type   : ${SCHEMA_ARTICLE_TYPE}
🧑 Avatar author   : ${AUTHOR_IMAGE_URL}
🔎 Search template : ${searchUrlTemplate}`);

  } catch (err) {
    console.error("❌ Error fatal:", err);
    process.exit(1);
  }
}

main();
