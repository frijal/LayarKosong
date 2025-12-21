import fs from "fs";
import path from "path";

const HTML_DIR = "artikel";
const JSON_DIR = "api/post";

function esc(str = "") {
  return str.replace(/"/g, "&quot;");
}

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

function removeTag(html, regex) {
  return html.replace(regex, "");
}

function inject(html, json) {
  const meta = json.meta || {};
  let modified = html;
  let injected = false;

  /* ===== DESCRIPTION + AI SUMMARY ===== */
  if (meta.summary) {
    const current = extractMeta(modified, "description");
    if (current !== meta.summary) {
      modified = removeTag(
        modified,
        /<meta[^>]+name=["']description["'][^>]*>\s*/gi
      );
      modified = modified.replace(
        "</head>",
        `<meta name="description" content="${esc(meta.summary)}">\n<meta name="ai:summary" content="${esc(meta.summary)}">\n</head>`
      );
      injected = true;
    }
  }

  /* ===== KEYWORDS ===== */
  if (meta.keywords?.length) {
    const val = meta.keywords.join(", ");
    const current = extractMeta(modified, "news_keywords");
    if (current !== val) {
      modified = removeTag(
        modified,
        /<meta[^>]+name=["']news_keywords["'][^>]*>\s*/gi
      );
      modified = modified.replace(
        "</head>",
        `<meta name="news_keywords" content="${esc(val)}">\n</head>`
      );
      injected = true;
    }
  }

  /* ===== TOPICS ===== */
  if (meta.topics?.length) {
    const val = meta.topics.join(", ");
    const current = extractMeta(modified, "ai:topics");
    if (current !== val) {
      modified = removeTag(
        modified,
        /<meta[^>]+name=["']ai:topics["'][^>]*>\s*/gi
      );
      modified = modified.replace(
        "</head>",
        `<meta name="ai:topics" content="${esc(val)}">\n</head>`
      );
      injected = true;
    }
  }

  /* ===== PROMPT HINT ===== */
  if (meta.prompt_hint?.length) {
    const val = meta.prompt_hint.join(" | ");
    const current = extractMeta(modified, "ai:prompt_hint");
    if (current !== val) {
      modified = removeTag(
        modified,
        /<meta[^>]+name=["']ai:prompt_hint["'][^>]*>\s*/gi
      );
      modified = modified.replace(
        "</head>",
        `<meta name="ai:prompt_hint" content="${esc(val)}">\n</head>`
      );
      injected = true;
    }
  }

  /* ===== OPEN GRAPH ===== */
  if (extractProperty(modified, "og:title") !== json.title) {
    modified = removeTag(modified, /<meta[^>]+property=["']og:[^>]+>\s*/gi);
    modified = modified.replace(
      "</head>",
      `
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(json.title)}">
<meta property="og:description" content="${esc(meta.summary || "")}">
<meta property="og:image" content="${json.image || ""}">
<meta property="og:url" content="${json.url || ""}">
</head>`
    );
    injected = true;
  }

  /* ===== TWITTER CARD ===== */
  if (extractMeta(modified, "twitter:title") !== json.title) {
    modified = removeTag(modified, /<meta[^>]+name=["']twitter:[^>]+>\s*/gi);
    modified = modified.replace(
      "</head>",
      `
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(json.title)}">
<meta name="twitter:description" content="${esc(meta.summary || "")}">
<meta name="twitter:image" content="${json.image || ""}">
</head>`
    );
    injected = true;
  }

  /* ===== JSON-LD ARTICLE ===== */
  if (!hasJSONLDArticle(modified)) {
    modified = removeTag(
      modified,
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
      keywords: meta.keywords || [],
      description: meta.summary || ""
    };

    modified = modified.replace(
      "</head>",
      `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>\n</head>`
    );
    injected = true;
  }

  return { modified, injected };
}

/* ================= MAIN LOOP ================= */

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

  if (!json.meta) {
    console.log(`SKIP (JSON meta missing): ${file}`);
    continue;
  }

  const { modified, injected } = inject(html, json);

  if (injected && modified !== html) {
    fs.writeFileSync(htmlPath, modified);
    console.log(`UPDATED (strict): ${file}`);
  } else {
    console.log(`NO CHANGE: ${file}`);
  }
}
