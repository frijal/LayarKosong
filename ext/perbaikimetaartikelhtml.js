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

/* ================== SCHEMA VALIDATOR (NO LIB) ================== */

function validateSchema(json, slug) {
  const errors = [];

  function req(field, type) {
    if (!(field in json)) {
      errors.push(`missing field: ${field}`);
    } else if (type && typeof json[field] !== type) {
      errors.push(`invalid type: ${field} should be ${type}`);
    }
  }

  req("title", "string");
  req("url", "string");
  req("published_at", "string");
  req("meta", "object");

  if (json.meta) {
    if (json.meta.summary && typeof json.meta.summary !== "string") {
      errors.push("meta.summary must be string");
    }
  }

  if (errors.length) {
    console.warn(`⚠ SCHEMA INVALID (${slug}):`, errors.join("; "));
    return false;
  }

  return true;
}

/* ================== HTML PARSER MINI ================== */

function extractMeta(html, name) {
  const re = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function extractProperty(html, prop) {
  const re = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function hasJSONLDArticle(html) {
  return /"@type"\s*:\s*"Article"/i.test(html);
}

function remove(html, regex) {
  return html.replace(regex, "");
}

/* ================== INJECTOR STRICT ================== */

function injectStrict(html, json) {
  let out = html;
  let changed = false;
  const meta = json.meta || {};

  function injectMeta(name, value) {
    const current = extractMeta(out, name);
    if (current === value) return;

    out = remove(out, new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>\\s*`, "gi"));
    out = out.replace(
      "</head>",
      `<meta name="${name}" content="${esc(value)}">\n</head>`
    );
    changed = true;
  }

  /* === BASIC SEO === */
  if (meta.summary) {
    injectMeta("description", meta.summary);
    injectMeta("ai:summary", meta.summary);
  }

  /* === KEYWORDS / TOPICS / PROMPT === */
  const keywords = normalizeToString(meta.keywords, ", ");
  const topics = normalizeToString(meta.topics, ", ");
  const prompts = normalizeToString(meta.prompt_hint, " | ");

  if (keywords) injectMeta("news_keywords", keywords);
  if (topics) injectMeta("ai:topics", topics);
  if (prompts) injectMeta("ai:prompt_hint", prompts);

  /* === OPEN GRAPH === */
  if (extractProperty(out, "og:title") !== json.title) {
    out = remove(out, /<meta[^>]+property=["']og:[^>]+>\\s*/gi);
    out = out.replace(
      "</head>",
      `
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(json.title)}">
<meta property="og:description" content="${esc(meta.summary || "")}">
<meta property="og:image" content="${json.image || ""}">
<meta property="og:url" content="${json.url}">
</head>`
    );
    changed = true;
  }

  /* === TWITTER CARD === */
  if (extractMeta(out, "twitter:title") !== json.title) {
    out = remove(out, /<meta[^>]+name=["']twitter:[^>]+>\\s*/gi);
    out = out.replace(
      "</head>",
      `
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(json.title)}">
<meta name="twitter:description" content="${esc(meta.summary || "")}">
<meta name="twitter:image" content="${json.image || ""}">
</head>`
    );
    changed = true;
  }

  /* === JSON-LD ARTICLE === */
  if (!hasJSONLDArticle(out)) {
out = remove(
  out,
  /<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>\s*/gi
);

    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: json.title,
      datePublished: json.published_at,
      articleSection: json.category,
      mainEntityOfPage: json.url,
      image: json.image,
      keywords: normalizeToArray(meta.keywords),
      description: meta.summary || ""
    };

    out = out.replace(
      "</head>",
      `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>\n</head>`
    );
    changed = true;
  }

  return { out, changed };
}

/* ================== MAIN ================== */

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

  const { out, changed } = injectStrict(html, json);

  if (changed && out !== html) {
    fs.writeFileSync(htmlPath, out);
    console.log(`UPDATED (strict): ${file}`);
  } else {
    console.log(`NO CHANGE: ${file}`);
  }
}
