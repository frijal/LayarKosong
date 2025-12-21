import fs from "fs";
import path from "path";

const HTML_DIR = "artikel";
const JSON_DIR = "api/post";

function has(pattern, html) {
  return pattern.test(html);
}

function isComplete(html) {
  return (
    has(/<meta\s+name=["']description["']/i, html) &&
    has(/property=["']og:title["']/i, html) &&
    has(/name=["']twitter:card["']/i, html) &&
    has(/application\/ld\+json/i, html) &&
    has(/name=["']ai:summary["']/i, html) &&
    has(/name=["']news_keywords["']/i, html) &&
    has(/name=["']ai:topics["']/i, html) &&
    has(/name=["']ai:prompt_hint["']/i, html)
  );
}

function injectMeta(html, json) {
  let headEnd = html.indexOf("</head>");
  if (headEnd === -1) return html;

  const meta = json.meta || {};
  let inject = "";

  if (meta.summary && !has(/name=["']description["']/i, html)) {
    inject += `<meta name="description" content="${meta.summary}">\n`;
    inject += `<meta name="ai:summary" content="${meta.summary}">\n`;
  }

  if (meta.keywords && !has(/news_keywords/i, html)) {
    inject += `<meta name="news_keywords" content="${meta.keywords.join(", ")}">\n`;
  }

  if (meta.topics && !has(/ai:topics/i, html)) {
    inject += `<meta name="ai:topics" content="${meta.topics.join(", ")}">\n`;
  }

  if (meta.prompt_hint && !has(/ai:prompt_hint/i, html)) {
    inject += `<meta name="ai:prompt_hint" content="${meta.prompt_hint.join(" | ")}">\n`;
  }

  if (!has(/og:title/i, html)) {
    inject += `
<meta property="og:title" content="${json.title}">
<meta property="og:description" content="${meta.summary || ""}">
<meta property="og:image" content="${json.image || ""}">
<meta property="og:url" content="${json.url || ""}">
<meta property="og:type" content="article">
`;
  }

  if (!has(/twitter:card/i, html)) {
    inject += `
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${json.title}">
<meta name="twitter:description" content="${meta.summary || ""}">
<meta name="twitter:image" content="${json.image || ""}">
`;
  }

  if (!has(/ld\+json/i, html)) {
    inject += `
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: json.title,
  datePublished: json.published_at,
  image: json.image,
  mainEntityOfPage: json.url,
  keywords: meta.keywords || [],
  articleSection: json.category,
  description: meta.summary || ""
}, null, 2)}
</script>
`;
  }

  return (
    html.slice(0, headEnd) +
    inject +
    html.slice(headEnd)
  );
}

for (const file of fs.readdirSync(HTML_DIR)) {
  if (!file.endsWith(".html")) continue;

  const base = file.replace(".html", "");
  const htmlPath = path.join(HTML_DIR, file);
  const jsonPath = path.join(JSON_DIR, `${base}.json`);

  let html = fs.readFileSync(htmlPath, "utf8");

  if (isComplete(html)) {
    console.log(`✓ SKIP (lengkap): ${file}`);
    continue;
  }

  if (!fs.existsSync(jsonPath)) {
    console.log(`→ SKIP (JSON tidak ada): ${file}`);
    continue;
  }

  const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  if (!json.meta) {
    console.log(`→ SKIP (JSON tidak lengkap): ${file}`);
    continue;
  }

  const updated = injectMeta(html, json);

  if (updated !== html) {
    fs.writeFileSync(htmlPath, updated);
    console.log(`✔ UPDATED: ${file}`);
  } else {
    console.log(`→ NO CHANGE: ${file}`);
  }
}
