import fs from "fs";
import path from "path";

/* ================== KONFIG ================== */

const HTML_DIR = "artikel";
const JSON_DIR = "api/v1/post";
const REPORT_FILE =
  `AuditInjectHTML-${new Date().toISOString().slice(0,10).replace(/-/g,"")}.md`;

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
  if (typeof val === "object")
    return Object.values(val).map(v => String(v).trim()).filter(Boolean);
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
    report.skipped.push({ file: `${slug}.html`, reason: errors.join(", ") });
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

/* ================== CANONICAL SANITY ================== */

function canonicalSanityCheck(html, expectedUrl) {
  const re = /<link\s+rel=["']canonical["'][^>]*>/gi;
  const found = html.match(re);
  if (!found || found.length <= 1) return html;

  const valid = found.find(l => l.includes(expectedUrl));
  if (!valid) return html;

  html = html.replace(re, "");
  return html.replace(/<\/head>/i, `${valid}\n</head>`);
}

/* ================== PATCH v3.2 — HEAD NORMALIZER ================== */

function normalizeHeadWhitespace(html) {
  const m = html.match(/<head[^>]*>[\s\S]*?<\/head>/i);
  if (!m) return html;

  const lines = m[0].split("\n");
  const cleaned = [];
  let empty = 0;

  for (const line of lines) {
    if (line.trim() === "") {
      empty++;
      if (empty <= 1) cleaned.push("");
    } else {
      empty = 0;
      cleaned.push(line);
    }
  }

  let head = cleaned.join("\n")
    .replace(/<head[^>]*>\s*\n+/i, m => m.replace(/\n+/, "\n"))
    .replace(/\n+\s*<\/head>/i, "\n</head>");

  return html.replace(m[0], head);
}

/* ================== QUALITY SCORE ================== */

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
  return {
    score,
    max: checks.length,
    percent: Math.round((score / checks.length) * 100)
  };
}

/* ================== INJECT STRICT ================== */

function injectStrict(html, json) {
  let out = html;
  const meta = json.meta || {};

  const injectMeta = (name, val) => {
    if (!val || extractMeta(out, name) === val) return;
    out = remove(out, new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>\\s*`, "gi"));
    out = out.replace("</head>", `<meta name="${name}" content="${esc(val)}">\n</head>`);
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
  }

  return out;
}

const report = {
  date: new Date().toISOString(),
  total: 0,
  updated: [],
  noChange: [],
  skippedJson: [],
  skippedSchema: [],
  quality: []
};

/* ================== MAIN LOOP ================== */

for (const file of fs.readdirSync(HTML_DIR)) {
  if (!file.endsWith(".html")) continue;

  report.total++;

  const slug = file.replace(".html", "");
  const htmlPath = path.join(HTML_DIR, file);
  const jsonPath = path.join(JSON_DIR, `${slug}.json`);

  if (!fs.existsSync(jsonPath)) {
    report.skippedJson.push(file);
    console.log(`SKIP (JSON missing): ${file}`);
    continue;
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  if (!validateSchema(json, slug)) {
    report.skippedSchema.push(file);
    console.log(`SKIP (schema invalid): ${file}`);
    continue;
  }

  let { out } = injectStrict(html, json);

  out = strictPostDeduplicator(out);
  out = canonicalSanityCheck(out, json.url);
  out = normalizeHeadWhitespace(out);

  const q = qualityScore(out);
  report.quality.push({
    file,
    score: q.score,
    max: q.max,
    percent: Math.round((q.score / q.max) * 100)
  });

  console.log(`[QUALITY] ${file} → ${q.score}/${q.max}`);

  if (out !== html) {
    fs.writeFileSync(htmlPath, out);
    report.updated.push(file);
    console.log(`UPDATED (strict): ${file}`);
  } else {
    report.noChange.push(file);
    console.log(`NO CHANGE: ${file}`);
  }
}

/* ================== GENERATE REPORT ================== */

function generateReport(r) {
  const hi = r.quality.filter(x => x.percent >= 90).length;
  const mid = r.quality.filter(x => x.percent >= 70 && x.percent < 90).length;
  const low = r.quality.filter(x => x.percent < 70).length;

  let md = `# 📊 Audit Inject HTML (Strict Mode)

Tanggal: ${r.date.toLocaleString("id-ID")}

---

## Ringkasan

- Total diperiksa: **${r.total}**
- Diperbarui: **${r.updated.length}**
- Tidak berubah: **${r.nochange.length}**
- Dilewati: **${r.skipped.length}**

---

## Distribusi Kualitas

| Kategori | Jumlah |
|--------|-------|
| ≥ 90% | ${hi} |
| 70–89% | ${mid} |
| < 70% | ${low} |

---

## Detail

### UPDATED
${r.updated.map(x => `- ${x.file} (${x.q.score}/${x.q.max})`).join("\n")}

### NO CHANGE
${r.nochange.map(x => `- ${x.file} (${x.q.score}/${x.q.max})`).join("\n")}

### SKIPPED
${r.skipped.map(x => `- ${x.file} (${x.reason})`).join("\n")}

---

_Audit otomatis oleh GitHub Actions._
`;

  fs.writeFileSync(REPORT_FILE, md);
}

generateReport(report);
function generateReport(r) {
  const avg =
    r.quality.reduce((a, b) => a + b.percent, 0) /
    (r.quality.length || 1);

  let md = `# Audit Inject HTML\n\n`;

  md += `**Tanggal Audit:** ${r.date}\n\n`;

  md += `## Ringkasan\n\n`;
  md += `| Item | Jumlah |\n`;
  md += `|------|--------|\n`;
  md += `| Total HTML diperiksa | ${r.total} |\n`;
  md += `| Updated | ${r.updated.length} |\n`;
  md += `| No Change | ${r.noChange.length} |\n`;
  md += `| Skip (JSON missing) | ${r.skippedJson.length} |\n`;
  md += `| Skip (Schema invalid) | ${r.skippedSchema.length} |\n`;
  md += `| Rata-rata Quality | ${Math.round(avg)}% |\n\n`;

  md += `## Quality Score per Artikel\n\n`;
  md += `| File | Score | Persen |\n`;
  md += `|------|-------|--------|\n`;

  r.quality.forEach(q => {
    md += `| ${q.file} | ${q.score}/${q.max} | ${q.percent}% |\n`;
  });

  if (r.updated.length) {
    md += `\n## Artikel Diperbarui\n\n`;
    r.updated.forEach(f => md += `- ${f}\n`);
  }

  if (r.noChange.length) {
    md += `\n## Artikel Sudah Lengkap\n\n`;
    r.noChange.forEach(f => md += `- ${f}\n`);
  }

  if (r.skippedJson.length) {
    md += `\n## Dilewati (JSON Tidak Ditemukan)\n\n`;
    r.skippedJson.forEach(f => md += `- ${f}\n`);
  }

  if (r.skippedSchema.length) {
    md += `\n## Dilewati (Schema Invalid)\n\n`;
    r.skippedSchema.forEach(f => md += `- ${f}\n`);
  }

  return md;
}

fs.writeFileSync(REPORT_FILE, generateReport(report));
console.log(`\n📄 Audit report generated: ${REPORT_FILE}`);

