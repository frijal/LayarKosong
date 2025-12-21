import fs from "fs";
import path from "path";

/* ================== KONFIG ================== */

const HTML_DIR = "artikel";
const JSON_DIR = "api/v1/post";

/* ================== UTIL DASAR ================== */

function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function normalizeToArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
  if (typeof val === "string") return [val.trim()];
  if (typeof val === "object") return Object.values(val).map(v => String(v).trim()).filter(Boolean);
  return [];
}

function normalizeToString(val, joiner = " | ") {
  return normalizeToArray(val).join(joiner);
}

/* ================== SCHEMA VALIDATOR ================== */

function validateSchema(json, slug) {
  const errors = [];

  const req = (f, t) => {
    if (!(f in json)) errors.push(`missing ${f}`);
    else if (t && typeof json[f] !== t) errors.push(`invalid ${f}`);
  };

  req("title", "string");
  req("url", "string");
  req("published_at", "string");
  req("meta", "object");

  if (errors.length) {
    console.warn(`⚠ SCHEMA INVALID (${slug}): ${errors.join(", ")}`);
    return false;
  }
  return true;
}

/* ================== HTML MINI ================== */

function extractMeta(html, name) {
  const m = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)`, "i")
  );
  return m ? m[1].trim() : null;
}

function extractProperty(html, prop) {
  const m = html.match(
    new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)`, "i")
  );
  return m ? m[1].trim() : null;
}

function hasJSONLDArticle(html) {
  return /"@type"\s*:\s*"Article"/i.test(html);
}

function remove(html, regex) {
  return html.replace(regex, "");
}

/* ================== DEDUPLICATOR ================== */

function dedupeMetaByKey(html, attr, prefix) {
  const re = new RegExp(`<meta\\s+${attr}="${prefix}[^"]*"[^>]*>`, "gi");
  const found = html.match(re);
  if (!found || found.length <= 1) return html;

  const last = found[found.length - 1];
  html = html.replace(re, "");
  return html.replace(/<\/head>/i, `${last}\n</head>`);
}

function strictPostDeduplicator(html) {
  let out = html;
  out = dedupeMetaByKey(out, "property", "og:");
  out = dedupeMetaByKey(out, "name", "twitter:");
  out = dedupeMetaByKey(out, "property", "article:");
  return out;
}

function canonicalSanityCheck(html, expectedUrl) {
  const re = /<link\s+rel=["']canonical["'][^>]*>/gi;
  const found = html.match(re);
  if (!found || found.length <= 1) return html;

  const valid = found.find(l => l.includes(expectedUrl));
  if (!valid) return html;

  html = html.replace(re, "");
  return html.replace(/<\/head>/i, `${valid}\n</head>`);
}

function qualityScore(html) {
  const checks = [
    /<meta name="description"/i,
    /<link rel="canonical"/i,
    /property="og:title"/i,
    /property="og:image"/i,
    /name="twitter:card"/i,
    /application\/ld\+json/i,
    /name="news_keywords"/i,
    /name="ai:summary"/i
  ];
  const score = checks.filter(r => r.test(html)).length;
  return { score, max: checks.length };
}

/* ================== INJECT STRICT ================== */

function injectStrict(html, json) {
  let out = html;
  let changed = false;
  const meta = json.meta || {};

  const injectMeta = (name, val) => {
    if (!val || extractMeta(out, name) === val) return;
    out = remove(out, new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>\\s*`, "gi"));
    out = out.replace("</head>", `<meta name="${name}" content="${esc(val)}">\n</head>`);
    changed = true;
  };

  if (meta.summary) {
    injectMeta("description", meta.summary);
    injectMeta("ai:summary", meta.summary);
  }

  injectMeta("news_keywords", normalizeToString(meta.keywords, ", "));
  injectMeta("ai:topics", normalizeToString(meta.topics, ", "));
  injectMeta("ai:prompt_hint", normalizeToString(meta.prompt_hint, " | "));

  if (extractProperty(out, "og:title") !== json.title) {
    out = remove(out, /<meta[^>]+property=["']og:[^>]+>\\s*/gi);
    out = out.replace(
      "</head>",
      `<meta property="og:type" content="article">
<meta property="og:title" content="${esc(json.title)}">
<meta property="og:description" content="${esc(meta.summary || "")}">
<meta property="og:image" content="${json.image || ""}">
<meta property="og:url" content="${json.url}">
</head>`
    );
    changed = true;
  }

  if (extractMeta(out, "twitter:title") !== json.title) {
    out = remove(out, /<meta[^>]+name=["']twitter:[^>]+>\\s*/gi);
    out = out.replace(
      "</head>",
      `<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(json.title)}">
<meta name="twitter:description" content="${esc(meta.summary || "")}">
<meta name="twitter:image" content="${json.image || ""}">
</head>`
    );
    changed = true;
  }

  if (!hasJSONLDArticle(out)) {
    out = remove(out, /<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>\s*/gi);
    out = out.replace(
      "</head>",
      `<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: json.title,
  datePublished: json.published_at,
  articleSection: json.category,
  mainEntityOfPage: json.url,
  image: json.image,
  keywords: normalizeToArray(meta.keywords),
  description: meta.summary || ""
}, null, 2)}
</script>
</head>`
    );
    changed = true;
  }

  return { out, changed };
}

/* ================== MAIN LOOP ================== */

for (const file of fs.readdirSync(HTML_DIR)) {
  if (!file.endsWith(".html")) continue;

  const slug = file.replace(".html", "");
  const htmlPath = path.join(HTML_DIR, file);
  const jsonPath = path.join(JSON_DIR, `${slug}.json`);

  if (!fs.existsSync(jsonPath)) {
    console.log(`SKIP (JSON missing): ${file}`);
    continue;
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  if (!validateSchema(json, slug)) {
    console.log(`SKIP (schema invalid): ${file}`);
    continue;
  }

  let { out, changed } = injectStrict(html, json);
  
out = strictPostDeduplicator(out);
out = canonicalSanityCheck(out, json.url);
out = normalizeHeadWhitespace(out);



  const q = qualityScore(out);
  console.log(`[QUALITY] ${file} → ${q.score}/${q.max}`);

  if (out !== html) {
    fs.writeFileSync(htmlPath, out);
    console.log(`UPDATED (strict): ${file}`);
  } else {
    console.log(`NO CHANGE: ${file}`);
  }
}

function normalizeHeadWhitespace(html) {
  const m = html.match(/<head[\s\S]*?<\/head>/i);
  if (!m) return html;

  let head = m[0];

  // 1. Hapus spasi kosong berlebihan (lebih dari 2 newline)
  head = head.replace(/\n{3,}/g, "\n\n");

  // 2. Hapus newline tepat sebelum </head>
  head = head.replace(/\n+\s*<\/head>/i, "\n</head>");

  // 3. Hapus newline tepat setelah <head>
  head = head.replace(/<head[^>]*>\s*\n+/i, match =>
    match.replace(/\n+/, "\n")
  );

  return html.replace(m[0], head);
}
